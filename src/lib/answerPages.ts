import {
  getCategories,
  getLocaleInfo,
  isDialogueSubsection,
  isPremiumCategory,
  LOCALES,
  type Bilingual,
  type Category,
  type DialogueSubsection,
  type Exchange,
  type Locale,
} from "./content";
import { splitNote } from "./quizTypes";
import { DESCRIPTION_MAX, TITLE_MAX } from "./seo";

/**
 * One page per long-tail question: "how to say do you take card in Spanish",
 * "how to answer do you have ID in Swedish".
 *
 * The scenario page targets the situation ("how to order a beer in Spain") and
 * the words page targets the term ("what does caña mean"). These target the
 * single line, which is the shortest and most specific search of the three and
 * the one a traveler types standing at the bar.
 *
 * Nothing here is written in the target language. Every Spanish, Swedish and
 * German line on these pages is read out of content/*.json, which is sourced
 * line by line (see content/SOURCES.md). The English around it is template
 * copy plus the exchange's own `notes` and `situation`.
 *
 * Only exchanges with authored `notes` get a page. The note is what makes the
 * page worth landing on: a line and its translation alone is the thin doorway
 * page search engines are built to ignore, and the scenario page already has
 * that.
 */

export interface AnswerPage {
  locale: Locale;
  /** "spanish", "swedish", "german": the URL segment under /answers. */
  langSlug: string;
  slug: string;
  path: string;
  category: Category;
  subsectionTitle: string | null;
  exchange: Exchange;
  /** "say": the line is yours. "answer": they ask, and the page is your reply. */
  kind: "say" | "answer";
  /** The English the search is built on, cleaned of asides. */
  query: string;
  heading: string;
  title: string;
  description: string;
  /** The line you say, in the target language, with its English. */
  yourLine: Bilingual;
  /** Other ways to say it, when the content has more than one model answer. */
  alternatives: Bilingual[];
  /** The other side of the exchange: what they ask first, or what they say back. */
  theirLine: Bilingual | null;
}

const LANG_SLUG: Record<Locale, string> = {
  "es-ES": "spanish",
  "sv-SE": "swedish",
  "de-DE": "german",
};

export function answerLangSlug(locale: Locale): string {
  return LANG_SLUG[locale];
}

export function localeFromAnswerSlug(slug: string | undefined): Locale | undefined {
  return (Object.keys(LANG_SLUG) as Locale[]).find((l) => LANG_SLUG[l] === slug);
}

/** Lines with a fill-in slot read as broken out of context. Mirrors content.ts. */
function hasSlot(line: string): boolean {
  return /__|\[[^\]]+\]/.test(line);
}

/**
 * The English a person would actually type: the first of "Excuse me! / Hey!",
 * without "(informal du)", without a closing full stop. A question mark stays,
 * because "do you take card?" is how the search reads.
 */
