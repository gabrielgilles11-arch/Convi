import type { Locale } from "./content";
import { indexLines, resolveTalkRef } from "./conversations";
import type { TalkRef } from "./talkScripts";
import type { RepairKit } from "./repairTypes";

/**
 * The "Huh?" kit for each edition, as references into the content.
 *
 * Every line is one the content already has, sourced and listed in
 * content/SOURCES.md: the getting-unstuck exchanges in each edition's
 * `*-starting-convo-main`. Nothing here is a line of the target language, only
 * which line plays which part.
 *
 * - `asks`: what you say when you missed it. "Sorry, I didn't catch that",
 *   "could you say that again", "a bit slower".
 * - `back`: their "I'll say it again", or the nearest thing the content has.
 * - `english` (Sweden only): the local offers English ("Jag kan säga det på
 *   engelska", the reply the content already gives to "jag fattar inte"), you
 *   ask them to carry on in Swedish, and they agree ("Ja, självklart").
 */
const q = (ex: string): TalkRef => ({ ex, part: "q" });
const a0 = (ex: string): TalkRef => ({ ex, part: "a0" });
const r = (ex: string): TalkRef => ({ ex, part: "r" });

interface KitRefs {
  asks: TalkRef[];
  back: TalkRef;
  english: { offer: TalkRef; steer: TalkRef[]; agree: TalkRef } | null;
}

export const REPAIR_REFS: Record<Locale, KitRefs> = {
  "es-ES": {
    asks: [q("starting-convo-05"), q("starting-convo-12")],
    back: a0("starting-convo-05"), // "Te lo repito."
    english: null,
  },
  "sv-SE": {
    asks: [q("sv-starting-convo-04"), q("sv-starting-convo-17")],
    back: a0("sv-starting-convo-17"), // "Ja, självklart."
    english: {
      offer: r("sv-starting-convo-04"), // "Jag kan säga det på engelska."
      steer: [q("sv-starting-convo-20")], // "Kan du fortsätta på svenska?"
      agree: a0("sv-starting-convo-17"),
    },
  },
  "de-DE": {
    asks: [q("de-starting-convo-04"), q("de-starting-convo-21")],
    back: r("de-starting-convo-04"), // "Ich sag's nochmal."
    english: null,
  },
};

export function buildRepairKit(locale: Locale): RepairKit | null {
  const refs = REPAIR_REFS[locale];
  if (!refs) return null;
  const index = indexLines(locale);
  const line = (ref: TalkRef) => resolveTalkRef(index, ref);
  return {
    asks: refs.asks.map(line),
    back: line(refs.back),
    english: refs.english
      ? {
          offer: line(refs.english.offer),
          steer: refs.english.steer.map(line),
          agree: line(refs.english.agree),
        }
      : null,
  };
}
