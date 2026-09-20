import { describe, expect, it } from "vitest";
import {
  answeredIt,
  answersMatch,
  buildOptions,
  buildQuestion,
  buildRound,
  buildStages,
  coreOf,
  pickedIt,
  tooAlike,
  translationCore,
  type AnswerLang,
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
      expect(buildRound(items, items, length)).toHaveLength(length);
    }
  });

  it("asks what a line means at most three times in any round", () => {
    // The property the content rewrite exists to hold. A round is eight
    // questions; the matching screen is a word exercise by nature and is
    // exempt. What is counted is everything else that hands you a line and
    // asks what it means or how to say it, rather than naming a moment and
    // asking what you would say in it.
    //
    // Run stage by stage with the pool a learner would actually have at that
    // point, because that is where it used to fail: a stage of nothing but
    // words came out as seven definitions and a board.
    const byId = new Map(items.map((i) => [i.id, i]));
    const stages = buildStages(items, getCategoryList(locale));

    stages.forEach((stage, index) => {
      const stageItems = stage.itemIds.map((id) => byId.get(id)!).filter(Boolean);
      // Everything reached by the time this stage comes up, which is what
      // QuizApp hands the builder.
      const reached = new Set(stages.slice(0, index + 1).flatMap((s) => s.itemIds));
      const seen = items.filter((i) => reached.has(i.id));

      for (let run = 0; run < 10; run++) {
        const round = buildRound(stageItems, seen);
        const definitions = round.filter((q) => q.form !== "match" && !q.saidByYou);
        expect(
          definitions.length,
          `${stage.id} run ${run}: ${definitions.length} of ${round.length} asked what a line means — ${JSON.stringify(
            definitions.map((q) => q.shown)
          )}`
        ).toBeLessThanOrEqual(3);
      }
    });
  });

  it("only ever asks you to type or assemble the language you came to learn", () => {
    // The bug this exists for, with a screenshot attached: "What does 'En
    // bärs, tack.' mean?" handed over the tiles A / very / casual / "beer, /
    // please." and marked the learner wrong for leaving out the editor's
    // "very casual". Assembling an English gloss tests whether you can
    // reproduce somebody's phrasing, which is not what anybody is here for,
    // and the tiles come out carrying stray quote marks.
    const byId = new Map(items.map((i) => [i.id, i]));
    const stages = buildStages(items, getCategoryList(locale));

    stages.forEach((stage, index) => {
      const stageItems = stage.itemIds.map((id) => byId.get(id)!).filter(Boolean);
      const reached = new Set(stages.slice(0, index + 1).flatMap((s) => s.itemIds));
      const seen = items.filter((i) => reached.has(i.id));

      for (let run = 0; run < 8; run++) {
        for (const q of buildRound(stageItems, seen)) {
          if (q.form !== "type" && q.form !== "bank") continue;
          expect(
            q.answerLang,
            `${stage.id} run ${run}: asked to produce English — "${q.shown}" -> "${q.answer}"`
          ).toBe("source");
        }
      }
    });
  });

  it("never asks you to type a line its cue cannot identify", () => {
    // Multiple choice is safe by construction: buildOptions refuses a
    // distractor whose own cue is this cue, so the rival never appears beside
    // the right answer. Typing has nothing to refuse — "How do you say: How
    // long?" takes one of the two lines with that English on them and marks
    // the other wrong, with nothing on screen to explain it. Those slots must
    // stay multiple choice.
    const byId = new Map(items.map((i) => [i.id, i]));
    const stages = buildStages(items, getCategoryList(locale));

    stages.forEach((stage, index) => {
      const stageItems = stage.itemIds.map((id) => byId.get(id)!).filter(Boolean);
      const reached = new Set(stages.slice(0, index + 1).flatMap((s) => s.itemIds));
      const seen = items.filter((i) => reached.has(i.id));

      for (let run = 0; run < 6; run++) {
        for (const q of buildRound(stageItems, seen)) {
          if (q.form !== "type" && q.form !== "bank") continue;
          const cueLang = q.answerLang === "source" ? "en" : "source";
          const rivals = seen.filter(
            (other) =>
              other.id !== q.itemId &&
              faceOf(other, cueLang) &&
              tooAlike(faceOf(other, cueLang), q.shown) &&
              !tooAlike(faceOf(other, q.answerLang), q.answer)
          );
          expect(
            rivals.map((r) => faceOf(r, q.answerLang)),
            `${stage.id} run ${run}: "${q.shown}" is typed, but also means`
          ).toEqual([]);
        }
      }
    });
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

/**
 * One side of an item as the question shows it: the line, or the English for
 * it. Mirrors answerTextFor — a phrase's English is a gloss whose dash
 * introduces commentary, a situation's is a translation whose dash is
 * punctuation.
 */
function faceOf(item: QuizItem, lang: "source" | "en"): string {
  if (lang === "source") {
    const text = item.kind === "phrase" ? item.front : item.correctAnswer;
    return text ? coreOf(text) : "";
  }
  const text = item.kind === "phrase" ? item.correctAnswer : item.correctAnswerTranslation ?? "";
  if (!text) return "";
  return item.kind === "phrase" ? coreOf(text) : translationCore(text);
}

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

  // The separation pass is a single walk plus a repair swap, not a search: it
  // says so itself — when nothing left in the queue can follow cleanly, the
  // next question goes in anyway rather than shortening the round. On a deck
  // that is nothing but twins that escape hatch is reachable, so the property
  // to assert is a rate, not zero. Measured over 5000 rounds of this deck: the
  // builder leaves a clash in roughly one round in six hundred, while the same
  // deck with the separation pass removed clashes in half of all rounds. A one
  // percent ceiling sits two orders of magnitude clear of the first and well
  // under the second, so this stays green on a good builder and goes red on a
  // builder that stopped separating — which asserting zero could not do
  // without also going red a few percent of the time for no reason.
  const CLASH_BUDGET = 0.01;

  it("keeps twins apart even when half the deck is twins", () => {
    let pairs = 0;
    let clashes = 0;
    const examples: string[] = [];

    for (let run = 0; run < RUNS * 10; run++) {
      const round = buildRound(twinned);
      for (let i = 1; i < round.length; i++) {
        const [a, b] = [round[i - 1], round[i]];
        if (a.form === "match" || b.form === "match") continue;
        pairs++;
        if (adjacentClash(a, b)) {
          clashes++;
          if (examples.length < 5) {
            examples.push(`run ${run}, position ${i}: "${a.shown}" then "${b.shown}"`);
          }
        }
      }
    }

    expect(pairs).toBeGreaterThan(0);
    expect(
      clashes / pairs,
      `${clashes} of ${pairs} adjacent pairs clashed\n${examples.join("\n")}`
    ).toBeLessThanOrEqual(CLASH_BUDGET);
  });
});

