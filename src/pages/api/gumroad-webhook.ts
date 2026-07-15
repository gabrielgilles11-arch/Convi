import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";
import { allowRequest, clientIp } from "../../lib/ratelimit";

export const prerender = false;

const GUMROAD_SELLER_ID = "ReJOHaqlJJ5J-KOXu318Tw==";

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!(await allowRequest(`gumroad-webhook:${clientIp(request, clientAddress)}`))) {
    return new Response("Too many requests", { status: 429 });
  }

  const secret = url.searchParams.get("secret");
  if (!secret || secret !== import.meta.env.GUMROAD_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.text();
  const params = new URLSearchParams(body);
  const email = params.get("email");
  const sellerId = params.get("seller_id");
  const refunded = params.get("refunded") === "true" || params.get("disputed") === "true";

  // The secret already authenticates this as a genuine ping from our configured
  // Gumroad account. Guard against stray pings by checking seller_id when present.
  if (!email || (sellerId && sellerId !== GUMROAD_SELLER_ID)) {
    return new Response("Ignored", { status: 200 });
  }

  const redis = new Redis({
    url: import.meta.env.KV_REST_API_URL,
    token: import.meta.env.KV_REST_API_TOKEN,
  });

  const key = `purchaser:${email.trim().toLowerCase()}`;
  if (refunded) {
    await redis.del(key);
  } else {
    await redis.set(key, "true");
  }

  return new Response("OK", { status: 200 });
};
