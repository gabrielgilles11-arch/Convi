import type { APIRoute } from "astro";
import { allowRequest, clientIp } from "../../../lib/ratelimit";
import {
  remindersConfigured,
  subscribe,
  validId,
  validPushEndpoint,
} from "../../../lib/reminders";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Opting in to reminders, by push, by email, or both.
 *
 * The id comes from the browser and is treated as a capability rather than a
 * name: it is the only thing an unsubscribe link carries, so it is rate-limited
 * like a form and never echoed back.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!(await allowRequest(`rem-sub:${clientIp(request, clientAddress)}`))) {
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
  }

  if (!remindersConfigured()) {
    // Nowhere to put it. Said plainly rather than answering 200 and dropping it.
    return new Response(JSON.stringify({ error: "unavailable" }), { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  const { id, push, email, locale, streak } = body;
  if (!validId(id)) {
    return new Response(JSON.stringify({ error: "Invalid id" }), { status: 400 });
  }

  const endpoint = push === undefined || push === null ? null : validPushEndpoint(push);
  if (push && !endpoint) {
    return new Response(JSON.stringify({ error: "Invalid subscription" }), { status: 400 });
  }

  let address: string | null = null;
  if (email !== undefined && email !== null) {
    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400 });
    }
    address = email.toLowerCase();
  }

  if (!endpoint && !address) {
    return new Response(JSON.stringify({ error: "Nothing to subscribe" }), { status: 400 });
  }

  const ok = await subscribe(id, {
    ...(endpoint ? { push: endpoint } : {}),
    ...(address ? { email: address } : {}),
    locale,
    streak: typeof streak === "number" && Number.isFinite(streak) ? Math.max(0, Math.trunc(streak)) : 0,
  });

  return new Response(JSON.stringify(ok ? { success: true } : { error: "Couldn't save" }), {
    status: ok ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
