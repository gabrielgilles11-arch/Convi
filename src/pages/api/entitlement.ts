import type { APIRoute } from "astro";
import { ENT_COOKIE, verifyEntitlement } from "../../lib/entitlement";

export const prerender = false;

// Lightweight status check for client islands: reads the signed, httpOnly
// entitlement cookie server-side (JS can't) and reports whether it's valid.
export const GET: APIRoute = async ({ cookies }) => {
  const ent = verifyEntitlement(cookies.get(ENT_COOKIE)?.value);
  return new Response(JSON.stringify({ entitled: !!ent }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
