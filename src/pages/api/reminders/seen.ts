import type { APIRoute } from "astro";
import { allowRequest, clientIp } from "../../../lib/ratelimit";
import { heartbeat, validId } from "../../../lib/reminders";

export const prerender = false;

/**
 * "They are here."
 *
 * The one thing that resets the nudge ladder, and therefore the whole of how the
 * site knows somebody has stopped using it. Sent from the layout on any page,
 * at most once per local day per browser, and carrying only the reminder id.
 *
 * A beat for an id with no record answers 200 and does nothing. That is the
 * ordinary case for anyone who has unsubscribed, and a 404 would only tell a
 * stranger whether an id they guessed exists.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Loose, like the view beacon: a household behind one address is not an
  // attack, and the write is idempotent anyway.
  if (!(await allowRequest(`rem-seen:${clientIp(request, clientAddress)}`, 20))) {
    return new Response(null, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }

  const { id, locale, streak } = body;
  if (!validId(id)) return new Response(null, { status: 400 });

  await heartbeat(id, {
    locale,
    ...(typeof streak === "number" && Number.isFinite(streak)
      ? { streak: Math.max(0, Math.trunc(streak)) }
      : {}),
  });

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
};
