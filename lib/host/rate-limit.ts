// SERVER-ONLY. Tiny fixed-window in-memory rate limiter. Process-local (resets
// on restart) — enough to blunt a runaway client or a leaked-cookie flood on the
// privileged endpoints. The login route keeps its own specialised limiter; this
// one guards /exec/run and friends.
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 4096;

// Returns true when `key` has exceeded `max` hits inside `windowMs` (caller
// should then reject with 429). Counts this call as a hit when allowed.
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (b.count >= max) return true;
  b.count += 1;
  return false;
}
