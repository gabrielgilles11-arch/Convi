import { describe, expect, it } from "vitest";
import { whoFromSituation, whoSays } from "../whoSays";
import { buildQuizItems } from "../quizItems";
import { buildQuestion } from "../quizTypes";
import { getCategories, LOCALES } from "../content";

describe("who says their line", () => {
  it("names the person the situation names", () => {
    expect(whoFromSituation("You're at a bar and the bartender asks what you're drinking.")).toBe("The bartender");
    expect(whoFromSituation("The doorman holds out a hand without saying much.")).toBe("The bouncer");
    expect(whoFromSituation("A friend asks how your hangover is.")).toBe("Your friend");
    expect(whoFromSituation("Someone asks which football team you support.")).toBe("Someone");
    expect(whoFromSituation("They ask whether you're staying or taking it away.")).toBe("They");
  });

  it("prefers someone with a job in the scene to the people around you", () => {
    expect(
      whoFromSituation("Seated with friends, the waiter offers drinks while you read the menu.")
    ).toBe("The waiter");
  });

  it("does not take a word that only contains a role for the role", () => {
    expect(whoFromSituation("Someone asks whether the neighborhood you stayed in was any good.")).toBe("Someone");
    expect(whoFromSituation("You're saying goodbye and want to leave the door open.")).toBe("They");
    expect(whoFromSituation("Their friends have arrived and the mood has changed.")).toBe("They");
  });

  it("asks when the line is a question, says when it is not, and agrees with They", () => {
    expect(whoSays("The waiter asks whether you want bread.", "¿Queréis pan?")).toBe("The waiter asks");
    expect(whoSays("The doorman looks past you.", "Hoy no, chicos.")).toBe("The bouncer says");
    expect(whoSays("They ask how you're paying.", "¿Cómo quieres pagar?")).toBe("They ask");
    expect(whoSays("Nobody is named here.", "Eso cerró.")).toBe("They say");
  });

  it("takes the authored `who` over the reading", () => {
    expect(
      whoSays("Someone suggests you ring the landlord about the boiler.", "Llámale tú.", "Someone")
    ).toBe("Someone says");
  });
});

describe.each(LOCALES.map((l) => l.locale))("%s: their line in Practice", (locale) => {
  const items = buildQuizItems(locale);
  const exchanges = new Map(
    getCategories(locale).flatMap((c) =>
      c.subsections.flatMap((s) => [
        ...((s as { exchanges?: unknown[] }).exchanges ?? []),
        ...((s as { scenes?: unknown[] }).scenes ?? []),
      ])
    ).map((ex) => [(ex as { id: string }).id, ex as { speaker: string; question: { es: string; en: string } }])
  );

  it("is their authored line where they speak first, and absent where you do", () => {
    for (const item of items) {
      if (item.kind !== "situation") continue;
      const ex = exchanges.get(item.id)!;
      if (ex.speaker === "them") {
        expect(item.heard?.source, item.id).toBe(ex.question.es);
        expect(item.heard?.en, item.id).toBe(ex.question.en);
        expect(item.heard?.audioId, item.id).toBe(`${item.id}-q`);
        expect(item.heard?.who, item.id).toMatch(/ (asks?|says?)$/);
      } else {
        expect(item.heard ?? null, item.id).toBeNull();
      }
    }
  });

  it("is shown and played only when the situation is asked forward", () => {
    const item = items.find((i) => i.heard)!;
    const forward = buildQuestion(item, false, "choice", items, items)!;
    expect(forward.heard).toEqual(item.heard);
    expect(forward.shownAudio).toBe(item.heard!.audioId);

    const reverse = buildQuestion(item, true, "choice", items, items);
    if (reverse) {
      expect(reverse.heard ?? null).toBeNull();
      expect(reverse.shownAudio).toBeNull();
    }
  });
});
