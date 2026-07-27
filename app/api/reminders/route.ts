import { env } from "cloudflare:workers";
import { sendAppointmentNotice } from "../../../lib/notifications";

export const runtime = "edge";

type ReminderAppointment = {
  reference: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  cancellation_token: string;
};

function phoenixTomorrow() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function POST(request: Request) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!process.env.REMINDER_SECRET || secret !== process.env.REMINDER_SECRET) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!env.DB) return Response.json({ error: "Booking storage is unavailable." }, { status: 503 });

  const result = await env.DB.prepare(
    `SELECT reference, service_name, appointment_date, appointment_time, client_name,
      client_email, client_phone, cancellation_token
     FROM appointments
     WHERE appointment_date = ?
       AND status IN ('pending', 'confirmed')
       AND reminder_sent_at IS NULL`,
  ).bind(phoenixTomorrow()).all<ReminderAppointment>();

  let sent = 0;
  for (const appointment of result.results) {
    const manageUrl = `${new URL(request.url).origin}/cancel?token=${encodeURIComponent(appointment.cancellation_token)}`;
    const delivered = await sendAppointmentNotice("reminder", {
      reference: appointment.reference,
      serviceName: appointment.service_name,
      date: appointment.appointment_date,
      time: appointment.appointment_time,
      name: appointment.client_name,
      email: appointment.client_email,
      phone: appointment.client_phone,
      manageUrl,
    });
    if (delivered) {
      await env.DB.prepare("UPDATE appointments SET reminder_sent_at = CURRENT_TIMESTAMP WHERE reference = ?")
        .bind(appointment.reference).run();
      sent += 1;
    }
  }
  return Response.json({ checked: result.results.length, sent });
}
