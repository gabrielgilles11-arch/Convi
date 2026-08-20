// Client-safe half of the quiz layer.
//
// IMPORTANT: this file must never import ../lib/content (or anything that
// does). Client components import from here so that no content JSON is pulled
// into the browser bundle — the quiz data itself arrives from
// /api/quiz-items, which checks entitlement server-side. Importing content
// here would silently re-open the paywall hole this split exists to close.

/**
 * What an item asks of you:
 *   say    — the line you produce in a situation ("what do you say?")
 *   reply  — what the other person comes back with
 *   phrase — a phrase and its meaning, testable in either direction
 *
 * A round is composed by role, not by shuffling everything together: guessing
 * their comeback is a minority of the work, not the bulk of it.
 */
export type ItemRole = "say" | "reply" | "phrase";

export interface QuizItem {
  id: string;
  categoryId: string;
  categoryTitle: string;
  kind: "dialogue" | "phrase";
  role: ItemRole;
  prompt: string; // instruction shown in test mode, e.g. "What do you say?"
  front: string; // source-language text shown on the flashcard front
  frontTranslation: string | null;
  correctAnswer: string; // source language (dialogue) or English gloss (phrase) — the thing being tested
  correctAnswerTranslation: string | null;
  /** Ids of the generated clips, or null where the side has no spoken line. */
  frontAudioId: string | null;
  answerAudioId: string | null;
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

/**
 * What one round is made of.
 *
 * The shape is fixed; the order is not. A round always holds four translation
 * questions, one matching screen and at most three "what would they say back",
 * but they are dealt in a different order every time so the rhythm doesn't
 * become a script you can play from memory. The one ordering rule that does
 * hold: a round never opens on a comeback question — the first thing you do is
 * always produce something yourself.
 */
export const TRANSLATION_PER_ROUND = 4;
export const MATCH_PER_ROUND = 1;
export const REPLY_MAX_PER_ROUND = 3;
export const ROUND_LENGTH = TRANSLATION_PER_ROUND + MATCH_PER_ROUND + REPLY_MAX_PER_ROUND;

/** Phrases paired off on one matching screen. */
export const MATCH_PAIRS = 4;

/**
 * Typed and assembled questions folded into the round. Both are recall rather
 * than recognition, so they stay — but never as the opening question, and never
 * in place of the matching screen.
 */
export const TYPED_PER_ROUND = 1;
export const BANK_PER_ROUND = 1;

/**
 * Items per stage. Deliberately not ROUND_LENGTH: a round samples from a stage,
 * so a stage wants more material than one round uses, and tying the two
 * together would have doubled the length of the path when `say` items were
 * restored to the deck.
 */
export const STAGE_SIZE = 12;

/** Best-score percentage at which a stage counts as cleared. */
export const STAGE_CLEAR_SCORE = 80;

/** `sv-beer-food` -> `beer-food`; Spanish ids are already bare. */
export function stageKeyOf(categoryId: string): string {
  return categoryId.replace(/^(sv|de)-/, "");
}

/** Exported so the matching board can lay its two columns out independently. */
export function shuffle<T>(arr: T[]): T[] {
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
 * Capstone at the end of the path: the slang from every section at once, rather
 * than one category at a time. Phrasebook items *are* the slang across an
 * edition — slang, cuss words, flirting, Bayern — so the final draws from every
 * phrase-kind item in the deck.
 */
export const SLANG_FINAL_ID = "__slang-final__";

export function slangFinalItems(items: QuizItem[]): QuizItem[] {
  return items.filter((i) => i.kind === "phrase");
}

/** The final stays locked until every ordinary stage has been cleared. */
export function allStagesCleared(stages: Stage[], bestScores: Record<string, number>): boolean {
  return stages.length > 0 && stages.every((s) => (bestScores[s.id] ?? 0) >= STAGE_CLEAR_SCORE);
}

/**
 * Spreads a category's production items and comeback items evenly before it is
 * chunked into stages.
 *
 * Items come out of the content file grouped by exchange, so a category whose
 * later exchanges all carry a `likelyReply` and no answers used to hand a whole
 * stage nothing but comebacks — and a round built from that stage was entirely
 * "what would they say back", which is the shape this deck is explicitly not
 * meant to have. Interleaving by ratio means every stage carries something to
 * produce.
 */
function interleaveByRole(items: QuizItem[]): QuizItem[] {
  const production = items.filter((i) => i.role !== "reply");
  const replies = items.filter((i) => i.role === "reply");
  if (production.length === 0 || replies.length === 0) return items;

  const out: QuizItem[] = [];
  let p = 0;
  let r = 0;
  // Take from whichever bucket has fallen furthest behind its share, so the
  // mix stays even at every prefix — which is what chunking actually reads.
  while (p < production.length || r < replies.length) {
    const pShare = p / production.length;
    const rShare = r / replies.length;
    if (r >= replies.length || (p < production.length && pShare <= rShare)) {
      out.push(production[p++]);
    } else {
      out.push(replies[r++]);
    }
  }
  return out;
}

/**
 * Splits each category into stages of at most STAGE_SIZE items. A trailing
 * remainder smaller than 4 is folded back into the previous part rather than
 * becoming a stage of one or two — a round samples from whatever the stage
 * holds, so a slightly over-full last part is harmless while a stage of one is
 * pointless.
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
    const mine = items.filter((i) => i.categoryId === category.id);
    if (mine.length === 0) continue;

    const ids = interleaveByRole(mine).map((i) => i.id);

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += STAGE_SIZE) {
      chunks.push(ids.slice(i, i + STAGE_SIZE));
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

export type QuestionForm = "choice" | "type" | "bank" | "match";

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
  /** Audio ids for the source-language sides only; English is never spoken. */
  shownAudio: string | null;
  answerAudio: string | null;
  options: string[]; // choice only
  tiles: string[]; // bank only
  pairs: MatchPair[]; // match only
}

/** One row of a matching screen: a phrase and the meaning it belongs to. */
export interface MatchPair {
  itemId: string;
  source: string;
  en: string;
}

/**
 * The clip ids for an item's two sides. These are carried on the item now
 * rather than derived from its id: a `say` item and the `reply` item from the
 * same exchange share a front clip but have different answer clips, which no
 * rule based on the item id alone could express.
 */
function audioIds(item: QuizItem): { front: string | null; answer: string | null } {
  return { front: item.frontAudioId, answer: item.answerAudioId };
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
  } else if (item.role === "say") {
    // The next line of the exchange. Forward shows the cue and asks what
    // follows; reversed shows the English of that line and asks you to produce
    // it. Both answer in the target language — production either way, which is
    // what earns the role its place in the front half of a round.
    if (reverse && !item.correctAnswerTranslation) return null;
    prompt = reverse ? "How do you say this?" : item.prompt;
    shown = reverse ? item.correctAnswerTranslation! : item.front;
    shownSub = reverse ? null : item.frontTranslation;
    answer = item.correctAnswer;
    answerSub = item.correctAnswerTranslation;
    answerLang = "source";
  } else {
    // Their comeback: always in the source language; reversing swaps the cue to
    // English so you're going from your language into theirs.
    if (reverse && !item.frontTranslation) return null;
    prompt = item.prompt;
    shown = reverse ? item.frontTranslation! : item.front;
    shownSub = reverse ? null : item.frontTranslation;
    answer = item.correctAnswer;
    answerSub = item.correctAnswerTranslation;
    answerLang = "source";
  }

