/**
 * Simple in-Worker rate limiter, per-IP sliding window.
 *
 * Why in-memory: Workers isolates are reused, and a single isolate
 * handles many requests. A `Map<ip, ringBuffer>` keeps things cheap.
 * State is NOT shared across isolates, but for our scale (one user
 * recording one video at a time) this is plenty.
 *
 * The trade-off: a determined attacker with many requests could
 * distribute across isolates and bypass the limit. For real abuse
 * mitigation, use Cloudflare's WAF Rate Limiting Rules in the
 * dashboard. This is a best-effort in-Worker soft cap.
 */

interface RateLimitOpts {
  windowMs: number;   // window length in ms
  max: number;        // max requests per window per IP
}

interface Bucket {
  // ring buffer of timestamps within the current window
  ts: number[];
}

const buckets = new Map<string, Bucket>();

/**
 * Check (and record) a hit for the given IP. Returns true if the
 * request is allowed, false if the limit is exceeded.
 */
export function rateLimit(ip: string, opts: RateLimitOpts): boolean {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { ts: [] };
    buckets.set(ip, bucket);
  }
  // Drop expired entries
  bucket.ts = bucket.ts.filter((t) => now - t < opts.windowMs);
  if (bucket.ts.length >= opts.max) {
    return false;
  }
  bucket.ts.push(now);
  return true;
}

/**
 * Get the client IP from a Request. Trust CF-Connecting-IP (Cloudflare
 * sets this; if your Worker is fronted by something else, configure
 * that header accordingly).
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

/**
 * Periodic cleanup of stale buckets so the Map doesn't grow unbounded
 * across long-lived isolates. Called from a setInterval set up on the
 * first request (Workers isolate is alive for the lifetime of the isolate
 * instance, which is fine).
 */
let cleanupScheduled = false;
export function scheduleRateLimitCleanup(): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  // Best-effort — Workers don't guarantee setInterval runs, but it's fine
  // if it doesn't (the buckets self-trim on each request).
  setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [ip, bucket] of buckets.entries()) {
      bucket.ts = bucket.ts.filter((t) => t > cutoff);
      if (bucket.ts.length === 0) buckets.delete(ip);
    }
  }, 5 * 60 * 1000);
}
