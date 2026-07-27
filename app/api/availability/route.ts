import { env } from "cloudflare:workers";
import { isDateKey } from "../../../lib/availability";

export const runtime = "edge";

export async function GET(request: Request) {
  if (!env.DB) return Response.json({ closedDates: [] });
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!isDateKey(from) || !isDateKey(to) || from > to) {
    return Response.json({ error: "Choose a valid date range." }, { status: 400 });
  }
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS availability_blocks (
    id TEXT PRIMARY KEY,
    block_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  const result = await env.DB.prepare(
    `SELECT DISTINCT block_date FROM availability_blocks
     WHERE block_date BETWEEN ? AND ? AND start_time = '09:00' AND end_time = '17:00'`,
  ).bind(from, to).all<{ block_date: string }>();
  return Response.json({ closedDates: result.results.map((row) => row.block_date) });
}
