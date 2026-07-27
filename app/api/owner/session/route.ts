import {
  createOwnerSession,
  OWNER_SESSION_COOKIE,
  ownerCookieOptions,
  verifyOwnerPassword,
} from "../../../../lib/owner-session";

export const runtime = "edge";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const expectsJson = contentType.includes("application/json");
  const password = expectsJson
    ? ((await request.json().catch(() => ({}))) as { password?: string }).password ?? ""
    : String((await request.formData().catch(() => new FormData())).get("password") ?? "");

  if (!await verifyOwnerPassword(password)) {
    if (!expectsJson) {
      return Response.redirect(new URL("/owner/login?error=invalid", request.url), 303);
    }
    return Response.json({ error: "That password is incorrect." }, { status: 401 });
  }
  const session = await createOwnerSession();
  if (!expectsJson) {
    return new Response(null, {
      status: 303,
      headers: {
        location: "/owner",
        "set-cookie": `${OWNER_SESSION_COOKIE}=${session}; ${ownerCookieOptions}`,
      },
    });
  }
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