/**
 * The item's answer text in one language, the way buildOptions is called for
 * real. Which field holds which language depends on the kind: a situation's
 * `correctAnswer` is the target-language line, a phrase's is the English gloss
 * and its `front` is the target-language phrase. Handing buildOptions an
 * English gloss under `answerLang: "source"` would compare an English answer
 * against target-language distractors, and no assertion about the two could
 * ever fire — which is what made a third of the deck untested here.
 */
function answerIn(item: QuizItem, lang: AnswerLang): string {
  const text =
    lang === "source"
      ? item.kind === "phrase"
        ? item.front
        : item.correctAnswer
      : item.kind === "phrase"
        ? item.correctAnswer
        : (item.correctAnswerTranslation ?? "");
  return text ? coreOf(text) : "";
}

describe("buildOptions", () => {
  const items = decks.get("es-ES")!;

  it("returns four options with the answer among them", () => {
    const item = items[0];
    const answer = answerIn(item, "source");
    const options = buildOptions(answer, "source", items, items, item);
    expect(options).toHaveLength(4);
    expect(options).toContain(answer);
  });

  it("never returns a distractor that means the same as the answer", () => {
    // Both directions, because both are asked. A phrase is shown in Spanish and
    // answered in English as often as the other way round, and the guard has to
    // hold on whichever side is being produced.
    for (const item of items) {
      for (const lang of ["source", "en"] as const) {
        const answer = answerIn(item, lang);
        if (!answer) continue;
        const cue = answerIn(item, lang === "source" ? "en" : "source");
        const options = buildOptions(answer, lang, items, items, item, cue || undefined);
        for (const option of options.filter((o) => o !== answer)) {
          expect(
            answersMatch(option, answer),
            `${item.id} (${lang}): "${option}" matches the answer "${answer}"`
          ).toBe(false);
        }
      }
    }
  });

  it("copes with a pool too small to fill it rather than throwing", () => {
    const one = items.slice(0, 1);
    const answer = answerIn(one[0], "source");
    const options = buildOptions(answer, "source", one, [], one[0]);
    expect(options).toContain(answer);
    expect(options.length).toBeGreaterThanOrEqual(1);
  });
});

/**
 * Every line the author wrote for one moment.
 *
 * An exchange is allowed more than one answer, and where it has them they are
 * alternatives rather than a winner and some runners-up. The deck used to ask
 * the situation and accept only the first, so a learner who typed the other
 * line — printed on the scenario page under the same scene — was told they were
 * wrong. Both halves of that have to hold: the alternatives count, and none of
 * them is ever offered as a wrong answer to pick.
 */
describe.each(LOCALES.map((l) => l.locale))("all the right answers: %s", (locale: Locale) => {
  const items = buildQuizItems(locale);
  const withAlternatives = items.filter(
    (i) => i.kind === "situation" && i.alsoAccepted.length > 0
  );

  it("has exchanges written with more than one answer", () => {
    expect(withAlternatives.length).toBeGreaterThan(0);
  });

  it("accepts every one of them when the scene is asked forward", () => {
    for (const item of withAlternatives) {
      const question = buildQuestion(item, false, "type", items, items);
      if (!question) continue;
      for (const line of item.alsoAccepted) {
        expect(
          answeredIt(line, question.accepted),
          `${item.id}: "${line}" is authored for this scene and was refused`
        ).toBe(true);
      }
      // The line the deck happens to hold first still counts, obviously.
      expect(answeredIt(item.correctAnswer, question.accepted)).toBe(true);
    }
  });

  it("asks it backwards about one line only", () => {
    for (const item of withAlternatives) {
      const question = buildQuestion(item, true, "type", items, items);
      // Reversed, the cue is the English of this line and no other.
      if (question) expect(question.accepted.length).toBe(1);
    }
  });

  it("never offers a second right answer to pick from", () => {
    for (const item of withAlternatives) {
      const question = buildQuestion(item, false, "choice", items, items);
      if (!question) continue;
      const right = question.options.filter((option) => pickedIt(option, question.accepted));
      expect(right.length, `${item.id}: ${right.length} correct options`).toBe(1);
    }
  });
});
