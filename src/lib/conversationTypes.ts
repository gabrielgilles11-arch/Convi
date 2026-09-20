// Client-safe half of the conversation layer.
//
// Same rule as quizTypes.ts: this file must never import ../lib/content (or
// anything that does). The Talk island imports these types and gets its data
// from GET /api/conversations, which checks entitlement server-side. Importing
// content here would pull all three content files into the browser bundle.

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
