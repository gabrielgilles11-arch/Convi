// Client-safe half of the "Huh?" moment. Same rule as quizTypes.ts and
// conversationTypes.ts: nothing here imports ../lib/content, so the browser
// bundle never carries a content file. The kit itself is built on the server
// (./repair.ts) and arrives with the practice and Talk payloads.

import type { ConvLine, Conversation } from "./conversationTypes";
import { shuffle, stageKeyOf, type Question, type QuizItem } from "./quizTypes";

/**
 * Everything a "Huh?" moment needs, all of it sourced content lines.
 *
 * The moment itself: somebody says something too fast to catch, and the
 * learner has to do what fluent people do and ask, in the language, rather
 * than freeze or switch to English. A course never teaches this because a
 * course's audio is always clear. A bar's is not.
 */
export interface RepairKit {
  /** What you can say when you did not catch it. Any of them counts. */
  asks: ConvLine[];
  /** Their "I'll say it again", before they repeat themselves slowly. */
  back: ConvLine;
  /**
   * Where the local's first instinct is to switch to English instead, which is
   * Sweden: they offer English, you steer back, they agree. Null elsewhere.
   */
  english: { offer: ConvLine; steer: ConvLine[]; agree: ConvLine } | null;
}

/** How much slower the repeat is played. Slow enough to hear, not a drawl. */
export const SLOW_RATE = 0.8;
/** How much faster the line you miss is played: quick, not cartoonish. */
export const FAST_RATE = 1.35;

// ---------------------------------------------------------------------------
// Practice: one "Huh?" question per round
// ---------------------------------------------------------------------------

/**
 * Sections where a "Huh?" question does not belong.
 *
 * Asking a creep to repeat himself is the opposite of what that section
 * teaches, and the cussing list is a list of things to recognize, not a
 * conversation anybody is having. Everywhere else, from the bar to the
 * pharmacy to a stranger's slang, missing a line and asking for it again is
 * exactly what happens.
 */
const NO_HUH_STAGES = new Set(["for-the-girls", "cuss-words"]);

export function huhFitsStage(categoryId: string): boolean {
  return !NO_HUH_STAGES.has(stageKeyOf(categoryId));
}

/** Prompt on a practice "Huh?" question. */
export const HUH_PROMPT = "That went by too fast. What do you say?";

/**
 * The line they say too fast: something a local would say to you in this
 * section, in the language. A situation's reply, or the opener when they speak
 * first; a word-list phrase where the section has no exchanges.
 */
function heardLineOf(item: QuizItem): { source: string; en: string | null; audioId: string | null } | null {
  if (item.kind === "situation") {
    if (item.reply?.source) return { ...item.reply, audioId: item.replyAudioId ?? null };
    return null;
  }
  return item.front ? { source: item.front, en: item.correctAnswer, audioId: item.frontAudioId } : null;
}

/** A trailing-ellipsis-free line with no fill-in blank, which nobody says out loud. */
function sayable(text: string): boolean {
  return !/__|\[[A-ZÅÄÖÜ]+\]/.test(text) && !text.includes(" / ");
}

/**
 * Turns a round into one with a "Huh?" question in it.
 *
 * Replaces one question that is not the opener (a round always opens on a
 * situation, and that stays true) with a "Huh?" question: a line from this
 * section is played fast with its text hidden, and the answer is any of the
 * kit's ways of asking for it again. The options are the right ask plus three
 * of the section's own lines in the language, so the wrong options are real
 * things you could say, just not here.
 *
 * Returns the round unchanged where there is nothing to build it from, so a
 * missing kit or an unusual section never costs a question.
 */