  if (!answer) return null;

  const ids = audioIds(item);
  // Both kinds show the source-language side only in the forward direction.
  const sourceIsShown = !reverse;
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
    // A side gets audio only when it is in the source language.
    shownAudio: sourceIsShown ? ids.front : null,
    answerAudio: answerLang === "source" ? ids.answer : null,
    options: [],
    tiles: [],
    pairs: [],
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
 * A pairable item: one that has a target-language side and an English side, so
 * it can sit on a matching screen. `say` and `reply` items pair their line with
 * its translation; phrases pair the phrase with its meaning.
 */
function pairFor(item: QuizItem): MatchPair | null {
  // Keyed on `kind`, not `role`: kind is what says which field holds which
  // language. A `say` item can be either kind.
  const source = item.kind === "phrase" ? item.front : item.correctAnswer;
  const en = item.kind === "phrase" ? item.correctAnswer : item.correctAnswerTranslation;
  if (!source?.trim() || !en?.trim()) return null;
  return { itemId: item.id, source: source.trim(), en: en.trim() };
}

/**
 * One matching screen: MATCH_PAIRS phrases against their meanings.
 *
 * Both sides have to be unique after normalising. Two rows reading "No way"
 * would make the screen unanswerable — either assignment is defensible, so one
 * of them gets marked wrong for a reason the learner cannot see. Backfills from
 * the whole deck when the stage alone can't supply enough distinct rows.
 */
export function buildMatchQuestion(
  pool: QuizItem[],
  fallbackPool: QuizItem[] = [],
  count: number = MATCH_PAIRS
): Question | null {
  const pairs: MatchPair[] = [];
  const sources = new Set<string>();
  const meanings = new Set<string>();

  for (const source of [pool, fallbackPool]) {
    for (const item of shuffle(source)) {
      if (pairs.length >= count) break;
      const pair = pairFor(item);
      if (!pair) continue;
      const sk = normalizeAnswer(pair.source);
      const ek = normalizeAnswer(pair.en);
      if (!sk || !ek || sources.has(sk) || meanings.has(ek)) continue;
      sources.add(sk);
      meanings.add(ek);
      pairs.push(pair);
    }
    if (pairs.length >= count) break;
  }

  // Two rows is the floor at which matching is still a task rather than a
  // formality; below that the screen is dropped and the round runs shorter.
  if (pairs.length < 2) return null;

  const first = pool.find((i) => i.id === pairs[0].itemId) ?? pool[0];
  return {
    itemId: pairs[0].itemId,
    categoryId: first?.categoryId ?? "",
    categoryTitle: first?.categoryTitle ?? "",
    form: "match",
    prompt: "Match each phrase to its meaning",
    shown: "",
    shownSub: null,
    answer: "",
    answerSub: null,
    answerLang: "source",
    shownAudio: null,
    answerAudio: null,
    options: [],
    tiles: [],
    pairs,
  };
}

/** Draws up to `n` questions from `pool`, alternating direction. */
function drawQuestions(
  pool: QuizItem[],
  n: number,
  items: QuizItem[],
  fallbackPool: QuizItem[],
  startReversed: boolean
): { item: QuizItem; question: Question; reverse: boolean }[] {
  const out: { item: QuizItem; question: Question; reverse: boolean }[] = [];

  for (const item of shuffle(pool)) {
    if (out.length >= n) break;
    // Alternate so a block never ends up all one direction: you are asked both
    // to read the target language and to produce it.
    const wanted = out.length % 2 === 0 ? startReversed : !startReversed;
    const first = buildQuestion(item, wanted, "choice", items, fallbackPool);
    if (first) {
      out.push({ item, question: first, reverse: wanted });
      continue;
    }
    const flipped = buildQuestion(item, !wanted, "choice", items, fallbackPool);
    if (flipped) out.push({ item, question: flipped, reverse: !wanted });
  }

  return out;
}

type Draft = { item: QuizItem; question: Question; reverse: boolean };

/**
 * Ensures a block asks in both directions — pick the English meaning at least
 * once, and produce the target language at least once — by replacing one entry
 * when every question came out the same way round. Does nothing when the pool
 * genuinely can't supply the missing direction.
 */
function forceBothDirections(
  block: Draft[],
  pool: QuizItem[],
  items: QuizItem[],
  fallbackPool: QuizItem[]
): void {
  if (block.length < 2) return;
  const langs = new Set(block.map((d) => d.question.answerLang));
  if (langs.size > 1) return;

  const missing: AnswerLang = langs.has("en") ? "source" : "en";
  const used = new Set(block.map((d) => d.item.id));
  // An English answer is only available from a phrase-kind item, whose forward
  // direction is "what does this mean".
  const reverse = missing === "source";

  for (const source of [pool, fallbackPool]) {
    for (const candidate of shuffle(source)) {
      if (used.has(candidate.id)) continue;
      if (missing === "en" && candidate.kind !== "phrase") continue;
      const q = buildQuestion(candidate, reverse, "choice", items, fallbackPool);
      if (!q || q.answerLang !== missing) continue;
      block[block.length - 1] = { item: candidate, question: q, reverse };
      return;
    }
  }
}

/**
 * One round, composed by role rather than sampled from one bag.
 *
 * Four translation questions come from the material you produce — your own
 * lines and the phrasebook — in both directions. One matching screen pairs
 * phrases with meanings. At most three questions ask what the other person
 * comes back with, which is the cap that keeps the round about speaking rather
 * than guessing.
 *
 * The blocks are then dealt in a random order, except that a comeback question
 * can never land first: whatever else varies, a round opens with you producing
 * something.
 */
export function buildRound(
  items: QuizItem[],
  fallbackPool: QuizItem[] = items,
  length: number = ROUND_LENGTH
): Question[] {
  const scale = length / ROUND_LENGTH;
  const wantTranslation = Math.max(1, Math.round(TRANSLATION_PER_ROUND * scale));
  const wantReplies = Math.max(0, Math.round(REPLY_MAX_PER_ROUND * scale));

  const production = items.filter((i) => i.role !== "reply");
  const replies = items.filter((i) => i.role === "reply");

  // A stage of nothing but comebacks would otherwise render an empty round.
  const translationPool = production.length > 0 ? production : items;

  const translation = drawQuestions(
    translationPool,
    wantTranslation,
    items,
    fallbackPool,
    Math.random() < 0.5
  );

  // Alternating direction inside drawQuestions isn't enough on its own: a
  // dialogue line answers in the target language whichever way it's turned, so
  // a block drawn entirely from dialogue asks you to pick a target phrase four
  // times and never an English meaning. Only a phrase-kind item can be answered
  // in English, so if the block came out one-directional, swap one in.
  forceBothDirections(translation, translationPool, items, fallbackPool);
  const comebacks = drawQuestions(replies, wantReplies, items, fallbackPool, false);

  // Typing and assembly are recall, so they replace choice questions from the
  // production block only — being asked to type a line you have never seen,
  // because it happened to be someone else's comeback, is not a fair ask.
  const drafts = [...translation];
  let typed = 0;
  let banked = 0;
  const forms = drafts.map((d) => {
    if (typed < TYPED_PER_ROUND && typeable(d.question.answer)) {
      typed += 1;
      return "type" as QuestionForm;
    }
    if (banked < BANK_PER_ROUND && bankable(d.question.answer)) {
      banked += 1;
      return "bank" as QuestionForm;
    }
    return "choice" as QuestionForm;
  });

  const produced: Question[] = drafts.map((d, i) => {
    if (forms[i] === "choice") return d.question;
    return buildQuestion(d.item, d.reverse, forms[i], items, fallbackPool) ?? d.question;
  });

  const match = MATCH_PER_ROUND > 0 ? buildMatchQuestion(items, fallbackPool) : null;

  // Opening slot is drawn from the production block on purpose; everything else
  // is shuffled together, so no two rounds run in the same order.
  const opener = produced.length > 0 ? [shuffle(produced)[0]] : [];
  const openerId = opener[0];
  const rest = shuffle([
    ...produced.filter((q) => q !== openerId),
    ...(match ? [match] : []),
    ...comebacks.map((c) => c.question),
  ]);

  return [...opener, ...rest].slice(0, length);
}
