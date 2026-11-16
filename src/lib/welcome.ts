// The first time somebody opens practice or Talk for a language. Client-safe:
// no content import, so the island can use it. The deck arrives from
// /api/quiz-items like everything else.

import { stageKeyOf, type QuizItem } from "./quizTypes";

/**
 * The welcome round's four sections, in the order the summary lists them.
 *
 * Stage keys, so one list serves all three editions. The labels are what the
 * round is selling on the first screen: the four things a trip needs on day
 * one, put the way a traveler would put them.
 */
export const WELCOME_SECTIONS = [
  { stage: "restaurant", label: "Ordering at a restaurant" },
  { stage: "beer-food", label: "How to ask for a beer" },
  { stage: "getting-around", label: "Getting around" },
  { stage: "starting-convo", label: "Starting a convo" },
] as const;

export type WelcomeStage = (typeof WELCOME_SECTIONS)[number]["stage"];

/** Questions in the welcome round. */
export const WELCOME_LENGTH = 5;

export interface WelcomePick {
  item: QuizItem;
  stage: WelcomeStage;
}

const BLANK = /(_{2,}|\[[^\]]+\])/;

/**
 * Lines that are about the section's headline moment. Within "beer-food" the
 * round promises asking for a beer, not a croissant, so a beer is preferred
 * when the edition has one; within the restaurant, ordering. Matched on the
 * English and on the line itself, which is where "caña", "öl" and "Bier" are.
 */
const PREFER: Partial<Record<WelcomeStage, RegExp>> = {
  "beer-food": /\b(beer|ca[ñn]a|cerveza|öl|stor stark|bier|helles|ma[ßs]|halbe)\b/i,
  restaurant: /\b(order|menu|table|recommend|dish|bill|check|starter|main)\b/i,
};

function textOf(item: QuizItem): string {
  return [item.front, item.correctAnswer, item.correctAnswerTranslation ?? ""].join(" ");
}

/**
 * Whether an item makes a fair first question: a moment in English with one
 * line to say, and no blank in it. A blank is a fine thing to learn later and a
 * confusing thing to meet in question one.
 */
export function welcomeEligible(item: QuizItem): boolean {
  return (
    item.kind === "situation" &&
    Boolean(item.front?.trim()) &&
    Boolean(item.correctAnswer?.trim()) &&
    !BLANK.test(item.correctAnswer) &&
    !BLANK.test(item.front)
  );
}

function shuffled<T>(list: T[], random: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Five questions across the four sections, in a random order.
 *
 * Every section gets one, so the round is a tour rather than five questions
 * about the bar, and the fifth goes to a section drawn at random. Within a
 * section the headline moment is preferred (`PREFER`), and nothing is asked
 * twice. A section the edition has nothing usable for is skipped rather than
 * filled from somewhere else, which is why the round can come back short.
 */
export function pickWelcomeItems(
  items: QuizItem[],
  random: () => number = Math.random
): WelcomePick[] {
  const bySection = new Map<WelcomeStage, QuizItem[]>();
  for (const { stage } of WELCOME_SECTIONS) {
    const own = items.filter((i) => stageKeyOf(i.categoryId) === stage && welcomeEligible(i));
    const prefer = PREFER[stage];
    const best = prefer ? own.filter((i) => prefer.test(textOf(i))) : [];
    const rest = own.filter((i) => !best.includes(i));
    bySection.set(stage, [...shuffled(best, random), ...shuffled(rest, random)]);
  }

  const available = WELCOME_SECTIONS.map((s) => s.stage).filter((s) => bySection.get(s)!.length > 0);
  if (available.length === 0) return [];

  const order: WelcomeStage[] = [...available];
  const extras = shuffled(available, random);
  while (order.length < WELCOME_LENGTH && extras.length > 0) {
    const stage = extras.shift()!;
    // A section with only one usable line cannot take a second question.
    if (bySection.get(stage)!.length > order.filter((s) => s === stage).length) order.push(stage);
  }

  const taken = new Map<WelcomeStage, number>();
  const picks = order.map((stage) => {
    const n = taken.get(stage) ?? 0;
    taken.set(stage, n + 1);
    return { item: bySection.get(stage)![n]!, stage };
  });
  return shuffled(picks, random);
}

export interface SectionTally {
  stage: WelcomeStage;
  label: string;
  right: number;
  total: number;
}

/**
 * How each section went, first tries only: the summary is about what somebody
 * already knew, not what the retry queue eventually got out of them. Sections
 * the round did not ask about are left out.
 */
export function tallyWelcome(picks: WelcomePick[], firstTries: Record<string, boolean>): SectionTally[] {
  return WELCOME_SECTIONS.flatMap(({ stage, label }) => {
    const asked = picks.filter((p) => p.stage === stage);
    if (asked.length === 0) return [];
    const right = asked.filter((p) => firstTries[p.item.id] === true).length;
    return [{ stage, label, right, total: asked.length }];
  });
}

// ---------------------------------------------------------------------------
// Whether it has been seen, per language
// ---------------------------------------------------------------------------

export type WelcomeKind = "practice" | "talk";

const KEY = "convi:welcome:v1";

function read(): Record<string, true> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * True once the welcome has been shown for this kind and language. With no
 * storage at all it reads as seen: a welcome on every visit is worse than none.
 */
export function welcomeSeen(kind: WelcomeKind, locale: string): boolean {
  try {
    window.localStorage.getItem(KEY);
  } catch {
    return true;
  }
  return read()[`${kind}:${locale}`] === true;
}

export function markWelcomeSeen(kind: WelcomeKind, locale: string): void {
  try {
    const all = read();
    all[`${kind}:${locale}`] = true;
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Nothing to do: it may simply show again next visit.
  }
}

/** The language you are learning, by edition, for the welcome copy. */
export const LANGUAGE_NAME: Record<string, string> = {
  "es-ES": "Spanish",
  "sv-SE": "Swedish",
  "de-DE": "German",
};

/**
 * Convi's first words on a welcome screen, in the language you picked.
 *
 * Sourced like every other line in the target language (content/SOURCES.md,
 * "Welcome screens"): Spanish "bienvenido a" as in "bienvenido a casa"
 * (Quillbot), Swedish "Välkommen till" as in "Välkommen till Wikipedia."
 * (Clozemaster), German "Willkommen bei" for a company, as in "Willkommen bei
 * [Firma]" (Lingoda). Try Convi is the name, so it stays as it is.
 */
export const WELCOME_HELLO: Record<string, { text: string; lang: string }> = {
  "es-ES": { text: "¡Bienvenido a Try Convi!", lang: "es" },
  "sv-SE": { text: "Välkommen till Try Convi!", lang: "sv" },
  "de-DE": { text: "Willkommen bei Try Convi!", lang: "de" },
};

/** What Convi says second, in every edition. */
export const WELCOME_PROMISE = "Where I teach you to speak like a local.";
