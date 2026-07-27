import { env } from "cloudflare:workers";

export const runtime = "edge";

const services = new Map([
  ["signature-gel", { name: "Signature Gel Manicure", duration: 60, price: 55 }],
  ["structured-gel", { name: "Structured Gel Manicure", duration: 75, price: 70 }],
  ["gel-x", { name: "Gel-X Full Set", duration: 90, price: 85 }],
  ["custom-art", { name: "Custom Nail Art", duration: 30, price: 25 }],
]);
const allowedTimes = new Set(["09:00", "11:00", "13:30", "16:00"]);

function clean(value: unknown, limit = 200) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const serviceId = clean(body.serviceId, 40);
    const service = services.get(serviceId);
    const date = clean(body.date, 10);
    const time = clean(body.time, 5);
    const name = clean(body.name, 100);
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 30);
    const notes = clean(body.notes, 800);

    if (!service || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !allowedTimes.has(time)) {
      return Response.json({ error: "Please choose a valid service, day, and time." }, { status: 400 });
    }
    const appointmentDate = new Date(`${date}T12:00:00`);
    if (appointmentDate.getDay() < 2 || appointmentDate.getDay() > 6) {
      return Response.json({ error: "Appointments are available Tuesday through Saturday." }, { status: 400 });
    }
    if (name.length < 2 || !email.includes("@") || phone.replace(/\D/g, "").length < 7) {
      return Response.json({ error: "Please enter a valid name, email, and phone number." }, { status: 400 });
    }
    if (!env.DB) {
      return Response.json({ error: "Booking storage is not connected yet. Please contact the studio." }, { status: 503 });
    }

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
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(appointment_date, appointment_time)
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS appointments_status_date_idx ON appointments(status, appointment_date)"),
    ]);

    const reference = `NBS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await env.DB.prepare(`INSERT INTO appointments (
      reference, service_id, service_name, duration_minutes, price_dollars,
      appointment_date, appointment_time, client_name, client_email, client_phone, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(reference, serviceId, service.name, service.duration, service.price, date, time, name, email, phone, notes)
      .run();

    return Response.json({ reference }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "That time was just taken. Please choose another time." }, { status: 409 });
    }
    return Response.json({ error: "We couldn’t save the appointment. Please try again." }, { status: 500 });
  }
}
