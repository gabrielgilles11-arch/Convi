import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";

export const prerender = false;

const GUMROAD_PRODUCT_ID = "ZGWReIV6wROcohJeSiJF7A==";

export const POST: APIRoute = async ({ request, url }) => {
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== import.meta.env.GUMROAD_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.text();
  const params = new URLSearchParams(body);
  const email = params.get("email");
  const productId = params.get("product_id");
  const refunded = params.get("refunded") === "true" || params.get("disputed") === "true";

  if (!email || productId !== GUMROAD_PRODUCT_ID) {
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
