import { PAYWALL_ENABLED } from "./paywall";
import esES from "../../content/es-ES.json";
import svSE from "../../content/sv-SE.json";
import deDE from "../../content/de-DE.json";

export interface Bilingual {
  es: string;
  en: string | null;
}

// The `es` key above holds the SOURCE language of whichever file it came from
// (Spanish, Swedish or German) — see content/schema.md. It is not renamed per
// locale so that every component can read one shape.

export type Region =
  | "madrid"
  | "barcelona"
  | "catalan"
  | "stockholm"
  | "bayern"
  | "bayerisch"
  | "berlin";

// Two kinds of tag share this field. `madrid`, `barcelona`, `stockholm`,
// `bayern` and `berlin` say where a line is said; `catalan` and `bayerisch`
// say what language it is actually in, which is the more useful warning — a
// visitor who reads "Bon dia" as Spanish will mispronounce it, and one who
// tries "Griaß di" outside Bavaria will sound like a tourist doing an accent.
export const REGION_LABELS: Record<Region, string> = {
  madrid: "Madrid",
  barcelona: "Barcelona",
  catalan: "Català",
  stockholm: "Stockholm",
  bayern: "Bayern",
  bayerisch: "Bairisch",
  berlin: "Berlin",
};

export interface Exchange {
  id: string;
  /**
   * Who says `question`. The field exists because it cannot be inferred: in
   * beer-food the bartender asks and `answers` are yours, while in
   * getting-around the question is yours and `answers` are the driver's. The
   * practice deck needs to know which line the learner produces.
   */
  speaker: "you" | "them";
  /** English description of the moment, used as the prompt in practice. */
  situation: { en: string };
  question: Bilingual;
  answers: Bilingual[];
  likelyReply: Bilingual | null;
  notes: string;
  difficulty: "easy" | "medium" | "hard";
  region?: Region;
  young?: boolean;
  women?: boolean;
  quizQuestions: unknown[];
}

export interface TipItem {
  es: string;
  en: string;
}

export interface DialogueSubsection {
  id: string;
  title: string | null;
  type?: "tips";
  exchanges?: Exchange[];
  items?: TipItem[];
}

export interface Phrase {
  id: string;
  es: string;
  en: string;
  difficulty: "easy" | "medium" | "hard";
  region?: Region;
  young?: boolean;
  quizQuestions: unknown[];
}

export interface PhrasebookSubsection {
  id: string;
  title: string;
  phrases: Phrase[];
}

export interface Category {
  id: string;
  order: number;
  title: string;
  icon: string;
  type: "dialogue" | "phrasebook";
  description: string;
  note?: Bilingual | null;
  subsections: (DialogueSubsection | PhrasebookSubsection)[];
}

export interface ContentFile {
  language: string;
  meta: { sourceTitle: string; tagline: string; region: string };
  categories: Category[];
}

export type Locale = "es-ES" | "sv-SE" | "de-DE";

export const DEFAULT_LOCALE: Locale = "es-ES";

export interface LocaleInfo {
  locale: Locale;
  /** URL segment. Spanish is "" — it stays at the root paths that are already
   *  indexed in Search Console, so no existing URL moves. */
  slug: string;
  language: string;
  flag: string;
  /** Per-edition accent colour, applied as --accent on that language's pages. */
  accent: string;
  region: string;
}

export const LOCALES: LocaleInfo[] = [
  { locale: "es-ES", slug: "", language: "Spanish", flag: "🇪🇸", accent: "#e8622c", region: "Spain" },
  { locale: "sv-SE", slug: "sv", language: "Swedish", flag: "🇸🇪", accent: "#2f6fa8", region: "Stockholm" },
  { locale: "de-DE", slug: "de", language: "German", flag: "🇩🇪", accent: "#c8952b", region: "Germany" },
];

