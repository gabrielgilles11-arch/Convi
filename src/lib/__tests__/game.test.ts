import { describe, expect, it } from "vitest";
import { buildConversations } from "../conversations";
import { LOCALES } from "../content";
import { gradeReply } from "../conversationTypes";
import { normalizeAnswer, tooAlike } from "../quizTypes";
import {
  CHOICES,
  GAME_SCENES,
  buildChoices,
  distractorPool,
  gameScenes,
  pointsFor,
  safeDistractor,
  starsFor,
} from "../gameTypes";

const locales = LOCALES.map((l) => l.locale);

/** Deterministic, so a failure names the same options every run. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("game scenes", () => {
  it("has a scene list for every edition", () => {
    for (const locale of locales) expect(GAME_SCENES[locale]?.length).toBeGreaterThan(0);
  });

  it("points every playable scene at an authored conversation", () => {
    for (const locale of locales) {
      const scenes = gameScenes(locale, buildConversations(locale));
      for (const scene of scenes) {
        if (scene.def.subsectionId === null) continue;
        expect(scene.conversation, `${locale} ${scene.def.kind}`).not.toBeNull();
      }
    }
  });

  it("plays taxi, bar and metro in every edition", () => {
    for (const locale of locales) {
      const playable = gameScenes(locale, buildConversations(locale))
        .filter((s) => s.conversation)
        .map((s) => s.def.kind);
      expect(playable).toEqual(expect.arrayContaining(["taxi", "bar", "metro"]));
    }
  });
});

describe("A, B or C", () => {
  for (const locale of locales) {
    const convos = buildConversations(locale);
    const scenes = gameScenes(locale, convos);
    const playable = scenes.flatMap((s) => (s.conversation ? [s.conversation] : []));

    it(`${locale}: every beat gets a full set of options`, () => {
      for (const convo of playable) {
        for (const turn of convo.turns) {
          const pool = distractorPool(turn, convo, playable);
          expect(pool.length, `${convo.id} / ${turn.id}`).toBeGreaterThanOrEqual(CHOICES - 1);
        }
      }
    });

    it(`${locale}: exactly one option is right, across many shuffles`, () => {
      for (const convo of playable) {
        for (const turn of convo.turns) {
          for (let seed = 1; seed <= 25; seed++) {
            const { options, answer } = buildChoices(turn, convo, playable, seeded(seed));
            const label = `${convo.id} / ${turn.id} / seed ${seed}`;

            expect(options.length, label).toBe(CHOICES);
            expect(answer, label).toBeGreaterThanOrEqual(0);

            const right = options.filter((o) => gradeReply(o.source, turn.yourLines).correct);
            expect(right.length, label).toBe(1);
            expect(options[answer]).toBe(right[0]);

            const keys = options.map((o) => normalizeAnswer(o.source));
            expect(new Set(keys).size, label).toBe(CHOICES);

            const wrong = options.filter((_, i) => i !== answer);
            expect(tooAlike(wrong[0]!.source, wrong[1]!.source), label).toBe(false);
          }
        }
      }
    });

    it(`${locale}: never offers a line the beat would accept`, () => {
      for (const convo of playable) {
        for (const turn of convo.turns) {
          for (const line of turn.yourLines) expect(safeDistractor(turn, line)).toBe(false);
        }
      }
    });
  }

  it("keeps an answer to another question off a beat where you are asked", () => {
    // "Rubia." answers "What are you having?" too well: a beer is a fair
    // answer even though the line was written for "Lager or amber?".
    const convos = buildConversations("es-ES");
    const bar = convos.find((c) => c.id === "beer-food-main")!;
    const asked = bar.turns.find((t) => t.theirOpener?.source === "¿Qué vas a tomar?")!;
    const pool = distractorPool(asked, bar, convos).map((l) => l.source);
    expect(pool).not.toContain("Rubia.");
    expect(pool).not.toContain("De barril, gracias.");
  });

  it("keeps a line from an overlapping moment off the beat", () => {
    const convos = buildConversations("sv-SE");
    const metro = convos.find((c) => c.id === "sv-getting-around-metro")!;
    const direction = metro.turns.find((t) => t.yourLines[0]?.source === "Vilken riktning?")!;
    const pool = distractorPool(direction, metro, convos).map((l) => l.source);
    expect(pool).not.toContain("Är det rätt perrong?");
  });
});

describe("scoring", () => {
  it("pays nothing for a miss", () => {
    expect(pointsFor(false, 3, "type", false)).toBe(0);
  });

  it("pays more for a streak, more for typing and less for a hint", () => {
    const base = pointsFor(true, 0, "choice", false);
    expect(pointsFor(true, 2, "choice", false)).toBeGreaterThan(base);
    expect(pointsFor(true, 0, "type", false)).toBe(base * 2);
    expect(pointsFor(true, 0, "choice", true)).toBe(base / 2);
  });

  it("caps the streak bonus", () => {
    expect(pointsFor(true, 50, "choice", false)).toBe(pointsFor(true, 4, "choice", false));
  });

  it("gives at least one star and three for a near-clean run", () => {
    expect(starsFor(0, 8)).toBe(1);
    expect(starsFor(5, 8)).toBe(2);
    expect(starsFor(7, 8)).toBe(3);
    expect(starsFor(8, 8)).toBe(3);
  });
});
