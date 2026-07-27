import {
  createOwnerSession,
  OWNER_SESSION_COOKIE,
  ownerCookieOptions,
  verifyOwnerPassword,
} from "../../../../lib/owner-session";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { password?: string };
  if (!await verifyOwnerPassword(body.password ?? "")) {
    return Response.json({ error: "That password is incorrect." }, { status: 401 });
  }
  const session = await createOwnerSession();
  return Response.json(
    { ok: true },
    { headers: { "set-cookie": `${OWNER_SESSION_COOKIE}=${session}; ${ownerCookieOptions}` } },
  );
}

export async function DELETE() {
  return Response.json(
    { ok: true },
    { headers: { "set-cookie": `${OWNER_SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` } },
  );
}
