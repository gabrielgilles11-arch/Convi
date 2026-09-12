import { describe, expect, it } from "vitest";
import {
  answersMatch,
  buildOptions,
  buildQuestion,
  buildRound,
  buildStages,
  tooAlike,
  type Question,
  type QuizItem,
} from "../quizTypes";
import { buildQuizItems, getCategoryList } from "../quizItems";
import { LOCALES, type Locale } from "../content";

/**
 * The round builder, run against the decks that actually ship.
 *
 * These are properties rather than fixed expectations: the builder shuffles, so
 * asserting a particular round would be asserting the seed. What must hold is
 * that no round it can produce is unanswerable or gives itself away, whichever
 * way the shuffle falls — so each one is run many times.
 *
 * Using the real content is the point. A deck edit that reintroduces two
 * interchangeable lines fails here, which is exactly how the "¿Una caña
 * porfa?" bug reached a learner in the first place.
 */

const RUNS = 40;
const locales = LOCALES.map((l) => l.locale);

/** Every deck, loaded once. */
const decks = new Map<Locale, QuizItem[]>(
  locales.map((locale) => [locale, buildQuizItems(locale)])
);

describe.each(locales)("%s deck", (locale) => {
  const items = decks.get(locale)!;

  it("has content to quiz on", () => {
    expect(items.length).toBeGreaterThan(20);
  });

  it("gives every item a unique id", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never offers two answers that are both right", () => {
    // The one that matters most. A multiple-choice question with two correct
    // options cannot be answered, and the learner has no way to tell.
    for (let run = 0; run < RUNS; run++) {
      for (const question of buildRound(items)) {
        if (question.form !== "choice") continue;
        const correct = question.options.filter((o) => answersMatch(o, question.answer));
        expect(
          correct.length,
          `${question.itemId}: ${correct.length} correct options among ${JSON.stringify(question.options)}`
        ).toBe(1);
      }
    }
  });

  it("never offers a distractor that means what the answer means", () => {
    // Stricter than the test above, and the property the guard in buildOptions
    // actually promises: not just "no second identical answer" but no second
    // *defensible* one. Exhaustive over the deck rather than over random
    // rounds, because this fires on roughly one option in a thousand — often
    // enough to reach a learner, rarely enough for sampling to miss it.
    for (const item of items) {
      for (let run = 0; run < 8; run++) {
        const question = buildQuestion(item, false, "choice", items, items);
        if (!question || question.form !== "choice") continue;
        for (const option of question.options) {
          if (option === question.answer) continue;
          expect(
            tooAlike(option, question.answer),
            `${item.id}: "${option}" says the same as the answer "${question.answer}"`
          ).toBe(false);
        }
      }
    }
  });

  it("never repeats an option within a question", () => {
    for (let run = 0; run < RUNS; run++) {
      for (const question of buildRound(items)) {
        if (question.form !== "choice") continue;
        const seen = new Set(question.options.map((o) => o.toLowerCase()));
        expect(seen.size).toBe(question.options.length);
      }
    }
  });

  it("always includes the correct answer among the options", () => {
    for (let run = 0; run < RUNS; run++) {
      for (const question of buildRound(items)) {
        if (question.form !== "choice") continue;
        expect(question.options).toContain(question.answer);
      }
    }
  });

  it("asks the same item at most once per round", () => {
    for (let run = 0; run < RUNS; run++) {
      const round = buildRound(items);
      const asked = round.map((q) => `${q.itemId}:${q.shown}`);
      expect(new Set(asked).size).toBe(asked.length);
    }
  });

  it("does not put two near-identical questions back to back", () => {
    // Seeing the answer to the next question inside the current one is the bug
    // this guards. The shipped decks produce none of these, so none is what is
    // asserted — an allowance would only hide the day that stops being true.
    for (let run = 0; run < RUNS; run++) {
      const round = buildRound(items);
      for (let i = 1; i < round.length; i++) {
        const [a, b] = [round[i - 1], round[i]];
        if (a.form === "match" || b.form === "match") continue;
        expect(
          adjacentClash(a, b),
          `${a.itemId} then ${b.itemId}: "${a.shown}" / "${a.answer}" then "${b.shown}" / "${b.answer}"`
        ).toBe(false);
      }
    }
  });

  it("builds a round of the requested length", () => {
    for (const length of [6, 8]) {
      expect(buildRound(items, items, length).length).toBeLessThanOrEqual(length);
    }
  });

  it("fills four options even for the smallest stage on the path", () => {
    // Spanish "Starting a convo" has one phrase item; without the fallback
    // pool it rendered a "multiple" choice of one. The guards are given up one
    // at a time rather than handing back an unanswerable question.
    const byId = new Map(items.map((i) => [i.id, i]));
    const stages = buildStages(items, getCategoryList(locale));
    const smallest = stages.reduce((a, b) => (a.itemIds.length <= b.itemIds.length ? a : b));
    const stageItems = smallest.itemIds.map((id) => byId.get(id)!).filter(Boolean);

    for (const item of stageItems) {
      const question = buildQuestion(item, false, "choice", stageItems, items);
      if (!question || question.form !== "choice") continue;
      expect(
        question.options.length,
        `${item.id} in ${smallest.id} (${stageItems.length} items)`
      ).toBe(4);
    }
  });
});