const FILES: Record<Locale, ContentFile> = {
  "es-ES": esES as unknown as ContentFile,
  "sv-SE": svSE as unknown as ContentFile,
  "de-DE": deDE as unknown as ContentFile,
};

export function getLocaleInfo(locale: Locale): LocaleInfo {
  return LOCALES.find((l) => l.locale === locale)!;
}

/** Maps a URL slug ("", "sv", "de") back to a locale, or undefined if unknown. */
export function localeFromSlug(slug: string | undefined): Locale | undefined {
  return LOCALES.find((l) => l.slug === (slug ?? ""))?.locale;
}

/** Builds an in-site path for a locale: localePath("sv-SE", "/practice") → "/sv/practice". */
export function localePath(locale: Locale, path: string): string {
  const { slug } = getLocaleInfo(locale);
  return slug ? `/${slug}${path}` : path;
}

export function getContent(locale: Locale = DEFAULT_LOCALE): ContentFile {
  return FILES[locale];
}

export function getCategories(locale: Locale = DEFAULT_LOCALE): Category[] {
  return [...FILES[locale].categories].sort((a, b) => a.order - b.order);
}

/** Category ids are unique across every locale file, so an id alone is enough. */
export function getCategoryById(id: string, locale?: Locale): Category | undefined {
  const files = locale ? [FILES[locale]] : Object.values(FILES);
  for (const file of files) {
    const found = file.categories.find((c) => c.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Which locale a category id belongs to — used to build correct links. */
export function localeOfCategory(id: string): Locale | undefined {
  for (const [locale, file] of Object.entries(FILES) as [Locale, ContentFile][]) {
    if (file.categories.some((c) => c.id === id)) return locale;
  }
  return undefined;
}

// Categories that require a purchase to view (same unlock as Practice mode).
// One purchase unlocks every language, so this is a single flat set; ids are
// globally unique, so no locale scoping is needed.
const PREMIUM_CATEGORY_IDS = new Set([
  // Spanish. Cuss words and nightlife are deliberately free here: they are what
  // the marketing leads on, and a visitor arriving on that promise should land
  // on it rather than on a locked page. The Swedish and German cuss words below
  // stay paid, so this is a Spanish-only shop window.
  "for-the-girls",
  "flirting",
  "emergencies",
  "resacon",
  // Swedish
  "sv-cuss-words",
  "sv-flirting",
  // German
  "de-cuss-words",
  "de-flirting",
  "de-for-the-girls",
  "de-emergencies",
  "de-resacon",
  "de-drunk-scale",
]);

export function isPremiumCategory(id: string): boolean {
  // The set below stays as the record of what *would* be paid; the flag is
  // what decides whether anything is. Every scenario surface reads this one
  // function, so turning the paywall off unhides the packs, drops the "Paid"
  // badges and stops the sort grouping them at the bottom, all at once.
  return PAYWALL_ENABLED && PREMIUM_CATEGORY_IDS.has(id);
}

export function isDialogueSubsection(
  sub: DialogueSubsection | PhrasebookSubsection
): sub is DialogueSubsection {
  return "exchanges" in sub || "items" in sub;
}

/**
 * What someone types into Google to reach a category.
 *
 * Page titles used to be "${category.title} — Try Convi", which contains
 * neither the language nor the country nor any phrase a human would search
 * for: "Ordering a beer/food like a local" is how we describe the page to
 * ourselves, not how anyone looks for it. These are the searches instead —
 * one verb phrase per stage, completed by the edition's own language and
 * region so each of the three reads naturally.
 *
 * Keyed by stage rather than category id so one entry serves all editions,
 * the same way the practice path is keyed. An unlisted stage falls back to the
 * category's own title, which is no worse than what it had before.
 */
const SEARCH_INTENT: Record<string, string> = {
  "getting-around": "get around",
  slang: "use slang",
  "beer-food": "order a beer",
  "starting-convo": "start a conversation",
  restaurant: "order at a restaurant",
  hotel: "check into a hotel",
  shopping: "shop and haggle",
  nightlife: "get into a club",
  flirting: "call someone attractive",
  "cuss-words": "swear",
  "drunk-scale": "say how drunk you are",
  resacon: "ask for medicine",
  emergencies: "get help in an emergency",
  "for-the-girls": "shut down a creep",
  "bayern-slang": "speak Bavarian",
  "berlin-slang": "speak Berlinerisch",
};

/** `sv-beer-food` -> `beer-food`. Mirrors stageKeyOf in quizTypes. */
function stageOf(categoryId: string): string {
  return categoryId.replace(/^(sv|de)-/, "");
}

/** The page title: a search, not a description of a page. */
export function searchTitle(category: Category, locale: Locale): string {
  const { language, region } = getLocaleInfo(locale);
  const intent = SEARCH_INTENT[stageOf(category.id)];
  if (!intent) return `${category.title} — ${language} phrases`;
  return `How to ${intent} in ${region} — real ${language} phrases`;
}

/**
 * The meta description, and the first thing an answer engine reads.
 *
 * Leads with actual phrases rather than a promise about them: a searcher
 * scanning results wants to see the Spanish, and a model deciding whether this
 * page answers the question wants the same thing. "Q → A → what they'll
 * probably say" — the old description, shared by every page on the site — told
 * neither of them anything.
 */
export function searchBlurb(category: Category, locale: Locale): string {
  const { language, region } = getLocaleInfo(locale);
  const intent = SEARCH_INTENT[stageOf(category.id)] ?? category.title.toLowerCase();
  const sample = samplePhrases(category, 3).join(" · ");
  const count = countCategoryItems(category);
  const lead = sample ? `${sample} — the ` : "The ";
  return `${lead}${language} you actually need to ${intent} in ${region}. ${count} real lines with what they'll say back. Free, no sign-up.`;
}

/** The first few target-language lines in a category, for the blurb. */
export function samplePhrases(category: Category, limit: number): string[] {
  const out: string[] = [];
  for (const sub of category.subsections) {
    if (isDialogueSubsection(sub)) {
      for (const ex of sub.exchanges ?? []) {
        const line = ex.speaker === "them" ? ex.answers[0]?.es : ex.question.es;
        if (line && !hasSlot(line)) out.push(line.replace(/\s*\/\s*.*$/, ""));
        if (out.length >= limit) return out;
      }
      for (const tip of sub.items ?? []) {
        if (tip.es && !hasSlot(tip.es)) out.push(tip.es);
        if (out.length >= limit) return out;
      }
    } else {
      for (const phrase of (sub as PhrasebookSubsection).phrases) {
        if (phrase.es && !hasSlot(phrase.es)) out.push(phrase.es);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/** Lines with a fill-in slot read as broken out of context, so they are skipped. */
function hasSlot(line: string): boolean {
  return /__|\[[^\]]+\]/.test(line);
}

/**
 * The single most useful line in a category — the one that answers the search
 * before the reader scrolls. Answer-first is the shape answer engines quote.
 */
export function quickAnswer(category: Category): { es: string; en: string | null } | null {
  for (const sub of category.subsections) {
    if (isDialogueSubsection(sub)) {
      for (const ex of sub.exchanges ?? []) {
        const line = ex.speaker === "them" ? ex.answers[0] : { es: ex.question.es, en: ex.question.en };
        if (line?.es && !hasSlot(line.es)) return line;
      }
    } else {
      const first = (sub as PhrasebookSubsection).phrases[0];
      if (first?.es && !hasSlot(first.es)) return first;
    }
  }
  return null;
}

export function countCategoryItems(category: Category): number {
  return category.subsections.reduce((sum, sub) => {
    if (isDialogueSubsection(sub)) {
      return sum + (sub.exchanges?.length ?? 0) + (sub.items?.length ?? 0);
    }
    return sum + (sub as PhrasebookSubsection).phrases.length;
  }, 0);
}
