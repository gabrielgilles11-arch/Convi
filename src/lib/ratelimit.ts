import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "./kv";

// Only enable rate limiting once the Redis store is configured. Until then the
// helper fails open so the endpoints keep working during setup.
const ratelimit = kv
  ? new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(5, "10 s"),
      prefix: "convi:rl",
    })
  : null;

export function clientIp(request: Request, clientAddress?: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return clientAddress ?? forwarded?.split(",")[0]?.trim() ?? "unknown";
}

export async function allowRequest(identifier: string): Promise<boolean> {
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
