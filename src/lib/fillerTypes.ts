/**
 * Fillers in Practice and Talk: "No sé…", "…und so.", "Ja men…".
 *
 * They come from one word list per edition, "Heard on every podcast": the
 * fillers that native podcasts use most and Convi did not teach. Every one is
 * only ever said as its own line, exactly as written. Stitching one onto
 * another line ("Pues… una caña") would make a line nobody published, which
 * is the one thing the content rules forbid. So a filler turns up in three
 * ways, none of which writes a new line:
 *
 * - Practice: once the Slang section is reached, some rounds elsewhere get one
 *   extra question on a filler (`withFiller`), so a round is ten, not nine.
 * - Your answers, typed: a filler at the start or end of what you type is
 *   taken off before grading (`withoutFillers`), so "Pues, una caña" is right.
 * - Talk: the local says one, as its own line, at a beat chosen by hand where
 *   it fits (lib/talkFillers.ts), in a minority of runs and never the first
 *   time you play a conversation (`planFillerTurn`).
 *
 * Client-safe: no content imports.
 */
import {
  answeredIt,
  buildQuestion,
  normalizeAnswer,
  shuffle,
  type Question,
  type QuizItem,
} from "./quizTypes";
import { gradeReply, type ConvFiller, type ConvLine, type ConvTurn, type ReplyVerdict } from "./conversationTypes";

/** The word lists fillers come from, one per edition. */
export const FILLER_SUBSECTIONS = new Set(["slang-heard", "de-slang-heard", "sv-slang-heard"]);

/**
 * Fillers never taken off a typed answer, because they change what it says:
 * "Nej, nej." in front of a yes, "Så där." (so-so) in front of a compliment.
 */
export const FILLERS_THAT_CHANGE_MEANING = new Set(["sv-slang-heard-07", "sv-slang-heard-09"]);

export function isFillerItem(item: Pick<QuizItem, "subsectionId">): boolean {
  return FILLER_SUBSECTIONS.has(item.subsectionId);
}

/** A word-list entry as the content has it, for `fillerWordsOf`. */
export interface FillerSource {
  id: string;
  subsectionId: string;
  text: string;
}

/** The fillers that may sit around a typed answer, as written. */
export function fillerWordsOf(entries: FillerSource[]): string[] {
  return entries
    .filter((e) => FILLER_SUBSECTIONS.has(e.subsectionId) && !FILLERS_THAT_CHANGE_MEANING.has(e.id))
    .map((e) => e.text);
}

/** `fillerWordsOf`, read off a practice deck. Phrases only: a scene is not a filler. */
export function fillerWordsOfItems(items: QuizItem[]): string[] {
  return fillerWordsOf(
    items
      .filter((i) => i.kind === "phrase")
      .map((i) => ({ id: i.id, subsectionId: i.subsectionId, text: i.front }))
  );
}

/**
 * What `given` would be with a filler taken off its start, its end or both.
 * Never the whole of it: "No sé." with "no sé" taken off is nothing at all,
 * and an answer that is only a filler is graded as it is.
 */
export function withoutFillers(given: string, fillers: string[]): string[] {
  const words = normalizeAnswer(given).split(" ").filter(Boolean);
  if (words.length < 2) return [];
  const fillerWords = fillers
    .map((f) => normalizeAnswer(f).split(" ").filter(Boolean))
    .filter((f) => f.length > 0);

  const startsWith = (w: string[], f: string[]) => f.length < w.length && f.every((t, i) => w[i] === t);
  const endsWith = (w: string[], f: string[]) =>
    f.length < w.length && f.every((t, i) => w[w.length - f.length + i] === t);

  const out = new Set<string>();
  for (const f of fillerWords) {
    if (startsWith(words, f)) {
      const rest = words.slice(f.length);
      out.add(rest.join(" "));
      for (const g of fillerWords) if (endsWith(rest, g)) out.add(rest.slice(0, rest.length - g.length).join(" "));
    }
    if (endsWith(words, f)) out.add(words.slice(0, words.length - f.length).join(" "));
  }
  out.delete("");
  return [...out];
}

/** Practice's typed check, with a filler around the answer allowed. */
export function answeredAllowingFillers(given: string, accepted: string[], fillers: string[]): boolean {
  if (answeredIt(given, accepted)) return true;
  return withoutFillers(given, fillers).some((rest) => answeredIt(rest, accepted));
}

