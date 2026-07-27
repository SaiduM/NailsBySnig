import { env } from "cloudflare:workers";
import { ownerAccess } from "../../../../lib/owner-auth";

export const runtime = "edge";

export async function GET(request: Request) {
  const access = await ownerAccess(request);
  if (!access.allowed) return Response.json({ error: access.error }, { status: access.status });
  if (!env.DB) return Response.json({ error: "Booking storage is unavailable." }, { status: 503 });

  const url = new URL(request.url);
  const includePast = url.searchParams.get("includePast") === "true";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const result = await env.DB.prepare(
    `SELECT reference, service_name, duration_minutes, price_dollars, appointment_date,
      appointment_time, client_name, client_email, client_phone, notes, status, created_at
     FROM appointments
     WHERE (? = 1 OR appointment_date >= ?)
     ORDER BY appointment_date ASC, appointment_time ASC`,
  ).bind(includePast ? 1 : 0, today).all();
  return Response.json({ appointments: result.results });
}

export async function PATCH(request: Request) {
  const access = await ownerAccess(request);
  if (!access.allowed) return Response.json({ error: access.error }, { status: access.status });
  if (!env.DB) return Response.json({ error: "Booking storage is unavailable." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { reference?: string; status?: string };
  const reference = body.reference?.trim() ?? "";
  const status = body.status;
  if (!reference || !["pending", "confirmed", "completed", "cancelled"].includes(status ?? "")) {
    return Response.json({ error: "Choose a valid appointment and status." }, { status: 400 });
  }
  const appointment = await env.DB.prepare("SELECT status FROM appointments WHERE reference = ?")
    .bind(reference).first<{ status: string }>();
  if (!appointment) return Response.json({ error: "Appointment not found." }, { status: 404 });
  if (appointment.status === "cancelled" && status !== "cancelled") {
    return Response.json({ error: "A cancelled appointment cannot be reopened; add a new booking instead." }, { status: 409 });
  }

  if (status === "cancelled") {
    await env.DB.batch([
      env.DB.prepare("UPDATE appointments SET status = 'cancelled' WHERE reference = ?").bind(reference),
      env.DB.prepare("DELETE FROM appointment_slots WHERE appointment_reference = ?").bind(reference),
    ]);
  } else {
    await env.DB.prepare("UPDATE appointments SET status = ? WHERE reference = ?")
      .bind(status, reference).run();
  }
  return Response.json({ reference, status });
}