export function withHuh(
  round: Question[],
  stageItems: QuizItem[],
  kit: RepairKit | null,
  random: () => number = Math.random
): Question[] {
  if (!kit || kit.asks.length === 0 || round.length < 3) return round;
  // One section's worth of items, not a drill of mistakes from all over: the
  // line missed and the wrong options should all belong to one place.
  const categoryId = stageItems[0]?.categoryId;
  if (!categoryId || !huhFitsStage(categoryId)) return round;
  if (stageItems.some((i) => i.categoryId !== categoryId)) return round;

  const heard = shuffle(stageItems)
    .map((item) => ({ item, line: heardLineOf(item) }))
    .find((c) => c.line && sayable(c.line.source));
  if (!heard?.line) return round;

  const askSet = new Set(kit.asks.map((a) => a.source));
  const answer = kit.asks[Math.floor(random() * kit.asks.length)]!;
  const distractors = shuffle(
    stageItems
      .map((i) => (i.kind === "situation" ? i.correctAnswer : i.front))
      .filter((s) => s && sayable(s) && !askSet.has(s) && s !== heard.line!.source)
  ).filter((s, i, all) => all.indexOf(s) === i).slice(0, 3);
  if (distractors.length < 2) return round;

  const question: Question = {
    itemId: `huh:${heard.item.id}`,
    categoryId,
    categoryTitle: heard.item.categoryTitle,
    form: "choice",
    prompt: HUH_PROMPT,
    shown: heard.line.source,
    shownSub: heard.line.en,
    answer: answer.source,
    answerSub: answer.en,
    answerNote: null,
    accepted: kit.asks.map((a) => a.source),
    answerLang: "source",
    saidByYou: true,
    shownAudio: heard.line.audioId,
    answerAudio: answer.audioId,
    reply: { source: kit.back.source, en: kit.back.en },
    replyAudio: kit.back.audioId,
    options: shuffle([answer.source, ...distractors]),
    tiles: [],
    pairs: [],
    huh: true,
  };

  // Anywhere but the opener, and not last: a round ending on a trick question
  // is a strange note to finish on.
  const slots = round.map((_, i) => i).filter((i) => i > 0 && i < round.length - 1 && round[i]!.form !== "match");
  if (slots.length === 0) return round;
  const at = slots[Math.floor(random() * slots.length)]!;
  return round.map((q, i) => (i === at ? question : q));
}

// ---------------------------------------------------------------------------
// Talk: which conversations get one, and on which beat
// ---------------------------------------------------------------------------

/** Every third conversation started gets a "Huh?" moment somewhere in it. */
export const HUH_EVERY = 3;

const TALK_COUNT_KEY = "convi:talk:started:v1";

/**
 * Counts one more conversation started in this browser and returns the new
 * count. Kept in localStorage, like the rest of practice progress, so "every
 * third" means every third you start, not every third since the page loaded.
 * Private mode returns 0, which never makes a moment due on its own.
 */
export function bumpTalkCount(): number {
  try {
    const next = (Number(window.localStorage.getItem(TALK_COUNT_KEY)) || 0) + 1;
    window.localStorage.setItem(TALK_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

/**
 * Whether this conversation, as the `count`th one started, gets a "Huh?"
 * moment. Wired ones always do; the rest on every third start.
 */
export function huhDue(conversation: Conversation, count: number): boolean {
  if (conversation.huhAt !== null) return true;
  return count > 0 && count % HUH_EVERY === 0;
}

/**
 * Where the moment lands. Always on a beat where they speak first, since the
 * moment is missing what *they* said.
 *
 * `at`: the wired beat, by index. `nth`: the nth beat walked on which they
 * speak first. A route branches, so a beat picked by index might never be
 * reached; counting the beats as they come always lands somewhere, and not
 * always on the first line, because the moment is meant to catch you
 * mid-conversation.
 */
export type HuhPlan = { at: number } | { nth: number };

export function huhPlan(conversation: Conversation, random: () => number = Math.random): HuhPlan | null {
  if (conversation.huhAt !== null) return { at: conversation.huhAt };
  // The shortest walk through a script still meets their line a couple of
  // times, so the first or second is always reached.
  return { nth: 1 + Math.floor(random() * 2) };
}