/** Talk's grading, with a filler around the reply allowed. */
export function gradeAllowingFillers(
  given: string,
  options: ConvLine[],
  accepts: ConvLine[][],
  fillers: string[]
): ReplyVerdict {
  const plain = gradeReply(given, options, accepts);
  if (plain.correct) return plain;
  for (const rest of withoutFillers(given, fillers)) {
    const verdict = gradeReply(rest, options, accepts);
    if (verdict.correct) return verdict;
  }
  return plain;
}

// ---------------------------------------------------------------------------
// Practice: the extra question

/** How often a round outside the Slang section gets a filler question. */
export const FILLER_ROUND_CHANCE = 1 / 3;

export function fillerThisRound(random: () => number = Math.random): boolean {
  return random() < FILLER_ROUND_CHANCE;
}

/**
 * Adds one filler question to a round, so it is ten questions instead of nine.
 *
 * Only once the fillers have been reached (they are in `allItems`, which holds
 * this stage and the ones before it, so nothing surfaces before its section),
 * and never inside the Slang section itself, where they are drilled already.
 * Never first, which is always a situation, and never last.
 */
export function withFiller(
  round: Question[],
  stageItems: QuizItem[],
  allItems: QuizItem[],
  random: () => number = Math.random
): Question[] {
  if (round.length < 2) return round;
  const fillers = allItems.filter(isFillerItem);
  if (fillers.length === 0) return round;
  const home = fillers[0]!.categoryId;
  if (stageItems.some((i) => i.categoryId === home)) return round;

  // Distractors from the same section first: other slang, not the stage's own
  // lines, which would make the filler the odd one out at a glance.
  const pool = allItems.filter((i) => i.categoryId === home);
  for (const item of shuffle(fillers)) {
    const question = buildQuestion(item, false, "choice", pool, allItems);
    if (!question || question.options.length < 3) continue;
    const at = 1 + Math.floor(random() * (round.length - 1));
    return [...round.slice(0, at), question, ...round.slice(at)];
  }
  return round;
}

// ---------------------------------------------------------------------------
// Talk: when the local says one

/** The share of runs, after the first, in which a local says a filler at all. */
export const FILLER_RUN_CHANCE = 0.3;

/**
 * The beat a filler is due on this run, or null for none.
 *
 * None on the first play of a conversation: there it is only length, between
 * a learner and a conversation they have not got through yet. After that, a
 * minority of runs get one, on one beat picked from those that have a slot.
 * The route may branch away from that beat, and then the run has none.
 */
export function planFillerTurn(
  turns: Pick<ConvTurn, "fillers">[],
  firstPlay: boolean,
  random: () => number = Math.random
): number | null {
  if (firstPlay) return null;
  const withSlots = turns.flatMap((turn, i) => (turn.fillers.length > 0 ? [i] : []));
  if (withSlots.length === 0) return null;
  if (random() >= FILLER_RUN_CHANCE) return null;
  return withSlots[Math.floor(random() * withSlots.length)]!;
}

/**
 * Which filler to say on the planned beat, given the line you said.
 *
 * Only one that fits after that line, and never before their reply when they
 * already say something there (a reaction, or an answer to your question), or
 * after it when there is no reply to trail. The ones said lately go last, so a
 * run does not repeat the last run's.
 */
export function pickFiller(
  turn: Pick<ConvTurn, "fillers">,
  index: number,
  context: { crowded: boolean; hasReply: boolean },
  recent: string[],
  random: () => number = Math.random
): ConvFiller | null {
  const fits = turn.fillers.filter(
    (f) =>
      (f.on === null || f.on.includes(index)) &&
      (f.when === "before-reply" ? !context.crowded && context.hasReply : context.hasReply)
  );
  if (fits.length === 0) return null;
  const key = (f: ConvFiller) => f.line.audioId ?? f.line.source;
  const fresh = fits.filter((f) => !recent.includes(key(f)));
  const from = fresh.length > 0 ? fresh : fits;
  return from[Math.floor(random() * from.length)]!;
}

/** How many fillers to remember as said lately, per edition. */
export const RECENT_FILLERS = 4;
