import type { TalkFillerSlots } from "../talkFillers";

/**
 * Beats in the sv-SE Talk scripts (src/lib/talkScripts.ts) where a filler from
 * the "Heard on every podcast" word list fits as the local's own line.
 * Keyed by script id, then step id. See ../talkFillers.ts.
 *
 * Ids, for reading this file: 02 "Ja men…", 06 "Exakt.", 07 "Nej, nej.",
 * 08 "…tycker jag.". The rest have no beat in these scripts: the story
 * connectors (01, 03, 04, 10) need a story around them, nobody here checks
 * you are following (05), and no local is asked how something was (09).
 */
export const SV_FILLERS: TalkFillerSlots = {
  "sv-starting-convo-basics": {
    // Their reply is a warm "how nice, welcome", and "Ja men…" is the usual
    // way that exclamation opens.
    from: [{ phrase: "sv-slang-heard-02", when: "before-reply" }],
    // A week or a few days, their reply builds on it: then you have time for
    // the old town. Agree, then add.
    long: [{ phrase: "sv-slang-heard-02", when: "before-reply" }],
  },
  "sv-starting-convo-main": {
    // You apologize for not following, and their reply is "no worries": the
    // soft "Nej, nej." waves the apology off before it.
    lost: [{ phrase: "sv-slang-heard-07", when: "before-reply" }],
  },
  "sv-restaurant-main": {
    // Their recommendation is an opinion, and the tag softens it.
    recommend: [{ phrase: "sv-slang-heard-08", when: "after-reply" }],
    // You say it was lovely, they are glad to hear it.
    taste: [{ phrase: "sv-slang-heard-02", when: "before-reply" }],
  },
  "sv-hotel-checkin": {
    // They have the booking up and are checking the length of stay against
    // it, so your answer matching gets a confirmation before the room number.
    nights: [{ phrase: "sv-slang-heard-06", when: "before-reply" }],
  },
  "sv-nightlife-friends": {
    // A local's tip for the next bar is their own opinion.
    tip: [{ phrase: "sv-slang-heard-08", when: "after-reply" }],
  },
};
