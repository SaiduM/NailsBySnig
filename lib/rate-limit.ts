import { env } from "cloudflare:workers";

function requestAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function identifier(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  if (!env.DB) return { allowed: true, retryAfter: 0 };
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const key = await identifier(requestAddress(request));
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS request_limits (
    scope TEXT NOT NULL,
    identifier TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (scope, identifier, window_start)
  )`).run();
  const result = await env.DB.prepare(`INSERT INTO request_limits (
    scope, identifier, window_start, request_count
  ) VALUES (?, ?, ?, 1)
  ON CONFLICT(scope, identifier, window_start)
  DO UPDATE SET request_count = request_count + 1
  RETURNING request_count`)
    .bind(scope, key, windowStart)
    .first<{ request_count: number }>();
  if (Math.random() < 0.02) {
    await env.DB.prepare("DELETE FROM request_limits WHERE window_start < ?")
      .bind(windowStart - windowSeconds * 8)
      .run();
  }
  return {
    allowed: (result?.request_count ?? 1) <= limit,
    retryAfter: Math.max(1, windowStart + windowSeconds - now),
  };
}
