import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "./kv";

// Only enable rate limiting once the Redis store is configured. Until then the
// helper fails open so the endpoints keep working during setup.
/**
 * One limiter per rate, built on first use.
 *
 * Forms want a tight limit; the usage beacon wants a loose one, because a
 * visitor reading four pages quickly is a visitor, not an attack.
 */
const limiters = new Map<number, Ratelimit>();

function limiterFor(perTenSeconds: number): Ratelimit | null {
  if (!kv) return null;
  let limiter = limiters.get(perTenSeconds);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(perTenSeconds, "10 s"),
      prefix: "convi:rl",
    });
    limiters.set(perTenSeconds, limiter);
  }
  return limiter;
}

export function clientIp(request: Request, clientAddress?: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return clientAddress ?? forwarded?.split(",")[0]?.trim() ?? "unknown";
}

export async function allowRequest(
  identifier: string,
  perTenSeconds = 5
): Promise<boolean> {
  const ratelimit = limiterFor(perTenSeconds);
  if (!ratelimit) return true;
  try {
    const { success } = await ratelimit.limit(identifier);
    return success;
  } catch {
    // The store is unreachable or out of quota. Fail open, the same as when it
    // is not configured at all: an outage at Upstash should not take signups
    // and purchase checks down with it. Left uncaught this threw a 500 from
    // every endpoint that asks.
    return true;
  }
}
