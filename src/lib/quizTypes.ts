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

/** Questions in one round. */
export const ROUND_LENGTH = 10;

/** Typed-answer and word-bank questions per round; the rest are multiple choice. */
export const TYPED_PER_ROUND = 2;
export const BANK_PER_ROUND = 2;

/** Best-score percentage at which a stage counts as cleared. */
export const STAGE_CLEAR_SCORE = 80;

/** `sv-beer-food` -> `beer-food`; Spanish ids are already bare. */
export function stageKeyOf(categoryId: string): string {
  return categoryId.replace(/^(sv|de)-/, "");
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Stages: a category, split into parts when it holds more than one round
// ---------------------------------------------------------------------------

export interface Stage {
  id: string; // `beer-food` or `beer-food#2`
  categoryId: string;
  title: string;
  part: number | null; // null when the category fits in a single stage
  partCount: number;
  itemIds: string[];
}

export const MISTAKES_STAGE_ID = "__mistakes__";

/**
 * Splits each category into stages of at most ROUND_LENGTH items so a stage is
 * always exactly one round's worth. A trailing remainder smaller than 4 is
 * folded back into the previous part rather than becoming a stage of one or two
 * — a round samples ROUND_LENGTH from whatever the stage holds, so a slightly
 * over-full last part is harmless while a stage of one is pointless.
 */
export function buildStages(items: QuizItem[], categories: QuizCategory[]): Stage[] {
  const ordered = [...categories].sort((a, b) => {
    const rank = (id: string) => {
      const i = PRACTICE_PATH.indexOf(stageKeyOf(id));
      return i === -1 ? PRACTICE_PATH.length : i;
    };
    return rank(a.id) - rank(b.id);
  });

  const stages: Stage[] = [];

  for (const category of ordered) {
    const ids = items.filter((i) => i.categoryId === category.id).map((i) => i.id);
    if (ids.length === 0) continue;

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += ROUND_LENGTH) {
      chunks.push(ids.slice(i, i + ROUND_LENGTH));
    }
    if (chunks.length > 1 && chunks[chunks.length - 1].length < 4) {
      const tail = chunks.pop()!;
      chunks[chunks.length - 1].push(...tail);
    }

    chunks.forEach((chunk, i) => {
      const multi = chunks.length > 1;
      stages.push({
        id: multi ? `${category.id}#${i + 1}` : category.id,
        categoryId: category.id,
        title: multi ? `${category.title} — Part ${i + 1}` : category.title,
        part: multi ? i + 1 : null,
        partCount: chunks.length,
        itemIds: chunk,
      });
    });
  }

  return stages;
}

/** First stage along the path that hasn't been cleared, or null if all are. */
export function recommendedStageId(
  stages: Stage[],
  bestScores: Record<string, number>
): string | null {
  const next = stages.find((s) => (bestScores[s.id] ?? 0) < STAGE_CLEAR_SCORE);
  return next ? next.id : null;
}

// ---------------------------------------------------------------------------
// Answer comparison
// ---------------------------------------------------------------------------

/**
 * Comparison key for typed and assembled answers. Accents are stripped, so
 * `que` matches `qué` and `grussgott` matches `Grüß Gott` — a learner typing on
 * an English keyboard should never be marked wrong for a missing diacritic.
 * Case, punctuation and surrounding whitespace are ignored for the same reason.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining accents
    .replace(/ß/g, "ss")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .replace(/[¿¡?!.,;:"'’“”()\-–—/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function answersMatch(given: string, expected: string): boolean {
  return normalizeAnswer(given) === normalizeAnswer(expected);
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export type QuestionForm = "choice" | "type" | "bank";

/** Which language the expected answer is in — distractors must match it. */
export type AnswerLang = "source" | "en";

export interface Question {
  itemId: string;
  categoryId: string;
  categoryTitle: string;
  form: QuestionForm;
  prompt: string;
  shown: string;
  shownSub: string | null;
  answer: string;
  answerSub: string | null;
  answerLang: AnswerLang;
  options: string[]; // choice only
  tiles: string[]; // bank only
}

/** The item's answer text in a given language, or "" when it has none. */
function answerTextFor(item: QuizItem, lang: AnswerLang): string {
  if (lang === "source") {
    return item.kind === "phrase" ? item.front : item.correctAnswer;
  }
  return item.kind === "phrase" ? item.correctAnswer : item.correctAnswerTranslation ?? "";
}

/**
 * Turns an item into a question, in one of two directions.
 *
 * `reverse` flips which language you're asked to produce. Phrases go from
 * "what does this mean" to "how do you say this"; dialogues keep their
 * source-language reply but show the English translation of the cue, so a round
 * mixes both languages rather than only ever reading the target one.
 * Returns null when the item lacks the text a direction needs.
 */
