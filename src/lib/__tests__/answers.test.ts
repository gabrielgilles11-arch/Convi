import { describe, expect, it } from "vitest";
import {
  answersMatch,
  coreOf,
  normalizeAnswer,
  splitNote,
  tooAlike,
} from "../quizTypes";

/**
 * Marking an answer right or wrong.
 *
 * Every case here is a line that is actually in the decks, because the bugs
 * these guard against were all found by a learner hitting a real one rather
 * than by imagining what might break.
 */

describe("normalizeAnswer", () => {
  it("ignores accents, so a keyboard without them is not a wrong answer", () => {
    expect(normalizeAnswer("¿Cuánto cuesta?")).toBe(normalizeAnswer("cuanto cuesta"));
  });

  it("treats ß as ss — German keyboards are not universal", () => {
    expect(normalizeAnswer("Ein Maß, bitte")).toBe(normalizeAnswer("Ein Mass, bitte"));
  });

  it("folds the Scandinavian vowels the same way", () => {
    expect(normalizeAnswer("Ölet är gott")).toBe(normalizeAnswer("Olet ar gott"));
  });

  it("ignores punctuation and spacing", () => {
    expect(normalizeAnswer("  ¡Hola,  qué tal!  ")).toBe("hola que tal");
  });
});

describe("splitNote", () => {
  it("takes a trailing register note off the answer", () => {
    expect(splitNote("Todo bien (casual)")).toEqual({ text: "Todo bien", note: "casual" });
  });

  it("takes a trailing em-dash aside off too", () => {
    expect(splitNote("Una caña — common in the south")).toEqual({
      text: "Una caña",
      note: "common in the south",
    });
  });

  it("keeps punctuation that belonged to the sentence, not the aside", () => {
    expect(splitNote("Until six (a.m.).").text).toBe("Until six.");
  });

  it("does not double up punctuation the core already had", () => {
    expect(splitNote("Fancy a drink? (mutual interest).").text).toBe("Fancy a drink?");
  });

  it("leaves mid-line parentheses alone — they are part of the phrase", () => {
    expect(splitNote("Where are you (all) from?")).toEqual({
      text: "Where are you (all) from?",
      note: null,
    });
  });

  it("takes only one aside, and never both kinds", () => {
    // The "(ever)" is part of the line; only the dash aside comes off.
    expect(splitNote("I'm never drinking again (ever) — everyone lies.").text).toBe(
      "I'm never drinking again (ever)"
    );
  });

  it("keeps a line that is nothing but its own aside", () => {
    expect(splitNote("(informal)")).toEqual({ text: "(informal)", note: null });
  });

  it("reports no note when there isn't one", () => {
    expect(splitNote("¿Me das un recibo?")).toEqual({ text: "¿Me das un recibo?", note: null });
  });
});

describe("answersMatch", () => {
  it("accepts the answer with or without the authored note", () => {
    // The whole point: nobody should have to type "(formal)" to be right.
    expect(answersMatch("¿Me das un recibo?", "¿Me das un recibo? (formal)")).toBe(true);
    expect(answersMatch("¿Me das un recibo? (formal)", "¿Me das un recibo?")).toBe(true);
  });

  it("accepts an answer typed without accents", () => {
    expect(answersMatch("donde esta el metro", "¿Dónde está el metro?")).toBe(true);
  });

  it("still rejects a different line", () => {
    // The grammar fix from the content audit: "Vamos tres" was wrong Spanish
    // for "there are three of us" and must not pass as the corrected line.
    expect(answersMatch("Vamos tres", "Somos tres")).toBe(false);
  });

  it("rejects an answer that merely contains the expected one", () => {
    expect(answersMatch("Somos tres personas mas", "Somos tres")).toBe(false);
  });
});

describe("tooAlike", () => {
  it("catches the case it was written for", () => {
    // Both are what "¿Una caña porfa?" means. Offering one as the wrong answer
    // to the other is unanswerable — this was a real bug report with a
    // screenshot attached.
    expect(tooAlike("A beer, please.", "A small beer, please.")).toBe(true);
  });

  it("catches one line wholly containing another", () => {
    expect(tooAlike("¿Cuánto cuesta?", "¿Cuánto cuesta ir al centro?")).toBe(true);
  });

  it("leaves contrasting answers alone — contrast is what a distractor is for", () => {
    expect(tooAlike("Draft, thanks.", "Bottle, thanks.")).toBe(false);
  });

  it("leaves unrelated lines alone", () => {
    expect(tooAlike("¿Dónde está el metro?", "Una caña, por favor.")).toBe(false);
  });

  it("is symmetric — which line is asked about must not change the verdict", () => {
    const a = "How many stops is it?";
    const b = "How many stops?";
    expect(tooAlike(a, b)).toBe(tooAlike(b, a));
  });

  it("says nothing about an empty line rather than matching everything", () => {
    expect(tooAlike("", "Una caña, por favor.")).toBe(false);
  });
});

describe("coreOf", () => {
  it("is the answerable half of a line", () => {
    expect(coreOf("Todo bien (casual)")).toBe("Todo bien");
  });
});
