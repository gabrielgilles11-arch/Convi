import type { APIRoute } from "astro";
import { ENT_COOKIE, verifyEntitlement } from "../../lib/entitlement";
import { PAYWALL_ENABLED } from "../../lib/paywall";
import { buildConversations } from "../../lib/conversations";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "../../lib/content";

export const prerender = false;

const KNOWN_LOCALES = new Set(LOCALES.map((l) => l.locale));

/**
 * The conversation decks, gated exactly as /api/quiz-items is.
 *
 * Its own route rather than another field on the quiz payload: a conversation
 * carries every line of an exchange — both sides, the comeback and the note —
 * where the quiz deck keeps only the one line you produce. Bundling them would
 * put the whole of Talk in front of every practice session that never opens it.
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  const ent = verifyEntitlement(cookies.get(ENT_COOKIE)?.value);

  if (PAYWALL_ENABLED && !ent) {
    return new Response(JSON.stringify({ error: "not_entitled" }), {
      status: 403,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // As in /api/quiz-items: the locale picks a deck and is never an
  // authorisation decision, so an unknown value falls back rather than erroring.
  const requested = url.searchParams.get("locale") as Locale | null;
  const locale = requested && KNOWN_LOCALES.has(requested) ? requested : DEFAULT_LOCALE;

  return new Response(JSON.stringify({ conversations: buildConversations(locale) }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Never let a shared cache hold paid content.
      "Cache-Control": "private, no-store",
    },
  });
};
