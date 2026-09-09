import type { APIRoute } from "astro";
import { ENT_COOKIE, verifyEntitlement } from "../../lib/entitlement";
import { PAYWALL_ENABLED } from "../../lib/paywall";

export const prerender = false;

// Lightweight status check for client islands: reads the signed, httpOnly
// entitlement cookie server-side (JS can't) and reports whether it's valid.
export const GET: APIRoute = async ({ cookies }) => {
  // With the paywall off everyone is entitled, so the scenario grid stops
  // hiding cards and the practice gate steps out of the way. The cookie is
  // still read and still valid — it just isn't what decides any more.
  const ent = verifyEntitlement(cookies.get(ENT_COOKIE)?.value);
  return new Response(JSON.stringify({ entitled: !PAYWALL_ENABLED || !!ent }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
