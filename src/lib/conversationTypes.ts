// Client-safe half of the conversation layer.
//
// Same rule as quizTypes.ts: this file must never import ../lib/content (or
// anything that does). The Talk island imports these types and gets its data
// from GET /api/conversations, which checks entitlement server-side. Importing
// content here would pull all three content files into the browser bundle.

import {
  coreOf,
  editBudget,
  normalizeAnswer,
  typedAnswerMatches,
  withinEdits,
} from "./quizTypes";

/** A line of the target language with its English meaning. */
export interface ConvLine {
  source: string;
  en: string | null;
  /** Id of the generated clip, where one was made. Null falls back to a voice. */
  audioId: string | null;
}

/**
 * One beat of a conversation.
 *
 * Whose line is whose is the whole of it, and it cannot be inferred from the
 * text — `speaker` on the authored exchange is what decides, so it is resolved
 * once here rather than everywhere downstream. See the comment on `Exchange` in
 * ./content.
 */
export interface ConvTurn {
  id: string;
  /** The moment, in English. What the beat is for. */
  situation: string;
  /** Their line, when they speak first. Null on a beat you open. */
  theirOpener: ConvLine | null;
  /**
   * The lines you could say here — all of them authored, none generated. Where
   * there is more than one they are genuine alternatives (register, not
   * correctness): nothing downstream branches on which you pick, because
   * nothing in the content does either.
   */
  yourLines: ConvLine[];
  /** What comes back once you've spoken. Null where the content has none. */
  theirReply: ConvLine | null;
  /** The authored note about this exchange, where it has one. */
  note: string;
}

/**
 * One walkable conversation: an authored subsection, in the order it was
 * written.
 *
 * A subsection is the right unit because it is already one place and one
 * moment — "Taxi / rideshare", "At the door", "Getting seated" — which is why
 * its exchanges read as consecutive beats rather than a list of unrelated
 * lines.
 */
export interface Conversation {
  /** The subsection id. */
  id: string;
  categoryId: string;
  categoryTitle: string;
  /** The subsection's title, or the category's where it has none. */
  title: string;
  turns: ConvTurn[];
}

export interface ConversationPayload {
  conversations: Conversation[];
}

/**
 * Sections that are a conversation rather than a word list.
 *
 * Keyed by stage rather than category id, the same way `PRACTICE_PATH` is, so
 * one list serves all three editions — ids carry a locale prefix
 * (`sv-beer-food`) and the stage key does not.
 *
 * Having exchanges is not the same as being somewhere you talk. Slang, cussing
 * and flirting are word lists and never had exchanges to begin with; the drunk
 * scale does have them, and they are a scale — eight ways to say how far gone
 * you are, not eight beats of one conversation. Walking that as a dialogue
 * would be a person being asked how drunk they are eight times.
 *
 * What is left is the places where somebody actually talks back: a bar, a taxi,
 * a restaurant, a hotel desk, a shop, a door, a pharmacy, a police station.
 *
 * `resacon` is the judgement call. Its name is the hangover, but the subsection
 * with the dialogue in it is at the pharmacy asking for something for your
 * head, which is as real a counter conversation as the shop. Drop the line if
 * you disagree — that is the whole change.
 */
export const CONVERSATION_STAGES = [
  "getting-around",
  "starting-convo",
  "beer-food",
  "restaurant",
  "hotel",
  "shopping",
  "nightlife",
  "resacon",
  "emergencies",
  "for-the-girls",
] as const;

/** `sv-beer-food` -> `beer-food`. Mirrors stageKeyOf in quizTypes. */
export function conversationStageOf(categoryId: string): string {
  return categoryId.replace(/^(sv|de)-/, "");
}

export function isConversationCategory(categoryId: string): boolean {
  return (CONVERSATION_STAGES as readonly string[]).includes(
    conversationStageOf(categoryId)
  );
}

/**
 * Beats below which a subsection is a list, not a conversation.
 *
 * Two lines and a comeback is an exchange; it is not something you walk
 * through. Nothing in the three editions currently falls under this — every
 * subsection with exchanges has eight — but a new one might, and a one-beat
 * "conversation" in the picker would be a worse answer than no entry at all.
 */
