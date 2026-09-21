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
  /**
   * The other lines the author wrote for this same moment.
   *
   * An exchange is allowed more than one answer, and where it has them they
   * are alternatives rather than a first choice and some runners-up: "Tja!"
   * and "Hej!" are both what you say when a Swede says "Tja!". The deck used
   * to ask the situation and then accept only `answers[0]`, so typing the
   * other authored line — the one printed on the scenario page, under the
   * same scene — came back wrong. These are accepted too, and kept out of the
   * multiple-choice options, where a second right answer is unanswerable.
   */
  alsoAccepted: string[];
  /** What they say back, revealed once the question is settled. */
  reply: Line | null;
  /** Ids of the generated clips, or null where the side has no spoken line. */
  frontAudioId: string | null;
  answerAudioId: string | null;
}

/**
 * The line an item teaches, with what it means.
 *
 * Which field holds which depends on the kind, and the two are mirror images:
 * a situation shows the English scene and asks you to produce the line, so the
 * line is `correctAnswer`; a phrase shows the line and asks what it means, so
 * the line is `front`. Reading the wrong one gives a round summary that lists
 * English back at somebody who just typed Spanish.
 *
 * The gloss goes through `splitNote`, which is what the quiz screens use: the
 * content writes "A small draft beer, please — how locals order" in one field,
 * and the aside is not part of what the line means.
 */