export function buildQuestion(
  item: QuizItem,
  reverse: boolean,
  form: QuestionForm,
  pool: QuizItem[],
  fallbackPool: QuizItem[]
): Question | null {
  let prompt: string;
  let shown: string;
  let shownSub: string | null;
  let answer: string;
  let answerSub: string | null;
  let answerLang: AnswerLang;

  if (item.kind === "phrase") {
    if (reverse) {
      if (!item.correctAnswer || !item.front) return null;
      prompt = "How do you say this?";
      shown = item.correctAnswer; // English gloss
      shownSub = null;
      answer = item.front; // source phrase
      answerSub = null;
      answerLang = "source";
    } else {
      prompt = "What does this mean?";
      shown = item.front;
      shownSub = null;
      answer = item.correctAnswer;
      answerSub = null;
      answerLang = "en";
    }
  } else {
    // Dialogue: the reply is always in the source language; reversing swaps the
    // cue to English so you're going from your language into theirs.
    if (reverse && !item.frontTranslation) return null;
    prompt = item.prompt;
    shown = reverse ? item.frontTranslation! : item.front;
    shownSub = reverse ? null : item.frontTranslation;
    answer = item.correctAnswer;
    answerSub = item.correctAnswerTranslation;
    answerLang = "source";
  }

  if (!answer) return null;

  const question: Question = {
    itemId: item.id,
    categoryId: item.categoryId,
    categoryTitle: item.categoryTitle,
    form,
    prompt,
    shown,
    shownSub,
    answer,
    answerSub,
    answerLang,
    options: [],
    tiles: [],
  };

  if (form === "choice") {
    question.options = buildOptions(answer, answerLang, pool, fallbackPool);
  } else if (form === "bank") {
    question.tiles = buildTiles(answer, answerLang, pool, fallbackPool);
  }

  return question;
}

/**
 * Builds 4 multiple-choice options (1 correct + 3 distractors).
 *
 * Distractors are drawn in the same language as the answer — mixing an English
 * gloss into a set of Spanish replies would give the answer away — and are
 * pulled from siblings, since every item's quizQuestions array is still empty.
 *
 * `fallbackPool` is the full deck. Small categories genuinely cannot supply
 * three same-language siblings — Spanish "Starting a convo" has exactly one
 * phrase item — so without a backfill those rounds render a "multiple" choice
 * of one or three options, where the answer is obvious or unavoidable.
 */
export function buildOptions(
  answer: string,
  answerLang: AnswerLang,
  pool: QuizItem[],
  fallbackPool: QuizItem[] = []
): string[] {
  const seen = new Set([normalizeAnswer(answer)]);
  const distractors: string[] = [];

  for (const source of [pool, fallbackPool]) {
    for (const candidate of shuffle(source.map((i) => answerTextFor(i, answerLang)))) {
      if (distractors.length >= 3) break;
      if (!candidate) continue;
      const key = normalizeAnswer(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      distractors.push(candidate);
    }
    if (distractors.length >= 3) break;
  }

  return shuffle([answer, ...distractors]);
}

/**
 * Word tiles for assembly questions: the answer's own words plus up to two
 * decoys borrowed from other answers in the same language.
 */
export function buildTiles(
  answer: string,
  answerLang: AnswerLang,
  pool: QuizItem[],
  fallbackPool: QuizItem[] = []
): string[] {
  const words = answer.split(/\s+/).filter(Boolean);
  const own = new Set(words.map((w) => normalizeAnswer(w)));

  const decoys: string[] = [];
  for (const source of [pool, fallbackPool]) {
    for (const text of shuffle(source.map((i) => answerTextFor(i, answerLang)))) {
      if (decoys.length >= 2) break;
      if (!text) continue;
      const candidate = shuffle(text.split(/\s+/).filter(Boolean))[0];
      if (!candidate) continue;
      const key = normalizeAnswer(candidate);
      if (!key || own.has(key)) continue;
      own.add(key);
      decoys.push(candidate);
    }
    if (decoys.length >= 2) break;
  }

  return shuffle([...words, ...decoys]);
}

/**
 * Some answers carry a fill-in slot — "Son __ euros.", "Byt vid [STATION]." —
 * which is fine to read or pick from a list but unreasonable to type or
 * assemble: there is no right thing to put in the blank. Those stay multiple
 * choice.
 */
function hasPlaceholder(answer: string): boolean {
  return /__|\[[^\]]+\]/.test(answer);
}

/** Answers short enough that typing them is reasonable on a phone. */
function typeable(answer: string): boolean {
  return answer.length > 0 && answer.length <= 24 && !hasPlaceholder(answer);
}

/** Answers with enough words to assemble, but not so many it's tedious. */
function bankable(answer: string): boolean {
  if (hasPlaceholder(answer)) return false;
  const n = answer.split(/\s+/).filter(Boolean).length;
  return n >= 2 && n <= 7;
}

/**
 * One round: up to `length` questions, sampled without replacement, with
 * directions mixed and a couple of typed and assembled questions folded in
 * wherever the answer text suits them.
 */
export function buildRound(
  items: QuizItem[],
  fallbackPool: QuizItem[] = items,
  length: number = ROUND_LENGTH
): Question[] {
  const picked = shuffle(items).slice(0, Math.min(length, items.length));

  // Decide direction first — it determines the answer text, which decides
  // which forms are even possible.
  const drafts = picked.map((item) => {
    const reverse = Math.random() < 0.5;
    const base =
      buildQuestion(item, reverse, "choice", items, fallbackPool) ??
      buildQuestion(item, !reverse, "choice", items, fallbackPool);
    return { item, question: base };
  });

  const usable = drafts.filter((d) => d.question !== null) as {
    item: QuizItem;
    question: Question;
  }[];

  const typedIdx = new Set<number>();
  const bankIdx = new Set<number>();

  usable.forEach((d, i) => {
    if (typedIdx.size < TYPED_PER_ROUND && typeable(d.question.answer)) typedIdx.add(i);
  });
  usable.forEach((d, i) => {
    if (typedIdx.has(i)) return;
    if (bankIdx.size < BANK_PER_ROUND && bankable(d.question.answer)) bankIdx.add(i);
  });

  return usable.map((d, i) => {
    const form: QuestionForm = typedIdx.has(i) ? "type" : bankIdx.has(i) ? "bank" : "choice";
    if (form === "choice") return d.question;
    const reverseUsed = d.question.shown !== d.item.front;
    return (
      buildQuestion(d.item, reverseUsed, form, items, fallbackPool) ?? d.question
    );
  });
}
