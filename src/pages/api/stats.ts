import type { APIRoute } from "astro";
import { allowRequest, clientIp } from "../../lib/ratelimit";
import { parseEvent, readStats, record } from "../../lib/stats";

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Records one anonymous usage event — see ../../lib/stats.
 *
 * The address is read here rather than sent: it is needed to recognise a
 * returning visitor and to place them in a country, and neither is a thing a
 * beacon should be trusted to claim about itself. It is hashed before anything
 * is written and never stored — see ../../lib/visitor.
 *
 * Always answers 204, whatever happened. The caller is a fire-and-forget beacon
 * sent while a learner is reading their score; there is nothing it could
 * usefully do with a failure, and a body would only be something for the
 * browser to hold on to.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const nothing = new Response(null, { status: 204 });
  const ip = clientIp(request, clientAddress);

  // Its own bucket, so a flood of beacons from one address cannot crowd out
  // that address's signup, and so ordinary fast browsing is not mistaken for
  // one: every page sends a view, and people open pages in bursts.
  if (!(await allowRequest(`stats:${ip}`, 60))) return nothing;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return nothing;
  }

  const event = parseEvent(body);
  // record() swallows its own store failures; this is for anything else that
  // could go wrong on a path whose whole job is to be invisible.
  if (event) await record(event, request, ip).catch(() => {});
  return nothing;
};

/**
 * Reads the counters back.
 *
 * Behind a token because these are business numbers, not public ones. With no
 * token configured the endpoint does not exist at all — an unset secret must
 * never be the same thing as an open door.
 */
export const GET: APIRoute = async ({ request }) => {
  const expected = import.meta.env.STATS_TOKEN;
  if (!expected) return json({ error: "Not found" }, 404);

  const url = new URL(request.url);
  const given =
    url.searchParams.get("token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (given !== expected) return json({ error: "Not found" }, 404);

  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 90);
  return json(await readStats(days));
};