export function cleanQuery(en: string): string {
  const first = en.split(/\s+\/\s+/)[0];
  return splitNote(first)
    .text.replace(/[.!]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Searches cut long queries anyway, and a 70-character line is not a search. */
const QUERY_MAX = 48;

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

/** Meta descriptions are user-facing copy, and the house style has no em dashes. */
function plain(text: string): string {
  return text.replace(/\s*—\s*/g, ", ").replace(/\s+/g, " ").trim();
}

function buildTitle(kind: "say" | "answer", query: string, language: string): string {
  const verb = kind === "say" ? "say" : "answer";
  const options = [
    `How to ${verb} "${query}" in ${language}`,
    `"${query}" in ${language}`,
  ];
  return options.find((t) => t.length <= TITLE_MAX) ?? options[options.length - 1];
}

function buildDescription(
  kind: "say" | "answer",
  yourLine: Bilingual,
  theirLine: Bilingual | null,
  notes: string,
  region: string
): string {
  const lead =
    kind === "say"
      ? `In ${region}, say "${yourLine.es}"`
      : `When they ask "${theirLine?.es ?? ""}", say "${yourLine.es}"`;
  // "say "Ja, tack."" needs no second full stop after the quote.
  const stop = /[.!?]"$/.test(lead) ? "" : ".";
  const note = plain(firstSentence(notes));
  const candidates = [
    `${lead}${stop} ${note}`,
    `${lead}${stop} Plus what they'll say back and how locals use it.`,
    `${lead}${stop}`,
  ];
  return candidates.find((d) => d.length <= DESCRIPTION_MAX) ?? candidates[candidates.length - 1];
}

function pagesFor(locale: Locale): AnswerPage[] {
  const { language, region } = getLocaleInfo(locale);
  const langSlug = LANG_SLUG[locale];
  const taken = new Set<string>();
  const out: AnswerPage[] = [];

  for (const category of getCategories(locale)) {
    // A page Google lands on must show its answer. Paid packs would not.
    if (isPremiumCategory(category.id)) continue;

    for (const sub of category.subsections) {
      if (!isDialogueSubsection(sub)) continue;
      for (const exchange of (sub as DialogueSubsection).exchanges ?? []) {
        if (!exchange.notes?.trim()) continue;

        const kind = exchange.speaker === "you" ? "say" : "answer";
        const yourLine: Bilingual | undefined =
          kind === "say" ? exchange.question : exchange.answers[0];
        const theirLine: Bilingual | null =
          kind === "say" ? (exchange.answers[0] ?? exchange.likelyReply) : exchange.question;
        if (!yourLine?.es || !yourLine.en || hasSlot(yourLine.es)) continue;

        // The search is built on your line when you start it, and on their
        // question when you are the one answering.
        const searchEn = kind === "say" ? yourLine.en : exchange.question.en;
        if (!searchEn) continue;
        const query = cleanQuery(searchEn);
        if (query.length < 4 || query.length > QUERY_MAX || hasSlot(query)) continue;

        const base = slugify(kind === "say" ? query : `answer ${query}`);
        if (!base) continue;
        // A second "a beer, please" in the same edition gets its stage on the
        // end. Derived from content, not from position, so it does not move
        // when an earlier exchange is added.
        const stage = category.id.replace(/^(sv|de)-/, "");
        const slug = [base, `${base}-${stage}`, `${base}-${slugify(exchange.id)}`].find(
          (s) => !taken.has(s)
        )!;
        taken.add(slug);

        const verb = kind === "say" ? "say" : "answer";
        out.push({
          locale,
          langSlug,
          slug,
          path: `/answers/${langSlug}/${slug}`,
          category,
          subsectionTitle: (sub as DialogueSubsection).title,
          exchange,
          kind,
          query,
          heading: `How to ${verb} "${query}" in ${language}`,
          title: buildTitle(kind, query, language),
          description: buildDescription(kind, yourLine, theirLine, exchange.notes, region),
          yourLine,
          alternatives: kind === "answer" ? exchange.answers.slice(1).filter((a) => a.es && !hasSlot(a.es)) : [],
          theirLine: theirLine && theirLine.es && !hasSlot(theirLine.es) ? theirLine : null,
        });
      }
    }
  }
  return out;
}

let cache: AnswerPage[] | null = null;

export function getAnswerPages(locale?: Locale): AnswerPage[] {
  cache ??= LOCALES.flatMap((l) => pagesFor(l.locale));
  return locale ? cache.filter((p) => p.locale === locale) : cache;
}

/** Other answers from the same scenario, so a page never ends in a dead end. */
export function relatedAnswers(page: AnswerPage, limit = 6): AnswerPage[] {
  // Start just after this page, wrapping, so neighbors link to each other
  // rather than every page in a category pointing at the same first six.
  const all = getAnswerPages(page.locale).filter((p) => p.category.id === page.category.id);
  const at = all.findIndex((p) => p.slug === page.slug);
  return [...all.slice(at + 1), ...all.slice(0, at)].slice(0, limit);
}

/** Answer pages grouped by scenario, in the edition's own order. */
export function answersByCategory(locale: Locale): { category: Category; pages: AnswerPage[] }[] {
  const pages = getAnswerPages(locale);
  return getCategories(locale)
    .map((category) => ({ category, pages: pages.filter((p) => p.category.id === category.id) }))
    .filter((g) => g.pages.length > 0);
}
