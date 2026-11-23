// Client-safe half of the filler layer. Same rule as quizTypes.ts,
// conversationTypes.ts and repairTypes.ts: nothing here imports ../lib/content,
// so the browser bundle never carries a content file. The pool itself is built
// on the server (./fillers.ts) and arrives with the practice and Talk payloads.

import type { ConvLine, Conversation, ConvTurn } from "./conversationTypes";
import type { Question } from "./quizTypes";

/**
 * Fillers: the short noises a local makes before they answer.
 *
 * "Pues…", "Genau.", "Alltså…". In native speech these are the most common
 * words there are, and a deck where every reply starts clean on its content
 * teaches you to expect a kind of Spanish nobody speaks. So now and then a
 * reply comes with one in front of it, on its own line, the way the authored
 * "Vale." already does.
 *
 * They are never typed into a line. Every filler is a whole line of its own in
 * the content's `talk` list (ids `<locale>-filler-*`), sourced like any other,
 * so no sourced sentence is ever changed by having one put in front of it.
 */

/**
 * How often a reply that has no reaction of its own gets a filler: a bit
 * under half. Every time would be a tic; never would be the deck as it was.
 */
export const FILLER_CHANCE = 0.4;

/** The first word of a line, for telling "Vale." from "Vale, vale." apart from a reply. */
function firstWord(text: string): string {
  return (text.toLowerCase().match(/\p{L}+/u) ?? [""])[0];
}

/**
 * A filler would stutter in front of this reply: it starts with the same word
 * ("Vale." and then "Vale. ¿Algo de comer?").
 */
export function fillerClashes(filler: ConvLine, reply: string): boolean {
  return firstWord(filler.source) !== "" && firstWord(filler.source) === firstWord(reply);
}

/**
 * Draws fillers so they come round evenly rather than at random.
 *
 * A shuffled bag: every filler in the pool is used once, in a random order,
 * before any comes round again, and the bag carries on across conversations
 * and rounds for as long as the page is open. Plain random picks repeat
 * themselves within a few beats; this cannot, and the order is different on
 * every visit.
 */
export class FillerBag {
  private bag: ConvLine[] = [];
  private last: string | null = null;

  constructor(
    private readonly pool: ConvLine[],
    private readonly random: () => number = Math.random
  ) {}

  private refill() {
    const next = [...this.pool];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [next[i], next[j]] = [next[j]!, next[i]!];
    }
    // Draws come off the front, so the first of a new bag is never the last
    // of the old one.
    if (next.length > 1 && next[0]!.source === this.last) {
      [next[0], next[next.length - 1]] = [next[next.length - 1]!, next[0]!];
    }
    this.bag = next;
  }

  /** The next filler that does not clash with `reply`, or null if none fits. */
  draw(reply: string): ConvLine | null {
    if (this.pool.length === 0) return null;
    // Two passes at most: what is left of this bag, then a fresh one.
    for (let pass = 0; pass < 2; pass++) {
      if (this.bag.length === 0) this.refill();
      const at = this.bag.findIndex((f) => !fillerClashes(f, reply));
      if (at >= 0) {
        const [picked] = this.bag.splice(at, 1);
        this.last = picked!.source;
        return picked!;
      }
      this.bag = [];
    }
    return null;
  }
}

/** One bag per edition, shared by Talk and practice for the life of the page. */
const bags = new Map<string, FillerBag>();

export function fillerBag(locale: string, pool: ConvLine[]): FillerBag {
  const key = `${locale}:${pool.map((f) => f.source).join("|")}`;
  let bag = bags.get(key);
  if (!bag) {
    bag = new FillerBag(pool);
    bags.set(key, bag);
  }
  return bag;
}

/**
 * The conversation with fillers in front of some of its replies.
 *
 * Only where the script gave that reply no reaction of its own: an authored
 * "Vale." is the content's choice and stays. Decided once per time the
 * conversation is opened, so a run is stable while you are in it and
 * different the next time.
 */
export function withFillerReactions(
  conversation: Conversation,
  bag: FillerBag | null,
  random: () => number = Math.random
): Conversation {
  if (!bag) return conversation;
  const turns: ConvTurn[] = conversation.turns.map((turn) => {
    if (turn.reactions.some((r) => r !== null)) return turn;
    if (!turn.replies.some((r) => r !== null)) return turn;
    if (random() >= FILLER_CHANCE) return turn;
    const lead = turn.replies.find((r) => r !== null)!;
    const filler = bag.draw(lead.source);
    if (!filler) return turn;
    return {
      ...turn,
      reactions: turn.replies.map((reply) => (reply && !fillerClashes(filler, reply.source) ? filler : null)),
    };
  });
  return { ...conversation, turns };
}

/**
 * A practice round with fillers in front of some of the replies shown after
 * each question. Not on a "Huh?" question, whose reply is "I'll say it again"
 * and is part of the moment rather than a comeback.
 */
export function withFillerQuestions(
  round: Question[],
  bag: FillerBag | null,
  random: () => number = Math.random
): Question[] {
  if (!bag) return round;
  return round.map((q) => {
    if (!q.reply || q.huh || random() >= FILLER_CHANCE) return q;
    const filler = bag.draw(q.reply.source);
    return filler ? { ...q, reaction: filler } : q;
  });
}
