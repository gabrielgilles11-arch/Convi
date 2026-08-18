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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds 4 multiple-choice options (1 correct + 3 distractors) for an item.
 * Distractors are pulled from sibling items of the same kind, since each
 * item's quizQuestions array is empty for v1 (no authored distractors yet).
 */
export function buildOptions(item: QuizItem, pool: QuizItem[]): string[] {
  const candidates = pool
    .filter((i) => i.kind === item.kind && i.correctAnswer !== item.correctAnswer)
    .map((i) => i.correctAnswer);

  const uniqueCandidates = [...new Set(candidates)];
  const distractors = shuffle(uniqueCandidates).slice(0, 3);

  return shuffle([item.correctAnswer, ...distractors]);
}
