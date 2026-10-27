import type { APIRoute } from "astro";
import { ENT_COOKIE, verifyEntitlement } from "../../lib/entitlement";
import { PAYWALL_ENABLED } from "../../lib/paywall";
import { buildGame } from "../../lib/gameScenes";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "../../lib/content";

export const prerender = false;

const KNOWN_LOCALES = new Set(LOCALES.map((l) => l.locale));

/**
 * Game Mode's scenes, resolved from the scripts against the content and gated
 * exactly as /api/conversations is.
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  const ent = verifyEntitlement(cookies.get(ENT_COOKIE)?.value);

  if (PAYWALL_ENABLED && !ent) {
    return new Response(JSON.stringify({ error: "not_entitled" }), {
      status: 403,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // The locale picks a deck and is never an authorisation decision, so an
  // unknown value falls back rather than erroring.
  const requested = url.searchParams.get("locale") as Locale | null;
  const locale = requested && KNOWN_LOCALES.has(requested) ? requested : DEFAULT_LOCALE;

  return new Response(JSON.stringify(buildGame(locale)), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Never let a shared cache hold paid content.
      "Cache-Control": "private, no-store",
    },
  });
};
