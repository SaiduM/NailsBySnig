import { env } from "cloudflare:workers";
import { candidateTimes, filterAvailableTimes, occupiedSlots } from "../../../lib/booking-rules";
import { sendAppointmentNotice } from "../../../lib/notifications";

export const runtime = "edge";

const services = new Map([
  ["signature-gel", { name: "Signature Gel Manicure", duration: 60, price: 55 }],
  ["structured-gel", { name: "Structured Gel Manicure", duration: 75, price: 70 }],
  ["gel-x", { name: "Gel-X Full Set", duration: 90, price: 85 }],
  ["custom-art", { name: "Custom Nail Art", duration: 30, price: 25 }],
]);
type Service = { name: string; duration: number; price: number };

function clean(value: unknown, limit = 200) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function isValidEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return !value || value.replace(/\D/g, "").length >= 10;
}

function selectedServiceBundle(values: unknown) {
  const rawIds = Array.isArray(values) ? values : [];
  const ids = [...new Set(rawIds.map((value) => clean(value, 40)).filter(Boolean))];
  if (!ids.length || ids.length > services.size) return null;
  const selected = ids.map((id) => services.get(id)).filter((service): service is Service => Boolean(service));
  if (selected.length !== ids.length) return null;
  return {
    ids,
    selected,
    duration: selected.reduce((total, service) => total + service.duration, 0),
    price: selected.reduce((total, service) => total + service.price, 0),
    name: selected.map((service) => service.name).join(" + "),
  };
}

function phoenixDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function validateBookingDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Please choose a valid appointment date.";
  const today = phoenixDateKey();
  if (date <= today || date > addMonths(today, 2)) return "Appointments can be booked for the next two months.";
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (day < 2 || day > 6) return "Appointments are available Tuesday through Saturday.";
  return null;
}

async function ensureTables() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price_dollars INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed',
      cancellation_token TEXT,
      reminder_sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(appointment_date, appointment_time)
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS appointments_status_date_idx ON appointments(status, appointment_date)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS appointment_slots (
      appointment_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      appointment_reference TEXT NOT NULL,
      PRIMARY KEY (appointment_date, slot_time)
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS appointment_slots_reference_idx ON appointment_slots(appointment_reference)"),
    env.DB.prepare("UPDATE appointments SET status = 'confirmed' WHERE status = 'pending'"),
    env.DB.prepare(`WITH RECURSIVE existing_slots(
      appointment_date, appointment_reference, slot_minutes, end_minutes
    ) AS (
      SELECT
        appointment_date,
        reference,
        CAST(substr(appointment_time, 1, 2) AS INTEGER) * 60 +
          CAST(substr(appointment_time, 4, 2) AS INTEGER),
        CAST(substr(appointment_time, 1, 2) AS INTEGER) * 60 +
          CAST(substr(appointment_time, 4, 2) AS INTEGER) + duration_minutes + 15
      FROM appointments
      WHERE status != 'cancelled'
      UNION ALL
      SELECT appointment_date, appointment_reference, slot_minutes + 15, end_minutes
      FROM existing_slots
      WHERE slot_minutes + 15 < end_minutes
    )
    INSERT OR IGNORE INTO appointment_slots (
      appointment_date, slot_time, appointment_reference
    )
    SELECT
      appointment_date,
      printf('%02d:%02d', CAST(slot_minutes / 60 AS INTEGER), slot_minutes % 60),
      appointment_reference
    FROM existing_slots`),
  ]);
  const columns = await env.DB.prepare("PRAGMA table_info(appointments)").all<{ name: string }>();
  const names = new Set(columns.results.map((column) => column.name));
  if (!names.has("cancellation_token")) {
    await env.DB.prepare("ALTER TABLE appointments ADD COLUMN cancellation_token TEXT").run();
  }
  if (!names.has("reminder_sent_at")) {
    await env.DB.prepare("ALTER TABLE appointments ADD COLUMN reminder_sent_at TEXT").run();
  }
  await env.DB.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS appointments_cancellation_token_idx ON appointments(cancellation_token)",
  ).run();
}

export async function GET(request: Request) {
  if (!env.DB) {
    return Response.json({ error: "Booking storage is not connected yet." }, { status: 503 });
  }
  const url = new URL(request.url);
  const date = clean(url.searchParams.get("date"), 10);
  const bundle = selectedServiceBundle(url.searchParams.getAll("serviceId"));
  const dateError = validateBookingDate(date);
  if (!bundle || dateError) {
    return Response.json({ error: dateError || "Please choose at least one valid service." }, { status: 400 });
  }

  await ensureTables();
  const result = await env.DB.prepare("SELECT slot_time FROM appointment_slots WHERE appointment_date = ?")
    .bind(date)
    .all<{ slot_time: string }>();
  const availableTimes = filterAvailableTimes(
    bundle.duration,
    result.results.map((row) => row.slot_time),
  );
  return Response.json({ availableTimes });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const bundle = selectedServiceBundle(body.serviceIds);
    const date = clean(body.date, 10);
    const time = clean(body.time, 5);
    const name = clean(body.name, 100);
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 30);
    const notes = clean(body.notes, 800);

    const dateError = validateBookingDate(date);
    if (!bundle || dateError || !candidateTimes(bundle.duration).includes(time)) {
      return Response.json({ error: "Please choose valid services, day, and time." }, { status: 400 });
    }
    if (name.length < 2 || (!email && !phone) || !isValidEmail(email) || !isValidPhone(phone)) {
      return Response.json({ error: "Please enter your name and a valid email or phone number." }, { status: 400 });
    }
    if (!env.DB) {
      return Response.json({ error: "Booking storage is not connected yet. Please contact the studio." }, { status: 503 });
    }

    await ensureTables();

    const reference = `NBS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const cancellationToken = crypto.randomUUID();
    const bookingStatements = [
      env.DB.prepare(`INSERT INTO appointments (
        reference, service_id, service_name, duration_minutes, price_dollars,
        appointment_date, appointment_time, client_name, client_email, client_phone, notes,
        cancellation_token, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`)
        .bind(reference, bundle.ids.join(","), bundle.name, bundle.duration, bundle.price, date, time, name, email, phone, notes, cancellationToken),
      ...occupiedSlots(time, bundle.duration).map((slot) =>
        env.DB.prepare(
          "INSERT INTO appointment_slots (appointment_date, slot_time, appointment_reference) VALUES (?, ?, ?)",
        ).bind(date, slot, reference),
      ),
    ];
    await env.DB.batch(bookingStatements);

    const origin = new URL(request.url).origin;
    const cancelUrl = `${origin}/cancel?token=${encodeURIComponent(cancellationToken)}`;
    const notificationSent = await sendAppointmentNotice("booked", {
      reference,
      serviceName: bundle.name,
      date,
      time,
      name,
      email,
      phone,
      manageUrl: cancelUrl,
    });
    return Response.json({ reference, cancelUrl, notificationSent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "That appointment overlaps with a time that was just booked. Please choose another slot." }, { status: 409 });
    }
    return Response.json({ error: "We couldn’t save the appointment. Please try again." }, { status: 500 });
  }
}