/** The same thing the round builder means by two questions clashing. */
function adjacentClash(a: Question, b: Question): boolean {
  return (
    a.itemId === b.itemId ||
    tooAlike(a.answer, b.answer) ||
    tooAlike(a.shown, b.shown) ||
    tooAlike(a.answer, b.shown) ||
    tooAlike(a.shown, b.answer)
  );
}

describe("separating near-identical questions", () => {
  // The decks are clean, so on real content this property holds trivially and
  // would keep holding if the separation pass were deleted. A deck built to
  // break it is what makes the test worth running: every item here has a twin,
  // so a builder that does not actively separate them will pair them up
  // almost immediately.
  const real = decks.get("es-ES")!;
  const twinned: QuizItem[] = [];
  for (const item of real.slice(0, 8)) {
    twinned.push(item, {
      ...item,
      id: `${item.id}-twin`,
      // Same line plus a word: tooAlike by containment, but not an exact
      // duplicate, so only the similarity check catches it.
      correctAnswer: `${item.correctAnswer} ahora`,
    });
  }

  it("keeps twins apart even when half the deck is twins", () => {
    for (let run = 0; run < RUNS; run++) {
      const round = buildRound(twinned);
      for (let i = 1; i < round.length; i++) {
        const [a, b] = [round[i - 1], round[i]];
        if (a.form === "match" || b.form === "match") continue;
        expect(
          adjacentClash(a, b),
          `run ${run}, position ${i}: "${a.shown}" then "${b.shown}"`
        ).toBe(false);
      }
    }
  });
});

describe("buildOptions", () => {
  const items = decks.get("es-ES")!;

  it("returns four options with the answer among them", () => {
    const item = items[0];
    const options = buildOptions(item.correctAnswer, "source", items, items, item);
    expect(options).toHaveLength(4);
    expect(options).toContain(item.correctAnswer);
  });

  it("never returns a distractor that means the same as the answer", () => {
    for (const item of items) {
      const options = buildOptions(item.correctAnswer, "source", items, items, item, item.front);
      const wrong = options.filter((o) => o !== item.correctAnswer);
      for (const option of wrong) {
        expect(
          answersMatch(option, item.correctAnswer),
          `${item.id}: "${option}" matches the answer "${item.correctAnswer}"`
        ).toBe(false);
      }
    }
  });

  it("copes with a pool too small to fill it rather than throwing", () => {
    const one = items.slice(0, 1);
    const options = buildOptions(one[0].correctAnswer, "source", one, [], one[0]);
    expect(options).toContain(one[0].correctAnswer);
    expect(options.length).toBeGreaterThanOrEqual(1);
  });
});
