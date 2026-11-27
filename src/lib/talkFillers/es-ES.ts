import type { TalkFillerSlots } from "../talkFillers";

/**
 * Beats in the es-ES Talk scripts (src/lib/talkScripts.ts) where a filler from
 * the "Heard on every podcast" word list fits as the local's own line.
 * Keyed by script id, then step id. See ../talkFillers.ts.
 *
 * Only the fillers that stand as a line on their own have slots: slang-heard-01
 * (I dunno…), -02 (yeah, yeah), -04 (maybe…), -08 and -10 (the list closers)
 * and -09 (but anyway…). The connectors (-03 plus, -05 sort of, -06 like,
 * -07 in fact) only work in front of a sentence of the speaker's own, and
 * stitching one onto a reply is the line nobody published.
 */
export const ES_FILLERS: TalkFillerSlots = {
  "starting-convo-basics": {
    // They describe their job: "I work in a bar, just next door". Trailing it
    // with "and stuff" is the vague, easy register of a chat on a bar stool.
    you: [
      { phrase: "slang-heard-08", when: "after-reply" },
      { phrase: "slang-heard-10", when: "after-reply" },
    ],
  },
  "starting-convo-bond": {
    // You call the foul a robbery; he is on your side ("That's what I said!").
    // "Yeah, yeah" first is him nodding along before he says it.
    ref: [{ phrase: "slang-heard-02", when: "before-reply" }],
    // You suggest meeting tomorrow at six and he agrees ("OK, perfect"). Only
    // after that line: after a goodbye there is nothing to say yes to.
    bye: [{ phrase: "slang-heard-02", when: "before-reply", on: [1] }],
  },
  "nightlife-friends": {
    // Asked what the plan is, the group shrugs before naming one: "I dunno…"
    // then the afterparty. Plans at a table at 1 a.m. are made like that.
    plans: [{ phrase: "slang-heard-01", when: "before-reply" }],
    // They told you to stay and you are going anyway. "But anyway…" is them
    // letting it go before "See you, take care!".
    leave: [{ phrase: "slang-heard-09", when: "before-reply" }],
  },
  taxi: {
    // You ask to go through the center; the driver thinks the ring road is
    // faster at this hour. "I dunno…" softens contradicting the passenger.
    // Only after that line: the other two get a plain "Done".
    route: [{ phrase: "slang-heard-01", when: "before-reply", on: [1] }],
  },
  "getting-around-lost": {
    // "Is it far?" A passerby estimating a walk ("ten minutes on foot")
    // hedges first, the way anyone guessing a distance does.
    far: [{ phrase: "slang-heard-01", when: "before-reply" }],
  },
};
