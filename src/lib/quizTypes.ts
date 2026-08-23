// Client-safe half of the quiz layer.
//
// IMPORTANT: this file must never import ../lib/content (or anything that
// does). Client components import from here so that no content JSON is pulled
// into the browser bundle — the quiz data itself arrives from
// /api/quiz-items, which checks entitlement server-side. Importing content
// here would silently re-open the paywall hole this split exists to close.

/**
 * What an item is:
 *   situation — a moment described in English; you produce the line it calls for
 *   phrase    — a phrase and its meaning, testable in either direction
 *
 * There is deliberately no "what would they say back" kind. Guessing someone
 * else's line is not the skill this deck teaches; their reply is shown after
 * you answer, as the payoff, never asked as a question.
 */
export type ItemKind = "situation" | "phrase";

/** A line of the target language with its English meaning. */
export interface Line {
  source: string;
  en: string | null;
}

export interface QuizItem {
  id: string;
  categoryId: string;
  categoryTitle: string;
  /** The subsection it came from — the ring of items closest to it in meaning. */
  subsectionId: string;
  kind: ItemKind;
  prompt: string;
  /** Situation: the English scene. Phrase: the target-language phrase. */
  front: string;
  frontTranslation: string | null;
  /** Situation: the line you produce. Phrase: the English meaning. */
  correctAnswer: string;
  correctAnswerTranslation: string | null;
  /** What they say back, revealed once the question is settled. */
  reply: Line | null;
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
 * What one round is made of: five situations, one matching screen, two
 * translation questions. Order is shuffled every run, except that a round
 * always opens on a situation — that is the thing being taught.
 *
 * Nothing asks what the other person would say. Their reply is shown after
 * each situation settles instead.
 */
export const SITUATIONS_PER_ROUND = 5;
export const MATCH_PER_ROUND = 1;
export const TRANSLATION_PER_ROUND = 2;
export const ROUND_LENGTH = SITUATIONS_PER_ROUND + MATCH_PER_ROUND + TRANSLATION_PER_ROUND;

/** Phrases paired off on one matching screen. */
export const MATCH_PAIRS = 4;

/**
 * At most one of the two translation slots may become a typed or assembled
 * question. Both are recall rather than recognition and worth keeping, but with
 * only two slots, converting both would leave the round with no translation
 * multiple choice at all. Situations are always multiple choice.
 */
export const RECALL_PER_ROUND = 1;

/**
 * Items per stage. Deliberately larger than a round: a round samples from a
 * stage, so a stage wants more material than one round uses.
 */
export const STAGE_SIZE = 12;

/**
 * Best-score percentage at which a stage counts as cleared.
 *
 * Set from the miss allowance rather than picked as a round number: a round is
 * ROUND_LENGTH questions and you may drop two of them, which is what clearing
 * has always meant here. Leaving this at 80 while the round shrank from ten
 * questions to eight quietly moved the bar to 7/8 (88%), because 6/8 is 75%
 * and no longer reaches it. Anything reading this — including the copy on the
 * path — must use the constant, never the number.
 */
export const CLEAR_MISS_ALLOWANCE = 2;
export const STAGE_CLEAR_SCORE = Math.round(
  ((ROUND_LENGTH - CLEAR_MISS_ALLOWANCE) / ROUND_LENGTH) * 100
);

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
 * Spreads a category's situation items and phrase items evenly before it is
 * chunked into stages, so no stage ends up made of only one kind and unable to
 * build a full round.
 */
function interleaveByKind(items: QuizItem[]): QuizItem[] {
  const situations = items.filter((i) => i.kind === "situation");
  const phrases = items.filter((i) => i.kind === "phrase");
  if (situations.length === 0 || phrases.length === 0) return items;

  const out: QuizItem[] = [];
  let a = 0;
  let b = 0;
  // Take from whichever bucket has fallen furthest behind its share, so the mix
  // stays even at every prefix — which is what chunking actually reads.
  while (a < situations.length || b < phrases.length) {
    const aShare = a / situations.length;
    const bShare = b / phrases.length;
    if (b >= phrases.length || (a < situations.length && aShare <= bShare)) {
      out.push(situations[a++]);
    } else {
      out.push(phrases[b++]);
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

    const ids = interleaveByKind(mine).map((i) => i.id);

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
  /** Shown after the question settles: what they'd come back with. */
  reply: Line | null;
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

  if (item.kind === "situation") {
    // Situations run one way only. The scene is in English and the answer is
    // the line you'd say — reversing it would mean showing the target line and
    // asking which situation it belongs to, which tests nothing useful.
    prompt = item.prompt;
    shown = item.front;
    shownSub = null;
    answer = item.correctAnswer;
    answerSub = item.correctAnswerTranslation;
    answerLang = "source";
  } else if (reverse) {
    if (!item.correctAnswer || !item.front) return null;
    // Same reasoning as pairFor: translating a template teaches the scaffolding
    // rather than the language. No phrase in the deck carries a slot today, so
    // this costs nothing now and stops the case arising as content grows.
    if (hasPlaceholder(item.front) || hasPlaceholder(item.correctAnswer)) return null;
    prompt = "How do you say this?";
    shown = item.correctAnswer; // English gloss
    shownSub = null;
    answer = item.front; // source phrase
    answerSub = null;
    answerLang = "source";
  } else {
    if (hasPlaceholder(item.front) || hasPlaceholder(item.correctAnswer)) return null;
    prompt = "What does this mean?";
    shown = item.front;
    shownSub = null;
    answer = item.correctAnswer;
    answerSub = null;
    answerLang = "en";
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
    // The scene of a situation is English, so only the answer is ever spoken.
    // A phrase shows its source side only in the forward direction.
    shownAudio: item.kind === "phrase" && !reverse ? item.frontAudioId : null,
    answerAudio: answerLang === "source" ? item.answerAudioId : null,
    reply: item.reply,
    options: [],
    tiles: [],
    pairs: [],
  };

  if (form === "choice") {
    question.options = buildOptions(answer, answerLang, pool, fallbackPool, item);
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
  fallbackPool: QuizItem[] = [],
  self?: QuizItem
): string[] {
  const seen = new Set([normalizeAnswer(answer)]);
  const distractors: string[] = [];

  // A subsection is a ring of lines about one moment, and in some of them —
  // "Déjame en paz", "No me toques", "¡Suéltame!" — several are a defensible
  // answer to the same situation. Drawing a distractor from that ring marks a
  // right instinct wrong, so siblings go last: the two wider pools are tried
  // first, and same-subsection lines fill in only when nothing else can.
  const sibling = (i: QuizItem) => !!self && i.subsectionId === self.subsectionId && i.id !== self.id;
  const near = (list: QuizItem[]) => list.filter(sibling);
  const far = (list: QuizItem[]) => list.filter((i) => !sibling(i));

  const sources = self
    ? [far(pool), far(fallbackPool), near(pool), near(fallbackPool)]
    : [pool, fallbackPool];

  for (const source of sources) {
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
  const source = item.kind === "phrase" ? item.front : item.correctAnswer;
  const en = item.kind === "phrase" ? item.correctAnswer : item.correctAnswerTranslation;
  if (!source?.trim() || !en?.trim()) return null;

  // A line with a fill-in slot is a template, not a phrase, and a board pairs
  // phrases with their meanings. Worse, the slot names are themselves
  // localised — Swedish authors [ORD] where the English says [WORD] — so a
  // board could pair "Hur säger man [ORD] på svenska?" with "How do you say
  // [WORD] in Swedish?" and appear to be teaching that ORD means WORD. The
  // placeholder is scaffolding; it is never the thing being learned.
  if (hasPlaceholder(source) || hasPlaceholder(en)) return null;

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
  count: number = MATCH_PAIRS,
  /**
   * What this round has already claimed: item ids, and the normalised lines
   * themselves. Ids alone are not enough — the same line can exist as two
   * items (German has "Servus" twice), and excluding one leaves the other free
   * to give the answer away.
   */
  exclude: Set<string> = new Set()
): Question | null {
  const pairs: MatchPair[] = [];
  const sources = new Set<string>();
  const meanings = new Set<string>();

  for (const source of [pool, fallbackPool]) {
    for (const item of shuffle(source)) {
      if (pairs.length >= count) break;
      // The board shows each phrase next to its meaning. Pairing a line that a
      // later question asks for hands over that answer, and since the order is
      // shuffled the board lands first about half the time.
      if (exclude.has(item.id)) continue;
      const pair = pairFor(item);
      if (!pair) continue;
      const sk = normalizeAnswer(pair.source);
      const ek = normalizeAnswer(pair.en);
      if (!sk || !ek || sources.has(sk) || meanings.has(ek)) continue;
      // Either half of the pair giving away a question is a leak: the board
      // shows both sides at once, so it doesn't matter which one is asked for.
      if (exclude.has(sk) || exclude.has(ek)) continue;
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
    reply: null,
    options: [],
    tiles: [],
    pairs,
  };
}

type Draft = { item: QuizItem; question: Question; reverse: boolean };

/**
 * Ensures the translation block asks in both directions — pick the English
 * meaning at least once, produce the target language at least once — by
 * replacing one entry when both came out the same way round.
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
  const reverse = missing === "source";

  for (const source of [pool, fallbackPool]) {
    for (const candidate of shuffle(source)) {
      if (used.has(candidate.id) || candidate.kind !== "phrase") continue;
      const q = buildQuestion(candidate, reverse, "choice", items, fallbackPool);
      if (!q || q.answerLang !== missing) continue;
      block[block.length - 1] = { item: candidate, question: q, reverse };
      return;
    }
  }
}

/** Draws up to `n` questions from `pool`, alternating direction. */
function drawQuestions(
  pool: QuizItem[],
  n: number,
  items: QuizItem[],
  fallbackPool: QuizItem[],
  startReversed: boolean
): Draft[] {
  const out: Draft[] = [];

  for (const item of shuffle(pool)) {
    if (out.length >= n) break;
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

/**
 * One round: five situations, one matching screen, two translation questions.
 *
 * A situation names a moment in English and asks for the line it calls for —
 * that is the whole point of the deck, so it is the bulk of the round and
 * always the opening question. Nothing asks what the other person would say;
 * their reply is carried on the question and shown once you've answered.
 *
 * Everything after the opener is shuffled, so no two rounds run in the same
 * order. Both blocks backfill from the wider deck when a stage is short of one
 * kind, rather than letting a round come up under length.
 */
export function buildRound(
  items: QuizItem[],
  fallbackPool: QuizItem[] = items,
  length: number = ROUND_LENGTH
): Question[] {
  const scale = length / ROUND_LENGTH;
  const wantSituations = Math.max(0, Math.round(SITUATIONS_PER_ROUND * scale));
  const wantTranslation = Math.max(1, Math.round(TRANSLATION_PER_ROUND * scale));

  const stageSituations = items.filter((i) => i.kind === "situation");
  const stagePhrases = items.filter((i) => i.kind === "phrase");
  const morePhrases = fallbackPool.filter(
    (i) => i.kind === "phrase" && !items.some((x) => x.id === i.id)
  );

  // Compose from what this stage actually holds. Situations are never borrowed
  // from elsewhere: a stage is one category, and a Slang round filled with
  // five taxi situations is no longer a Slang round. Two thirds of the stages
  // in this deck are phrasebook-only, so this is the common case, not an edge
  // one — whatever a stage can't fill with situations it fills with its own
  // translation questions instead, and a phrasebook stage is simply all
  // translation and matching.
  const situations = drawQuestions(stageSituations, wantSituations, items, fallbackPool, false);
  const shortfall = wantSituations - situations.length;
  const translationSlots = wantTranslation + shortfall;

  const translation = drawQuestions(
    stagePhrases.length >= translationSlots ? stagePhrases : [...stagePhrases, ...morePhrases],
    translationSlots,
    items,
    fallbackPool,
    Math.random() < 0.5
  );
  forceBothDirections(translation, [...stagePhrases, ...morePhrases], items, fallbackPool);

  // At most one translation slot becomes typing or assembly. Situations stay
  // multiple choice: the answer is a whole spoken line, and typing one from a
  // standing start is a different, much harder exercise than choosing it.
  let recall = 0;
  const translated: Question[] = translation.map((d) => {
    if (recall < RECALL_PER_ROUND) {
      const form: QuestionForm | null = typeable(d.question.answer)
        ? "type"
        : bankable(d.question.answer)
          ? "bank"
          : null;
      if (form) {
        recall += 1;
        return buildQuestion(d.item, d.reverse, form, items, fallbackPool) ?? d.question;
      }
    }
    return d.question;
  });

  // Built last, from what the questions didn't claim, so the board can't show
  // a line the round is about to ask for.
  const spokenFor = new Set<string>();
  for (const d of [...situations, ...translation]) {
    spokenFor.add(d.item.id);
    spokenFor.add(normalizeAnswer(d.question.answer));
    spokenFor.add(normalizeAnswer(d.question.shown));
  }
  const match =
    MATCH_PER_ROUND > 0 ? buildMatchQuestion(items, fallbackPool, MATCH_PAIRS, spokenFor) : null;

  const situationQs = situations.map((d) => d.question);
  // A round opens on a situation wherever it has one; a phrasebook stage has
  // none, so it opens on translation instead.
  const opener = situationQs.length > 0 ? [situationQs[0]] : translated.slice(0, 1);
  const rest = shuffle([
    ...situationQs.slice(1),
    ...(situationQs.length > 0 ? translated : translated.slice(1)),
    ...(match ? [match] : []),
  ]);

  return [...opener, ...rest].slice(0, length);
}
