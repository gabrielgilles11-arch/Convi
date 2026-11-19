import { describe, expect, it } from "vitest";
import { spokenLines } from "../../../scripts/generate-audio.mjs";
import { buildConversations } from "../conversations";
import { buildQuizItems, getCategoryList } from "../quizItems";
import { buildRepairKit } from "../repair";
import { HUH_PROMPT, huhDue, huhFitsStage, huhPlan, withHuh } from "../repairTypes";
import { buildRound, buildStages } from "../quizTypes";
import { LOCALES, type Locale } from "../content";

const locales = LOCALES.map((l) => l.locale);

describe.each(locales)("the Huh? kit: %s", (locale: Locale) => {
  const kit = buildRepairKit(locale)!;
  const recorded = new Map<string, string>(
    (spokenLines(locale) as { id: string; text: string }[]).map((line) => [line.id, line.text])
  );

  it("is built from content lines, each with a clip the recorder makes", () => {
    expect(kit).toBeTruthy();
    expect(kit.asks.length).toBeGreaterThanOrEqual(2);
    const lines = [
      ...kit.asks,
      kit.back,
      ...(kit.english ? [kit.english.offer, kit.english.agree, ...kit.english.steer] : []),
    ];
    for (const line of lines) {
      expect(line.source.trim(), "an empty line").not.toBe("");
      expect(line.source, "a fill-in blank nobody says").not.toMatch(/__|\[[A-ZÅÄÖÜ]+\]/);
      expect(recorded.get(line.audioId!), `clip ${line.audioId}`).toBe(line.source.trim());
    }
  });

  it("has the switch to English only where the local makes it: Sweden", () => {
    expect(kit.english !== null).toBe(locale === "sv-SE");
  });

  it("wires the moment into the bar and the taxi, on a line of theirs", () => {
    const wired = buildConversations(locale).filter((c) => c.huhAt !== null);
    expect(wired.map((c) => c.id).sort()).toEqual(
      buildConversations(locale)
        .filter((c) => /(^|-)(beer-food-main|taxi)$/.test(c.id))
        .map((c) => c.id)
        .sort()
    );
    expect(wired.length).toBe(2);
    for (const convo of wired) {
      expect(convo.turns[convo.huhAt!]?.theirOpener, convo.id).toBeTruthy();
    }
  });

  it("puts one Huh? question in a round where it belongs, never first", () => {
    const items = buildQuizItems(locale);
    const stages = buildStages(items, getCategoryList(locale));
    let placed = 0;
    for (const stage of stages) {
      const pool = items.filter((i) => stage.itemIds.includes(i.id));
      const round = withHuh(buildRound(pool, pool), pool, kit);
      const huh = round.filter((q) => q.huh);
      const fits = pool.length > 0 && huhFitsStage(pool[0]!.categoryId);
      if (!fits) {
        expect(huh, stage.id).toHaveLength(0);
        continue;
      }
      expect(huh.length, stage.id).toBeLessThanOrEqual(1);
      if (huh.length === 0) continue;
      placed += 1;
      const q = huh[0]!;
      expect(round[0]!.huh, `${stage.id} opens on the Huh?`).toBeFalsy();
      expect(q.prompt).toBe(HUH_PROMPT);
      expect(q.accepted).toEqual(kit.asks.map((a) => a.source));
      expect(q.options).toContain(q.answer);
      // Exactly one way of asking again among the options, or the question
      // has two right answers.
      expect(q.options.filter((o) => q.accepted.includes(o))).toHaveLength(1);
      expect(q.reply?.source).toBe(kit.back.source);
    }
    // Nearly every section gets one.
    expect(placed).toBeGreaterThanOrEqual(stages.length - 4);
  });
});

describe("when Talk has a Huh? moment", () => {
  const plain = buildConversations("es-ES").find((c) => c.huhAt === null)!;
  const wired = buildConversations("es-ES").find((c) => c.huhAt !== null)!;

  it("comes due on every third conversation started", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => huhDue(plain, n))).toEqual([false, false, true, false, false, true]);
    expect(huhDue(plain, 0)).toBe(false);
  });

  it("always comes due in a wired conversation, on its wired beat", () => {
    expect([1, 2, 3].every((n) => huhDue(wired, n))).toBe(true);
    expect(huhPlan(wired)).toEqual({ at: wired.huhAt });
  });

  it("lands on their first or second line elsewhere", () => {
    expect(huhPlan(plain, () => 0)).toEqual({ nth: 1 });
    expect(huhPlan(plain, () => 0.99)).toEqual({ nth: 2 });
  });

  it("leaves a round alone with no kit", () => {
    const items = buildQuizItems("es-ES").filter((i) => i.categoryId === "beer-food");
    const round = buildRound(items, items);
    expect(withHuh(round, items, null)).toBe(round);
  });
});