export const MIN_TURNS = 3;

/** Conversations grouped by the category they were written under, in order. */
export function groupByCategory(
  conversations: Conversation[]
): { categoryId: string; categoryTitle: string; conversations: Conversation[] }[] {
  const out: { categoryId: string; categoryTitle: string; conversations: Conversation[] }[] = [];
  const byId = new Map<string, (typeof out)[number]>();

  // First-seen order is content order, which is the order the editions were
  // written in and the order the scenario pages list them in.
  for (const convo of conversations) {
    let group = byId.get(convo.categoryId);
    if (!group) {
      group = { categoryId: convo.categoryId, categoryTitle: convo.categoryTitle, conversations: [] };
      byId.set(convo.categoryId, group);
      out.push(group);
    }
    group.conversations.push(convo);
  }

  return out;
}

/** How many lines of yours a conversation asks for — what the picker counts. */
export function turnCount(convo: Conversation): number {
  return convo.turns.length;
}

// ---------------------------------------------------------------------------
// Grading what somebody says back
// ---------------------------------------------------------------------------

/**
 * A fill-in slot: `__` or `[BELOPP]`. Authored content, not missing data — the
 * amount, the street or the station changes every time you say the line.
 *
 * Two patterns rather than one, because a /g regex keeps its own position
 * between `.test()` calls and the two uses here would interfere.
 */
const SLOT_SPLIT = /(_{2,}|\[[^\]]+\])/g;
const IS_SLOT = /^(_{2,}|\[[^\]]+\])$/;
const HAS_SLOT = /(_{2,}|\[[^\]]+\])/;

