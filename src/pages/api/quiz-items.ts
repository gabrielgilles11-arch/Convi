import type { APIRoute } from "astro";
import { ENT_COOKIE, verifyEntitlement } from "../../lib/entitlement";
import { buildQuizItems, getCategoryList } from "../../lib/quizItems";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "../../lib/content";

export const prerender = false;

const KNOWN_LOCALES = new Set(LOCALES.map((l) => l.locale));

// The only way to obtain quiz data. Practice content used to be bundled into
// the PracticeGate client island, which meant the whole content file — premium
// categories included — was downloadable by anyone who opened devtools. The
// data now lives behind this check and never reaches an unentitled browser.
export const GET: APIRoute = async ({ cookies, url }) => {
  const ent = verifyEntitlement(cookies.get(ENT_COOKIE)?.value);

  if (!ent) {
    return new Response(JSON.stringify({ error: "not_entitled" }), {
      status: 403,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // One purchase unlocks every language, so the locale only selects which deck
  // to build — it is never an authorisation decision. Unknown values fall back
  // rather than erroring.
  const requested = url.searchParams.get("locale") as Locale | null;
  const locale = requested && KNOWN_LOCALES.has(requested) ? requested : DEFAULT_LOCALE;

  return new Response(
    JSON.stringify({ items: buildQuizItems(locale), categories: getCategoryList(locale) }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Never let a shared cache hold paid content.
        "Cache-Control": "private, no-store",
      },
    },
  );
};
