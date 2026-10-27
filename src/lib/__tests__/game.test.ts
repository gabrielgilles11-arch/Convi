import { describe, expect, it } from "vitest";
import { buildGame } from "../gameScenes";
import { GAME_SCRIPTS, SCENE_ORDER } from "../gameScripts";
import { LOCALES } from "../content";
import { gradeReply } from "../conversationTypes";
import { normalizeAnswer, tooAlike } from "../quizTypes";
import {
  CHOICES,
  bestOption,
  buildNodeChoices,
  gradeTyped,
  longestPath,
  pointsFor,
  starsFor,
  wrongPool,
  type PlayableScene,
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

/** Every path through a scene, as lists of node ids. */
function paths(scene: PlayableScene): string[][] {
  const out: string[][] = [];
  const walk = (id: string | null, trail: string[]) => {
    if (!id) {
      out.push(trail);
      return;
    }
    if (trail.includes(id)) throw new Error(`loop at ${id} in ${scene.id}`);
    const node = scene.nodes[id];
    if (!node) throw new Error(`${scene.id}: no node ${id}`);
    for (const next of new Set(node.options.map((o) => o.next))) walk(next, [...trail, id]);
  };
  walk(scene.start, []);
  return out;
}

describe("game scenes", () => {
  it("resolves every scripted line against the content", () => {
    for (const locale of locales) expect(() => buildGame(locale)).not.toThrow();
  });

  it("plays taxi, bar and metro in every edition, in trip order", () => {
    for (const locale of locales) {
      const kinds = buildGame(locale).scenes.map((s) => s.kind);
      expect(kinds).toEqual(expect.arrayContaining(["taxi", "bar", "metro"]));
      expect([...kinds].sort((x, y) => SCENE_ORDER.indexOf(x) - SCENE_ORDER.indexOf(y))).toEqual(
        kinds
      );
    }
  });

  it("reaches every node and ends every path", () => {
    for (const locale of locales) {
      for (const scene of buildGame(locale).scenes) {
        const all = paths(scene);
        const reached = new Set(all.flat());
        expect([...reached].sort(), scene.id).toEqual(Object.keys(scene.nodes).sort());
      }
    }
  });

  it("keeps every conversation short: three to six turns on any path", () => {
    for (const locale of locales) {
      for (const scene of buildGame(locale).scenes) {
        for (const path of paths(scene)) {
          expect(path.length, `${scene.id}: ${path.join(" > ")}`).toBeGreaterThanOrEqual(3);
          expect(path.length, `${scene.id}: ${path.join(" > ")}`).toBeLessThanOrEqual(6);
        }
        expect(longestPath(scene)).toBeLessThanOrEqual(6);
      }
    }
  });

  it("opens with the local talking wherever a local would", () => {
    // Taxi and bar start with the driver or the bartender. Swedish taxis are
    // the exception: the content says to settle the price before getting in.
    for (const locale of locales) {
      for (const scene of buildGame(locale).scenes) {
        if (scene.kind !== "bar" && scene.kind !== "taxi") continue;
        if (locale === "sv-SE" && scene.kind === "taxi") continue;
        expect(scene.nodes[scene.start]!.npc, scene.id).not.toBeNull();
      }
    }
  });

  it("gives English only where Convi has to start", () => {
    for (const locale of locales) {
      for (const scene of buildGame(locale).scenes) {
        for (const node of Object.values(scene.nodes)) {
          const ways = [node.npc, node.cue, node.asked].filter(Boolean).length;
          expect(ways, `${scene.id}/${node.id}`).toBe(1);
        }
      }
    }
  });

  it("has a scripts entry for every edition", () => {
    for (const locale of locales) expect(GAME_SCRIPTS[locale]?.length).toBeGreaterThan(0);
  });
});

describe("three options a turn", () => {
  for (const locale of locales) {
    const game = buildGame(locale);

    it(`${locale}: enough wrong options wherever a turn needs them`, () => {
      for (const scene of game.scenes) {
        for (const node of Object.values(scene.nodes)) {
          const need = CHOICES - Math.min(CHOICES, node.options.length);
          expect(
            wrongPool(node, game.pool, scene).length,
            `${scene.id}/${node.id}`
          ).toBeGreaterThanOrEqual(need);
        }
      }
    });

    it(`${locale}: every wrong option is wrong, across many shuffles`, () => {
      for (const scene of game.scenes) {
        for (const node of Object.values(scene.nodes)) {
          for (let seed = 1; seed <= 20; seed++) {
            const choices = buildNodeChoices(node, game.pool, seeded(seed), scene);
            const label = `${scene.id}/${node.id}/seed ${seed}`;
            expect(choices.length, label).toBe(CHOICES);
            expect(new Set(choices.map((c) => normalizeAnswer(c.line.source))).size, label).toBe(
              CHOICES
            );

            const accepted = node.options.map((o) => o.line);
            for (const choice of choices) {
              const right = gradeReply(choice.line.source, accepted).correct;
              expect(right, `${label}: ${choice.line.source}`).toBe(choice.option !== null);
            }
            const wrong = choices.filter((c) => c.option === null);
            if (wrong.length === 2)
              expect(tooAlike(wrong[0]!.line.source, wrong[1]!.line.source)).toBe(false);
            // The local way of saying it is always on offer.
            if (node.options.some((o) => o.local))
              expect(choices.some((c) => c.option?.local)).toBe(true);
          }
        }
      }
    });
  }

  it("lets an order be a real choice: caña, beer or iced coffee", () => {
    const es = buildGame("es-ES");
    const cafe = es.scenes.find((s) => s.kind === "cafe")!;
    const order = cafe.nodes[cafe.start]!;
    expect(order.options.length).toBe(3);
    expect(order.options.map((o) => o.line.source)).toContain("¿Me pones un café con hielo?");
  });

  it("follows the order: a caña skips draft or bottle", () => {
    const bar = buildGame("es-ES").scenes.find((s) => s.kind === "bar")!;
    const order = bar.nodes[bar.start]!;
    const cana = order.options.find((o) => o.local)!;
    const beer = order.options.find((o) => !o.local)!;
    expect(cana.next).not.toBe(beer.next);
    expect(bar.nodes[beer.next!]!.npc?.source).toMatch(/barril/);
  });

  it("corrects a miss to the local line", () => {
    const bar = buildGame("es-ES").scenes.find((s) => s.kind === "bar")!;
    expect(bestOption(bar.nodes[bar.start]!).local).toBe(true);
    const typed = gradeTyped(bar.nodes[bar.start]!, "xyzzy");
    expect(typed.correct).toBe(false);
    expect(typed.option.local).toBe(true);
  });
});

describe("scoring", () => {
  it("pays nothing for a miss", () => {
    expect(pointsFor(false, 3, "type", false)).toBe(0);
  });

  it("pays more for a streak, typing and the local line, less for a hint", () => {
    const base = pointsFor(true, 0, "choice", false);
    expect(pointsFor(true, 2, "choice", false)).toBeGreaterThan(base);
    expect(pointsFor(true, 0, "type", false)).toBe(base * 2);
    expect(pointsFor(true, 0, "choice", true)).toBe(base / 2);
    expect(pointsFor(true, 0, "choice", false, true)).toBe(base * 1.5);
  });

  it("caps the streak bonus", () => {
    expect(pointsFor(true, 50, "choice", false)).toBe(pointsFor(true, 4, "choice", false));
  });

  it("gives at least one star and three for a near-clean run", () => {
    expect(starsFor(0, 5)).toBe(1);
    expect(starsFor(3, 5)).toBe(2);
    expect(starsFor(5, 5)).toBe(3);
  });
});
