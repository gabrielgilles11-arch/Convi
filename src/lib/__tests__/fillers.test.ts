import { describe, expect, it } from "vitest";
import { spokenLines } from "../../../scripts/generate-audio.mjs";
import { buildConversations } from "../conversations";
import { buildFillers } from "../fillers";
import { FillerBag, fillerClashes, withFillerQuestions, withFillerReactions } from "../fillerTypes";
import { LOCALES, type Locale } from "../content";
import type { ConvLine } from "../conversationTypes";
import type { Question } from "../quizTypes";

const locales = LOCALES.map((l) => l.locale);

/** A repeatable stand-in for Math.random. */
function seeded(seed: number): () => number {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const line = (source: string): ConvLine => ({ source, en: null, audioId: null });

describe.each(locales)("the filler pool: %s", (locale: Locale) => {
  const pool = buildFillers(locale);
  const recorded = new Set((spokenLines(locale) as { id: string }[]).map((l) => l.id));

  it("has several fillers, each a talk line the recorder makes a clip for", () => {
    expect(pool.length).toBeGreaterThanOrEqual(6);
    for (const f of pool) {
      expect(f.source.trim()).not.toBe("");
      expect(f.en).toBeTruthy();
      expect(recorded.has(f.audioId!), f.audioId!).toBe(true);
    }
  });

  it("puts fillers only where the script left the reaction open, and varies them", () => {
    const bag = new FillerBag(pool, seeded(7));
    const conversations = buildConversations(locale);
    const used = new Set<string>();
    let seededTurns = 0;
    for (const convo of conversations) {
      const out = withFillerReactions(convo, bag, seeded(convo.id.length));
      out.turns.forEach((turn, i) => {
        const before = convo.turns[i]!;
        if (before.reactions.some((r) => r !== null)) {
          expect(turn.reactions).toEqual(before.reactions);
          return;
        }
        turn.reactions.forEach((r, j) => {
          if (!r) return;
          seededTurns++;
          used.add(r.source);
          expect(before.replies[j], "a filler with no reply after it").not.toBeNull();
          expect(fillerClashes(r, before.replies[j]!.source)).toBe(false);
        });
      });
    }
    expect(seededTurns).toBeGreaterThan(0);
    expect(used.size).toBeGreaterThan(1);
  });
});

describe("the filler bag", () => {
  const pool = ["Vale.", "Claro.", "Bueno…", "Pues…", "Ya."].map(line);

  it("uses every filler once before any comes round again", () => {
    const bag = new FillerBag(pool, seeded(3));
    const first = Array.from({ length: pool.length }, () => bag.draw("Son cinco euros.")!.source);
    expect(new Set(first).size).toBe(pool.length);
  });

  it("never draws the same filler twice in a row, across bags", () => {
    const bag = new FillerBag(pool, seeded(11));
    let last = "";
    for (let i = 0; i < 200; i++) {
      const next = bag.draw("Son cinco euros.")!.source;
      expect(next).not.toBe(last);
      last = next;
    }
  });

  it("skips a filler that would stutter into the reply", () => {
    const bag = new FillerBag([line("Vale."), line("Claro.")], seeded(5));
    for (let i = 0; i < 20; i++) expect(bag.draw("Vale. ¿Algo de comer?")!.source).toBe("Claro.");
    expect(new FillerBag([line("Vale.")]).draw("Vale, vale.")).toBeNull();
  });

  it("leaves Huh? questions and replyless questions alone in practice", () => {
    const q = (over: Partial<Question>) => ({ reply: line("Son cinco euros."), ...over }) as Question;
    const always = () => 0;
    const out = withFillerQuestions(
      [q({}), q({ huh: true }), q({ reply: null })],
      new FillerBag(pool, seeded(1)),
      always
    );
    expect(out[0]!.reaction).toBeTruthy();
    expect(out[1]!.reaction).toBeUndefined();
    expect(out[2]!.reaction).toBeUndefined();
  });
});
