import type { APIRoute } from "astro";
import {
  LOCALES,
  countCategoryItems,
  getCategories,
  getLocaleInfo,
  localePath,
  quickAnswer,
  searchTitle,
  type Category,
  type Locale,
} from "../lib/content";

// Built, not served from a request: it is the same file for everybody and it
// changes only when the content does.
export const prerender = true;

const SITE = "https://tryconvi.com";

/**
 * /llms.txt, generated from the content files.
 *
 * It used to be a hand-written file in public/, and by the time anybody
 * checked it was listing 28 of the 44 categories — every section added to the
 * Swedish and German editions after it was written was simply missing. A map
 * of the site that is maintained by hand is a map that goes out of date
 * silently, and the whole value of this file to an answer engine is that it is
 * a complete and current index.
 *
 * Each entry carries the page's own search title and its quick answer — the
 * single most useful line in that category. That is deliberate: a bare list of
 * links tells a model what pages exist, and a list with a real phrase on each
 * row tells it what is on them, in the language, ready to quote.
 */
function line(category: Category, locale: Locale): string {
  const url = `${SITE}${localePath(locale, `/scenarios/${category.id}`)}`;
  const answer = quickAnswer(category);
  const count = countCategoryItems(category);
  const sample = answer?.es ? `${answer.es} — ` : "";
  return `- [${searchTitle(category, locale)}](${url}): ${sample}${count} lines, with what they say back.`;
}

function section(locale: Locale): string {
  const { language, region, flag } = getLocaleInfo(locale);
  const rows = getCategories(locale).map((c) => line(c, locale));

  return [
    `## ${language} — ${region} ${flag}`,
    "",
    `- [All ${language} scenarios](${SITE}${localePath(locale, "/scenarios")}): every ${language} category in one list.`,
    ...rows,
    `- [Practise ${language}](${SITE}${localePath(locale, "/practice")}): free drills and Talk Mode over the same material.`,
  ].join("\n");
}

export const GET: APIRoute = () => {
  const total = LOCALES.reduce((n, l) => n + getCategories(l.locale).length, 0);

  const body = [
    "# Try Convi",
    "",
    "> Real conversational Spanish, Swedish and German — the phrases people",
    "> actually say in Spain, Sweden and Germany, with what they will say back.",
    "> Every page is free to read, with no account and no paywall.",
    "",
    `${total} scenario categories across three independent editions. Each scenario`,
    "page opens with a short answer — the single most useful line for that",
    "situation — followed by the full exchanges: what they ask, what you say, and",
    "their likely reply. Practice drills the same material, and Talk Mode holds a",
    "whole conversation in the target language.",
    "",
    ...LOCALES.map((l) => `${section(l.locale)}\n`),
    "## Notes",
    "",
    "- Content is human-written per country, not machine-translated between",
    "  editions. A Swedish line is not a translation of the Spanish one.",
    "- Spanish is Spain Spanish (vosotros, caña, vale), not Latin American.",
    "- Swedish is Stockholm-weighted; German covers Germany-wide plus separate",
    "  Bavarian and Berlin sets, because those are the two places a visitor will",
    "  hear something a textbook did not teach them.",
    "- Regional and register warnings are attached to individual lines, not to",
    "  pages: a line marked Català or Bairisch is not the national language.",
    "- No account, no card, no trial. There is nothing to sign up for.",
    "",
    `Sitemap: ${SITE}/sitemap-index.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
