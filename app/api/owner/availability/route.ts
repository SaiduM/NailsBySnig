import { env } from "cloudflare:workers";
import { blockedSlots, isDateKey } from "../../../../lib/availability";
import { ownerAccess } from "../../../../lib/owner-auth";

export const runtime = "edge";

async function ensureAvailabilityTables() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS availability_blocks (
      id TEXT PRIMARY KEY,
      block_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS availability_blocks_date_idx ON availability_blocks(block_date)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS appointment_slots (
      appointment_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      appointment_reference TEXT NOT NULL,
      PRIMARY KEY (appointment_date, slot_time)
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS appointment_slots_reference_idx ON appointment_slots(appointment_reference)"),
  ]);
}

export async function GET(request: Request) {
  const access = await ownerAccess(request);
  if (!access.allowed) return Response.json({ error: access.error }, { status: access.status });
  if (!env.DB) return Response.json({ error: "Booking storage is unavailable." }, { status: 503 });
  await ensureAvailabilityTables();
  const result = await env.DB.prepare(
    `SELECT id, block_date, start_time, end_time, label
     FROM availability_blocks ORDER BY block_date ASC, start_time ASC`,
  ).all();
  return Response.json({ blocks: result.results });
}

export async function POST(request: Request) {
  const access = await ownerAccess(request);
  if (!access.allowed) return Response.json({ error: access.error }, { status: access.status });
  if (!env.DB) return Response.json({ error: "Booking storage is unavailable." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as {
    date?: string;
    startTime?: string;
    endTime?: string;
    label?: string;
  };
  const date = body.date?.trim() ?? "";
  const startTime = body.startTime?.trim() ?? "";
  const endTime = body.endTime?.trim() ?? "";
  const label = body.label?.trim().slice(0, 120) ?? "";
  const slots = blockedSlots(startTime, endTime);
  if (!isDateKey(date) || !slots.length) {
    return Response.json({ error: "Choose a valid date and time range between 9:00 AM and 5:00 PM." }, { status: 400 });
  }
  await ensureAvailabilityTables();
  const id = crypto.randomUUID();
  const reference = `BLOCK:${id}`;
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO availability_blocks (id, block_date, start_time, end_time, label) VALUES (?, ?, ?, ?, ?)",
      ).bind(id, date, startTime, endTime, label),
      ...slots.map((slot) =>
        env.DB.prepare(
          "INSERT INTO appointment_slots (appointment_date, slot_time, appointment_reference) VALUES (?, ?, ?)",
        ).bind(date, slot, reference),
      ),
    ]);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "That time overlaps an appointment or another blocked period." }, { status: 409 });
    }
    return Response.json({ error: "That blocked time could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await ownerAccess(request);
  if (!access.allowed) return Response.json({ error: access.error }, { status: access.status });
  if (!env.DB) return Response.json({ error: "Booking storage is unavailable." }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return Response.json({ error: "Choose a blocked period." }, { status: 400 });
  await ensureAvailabilityTables();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM appointment_slots WHERE appointment_reference = ?").bind(`BLOCK:${id}`),
    env.DB.prepare("DELETE FROM availability_blocks WHERE id = ?").bind(id),
  ]);
  return Response.json({ id });
}
