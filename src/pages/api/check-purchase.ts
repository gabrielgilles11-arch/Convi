import type { APIRoute } from "astro";
import { kv } from "../../lib/kv";
import { allowRequest, clientIp } from "../../lib/ratelimit";
import {
  COOKIE_OPTS,
  DEV_COOKIE,
  ENT_COOKIE,
  isConfigured,
  newDeviceId,
  signEntitlement,
} from "../../lib/entitlement";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// How many distinct devices a single purchase email may activate.
const DEVICE_LIMIT = 2;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const POST: APIRoute = async ({ request, clientAddress, cookies }) => {
  if (!(await allowRequest(`check-purchase:${clientIp(request, clientAddress)}`))) {
    return json({ error: "Too many requests" }, 429);
  }

  let email: unknown;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return json({ error: "Invalid email" }, 400);
  }

  // Not fully configured (e.g. local dev without store/secret): treat as not
  // unlocked instead of throwing.
  if (!kv || !isConfigured()) {
    return json({ unlocked: false });
  }

  const redis = kv;
  const normalized = email.trim().toLowerCase();

  const purchased = await redis.get(`purchaser:${normalized}`);
  if (!(purchased === true || purchased === "true")) {
    return json({ unlocked: false });
  }

  // Enforce a per-email device cap to discourage account sharing. Each device
  // gets a stable id (httpOnly cookie) recorded in a Redis set for the email.
  const setKey = `unlocks:${normalized}`;
  let deviceId = cookies.get(DEV_COOKIE)?.value;
  const knownDevice = deviceId ? await redis.sismember(setKey, deviceId) : 0;

  if (!knownDevice) {
    const activeDevices = await redis.scard(setKey);
    if (activeDevices >= DEVICE_LIMIT) {
      return json({ unlocked: false, reason: "device_limit" });
    }
    if (!deviceId) deviceId = newDeviceId();
    await redis.sadd(setKey, deviceId);
  }

  cookies.set(DEV_COOKIE, deviceId as string, COOKIE_OPTS);
  cookies.set(ENT_COOKIE, signEntitlement(normalized, deviceId as string), COOKIE_OPTS);

  return json({ unlocked: true });
};
