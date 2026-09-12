import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";
import { allowRequest, clientIp } from "../../lib/ratelimit";

export const prerender = false;

/**
 * The seller the ping must be for.
 *
 * Not a credential — Gumroad puts this id in its own public embeds, and the
 * request is authenticated by the shared secret in the URL above. It is
 * configured rather than committed because it names a real account, and a
 * public repository is no place to keep that.
 *
 * Unset means no ping can be verified, so none is accepted. That is the right
 * way round: this endpoint grants access, and it should refuse rather than
 * guess when it has not been told whose account to trust.
 */
const GUMROAD_SELLER_ID = import.meta.env.GUMROAD_SELLER_ID;

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

  // The secret already authenticates this as a genuine ping from our own
  // Gumroad account; the seller id is the second check on top of it.
  //
  // Both sides must be present and agree. Accepting a ping that carries no
  // seller id, or checking it against an id we were never given, would make
  // this endpoint grant access on the strength of a URL parameter alone — and
  // what it grants is a paid entitlement.
  if (!email || !GUMROAD_SELLER_ID || sellerId !== GUMROAD_SELLER_ID) {
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
