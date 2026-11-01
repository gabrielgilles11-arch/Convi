// SERVER ONLY. Imports the content files, so anything that imports this gets
// all three editions' JSON. It must only ever be pulled in from an API route or
// an .astro frontmatter block — never from a React island. The Talk island
// imports ./conversationTypes and fetches GET /api/conversations instead.

import {
  getCategories,
  getTalkLines,
  DEFAULT_LOCALE,
  type Category,
  type Locale,
} from "./content";
import {
  isConversationCategory,
  type Conversation,
  type ConvLine,
  type ConvTurn,
} from "./conversationTypes";
import { indexExchanges, resolveRef, type Indexed } from "./gameScenes";
import { TALK_SCRIPTS, type TalkRef, type TalkScript, type TalkStep } from "./talkScripts";

/**
 * Turning Talk's scripts into conversations you can hold.
 *
 * A script (./talkScripts) is the order a conversation goes in, written as
 * references into the content. This resolves each reference to the line it
 * points at, numbers the steps, and says for every line you could say what
 * comes back and where it goes. No line is made here: every word the screen
 * shows is a line from content/*.json, the same as everywhere else on the
 * site.
 */

export type LineIndex = {
  exchanges: Map<string, Indexed>;
  talk: Map<string, ConvLine>;
};

export function indexLines(locale: Locale): LineIndex {
  const talk = new Map<string, ConvLine>();
  for (const line of getTalkLines(locale)) {
    // Recorded under the line's own id (scripts/generate-audio.mjs).
    talk.set(line.id, { source: line.es, en: line.en, audioId: null });
  }
  return { exchanges: indexExchanges(locale), talk };
}

/**
 * The clip for one side of an "A / B" line, as scripts/generate-audio.mjs
 * names it: the whole line's id with `-alt` and the side.
 */
export function altAudioId(ex: string, part: string, alt: number): string {
  return `${ex}-${part}-alt${alt}`;
}

export function resolveTalkRef(index: LineIndex, ref: TalkRef): ConvLine {
  if ("line" in ref) {
    const line = index.talk.get(ref.line);
    if (!line) throw new Error(`Talk script: no talk line ${ref.line}`);
    return { ...line, audioId: ref.line };
  }
  const line = resolveRef(index.exchanges, ref);
  return ref.alt === undefined ? line : { ...line, audioId: altAudioId(ref.ex, ref.part, ref.alt) };
}

/** The exchange a step is about, for its English situation and its note. */
function leadExchange(index: LineIndex, step: TalkStep) {
  for (const ref of [step.them, ...step.says.map((s) => s.say)]) {
    if (ref && !("line" in ref)) {
      const found = index.exchanges.get(ref.ex);
      if (found) return found.exchange;
    }
  }
  return null;
}

export function resolveScript(
  index: LineIndex,
  script: TalkScript,
  category: Category,
  title: string
): Conversation {
  const position = new Map(script.steps.map((s, i) => [s.id, i]));

  /** A step's `next`, as an index: omitted is the following step, null the end. */
  function target(id: string | null | undefined, from: number): number | null {
    if (id === null) return null;
    if (id === undefined) return from + 1 < script.steps.length ? from + 1 : null;
    const at = position.get(id);
    if (at === undefined) throw new Error(`Talk script ${script.id}: no step ${id}`);
    return at;
  }

  let branches = false;

  const turns: ConvTurn[] = script.steps.map((step, i) => {
    const lead = leadExchange(index, step);
    const yourLines = step.says.map((s) => resolveTalkRef(index, s.say));
    const replies = step.says.map((s) => {
      const ref = s.back === undefined ? step.back : s.back;
      return ref ? resolveTalkRef(index, ref) : null;
    });
    const next = step.says.map((s) =>
      target(s.next === undefined ? step.next : s.next, i)
    );
    if (new Set(next).size > 1) branches = true;

    return {
      id: `${script.id}:${step.id}`,
      situation: step.cue ?? lead?.situation?.en ?? script.intro,
      cue: step.cue ?? null,
      theirOpener: step.them ? resolveTalkRef(index, step.them) : null,
      yourLines,
      replies,
      next,
      theirReply: replies[0] ?? null,
      note: lead?.notes ?? "",
    };
  });

  return {
    id: script.id,
    categoryId: category.id,
    categoryTitle: category.title,
    categoryIcon: category.icon,
    title,
    intro: script.intro,
    branches,
    turns,
  };
}

/**
 * Every conversation in an edition, in content order.
 *
 * A conversation exists where a script has been written for a subsection in a
 * section where somebody talks back (`isConversationCategory`). The order is
 * the scenario pages' order, so "Keep talking" walks from being seated to
 * ordering to paying, and from the bar out into the taxi.
 */
export function buildConversations(locale: Locale = DEFAULT_LOCALE): Conversation[] {
  const scripts = new Map((TALK_SCRIPTS[locale] ?? []).map((s) => [s.id, s]));
  const index = indexLines(locale);
  const out: Conversation[] = [];

  for (const category of getCategories(locale) as Category[]) {
    if (!isConversationCategory(category.id)) continue;
    for (const sub of category.subsections) {
      const script = scripts.get(sub.id);
      if (!script) continue;
      // A subsection with no title of its own is the category's only one —
      // `beer-food-main`, `hotel-checkin` — so the category's title is the
      // honest label rather than a made-up one.
      out.push(resolveScript(index, script, category, sub.title ?? category.title));
    }
  }

  return out;
}
