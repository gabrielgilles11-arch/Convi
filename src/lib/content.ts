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

export type Region = "madrid" | "barcelona" | "stockholm" | "bayern";

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
  // Spanish
  "for-the-girls",
  "cuss-words",
  "flirting",
  "nightlife",
  "emergencies",
  "resacon",
  // Swedish
  "sv-cuss-words",
  "sv-flirting",
  // German
  "de-cuss-words",
  "de-flirting",
]);

export function isPremiumCategory(id: string): boolean {
  return PREMIUM_CATEGORY_IDS.has(id);
}

export function isDialogueSubsection(
  sub: DialogueSubsection | PhrasebookSubsection
): sub is DialogueSubsection {
  return "exchanges" in sub || "items" in sub;
}

export function countCategoryItems(category: Category): number {
  return category.subsections.reduce((sum, sub) => {
    if (isDialogueSubsection(sub)) {
      return sum + (sub.exchanges?.length ?? 0) + (sub.items?.length ?? 0);
    }
    return sum + (sub as PhrasebookSubsection).phrases.length;
  }, 0);
}
