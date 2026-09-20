// Client-safe half of the conversation layer.
//
// Same rule as quizTypes.ts: this file must never import ../lib/content (or
// anything that does). The Talk island imports these types and gets its data
// from GET /api/conversations, which checks entitlement server-side. Importing
// content here would pull all three content files into the browser bundle.

import { normalizeAnswer, typedAnswerMatches } from "./quizTypes";

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

/** True when what somebody said is this line, blanks and all. */
export function replyMatches(given: string, expected: string): boolean {
  if (typedAnswerMatches(given, expected)) return true;
  const pattern = slotPattern(expected);
  return pattern ? pattern.test(normalizeAnswer(given)) : false;
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
