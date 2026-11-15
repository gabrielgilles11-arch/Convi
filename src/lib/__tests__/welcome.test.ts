import { describe, expect, it } from "vitest";
import { buildQuizItems } from "../quizItems";
import { LOCALES, type Locale } from "../content";
import { buildQuestion, stageKeyOf } from "../quizTypes";
import {
  pickWelcomeItems,
  tallyWelcome,
  welcomeEligible,
  WELCOME_LENGTH,
  WELCOME_SECTIONS,
} from "../welcome";

/** A seeded generator, so a failure can be replayed. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe.each(LOCALES.map((l) => l.locale))("welcome round: %s", (locale: Locale) => {
  const items = buildQuizItems(locale);

  it("asks five questions and visits every section", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const picks = pickWelcomeItems(items, seeded(seed));
      expect(picks).toHaveLength(WELCOME_LENGTH);
      const stages = new Set(picks.map((p) => p.stage));
      for (const { stage } of WELCOME_SECTIONS) expect(stages.has(stage), `${stage} seed ${seed}`).toBe(true);
    }
  });

  it("never asks the same thing twice, and only asks what it promised", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const picks = pickWelcomeItems(items, seeded(seed));
      expect(new Set(picks.map((p) => p.item.id)).size).toBe(picks.length);
      for (const p of picks) {
        expect(stageKeyOf(p.item.categoryId)).toBe(p.stage);
        expect(welcomeEligible(p.item)).toBe(true);
      }
    }
  });

  it("asks about a beer in the beer section", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const beer = pickWelcomeItems(items, seeded(seed)).find((p) => p.stage === "beer-food")!;
      const text = `${beer.item.front} ${beer.item.correctAnswer} ${beer.item.correctAnswerTranslation}`;
      expect(text, beer.item.id).toMatch(/beer|ca[ñn]a|cerveza|öl|stark|bier|helles|ma[ßs]|halbe/i);
    }
  });

  it("varies the order from one visit to the next", () => {
    const orders = new Set(
      Array.from({ length: 12 }, (_, i) => pickWelcomeItems(items, seeded(i + 1)).map((p) => p.stage).join(","))
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("turns every pick into a multiple choice with real options", () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const { item } of pickWelcomeItems(items, seeded(seed))) {
        const section = items.filter((i) => i.categoryId === item.categoryId);
        const q = buildQuestion(item, false, "choice", section, items);
        expect(q?.form, item.id).toBe("choice");
        expect(q!.options.length, item.id).toBeGreaterThanOrEqual(3);
        expect(q!.options.filter((o) => q!.accepted.includes(o)), item.id).toHaveLength(1);
      }
    }
  });
});

describe("tallyWelcome", () => {
  const items = buildQuizItems("es-ES");
  const picks = pickWelcomeItems(items, seeded(7));

  it("counts first tries per section and leaves out sections not asked", () => {
    const first = Object.fromEntries(picks.map((p, i) => [p.item.id, i % 2 === 0]));
    const tally = tallyWelcome(picks, first);
    expect(tally.reduce((n, t) => n + t.total, 0)).toBe(picks.length);
    expect(tally.reduce((n, t) => n + t.right, 0)).toBe(picks.filter((_, i) => i % 2 === 0).length);
    expect(tallyWelcome(picks.slice(0, 1), first)).toHaveLength(1);
  });

  it("counts an unanswered question as not right", () => {
    expect(tallyWelcome(picks, {}).every((t) => t.right === 0)).toBe(true);
  });
});
