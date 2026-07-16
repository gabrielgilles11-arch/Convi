import esES from "../../content/es-ES.json";

export interface Bilingual {
  es: string;
  en: string | null;
}

export type Region = "madrid" | "barcelona";

export interface Exchange {
  id: string;
  question: Bilingual;
  answers: Bilingual[];
  likelyReply: Bilingual | null;
  notes: string;
  difficulty: "easy" | "medium" | "hard";
  region?: Region;
  young?: boolean;
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

const content = esES as unknown as ContentFile;

export function getContent(): ContentFile {
  return content;
}

export function getCategories(): Category[] {
  return [...content.categories].sort((a, b) => a.order - b.order);
}

export function getCategoryById(id: string): Category | undefined {
  return content.categories.find((c) => c.id === id);
}

// Categories that require a purchase to view (same unlock as Practice mode).
const PREMIUM_CATEGORY_IDS = new Set(["cuss-words", "flirting", "nightlife", "emergencies", "resacon"]);

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
