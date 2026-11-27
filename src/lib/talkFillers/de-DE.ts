import type { TalkFillerSlots } from "../talkFillers";

/**
 * Beats in the de-DE Talk scripts (src/lib/talkScripts.ts) where a filler from
 * the "Heard on every podcast" word list fits as the local's own line.
 * Keyed by script id, then step id. See ../talkFillers.ts.
 *
 * Register decides most of it in German. The du-form tag (de-slang-heard-08)
 * only goes where the local is already saying du: the bar conversations, never
 * a waiter, driver, cashier, officer, pharmacist or hotel desk. The casual
 * trailers that are not du-form (or something, and stuff) can go to a driver
 * or a passer-by, who talk that way whatever pronoun they use.
 *
 * Left out on purpose: de-slang-heard-04 (I mean), -05 (so to speak) and -09
 * (you see), which each need a sentence of their own around them to mean
 * anything, and no reply in these scripts is that sentence.
 */
export const DE_FILLERS: TalkFillerSlots = {
  "de-starting-convo-basics": {
    // You say you speak no German at all; they wave it off ("doesn't matter")
    // before saying it's no problem and they'll slow down.
    german: [{ phrase: "de-slang-heard-10", when: "before-reply", on: [0] }],
    // You're here for work, not on vacation: mild surprise, then "oh, interesting".
    holiday: [{ phrase: "de-slang-heard-06", when: "before-reply", on: [1] }],
    // Asked what they do, they say they work round the corner, and leave the
    // rest vague: "...and stuff".
    you: [{ phrase: "de-slang-heard-02", when: "after-reply" }],
  },
  "de-nightlife-door": {
    // The bouncer hears your age and doubts it ("really?") before asking for ID.
    age: [{ phrase: "de-slang-heard-06", when: "before-reply" }],
  },
  "de-nightlife-friends": {
    // You're with friends, and they invite you over anyway: "still... come and
    // join us". Only after that line; on your own, there is nothing to go
    // ahead despite.
    alone: [{ phrase: "de-slang-heard-07", when: "before-reply", on: [0] }],
    // "Every weekend" is a shrug of a guess: somehow, or every weekend or so.
    often: [
      { phrase: "de-slang-heard-01", when: "before-reply" },
      { phrase: "de-slang-heard-03", when: "after-reply" },
    ],
    // An insider tip (two streets over, that one's better), said in du: "you know?"
    tip: [{ phrase: "de-slang-heard-08", when: "after-reply" }],
  },
  "de-getting-around-taxi": {
    // The driver's "about twenty minutes" is an estimate: "...or so".
    time: [{ phrase: "de-slang-heard-03", when: "after-reply" }],
  },
  "de-getting-around-metro": {
    // A passenger counting stops in their head: "four stops... or so".
    stops: [{ phrase: "de-slang-heard-03", when: "after-reply" }],
  },
};
