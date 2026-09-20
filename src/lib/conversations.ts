// SERVER ONLY. Imports the content files, so anything that imports this gets
// all three editions' JSON. It must only ever be pulled in from an API route or
// an .astro frontmatter block — never from a React island. The Talk island
// imports ./conversationTypes and fetches GET /api/conversations instead.

import {
  getCategories,
  DEFAULT_LOCALE,
  type Category,
  type DialogueSubsection,
  type Exchange,
  type Locale,
} from "./content";
import {
  MIN_TURNS,
  isConversationCategory,
  type Conversation,
  type ConvLine,
  type ConvTurn,
} from "./conversationTypes";

/**
 * Turning the authored exchanges into a conversation you can walk.
 *
 * There is no model anywhere in here, and there does not need to be one. A
 * dialogue subsection is already a conversation: eight consecutive beats in one
 * place, each with the line that opens it, the lines you could answer with, and
 * what comes back. All this does is say which of those is whose, which is the
 * one thing the JSON does not say in a single field.
 *
 * What that buys, and what it costs: every line anybody reads here was written
 * by a person and reviewed in a pull request, the same as the rest of the
 * content, and the same test suite that catches a duplicate phrase covers it.
 * In exchange the conversation does not branch — picking the bolder of two
 * replies does not change what they say next, because the content has only one
 * next. Pretending otherwise would mean generating the other branches, and a
 * generated branch is an unreviewed line being taught as if it were real.
 */

/** Clip ids as scripts/generate-audio.mjs writes them. */
const questionAudio = (id: string) => `${id}-q`;
const answerAudio = (id: string, i: number) => `${id}-a${i}`;
const replyAudio = (id: string) => `${id}-r`;

function lineOf(
  text: string | undefined | null,
  en: string | null | undefined,
  audioId: string
): ConvLine | null {
  if (!text) return null;
  return { source: text, en: en ?? null, audioId };
}

/**
 * One beat, with the sides resolved.
 *
 * When they open (`speaker: "them"`) their question is the opener, `answers`
 * are yours to choose from and `likelyReply` is their comeback. When you open,
 * the question is your only line and everything else is theirs — `answers[0]`
 * where it exists, since that is what they say to what you just said, and
 * `likelyReply` where it does not.
 */
function turnFrom(exchange: Exchange): ConvTurn | null {
  const situation = exchange.situation?.en;
  if (!situation) return null;

  const theirTurn = exchange.speaker === "them";

  const theirOpener = theirTurn
    ? lineOf(exchange.question?.es, exchange.question?.en, questionAudio(exchange.id))
    : null;

  const yourLines: ConvLine[] = theirTurn
    ? exchange.answers
        .map((a, i) => lineOf(a.es, a.en, answerAudio(exchange.id, i)))
        .filter((l): l is ConvLine => l !== null)
    : [lineOf(exchange.question?.es, exchange.question?.en, questionAudio(exchange.id))].filter(
        (l): l is ConvLine => l !== null
      );

  // Nothing for the learner to say is not a beat. Every exchange in all three
  // editions currently has one; this is the guard for the one that doesn't.
  if (yourLines.length === 0) return null;

  const theirReply = theirTurn
    ? lineOf(exchange.likelyReply?.es, exchange.likelyReply?.en, replyAudio(exchange.id))
    : (lineOf(exchange.answers[0]?.es, exchange.answers[0]?.en, answerAudio(exchange.id, 0)) ??
      lineOf(exchange.likelyReply?.es, exchange.likelyReply?.en, replyAudio(exchange.id)));

  return {
    id: exchange.id,
    situation,
    theirOpener,
    yourLines,
    theirReply,
    note: exchange.notes ?? "",
  };
}

/**
 * Every conversation in an edition, in content order.
 *
 * Two filters, and they exclude different things.
 *
 * `isConversationCategory` keeps the sections where somebody talks back — a
 * bar, a taxi, a hotel desk. The drunk scale is the one that fails it while
 * still having exchanges: eight ways to say how far gone you are is a scale,
 * and walking it as a dialogue is a person being asked how drunk they are
 * eight times.
 *
 * Then only `exchanges` become turns. A subsection's `scenes` are separate
 * moments written to put one word each in context, and `items` are standalone
 * tips — stringing either into a transcript would produce a dialogue that
 * changes the subject every line.
 */
export function buildConversations(locale: Locale = DEFAULT_LOCALE): Conversation[] {
  const out: Conversation[] = [];

  for (const category of getCategories(locale) as Category[]) {
    if (!isConversationCategory(category.id)) continue;

    for (const sub of category.subsections) {
      const exchanges = (sub as DialogueSubsection).exchanges ?? [];
      if (exchanges.length < MIN_TURNS) continue;

      const turns = exchanges
        .map(turnFrom)
        .filter((t): t is ConvTurn => t !== null);

      if (turns.length < MIN_TURNS) continue;

      out.push({
        id: sub.id,
        categoryId: category.id,
        categoryTitle: category.title,
        // A subsection with no title of its own is the category's only one —
        // `beer-food-main`, `hotel-checkin` — so the category's title is the
        // honest label rather than a made-up one.
        title: sub.title ?? category.title,
        turns,
      });
    }
  }

  return out;
}
