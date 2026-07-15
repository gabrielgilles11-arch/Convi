import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = import.meta.env.KV_REST_API_URL;
const token = import.meta.env.KV_REST_API_TOKEN;

// Only enable rate limiting once the Redis store is configured. Until then the
// helper fails open so the endpoints keep working during setup.
const ratelimit =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
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
  const { success } = await ratelimit.limit(identifier);
  return success;
}