export function hasSlot(line: string): boolean {
  return HAS_SLOT.test(line);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matching a line that has a blank in it.
 *
 * "A la calle __, número __, por favor." is a correct thing to say and nobody
 * can type it correctly, because the whole point of the blank is that you put
 * your own street in it. So the fixed parts have to match and the blanks have
 * to accept whatever was put there. Everything outside the blanks goes through
 * `normalizeAnswer` first, so accents, case and punctuation are as forgiving
 * here as they are anywhere else.
 */
function slotPattern(expected: string): RegExp | null {
  const normalised = normalizeAnswer(expected);
  if (!HAS_SLOT.test(normalised)) return null;

  const source = normalised
    .split(SLOT_SPLIT)
    .map((part) =>
      IS_SLOT.test(part)
        ? // At least one character, so an empty blank is not an answer.
          "(.+)"
        : escapeRegExp(part).replace(/\s+/g, "\\s+")
    )
    .join("");

  try {
    return new RegExp(`^${source}$`);
  } catch {
    // A slot pattern that will not compile is not worth failing a conversation
    // over; the plain comparison above it still applies.
    return null;
  }
}

/**
 * Words that carry no order in them.
 *
 * Articles, pronouns, prepositions and the politeness a line is padded with,
 * across all three editions at once. One list rather than three because a
 * Spanish function word is not a German content word: nothing in any edition
 * is taught by asking somebody to produce "der" or "por" on its own, and a
 * list per language would be three places to forget to update.
 *
 * Deliberately conservative. "Sí", "No", "Vale", "Tack" and "Danke" are whole
 * answers somebody might give, so they stay out of it — a line that is nothing
 * but politeness ends up with no content words at all, and `keywordMatch`
 * declines to judge those rather than accepting anything polite.
 */
const FUNCTION_WORDS = new Set([
  // Spanish
  "un", "una", "unos", "unas", "el", "la", "los", "las", "lo", "de", "del",
  "al", "a", "en", "con", "sin", "por", "para", "y", "e", "o", "u", "que",
  "me", "te", "se", "le", "nos", "les", "mi", "tu", "su", "es", "esta",
  "estoy", "soy", "hay", "muy", "mas", "porfa", "porfavor", "favor", "pues",
  "oye", "quiero", "querria", "pongame", "pones", "puedo", "puede",
  // Swedish
  "en", "ett", "den", "det", "har", "dar", "jag", "du", "vi", "ni", "ar",
  "vill", "skulle", "kan", "att", "och", "eller", "pa", "till", "med", "for",
  "av", "sa", "ha", "garna", "jarna",
  // German
  "ein", "eine", "einen", "einem", "einer", "eines", "der", "die", "das",
  "den", "dem", "des", "ich", "wir", "ihr", "sie", "ist", "sind", "habe",
  "hatte", "haette", "gern", "gerne", "bitte", "und", "oder", "mit", "ohne",
  "auf", "zu", "an", "von", "im", "ins", "mal", "doch", "noch", "wurde",
]);

/**
 * The words in a line that actually say what it is.
 *
 * Blanks are dropped with the function words: a slot is the part of the line
 * that changes every time it is said, so it cannot be something a learner is
 * asked to have got right.
 */
function contentWords(line: string): string[] {
  return normalizeAnswer(coreOf(line))
    .split(" ")
    .filter((word) => word && !FUNCTION_WORDS.has(word) && !IS_SLOT.test(word));
}

/**
 * Two words that are the same word, give or take a slip of the hand.
 *
 * The first letter has to survive. One edit is most of a short word and
 * Spanish is full of pairs a single letter apart — "vamos" and "somos",
 * "pero" and "perro" — but almost nobody's slip is on the letter they started
 * with, so holding that one fixed separates "kafe" for "kaffe" from a
 * different word entirely. Below four letters nothing is forgiven at all.
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const longest = Math.max(a.length, b.length);
  if (longest < 4 || a[0] !== b[0]) return false;
  return withinEdits(a, b, Math.max(1, editBudget(longest)));
}

/**
 * How much of the authored line has to be in what you said.
 *
 * Four words in five. Enough that "hej kan jag har en kanellbulle och kafe
 * tack" is the same order as "En kaffe och en kanelbulle, tack" — which it
 * plainly is — and not so little that two words in common carries a different
 * sentence over the line.
 */
const COVERAGE = 0.8;

/**
 * The half-answer, and the one with a greeting bolted on the front.
 *
 * A barista asks what you want and you say "café". That is what somebody
 * standing at a counter in Madrid actually says, and the authored line is "Un
 * café con leche, por favor" — so grading it letter by letter marks a correct
 * order wrong and teaches that the app wants a recitation rather than a
 * sentence.
 *
 * Two ways to be right, because there are two ways to be brief:
 *
 * **Everything you said is in the line.** The short order: "café". Nothing is
 * missing that was not simply left unsaid.
 *
 * **You covered enough of the line.** The long way round: "hej kan jag har en
 * kanellbulle och kafe tack" says everything "En kaffe och en kanelbulle,
 * tack" says, plus a hello and a false start. Extra words cost nothing here,
 * which is the whole difference: requiring every word you typed to land on one
 * in the line meant a greeting the author did not happen to write was enough
 * to mark a correct order wrong.
 *
 * What it will not do is guess. "Una cerveza" covers none of the coffee, a
 * line whose content is nothing but politeness is left to the exact
 * comparisons above rather than matched on an empty set, and a line with a
 * blank in it is `slotPattern`'s business alone: the blank is the part being
 * asked for, and content words drop it.
 */
function keywordMatch(given: string, expected: string): boolean {
  if (hasSlot(expected)) return false;

  const said = contentWords(given);
  const line = contentWords(expected);
  if (said.length === 0 || line.length === 0) return false;

  const inTheLine = said.every((word) => line.some((other) => sameWord(word, other)));
  if (inTheLine) return true;

  const covered = line.filter((word) => said.some((other) => sameWord(word, other))).length;
  return covered / line.length >= COVERAGE;
}

/** True when what somebody said is this line, blanks and all. */
export function replyMatches(given: string, expected: string): boolean {
  if (typedAnswerMatches(given, expected)) return true;
  const pattern = slotPattern(expected);
  if (pattern && pattern.test(normalizeAnswer(given))) return true;
  return keywordMatch(given, expected);
}

/** Shared words over total distinct words, for "close" rather than "right". */
function overlap(a: string, b: string): number {
  const ta = new Set(normalizeAnswer(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeAnswer(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  const shared = [...ta].filter((t) => tb.has(t)).length;
  return shared / (ta.size + tb.size - shared);
}

/** Enough of the right words that "almost" is true rather than encouraging. */
const CLOSE_ENOUGH = 0.45;

export interface ReplyVerdict {
  correct: boolean;
  /**
   * The authored line this counts as. On a correct answer it is what they
   * said; on a wrong one it is the line they were closest to, which is what
   * the correction shows.
   */
  line: ConvLine;
  /** Wrong, but recognisably an attempt at `line` rather than something else. */
  close: boolean;
}

/**
 * Grading a turn.
 *
 * Every authored line for the turn is acceptable, not just the first: where a
 * beat offers a polite version and a blunt one, both are things a person says
 * there, and marking one of them wrong would be teaching that it isn't.
 *
 * A wrong answer is never a dead end. It is corrected against the line it came
 * closest to and the conversation carries on, because this is a conversation
 * and not a test — the round screens are the test.
 */
export function gradeReply(given: string, options: ConvLine[]): ReplyVerdict {
  const fallback = options[0]!;
  for (const option of options) {
    if (replyMatches(given, option.source)) return { correct: true, line: option, close: false };
  }

  let best = fallback;
  let bestScore = 0;
  for (const option of options) {
    const score = overlap(given, option.source);
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }

  return { correct: false, line: best, close: bestScore >= CLOSE_ENOUGH };
}

// ---------------------------------------------------------------------------
// Which beat comes next
// ---------------------------------------------------------------------------

/**
 * How far ahead a branch can reach. Three is two skippable beats: enough for
 * "just a drink" to step over both the food beat and the follow-up about it,
 * and not so far that the conversation stops being the one it started as.
 */
const LOOKAHEAD = 3;

/** A jump has to be this much better than simply carrying on to be worth it. */
const BRANCH_MARGIN = 0.12;

/** Everything about a beat that is in English, for matching against intent. */
function beatText(turn: ConvTurn): string {
  return [
    turn.situation,
    turn.theirOpener?.en ?? "",
    ...turn.yourLines.map((l) => l.en ?? ""),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * How many beats a conversation is allowed to step over in one run.
 *
 * A third of them, so an eight-beat subsection keeps at least six and still
 * reads as the same visit to the same bar. Without a cap, a learner who
 * answers tersely would skip most of what was written for them.
 */
export function skipBudget(turns: ConvTurn[]): number {
  return Math.max(0, Math.floor(turns.length / 3));
}

export interface NextBeat {
  /** The beat to open. */
  index: number;
  /** Beats stepped over to get there, because of what was just said. */
  skipped: number[];
}

/**
 * Where the conversation goes after what you just said.
 *
 * The content is linear — eight beats in the order somebody wrote them — and
 * nothing here invents a ninth. What it does is let an answer decide which of
 * the next few authored beats is the one worth having: say you only want a
 * drink and the beat about ordering food is stepped over rather than asked
 * anyway, which is the difference between a conversation and a form.
 *
 * Forward only, and never further than `LOOKAHEAD`. A beat is skipped only
 * when a later one is a clearly better answer to what was said than the next
 * one is, which is why the margin exists: ties carry on in authored order, so
 * a learner who says the expected thing walks the conversation as written.
 */
export function nextBeat(
  turns: ConvTurn[],
  from: number,
  intent: string | null,
  skipsUsed: number
): NextBeat | null {
  const straight = from + 1;
  if (straight >= turns.length) return null;
  if (!intent?.trim()) return { index: straight, skipped: [] };

  const remaining = skipBudget(turns) - skipsUsed;
  if (remaining <= 0) return { index: straight, skipped: [] };

  const last = Math.min(turns.length - 1, straight + remaining, straight + LOOKAHEAD - 1);

  let best = straight;
  let bestScore = overlap(intent, beatText(turns[straight]!));

  for (let i = straight + 1; i <= last; i++) {
    const score = overlap(intent, beatText(turns[i]!));
    if (score > bestScore + BRANCH_MARGIN) {
      bestScore = score;
      best = i;
    }
  }

  const skipped: number[] = [];
  for (let i = straight; i < best; i++) skipped.push(i);
  return { index: best, skipped };
}
