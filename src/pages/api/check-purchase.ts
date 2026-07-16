import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";
import { allowRequest, clientIp } from "../../lib/ratelimit";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!(await allowRequest(`check-purchase:${clientIp(request, clientAddress)}`))) {
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
  }

  let email: unknown;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400 });
  }

  const url = import.meta.env.KV_REST_API_URL;
  const token = import.meta.env.KV_REST_API_TOKEN;

  // No store configured (e.g. local dev without creds): treat as not unlocked
  // instead of throwing an Upstash "invalid URL" error.
  if (!url || !token) {
    return new Response(JSON.stringify({ unlocked: false }), { status: 200 });
  }

  const redis = new Redis({ url, token });

  const purchased = await redis.get(`purchaser:${email.trim().toLowerCase()}`);

  return new Response(JSON.stringify({ unlocked: purchased === true || purchased === "true" }), { status: 200 });
};