export function wonLine(item: QuizItem): { source: string; en: string | null } {
  if (item.kind === "situation") {
    return {
      source: item.correctAnswer,
      en: item.correctAnswerTranslation ? splitNote(item.correctAnswerTranslation).text : null,
    };
  }
  return { source: item.front, en: splitNote(item.correctAnswer).text || null };
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
  // Arriving, then the slang that makes the rest of it make sense, then the
  // bar. Slang sits second because it is the most interesting thing here and
  // the reason somebody picked this over a textbook — burying it at stage
  // seven meant most people would never reach it.
  "getting-around",
  "slang",
  "beer-food",
  "hotel",
  "starting-convo",
  "restaurant",
  "shopping",
  "bayern-slang",
  "berlin-slang",
  "nightlife",
  "flirting",
  "cuss-words",
  // The night in order: how drunk you are, then the morning that follows it.
  "drunk-scale",
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
 * than one category at a time.
 *
 * It used to be defined as every phrase-kind item, on the reasoning that a
 * phrasebook entry *was* slang. That stopped being true once those sections
 * were rewritten as scenes: the slang is still there, it is just inside a
 * moment now, and a final drawn on kind alone would have been the handful of
 * words left over — every question a definition, which is the shape the
 * rewrite existed to get away from. So it reads the sections by name, and
 * keeps the loose words beside them.
 */
export const SLANG_FINAL_ID = "__slang-final__";

const SLANG_STAGES = new Set([
  "slang",
  "cuss-words",
  "flirting",
  "bayern-slang",
  "berlin-slang",
]);

export function slangFinalItems(items: QuizItem[]): QuizItem[] {
  return items.filter(
    (i) => SLANG_STAGES.has(stageKeyOf(i.categoryId)) || i.kind === "phrase"
  );
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
 * Splits each category into parts of around STAGE_SIZE items, sized evenly.
 *
 * How many parts is decided first — ceiling, with a remainder smaller than 4
 * folded back, so a category never ends on a stage of one or two — and then
 * the items are dealt out across that many parts rather than filled one at a
 * time. Greedy filling gave 16 items a 12 and a 4, and a stage of four cannot
 * build a round out of its own material: most of what it asked came from
 * somewhere else, while the part before it was full. Two parts of eight each
 * stand on their own, and the path shows the same number of parts either way.
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

    let parts = Math.max(1, Math.ceil(ids.length / STAGE_SIZE));
    if (parts > 1 && ids.length - (parts - 1) * STAGE_SIZE < 4) parts -= 1;

    const chunks: string[][] = [];
    let cut = 0;
    for (let i = 0; i < parts; i++) {
      // What is left, spread over the parts that are left: the sizes come out
      // within one of each other however the division falls.
      const size = Math.ceil((ids.length - cut) / (parts - i));
      chunks.push(ids.slice(cut, cut + size));
      cut += size;
    }

    chunks.forEach((chunk, i) => {
      const multi = chunks.length > 1;
      stages.push({
        id: multi ? `${category.id}#${i + 1}` : category.id,
        categoryId: category.id,
        title: multi ? `${category.title}: Part ${i + 1}` : category.title,
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
    // Everything a keyboard puts between words. `_` and `[]` survive on
    // purpose: they are how a fill-in slot is authored, and slotPattern reads
    // them back off this same normalised form.
    .replace(/[¿¡?!.,;:"'’‘‚“”„«»()\-–—/…·•*~`´^{}<>|+=&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * How many typos a word or line of this length is allowed before it stops
 * being the same thing.
 *
 * Deliberately mean at the short end. One edit is most of a five-letter word
 * and Spanish is full of pairs that differ by exactly one — "pero" and
 * "perro", "vamos" and "somos" — so nothing under six characters gets any
 * slack at all. Past that it is roughly one slip per ten characters: enough
 * for a doubled letter, a missing one or two fingers landing out of order in a
 * line long enough that no other line is that close to it.
 */
export function editBudget(length: number): number {
  if (length < 6) return 0;
  if (length < 12) return 1;
  if (length < 22) return 2;
  return 3;
}

/**
 * Damerau-Levenshtein, asked as a yes/no question.
 *
 * The full distance is never interesting here — only whether two strings are
 * within `budget` edits of each other — so the row is abandoned as soon as
 * every cell in it has already spent more than that. Transpositions count as
 * one edit rather than two, because "eine" for "eien" is one slip of the hand.
 */
export function withinEdits(a: string, b: string, budget: number): boolean {
  if (a === b) return true;
  if (budget <= 0) return false;
  if (Math.abs(a.length - b.length) > budget) return false;

  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  let row: number[] = [];

  for (let i = 1; i <= a.length; i++) {
    row = new Array(b.length + 1);
    row[0] = i;
    let best = row[0];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prev2[j - 2] + 1);
      }
      row[j] = value;
      if (value < best) best = value;
    }

    if (best > budget) return false;
    prev2 = prev;
    prev = row;
  }

  return prev[b.length] <= budget;
}

/** The same line typed with a slip or two in it. Spacing is not the test. */
export function nearlyTyped(given: string, expected: string): boolean {
  const key = (text: string) => normalizeAnswer(text).replace(/\s+/g, "");
  const typed = key(given);
  const target = key(expected);
  if (!typed || !target) return false;
  return withinEdits(typed, target, editBudget(target.length));
}

/**
 * Splits a line into the part you are actually being asked for and the aside
 * the author attached to it.
 *
 * Content is written with register and usage notes baked into the line —
 * "All good (casual).", "A pale lager, please — common in the south.",
 * "Dude! / bro! — tone matters." Those asides are worth reading, but they are
 * commentary, not the answer: making someone type "(informal)" to be marked
 * right tests transcription, not the language. So the aside comes off the
 * answer and is shown in the verdict drawer once the question is settled,
 * which is also where it does the most good — you see the difference at the
 * moment you find out whether you had it.
 *
 * Only a *trailing* aside is split off. "(kein) Bock" and "Where are you (all)
 * from?" carry their parentheses mid-line, where they are part of the phrase,
 * and a mid-line dash is prose. Exactly one aside is taken, and never both
 * kinds: "I'm never drinking again (ever) — everyone lies." keeps its "(ever)".
 */
const TRAILING_PAREN = /\s*\(([^()]{1,80})\)\s*[.!?\u2026]*\s*$/;
const TRAILING_DASH = /\s+[\u2014\u2013]\s+([^\u2014\u2013]{1,80})\s*$/;

/**
 * `dash: false` reads only the bracketed form.
 *
 * A dash is a reliable aside marker in a *gloss* — a phrase entry is authored
 * as its meaning plus commentary, and "I mean / like — constant, and fills the
 * same slot as en plan" is exactly that. It is not reliable in a
 * *translation*, where a dash is ordinary sentence punctuation: "No — a half,
 * please." is one sentence, and taking the dash clause off leaves "No", which
 * explains nothing and, asked as a cue, identifies no line at all. Across the
 * three decks the dash rule was reading about ninety translations that way and
 * only a handful of real notes.
 *
 * Brackets stay on in both, because "(casual)" and "(informal du)" are
 * commentary wherever they appear.
 */
export function splitNote(
  text: string,
  options: { dash?: boolean } = {}
): { text: string; note: string | null } {
  const trimmed = text.trim();
  const patterns = options.dash === false ? [TRAILING_PAREN] : [TRAILING_PAREN, TRAILING_DASH];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const core = trimmed.slice(0, match.index).trim();
    // A line that is nothing but its aside — "(informal)" on its own — has no
    // answer left once the aside is removed, so it keeps it.
    if (core.length < 2) continue;
    const note = match[1].trim().replace(/\.$/, "");
    return {
      text: pattern === TRAILING_PAREN ? `${core}${endPunctuation(core, trimmed)}` : core,
      note,
    };
  }

  return { text: trimmed, note: null };
}

/**
 * The sentence punctuation a parenthetical was sitting in front of — "Until six
 * (a.m.)." ends in a full stop that belongs to the sentence, not to the aside.
 */
function endPunctuation(core: string, text: string): string {
  // "Like… (filler)." and "…a drink? (mutual interest)." already close their
  // own sentence; putting the trailing stop back would double it.
  if (/[.!?\u2026]$/.test(core)) return "";
  const match = text.match(/\)\s*([.!?\u2026]+)\s*$/);
  return match ? match[1] : "";
}

/** Just the answerable half of a line, with any trailing aside removed. */
export function coreOf(text: string): string {
  return splitNote(text).text;
}

/**
 * The same, for a line of English that translates something rather than
 * explaining it. See `splitNote`.
 */
export function translationCore(text: string): string {
  return splitNote(text, { dash: false }).text;
}

/**
 * True when two answers are the same line. The comparison is made on the core
 * of each side, so someone who types the authored aside is right and so is
 * someone who leaves it off.
 *
 * This is the strict one, and it is what decides whether a multiple-choice
 * option is the right one. Grading what a person typed uses
 * `typedAnswerMatches` below, which is looser in ways that would be wrong
 * here: two options that differ only in spacing would both come back correct,
 * and a question with two right answers is unanswerable.
 */
export function answersMatch(given: string, expected: string): boolean {
  if (normalizeAnswer(given) === normalizeAnswer(expected)) return true;
  return normalizeAnswer(coreOf(given)) === normalizeAnswer(coreOf(expected));
}

/**
 * A line, and each side of it where it offers a choice.
 *
 * "¡Perdona! / ¡Oye!" and "Pfiat di! / Pfiat eich!" are written with a slash
 * to teach that both exist. Producing one of them is the whole skill, so
 * either counts, and so does the full line for anybody who types it out.
 *
 * Splitting on the slash is deliberately unfussy. It also lets "a plasta"
 * through for "un/a plasta", which is generous rather than wrong: the cost of
 * accepting a shorter true answer is nothing, and the cost of rejecting
 * "achispado" for "achispado/a" is a learner who typed the right word being
 * told they did not. A side of one character is dropped, so the /a itself is
 * never an answer on its own.
 */
function variantsOf(line: string): string[] {
  const whole = coreOf(line);
  if (!whole.includes("/")) return [whole];
  const sides = whole
    .split("/")
    .map((side) => side.trim())
    .filter((side) => side.length > 1);
  return [whole, ...sides];
}

/**
 * True when what somebody typed or assembled is the line the deck holds.
 *
 * Case, accents, punctuation and ß/ø/æ already come off in normalizeAnswer —
 * nobody should lose a question to a missing diacritic or a full stop. Two
 * more things come off here, both of which were marking correct answers wrong:
 *
 * **Spacing, entirely.** A punctuation mark inside a word splits it in two:
 * "Wusste ich's doch" normalises to four tokens and "Wusste ichs doch" to
 * three, so a line typed perfectly on a keyboard without a convenient
 * apostrophe came back wrong. The same went for "secondhand" against
 * "second-hand". Word boundaries are not what a typed question is testing, so
 * this comparison ignores them.
 *
 * **A slash variant** — see `variantsOf`.
 *
 * **A typo.** A line typed out in full with one letter wrong is the line, not
 * a different answer, and telling somebody otherwise teaches them to distrust
 * their own spelling rather than to speak. See `editBudget` for how much slack
 * a line of a given length gets.
 */
export function typedAnswerMatches(given: string, expected: string): boolean {
  if (answersMatch(given, expected)) return true;
  const key = (text: string) => normalizeAnswer(text).replace(/\s+/g, "");
  const typed = key(coreOf(given));
  if (!typed) return false;
  const variants = variantsOf(expected);
  if (variants.some((variant) => key(variant) === typed)) return true;
  return variants.some((variant) => nearlyTyped(typed, variant));
}

/**
 * True when what was typed or assembled answers the question at all.
 *
 * A scene with two authored lines has two right answers, and which one the
 * deck happens to hold first is not something the learner can see. Both count.
 */
export function answeredIt(given: string, accepted: string[]): boolean {
  return accepted.some((line) => typedAnswerMatches(given, line));
}

/** The same, for an option picked off a list rather than typed. */
export function pickedIt(option: string, accepted: string[]): boolean {
  return accepted.some((line) => answersMatch(option, line));
}

/**
 * True when two lines say close enough to the same thing that offering them as
 * rival answers is a trick rather than a question.
 *
 * "A beer, please." against "A small/pint-size beer, please." is the case this
 * exists for: both are what "¿Una caña porfa?" means, so whichever one the deck
 * happens to hold gets marked wrong for no reason the learner can see. Exact
 * duplicates were already caught; near-duplicates were not.
 *
 * Two tests, because the failure has two shapes. One line containing all of
 * another's words is the first — the longer is the shorter plus detail. Heavy
 * overlap without containment is the second. Contrasting answers are safe from
 * both: "Draft, thanks." and "Bottle, thanks." share only "thanks", which is
 * one word in three, and contrast is exactly what a distractor is for.
 */
export function tooAlike(a: string, b: string): boolean {
  const ta = new Set(normalizeAnswer(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeAnswer(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return false;

  const shared = [...ta].filter((t) => tb.has(t)).length;
  if (shared === Math.min(ta.size, tb.size)) return true;
  return shared / (ta.size + tb.size - shared) >= 0.6;
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
  /**
   * The aside the author attached to the answer — register, region, tone.
   * Never part of what you have to produce; shown in the drawer once the
   * question settles, which is where the difference it marks is worth seeing.
   */
  answerNote: string | null;
  /**
   * Every line that counts as having answered this question, `answer` first.
   *
   * More than one only where the author wrote more than one for the same
   * moment, and only when the question is asked forward — "someone greets you,
   * what do you say?" has as many right answers as the exchange has lines.
   * Asked backwards it is a translation of one specific line, so the set is
   * that line alone.
   */
  accepted: string[];
  answerLang: AnswerLang;
  /**
   * True when the answer is a line the learner would actually say in the
   * moment — a situation asked forward. That is what lets the drawer report it
   * back as "you said" and follow it with their reply; a translation question
   * has no scene for either to belong to.
   */
  saidByYou: boolean;
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
  // Distractors are shown next to the answer, and the answer has had its aside
  // taken off. Leaving one on a distractor would make it the odd option out.
  // Which aside, though, is the same question buildQuestion answers: a dash is
  // commentary in a phrase's gloss and punctuation in a situation's
  // translation, so cutting at one there would shorten a distractor past the
  // point where it says anything.
  if (lang === "source") {
    const text = item.kind === "phrase" ? item.front : item.correctAnswer;
    return text ? coreOf(text) : "";
  }
  const text = item.kind === "phrase" ? item.correctAnswer : item.correctAnswerTranslation ?? "";
  if (!text) return "";
  return item.kind === "phrase" ? coreOf(text) : translationCore(text);
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

  if (item.kind === "situation" && reverse) {
    // The same line asked from the other side: here is what it means, produce
    // it. Not a situation question — no scene, no reply — but it is the same
    // material seen from a second angle, which is how a three-item stage fills
    // a round without importing anything.
    if (!item.correctAnswerTranslation || hasPlaceholder(item.correctAnswer)) return null;
    prompt = "How do you say this?";
    shown = item.correctAnswerTranslation;
    shownSub = null;
    answer = item.correctAnswer;
    answerSub = null;
    answerLang = "source";
  } else if (item.kind === "situation") {
    // Forward: the scene is in English and the answer is the line you'd say.
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

  // The aside comes off every side of the question. It is off the answer so it
  // never has to be typed or assembled, off the cue so the two directions of
  // the same item read the same way, and back on in `answerNote` so the drawer
  // can show what it was marking.
  //
  // How much comes off depends on what the text is, not on which slot it sits
  // in. A phrase's English is a gloss, authored with its commentary attached,
  // and both the bracket and the dash forms are asides there. A situation's
  // English is the translation of a line somebody says — nobody ever types it,
  // all of it is the meaning, and a dash in it is punctuation. Reading a dash
  // as an aside there cut "Better not — I'm hammered." down to "Better not",
  // which is no use as a subtitle and unanswerable as a cue.
  const glossed = item.kind === "phrase";
  const split = splitNote(answer);
  answer = split.text;
  const subSplit = answerSub ? splitNote(answerSub, { dash: glossed }) : null;
  answerSub = subSplit ? subSplit.text : null;
  const answerNote = split.note ?? subSplit?.note ?? null;
  shown = glossed ? coreOf(shown) : translationCore(shown);

  // The siblings ride along only on the forward direction. Reversed, the cue
  // is the English of this line and no other, so a second line answering it
  // would be answering a question that wasn't asked.
  const forwardSituation = item.kind === "situation" && !reverse;
  const accepted = [
    answer,
    ...(forwardSituation ? item.alsoAccepted.map((line) => splitNote(line).text) : []),
  ].filter((line, i, all) => line && all.findIndex((x) => answersMatch(x, line)) === i);

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
    answerNote,
    accepted,
    answerLang,
    saidByYou: forwardSituation,
    // The scene of a situation is English, so only the answer is ever spoken.
    // A phrase shows its source side only in the forward direction.
    shownAudio: item.kind === "phrase" && !reverse ? item.frontAudioId : null,
    answerAudio: answerLang === "source" ? item.answerAudioId : null,
    // The reply belongs to the scene. A reversed situation has no scene, so
    // showing "they'd say back" under it would be answering a question that
    // was never asked.
    reply: item.kind === "situation" && reverse ? null : item.reply,
    options: [],
    tiles: [],
    pairs: [],
  };

  if (form === "choice") {
    question.options = buildOptions(answer, answerLang, pool, fallbackPool, item, shown, accepted);
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
  self?: QuizItem,
  /**
   * The line the question is asking about. A distractor whose own cue is this
   * cue is a second right answer wearing a different coat — "¿Una caña porfa?"
   * and "Una cerveza, por favor." both mean "a beer, please", so offering one
   * as the wrong answer to the other's meaning is unanswerable.
   */
  cue?: string,
  /**
   * Every line that would be marked right, so none of them is offered as a
   * wrong one. An exchange written with two answers to the same scene has two
   * right boxes on the screen if this is not honoured.
   */
  alsoRight: string[] = []
): string[] {
  const seen = new Set([normalizeAnswer(answer), ...alsoRight.map(normalizeAnswer)]);
  const distractors: string[] = [];
  const otherLang: AnswerLang = answerLang === "source" ? "en" : "source";

  // A subsection is a ring of lines about one moment, and in some of them —
  // "Déjame en paz", "No me toques", "¡Suéltame!" — several are a defensible
  // answer to the same situation. Drawing a distractor from that ring marks a
  // right instinct wrong, so siblings go last: the two wider pools are tried
  // first, and same-subsection lines fill in only when nothing else can.
  const sibling = (i: QuizItem) => !!self && i.subsectionId === self.subsectionId && i.id !== self.id;
  const sameCat = (i: QuizItem) => !!self && i.categoryId === self.categoryId;
  const near = (list: QuizItem[]) => list.filter(sibling);
  const far = (list: QuizItem[]) => list.filter((i) => !sibling(i));

  // Same category before anything else: a wrong answer from the topic you are
  // on is a real distractor, where one borrowed from Bayern slang inside a
  // restaurant question just tells you which option is the odd one out. Same
  // subsection stays last for the opposite reason — those lines are often all
  // defensible answers to the same situation.
  const sources = self
    ? [
        far(pool).filter(sameCat),
        far(fallbackPool).filter(sameCat),
        far(pool).filter((i) => !sameCat(i)),
        far(fallbackPool).filter((i) => !sameCat(i)),
        near(pool),
        near(fallbackPool),
      ]
    : [pool, fallbackPool];

  // Both guards first. If the deck genuinely cannot fill four boxes under them
  // — a tiny category early on the path — they are given up one at a time
  // rather than handing back a two-option "multiple" choice. Ambiguity is worth
  // avoiding; a question with no wrong answers to pick from is worse.
  for (const guard of ["both", "answer", "none"] as const) {
    for (const source of sources) {
      for (const item of shuffle(source)) {
        if (distractors.length >= 3) break;
        const candidate = answerTextFor(item, answerLang);
        if (!candidate) continue;
        const key = normalizeAnswer(candidate);
        if (seen.has(key)) continue;
        // Rejected on either side: a line that means what the answer means, or
        // one that answers the same cue by another route.
        if (guard !== "none" && alsoRight.some((right) => tooAlike(candidate, right))) continue;
        if (guard !== "none" && tooAlike(candidate, answer)) continue;
        if (guard === "both" && cue && tooAlike(answerTextFor(item, otherLang), cue)) continue;
        seen.add(key);
        distractors.push(candidate);
      }
      if (distractors.length >= 3) break;
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

  // Same reason as the answer itself: a board row is a phrase against its
  // meaning, and "Very casual" is neither.
  return { itemId: item.id, source: coreOf(source), en: coreOf(en) };
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
   * Items the round already asked about, in the order it asked them. The board
   * is built from these first: pairing what you just worked through turns it
   * into reinforcement, and it is the only way a three-item stage gets a board
   * of its own material rather than four imported rows.
   */
  prefer: QuizItem[] = []
): Question | null {
  const pairs: MatchPair[] = [];
  const sources = new Set<string>();
  const meanings = new Set<string>();

  const claimed = new Set(prefer.map((i) => i.id));
  // Round material first, then the rest of this stage, then whatever the caller
  // allows as a wider pool. Nothing is excluded any more: a board that repeats
  // a line the round already covered is reinforcement, not a leak, because you
  // have already been shown the answer.
  const sources_ = [
    prefer,
    shuffle(pool.filter((i) => !claimed.has(i.id))),
    shuffle(fallbackPool.filter((i) => !claimed.has(i.id) && !pool.some((p) => p.id === i.id))),
  ];

  for (const source of sources_) {
    for (const item of source) {
      if (pairs.length >= count) break;
      const pair = pairFor(item);
      if (!pair) continue;
      const sk = normalizeAnswer(pair.source);
      const ek = normalizeAnswer(pair.en);
      if (!sk || !ek || sources.has(sk) || meanings.has(ek)) continue;
      // Near-duplicates make a board unanswerable for the same reason exact
      // ones do: two rows that mean the same thing can be paired either way
      // round, and one of the two assignments is marked wrong.
      if (pairs.some((p) => tooAlike(p.source, pair.source) || tooAlike(p.en, pair.en))) continue;
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
    answerNote: null,
    // A matching screen scores row by row against its own pairs; there is no
    // single line for the typed comparison to accept.
    accepted: [],
    answerLang: "source",
    saidByYou: false,
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
  /**
   * Everything the learner has already reached: this stage plus every stage
   * before it on the path. Never the whole deck. When a stage is too small to
   * fill a round on its own the shortfall is borrowed from here, so an import
   * is always revision of something already seen rather than a stranger from a
   * category further along.
   */
  seenPool: QuizItem[] = items,
  length: number = ROUND_LENGTH
): Question[] {
  const scale = length / ROUND_LENGTH;
  const wantSituations = Math.max(0, Math.round(SITUATIONS_PER_ROUND * scale));
  const wantTranslation = Math.max(1, Math.round(TRANSLATION_PER_ROUND * scale));
  const slots = wantSituations + wantTranslation;

  const mine = new Set(items.map((i) => i.id));
  const earlier = seenPool.filter((i) => !mine.has(i.id));

  const used = new Set<string>();
  const drafts: Draft[] = [];

  /**
   * Fills up to `n` slots from `pool`, skipping items already spoken for.
   * `reverse` picks which way round the question is asked, which is what makes
   * a second pass over the same items produce different questions.
   */
  const take = (pool: QuizItem[], n: number, reverse: boolean, allowUsed = false) => {
    if (n <= 0) return;
    const shuffled = shuffle(pool);
    // A second pass may reuse an item in the other direction, but only once
    // the untouched ones are gone. Taking at random meant a ten-item stage
    // could ask "It's late and someone proposes one last drink" and then, two
    // questions later, "How do you say 'go on then'?" — the same line twice,
    // while five items it had not touched sat unused.
    const order = allowUsed
      ? [...shuffled.filter((i) => !used.has(i.id)), ...shuffled.filter((i) => used.has(i.id))]
      : shuffled;
    for (const item of order) {
      if (drafts.length >= slots) return;
      if (n <= 0) return;
      if (!allowUsed && used.has(item.id)) continue;
      if (allowUsed && drafts.some((d) => d.item.id === item.id && d.reverse === reverse)) continue;
      const q = buildQuestion(item, reverse, "choice", items, seenPool);
      if (!q) continue;
      used.add(item.id);
      drafts.push({ item, question: q, reverse });
      n -= 1;
    }
  };

  const situations = (list: QuizItem[]) => list.filter((i) => i.kind === "situation");
  const phrases = (list: QuizItem[]) => list.filter((i) => i.kind === "phrase");

  // The order below is the whole policy. Own material first, but a situation
  // slot is filled by a situation before anything else — including by stepping
  // back along the path for one. A stage made mostly of words used to spend
  // all five of those slots on "what does this mean?", so a slang round was
  // seven definitions and a matching screen; revising a moment already met is
  // a better question than a fourth definition of a word.
  take(situations(items), wantSituations, false);                     // 1. own situations
  take(situations(earlier), wantSituations - drafts.length, false);   // 2. borrowed situations
  take(phrases(items), slots - drafts.length, false);                 // 3. own phrases
  take(phrases(items), slots - drafts.length, true, true);            // 4. own phrases, flipped
  take(situations(items), slots - drafts.length, true, true);         // 5. own situations, flipped
  take(phrases(earlier), slots - drafts.length, false);               // 6. earlier phrases
  take(phrases(earlier), slots - drafts.length, true, true);

  if (drafts.length === 0) return [];

  // Both directions of translation should appear when the material allows it.
  forceBothDirections(drafts, [...phrases(items), ...phrases(earlier)], items, seenPool);

  // At most one slot becomes typing or assembly, and only where producing the
  // answer is a language exercise.
  //
  // Two things are excluded. A situation shown forward, because the answer is
  // a whole spoken line and typing one from a standing start is a different,
  // much harder exercise than choosing it. And anything whose answer is
  // English, because assembling English is not practising anything: "What does
  // 'En bärs, tack.' mean?" was handing over the tiles A / very / casual /
  // "beer, / please." and marking a learner wrong for leaving out the editor's
  // "very casual". Nobody is here to reproduce a gloss word for word. You only
  // ever type or assemble the language you came to learn.
  let recall = 0;
  const asked: Question[] = drafts.map((d) => {
    const isForwardSituation = d.item.kind === "situation" && !d.reverse;
    const producesTheLanguage = d.question.answerLang === "source";
    if (
      !isForwardSituation &&
      producesTheLanguage &&
      recall < RECALL_PER_ROUND &&
      cueIdentifies(d.question, seenPool)
    ) {
      const form: QuestionForm | null = typeable(d.question.answer)
        ? "type"
        : bankable(d.question.answer)
          ? "bank"
          : null;
      if (form) {
        recall += 1;
        return buildQuestion(d.item, d.reverse, form, items, seenPool) ?? d.question;
      }
    }
    return d.question;
  });

  // The board is built from what the round just covered, so it reinforces
  // rather than importing four unrelated rows.
  const match =
    MATCH_PER_ROUND > 0
      ? buildMatchQuestion(items, seenPool, MATCH_PAIRS, drafts.map((d) => d.item))
      : null;

  // A round opens on a situation wherever it has one.
  const openerIdx = asked.findIndex((_, i) => drafts[i].item.kind === "situation" && !drafts[i].reverse);
  const opener = openerIdx >= 0 ? [asked[openerIdx]] : asked.slice(0, 1);
  const rest = shuffle([
    ...asked.filter((q) => q !== opener[0]),
    ...(match ? [match] : []),
  ]);

  return spreadOut([...opener, ...rest]).slice(0, length);
}

/**
 * True when this question's cue points at one line in the deck and no other.
 *
 * Multiple choice does not need this: `buildOptions` already refuses any
 * distractor whose own cue is this cue, so the rival answer never appears next
 * to the right one. Typing has nothing to refuse. "How do you say: How long?"
 * takes "¿Cuánto tarda?" and rejects "¿Cuánto hay que esperar?", which is the
 * same question with the same English on it, and the learner is told they are
 * wrong with no way to see why.
 *
 * So a slot becomes a typed or assembled one only where the cue could not have
 * meant something else. Where it could, the question stays multiple choice —
 * still worth asking, and answerable.
 */
function cueIdentifies(question: Question, pool: QuizItem[]): boolean {
  const cueLang: AnswerLang = question.answerLang === "source" ? "en" : "source";
  return !pool.some((item) => {
    if (item.id === question.itemId) return false;
    const theirCue = answerTextFor(item, cueLang);
    if (!theirCue || !tooAlike(theirCue, question.shown)) return false;
    // Two items that mean the same and say the same are one line written
    // twice, which is a duplicate for the content suite to catch rather than
    // an ambiguity for this to dodge.
    return !tooAlike(answerTextFor(item, question.answerLang), question.answer);
  });
}

/**
 * Keeps two questions about the same line from landing next to each other.
 *
 * A round asks some items from both sides, so the shuffle can deal "What does
 * this mean? ¿Una caña porfa?" and then, immediately, "How do you say this? A
 * beer, please?" — the second screen answered by the first. Same-answer pairs
 * do it too: two different lines that mean the same thing, back to back.
 *
 * The order is still random; this only walks it and moves a clashing question
 * back rather than reshuffling until luck holds. When nothing in what's left
 * can follow cleanly — a short round of closely related material — the next
 * question goes in anyway, because dropping it would shorten the round.
 */
interface SpreadOptions {
  /**
   * Also keep two questions from the same category apart. Only the taster asks
   * for this: a round is one stage, so there it would reject everything.
   */
  separateCategories?: boolean;
  /** Leading questions that must stay where they are, in the order given. */
  pinned?: number;
}

function spreadOut(questions: Question[], options: SpreadOptions = {}): Question[] {
  const { separateCategories = false, pinned = 1 } = options;
  const out = questions.slice(0, Math.max(1, pinned));
  const remaining = questions.slice(out.length);

  const clashes = (a: Question, b: Question) => {
    if (a.form === "match" || b.form === "match") return false;
    if (a.itemId === b.itemId) return true;
    if (separateCategories && a.categoryId === b.categoryId) return true;
    // Either side of one question showing up on either side of the next is the
    // giveaway, whichever direction each was asked in.
    return (
      tooAlike(a.answer, b.answer) ||
      tooAlike(a.shown, b.shown) ||
      tooAlike(a.answer, b.shown) ||
      tooAlike(a.shown, b.answer)
    );
  };

  while (remaining.length > 0) {
    const previous = out[out.length - 1];
    let index = 0;
    if (previous) {
      const clear = remaining.findIndex((q) => !clashes(previous, q));
      if (clear >= 0) index = clear;
    }
    out.push(remaining.splice(index, 1)[0]);
  }

  // Taking the first question that fits can leave a twin stranded at the end,
  // next to the one question it could not follow. A swap fixes what the single
  // pass could not see coming, so long as it doesn't create a clash elsewhere.
  const clean = (i: number) =>
    (i === 0 || !clashes(out[i - 1], out[i])) &&
    (i === out.length - 1 || !clashes(out[i], out[i + 1]));

  // Pinned questions are never swapped, even to fix a clash between two of
  // them: where they sit is the point of pinning them.
  const firstMovable = Math.max(1, pinned);
  for (let i = firstMovable; i < out.length; i++) {
    if (clean(i)) continue;
    for (let j = firstMovable; j < out.length; j++) {
      if (j === i) continue;
      [out[i], out[j]] = [out[j], out[i]];
      // Both landing sites and the gaps the two questions left behind.
      const fixed = [i, j, i - 1, j - 1, i + 1, j + 1]
        .filter((k) => k >= 0 && k < out.length)
        .every(clean);
      if (fixed) break;
      [out[i], out[j]] = [out[j], out[i]];
    }
  }

  return out;
}
