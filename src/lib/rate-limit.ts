// NOTE: In-memory only — resets between Vercel serverless invocations.
// Provides basic protection during dev and burst protection in production.
// For persistent rate limiting, migrate to Upstash Redis or Vercel KV.
const requests = new Map<string, number[]>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requests.get(ip) || [];

  // Remove old timestamps
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    requests.set(ip, recent);
    return true;
  }

  recent.push(now);
  requests.set(ip, recent);
  return false;
}
