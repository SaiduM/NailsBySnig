export const OWNER_SESSION_COOKIE = "nbs_owner_session";
const SESSION_SECONDS = 60 * 60 * 12;

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

function encode(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes(value)));
}

function equal(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function signature(payload: string) {
  const secret = process.env.OWNER_SESSION_SECRET ?? "";
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    bytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return encode(new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes(payload))));
}

export async function verifyOwnerPassword(candidate: string) {
  const configured = process.env.OWNER_PASSWORD ?? "";
  if (!configured || !candidate) return false;
  return equal(await digest(configured), await digest(candidate));
}

export async function createOwnerSession() {
  const payload = encode(bytes(JSON.stringify({
    email: (process.env.OWNER_EMAIL ?? "").toLowerCase(),
    expires: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })));
  return `${payload}.${await signature(payload)}`;
}

export async function verifyOwnerSession(token: string) {
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;
  const expectedSignature = await signature(payload);
  if (!expectedSignature || !equal(bytes(expectedSignature), bytes(suppliedSignature))) return false;
  try {
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = JSON.parse(atob(normalized)) as { email?: string; expires?: number };
    return decoded.email === (process.env.OWNER_EMAIL ?? "").toLowerCase()
      && Number(decoded.expires) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function ownerSessionFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((part) => part.trim()).find((part) =>
    part.startsWith(`${OWNER_SESSION_COOKIE}=`)
  )?.slice(OWNER_SESSION_COOKIE.length + 1) ?? "";
}

export const ownerCookieOptions = `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`;
