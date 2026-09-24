const WINDOW_SECONDS = 60;
const CLEANUP_AGE_SECONDS = 120;
const CLEANUP_BATCH_SIZE = 100;
const CLEANUP_PROBABILITY = 0.01;

export async function checkRateLimit(request, env, { bucket, limit }) {
  if (!env?.DB || typeof bucket !== "string" || !bucket || !Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Rate limiter unavailable");
  }

  const requestIp = request.headers.get("CF-Connecting-IP")?.trim();
  const ip = requestIp && requestIp.length <= 64 ? requestIp : "unknown";
  const bucketKey = `${bucket}:${ip}`;
  const now = Math.floor(Date.now() / 1000);

  const row = await env.DB.prepare(
    `INSERT INTO auth_rate_limits (bucket_key, window_start, request_count, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(bucket_key) DO UPDATE SET
       window_start = CASE
         WHEN auth_rate_limits.window_start + ? <= excluded.window_start THEN excluded.window_start
         ELSE auth_rate_limits.window_start
       END,
       request_count = CASE
         WHEN auth_rate_limits.window_start + ? <= excluded.window_start THEN 1
         ELSE MIN(auth_rate_limits.request_count + 1, ?)
       END,
       updated_at = excluded.updated_at
     RETURNING window_start, request_count`,
  ).bind(bucketKey, now, now, WINDOW_SECONDS, WINDOW_SECONDS, limit + 1).first();

  if (!row || !Number.isSafeInteger(row.window_start) || !Number.isSafeInteger(row.request_count)) {
    throw new Error("Rate limiter returned an invalid counter");
  }

  if (Math.random() < CLEANUP_PROBABILITY) {
    try {
      await env.DB.prepare(
        `DELETE FROM auth_rate_limits
         WHERE bucket_key IN (
           SELECT bucket_key FROM auth_rate_limits
           WHERE updated_at <= ?
           ORDER BY updated_at
           LIMIT ?
         )`,
      ).bind(now - CLEANUP_AGE_SECONDS, CLEANUP_BATCH_SIZE).run();
    } catch {
      // Cleanup is best-effort; the active request counter has already been updated.
    }
  }

  return {
    allowed: row.request_count <= limit,
    retryAfterSeconds: Math.max(1, row.window_start + WINDOW_SECONDS - now),
  };
}
