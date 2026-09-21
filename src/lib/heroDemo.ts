// SERVER ONLY. Imports ./content, so it pulls all three editions' JSON in with
// it. Same rule as ./conversations: only ever imported from .astro frontmatter
// or an API route, never from a React island.

import {
  getCategories,
  getLocaleInfo,
  isDialogueSubsection,
  localePath,
  type Exchange,
  type Locale,
} from "./content";
import { splitNote } from "./quizTypes";

/**
 * The conversation the home page plays above the fold.
 *
 * The hero used to hold a paper-plane SVG: the most valuable space on the site
 * spent on decoration, with the product itself two clicks away. This is the
 * product instead — a real Talk Mode exchange, in Spanish, from the bar.
 *
 * Every line is read out of `content/es-ES.json` at build time rather than
 * typed into the page, for the reason the counts in the copy are: a phrase
 * pasted into a template is a phrase that goes stale the day somebody edits
 * the content file, and silently, because nothing checks it. Here a beat that
 * loses its question, its answer or its comeback stops the build, and
 * `heroDemo.test.ts` stops it earlier than that.
 */

/** Spanish is the edition the hero opens on, and the default everywhere else. */
export const HERO_DEMO_LOCALE: Locale = "es-ES";

/** The category the beats are drawn from. */
const HERO_DEMO_CATEGORY = "beer-food";

/**
 * Which beats, and which of the authored answers is the one shown typed.
 *
 * Named rather than sliced off the front of the subsection, because the two
 * that read as consecutive are not adjacent: `beer-food-01` ends on "¿Algo de
 * comer?", and the beat that answers it with food is `beer-food-04`, whose
 * second answer orders the tortilla. Taking exchanges 1 and 2 instead would
 * show a bartender asking about food and then, with no reply to it, about
 * draft or bottle.
 *
 * Two beats rather than three. Six bubbles is what fits the card at the width
 * the hero has on a phone without either scrolling or shrinking the type below
 * the site's floor, and two beats is already the whole claim: they open, you
 * produce a line, they come back at you.
 */
const HERO_DEMO_BEATS: { exchange: string; answer: number }[] = [
  { exchange: "beer-food-01", answer: 0 },
  { exchange: "beer-food-04", answer: 1 },
];

/** A line of Spanish with its English, and the aside the English carried. */
export interface HeroDemoLine {
  source: string;
  en: string;
  /** The "how locals order" half of a gloss, where the content has one. */
  note: string | null;
}

/** One beat: they open, you answer, they come back. */
export interface HeroDemoBeat {
  id: string;
  /** The moment, in English. What the beat is for. */
  situation: string;
  them: HeroDemoLine;
  you: HeroDemoLine;
  reply: HeroDemoLine;
}

export interface HeroDemo {
  locale: Locale;
  language: string;
  flag: string;
  /** The category these beats were written under, for the card's caption. */
  title: string;
  /** Where the card's link goes: the practice path for this edition. */
  href: string;
  beats: HeroDemoBeat[];
}

function lineOf(source: string, en: string | null | undefined): HeroDemoLine {
  // `splitNote` is what the quiz screens use to pull "A small draft beer,
  // please — how locals order" apart. The aside is worth showing and is not
  // worth showing as part of the sentence.
  const split = splitNote(en ?? "");
  return { source, en: split.text, note: split.note };
}

function findExchange(locale: Locale, id: string): Exchange {
  for (const category of getCategories(locale)) {
    if (category.id !== HERO_DEMO_CATEGORY) continue;
    for (const sub of category.subsections) {
      if (!isDialogueSubsection(sub)) continue;
      const found = (sub.exchanges ?? []).find((ex) => ex.id === id);
      if (found) return found;
    }
  }
  throw new Error(
    `heroDemo: no exchange "${id}" in ${locale} / ${HERO_DEMO_CATEGORY}. ` +
      `The home page hero plays this beat; update HERO_DEMO_BEATS.`
  );
}

/**
 * The beats, resolved against the content files.
 *
 * Throws rather than returning null on anything missing. A hero that quietly
 * renders five bubbles instead of six, or an empty card, is worse than a build
 * that stops: the page is the first thing every visitor sees and nobody would
 * notice the gap for weeks.
 */
export function getHeroDemo(): HeroDemo {
  const locale = HERO_DEMO_LOCALE;
  const info = getLocaleInfo(locale);
  const category = getCategories(locale).find((c) => c.id === HERO_DEMO_CATEGORY);

  if (!category) {
    throw new Error(
      `heroDemo: no category "${HERO_DEMO_CATEGORY}" in ${locale}. ` +
        `The home page hero is built from it.`
    );
  }

  const beats = HERO_DEMO_BEATS.map(({ exchange: id, answer }) => {
    const ex = findExchange(locale, id);

    // Each of the three is load-bearing: the beat is "they open, you answer,
    // they come back", and a beat missing one of them is not that.
    if (ex.speaker !== "them") {
      throw new Error(`heroDemo: "${id}" is not a beat they open. The hero card needs their line first.`);
    }
    const you = ex.answers[answer];
    if (!ex.question?.es || !you?.es || !ex.likelyReply?.es || !ex.situation?.en) {
      throw new Error(
        `heroDemo: "${id}" is missing a question, answer ${answer}, likely reply or situation.`
      );
    }

    return {
      id,
      situation: ex.situation.en,
      them: lineOf(ex.question.es, ex.question.en),
      you: lineOf(you.es, you.en),
      reply: lineOf(ex.likelyReply.es, ex.likelyReply.en),
    };
  });

  return {
    locale,
    language: info.language,
    flag: info.flag,
    title: category.title,
    href: localePath(locale, "/practice"),
    beats,
  };
}
