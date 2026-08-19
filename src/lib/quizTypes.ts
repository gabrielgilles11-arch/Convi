// Client-safe half of the quiz layer.
//
// IMPORTANT: this file must never import ../lib/content (or anything that
// does). Client components import from here so that no content JSON is pulled
// into the browser bundle — the quiz data itself arrives from
// /api/quiz-items, which checks entitlement server-side. Importing content
// here would silently re-open the paywall hole this split exists to close.

export interface QuizItem {
  id: string;
  categoryId: string;
  categoryTitle: string;
  kind: "dialogue" | "phrase";
  prompt: string; // instruction shown in test mode, e.g. "What would they probably say back?"
  front: string; // source-language text shown on the flashcard front
  frontTranslation: string | null;
  correctAnswer: string; // source language (dialogue) or English gloss (phrase) — the thing being tested
  correctAnswerTranslation: string | null;
}

export interface QuizCategory {
  id: string;
  title: string;
}

export interface QuizPayload {
  items: QuizItem[];
  categories: QuizCategory[];
}

/**
 * The order Test mode walks you through the material: roughly the shape of a
 * trip, so the first thing you practise is the first thing you'll need. Values
 * are *stage keys*, not category ids — ids are locale-prefixed (`sv-beer-food`),
 * so the prefix is stripped and the remainder matched against this list. That
 * keeps one ordering working across all three editions.
 *
 * Anything not listed sorts to the end in its existing order, so a new category
 * shows up at the bottom of the path rather than disappearing.
 */
export const PRACTICE_PATH = [
  "getting-around",
  "hotel",
  "beer-food",
  "starting-convo",
  "restaurant",
  "shopping",
  "slang",
  "bayern-slang",
  "nightlife",
  "flirting",
  "cuss-words",
  "resacon",
  "for-the-girls",
  "emergencies",
];

/** Questions in one round. Short enough to finish in a queue for coffee. */
export const ROUND_LENGTH = 10;

/** Best-score percentage at which a stage counts as cleared. */
export const STAGE_CLEAR_SCORE = 80;

/** `sv-beer-food` -> `beer-food`; Spanish ids are already bare. */
export function stageKeyOf(categoryId: string): string {
  return categoryId.replace(/^(sv|de)-/, "");
}

export function sortCategoriesByPath<T extends { id: string }>(categories: T[]): T[] {
  const rank = (id: string) => {
    const i = PRACTICE_PATH.indexOf(stageKeyOf(id));
    return i === -1 ? PRACTICE_PATH.length : i;
  };
  return [...categories].sort((a, b) => rank(a.id) - rank(b.id));
}

/**
 * The stage to drop someone into: the first along the path they haven't
 * cleared. Returns null once everything is cleared, which the caller shows as
 * free choice rather than pinning them to a finished stage.
 */
export function recommendedCategoryId(
  categories: { id: string }[],
  bestScores: Record<string, number>
): string | null {
  const next = sortCategoriesByPath(categories).find(
    (c) => (bestScores[c.id] ?? 0) < STAGE_CLEAR_SCORE
  );
  return next ? next.id : null;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** One round's worth of questions, sampled without replacement. */
export function buildRound(items: QuizItem[], length: number = ROUND_LENGTH): QuizItem[] {
  return shuffle(items).slice(0, Math.min(length, items.length));
}

/**
 * Builds 4 multiple-choice options (1 correct + 3 distractors) for an item.
 * Distractors are pulled from sibling items of the same kind, since each
 * item's quizQuestions array is empty for v1 (no authored distractors yet).
 *
 * `fallbackPool` is the full deck. Small categories genuinely cannot supply
 * three same-kind siblings — Spanish "Starting a convo" has exactly one phrase
 * item, and the Swedish and German restaurant sets have three dialogues — so
 * without a backfill those rounds render a "multiple" choice of one or three
 * options, where the answer is obvious or unavoidable.
 */
export function buildOptions(
  item: QuizItem,
  pool: QuizItem[],
  fallbackPool: QuizItem[] = []
): string[] {
  const collect = (source: QuizItem[]) =>
    source
      .filter((i) => i.kind === item.kind && i.correctAnswer !== item.correctAnswer)
      .map((i) => i.correctAnswer);

  const seen = new Set<string>();
  const distractors: string[] = [];

  for (const source of [pool, fallbackPool]) {
    for (const candidate of shuffle([...new Set(collect(source))])) {
      if (distractors.length >= 3) break;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      distractors.push(candidate);
    }
    if (distractors.length >= 3) break;
  }

  return shuffle([item.correctAnswer, ...distractors]);
}
