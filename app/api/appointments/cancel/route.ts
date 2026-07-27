import { env } from "cloudflare:workers";
import { sendAppointmentNotice } from "../../../../lib/notifications";

export const runtime = "edge";

function tokenFrom(request: Request) {
  return new URL(request.url).searchParams.get("token")?.trim() ?? "";
}

export async function GET(request: Request) {
  const token = tokenFrom(request);
  if (!env.DB || !token) {
    return Response.json({ error: "This cancellation link is invalid." }, { status: 400 });
  }
  const appointment = await env.DB.prepare(
    `SELECT reference, service_name, appointment_date, appointment_time, status
     FROM appointments WHERE cancellation_token = ?`,
  ).bind(token).first<{
    reference: string;
    service_name: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
  }>();
  if (!appointment) {
    return Response.json({ error: "We couldn’t find that appointment." }, { status: 404 });
  }
  return Response.json({ appointment });
}

export async function POST(request: Request) {
  const token = tokenFrom(request);
  if (!env.DB || !token) {
    return Response.json({ error: "This cancellation link is invalid." }, { status: 400 });
  }
  const body = await request.json().catch(() => ({})) as { action?: string };
  const action = body.action === "confirm" ? "confirm" : "cancel";
  const appointment = await env.DB.prepare(
    `SELECT reference, service_name, appointment_date, appointment_time, client_name,
      client_email, client_phone, status
     FROM appointments WHERE cancellation_token = ?`,
  ).bind(token).first<{
    reference: string;
    service_name: string;
    appointment_date: string;
    appointment_time: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    status: string;
  }>();
  if (!appointment) {
    return Response.json({ error: "We couldn’t find that appointment." }, { status: 404 });
  }
  if (appointment.status === "cancelled") {
    return Response.json({ reference: appointment.reference, alreadyCancelled: true });
  }
  const manageUrl = `${new URL(request.url).origin}/cancel?token=${encodeURIComponent(token)}`;
  if (action === "confirm") {
    await env.DB.prepare("UPDATE appointments SET status = 'confirmed' WHERE reference = ?")
      .bind(appointment.reference).run();
    await sendAppointmentNotice("confirmed", {
      reference: appointment.reference,
      serviceName: appointment.service_name,
      date: appointment.appointment_date,
      time: appointment.appointment_time,
      name: appointment.client_name,
      email: appointment.client_email,
      phone: appointment.client_phone,
      manageUrl,
    });
    return Response.json({ reference: appointment.reference, confirmed: true });
  }
  await env.DB.batch([
    env.DB.prepare("UPDATE appointments SET status = 'cancelled' WHERE reference = ?")
      .bind(appointment.reference),
    env.DB.prepare("DELETE FROM appointment_slots WHERE appointment_reference = ?")
      .bind(appointment.reference),
  ]);
  await sendAppointmentNotice("cancelled", {
    reference: appointment.reference,
    serviceName: appointment.service_name,
    date: appointment.appointment_date,
    time: appointment.appointment_time,
    name: appointment.client_name,
    email: appointment.client_email,
    phone: appointment.client_phone,
    manageUrl,
  });
  return Response.json({ reference: appointment.reference });
}
