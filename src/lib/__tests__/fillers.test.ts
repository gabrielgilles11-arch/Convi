import { describe, expect, it } from "vitest";
import {
  FILLER_RUN_CHANCE,
  FILLER_SUBSECTIONS,
  answeredAllowingFillers,
  fillerWordsOf,
  gradeAllowingFillers,
  isFillerItem,
  pickFiller,
  planFillerTurn,
  withFiller,
  withoutFillers,
} from "../fillerTypes";
import { buildQuizItems } from "../quizItems";
import { buildRound, buildStages, normalizeAnswer, pickedIt, tooAlike, type QuizItem } from "../quizTypes";
import { buildConversations, fillerWords } from "../conversations";
import { getCategoryList } from "../quizItems";
import { LOCALES, type Locale } from "../content";
import { TALK_SCRIPTS } from "../talkScripts";
import { TALK_FILLERS } from "../talkFillers";
import type { ConvFiller, ConvLine } from "../conversationTypes";

/** A seeded random, so a property run is the same run every time. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const line = (source: string, en = ""): ConvLine => ({ source, en, audioId: null });

describe("a filler around a typed answer", () => {
  const words = ["No sé…", "Sí, sí.", "…y tal.", "A lo mejor…"];

  it("comes off the start, the end or both, and never leaves nothing", () => {
    expect(withoutFillers("No sé, una caña, porfa.", words)).toContain(normalizeAnswer("una caña porfa"));
    expect(withoutFillers("Una caña y tal", words)).toContain(normalizeAnswer("una caña"));
    expect(withoutFillers("A lo mejor una caña y tal", words)).toContain(normalizeAnswer("una caña"));
    expect(withoutFillers("No sé.", words)).toEqual([]);
    expect(withoutFillers("Una caña", words)).toEqual([]);
  });

  it("is accepted in Practice and in Talk", () => {
    expect(answeredAllowingFillers("No sé… una caña, porfa", ["Una caña, porfa."], words)).toBe(true);
    expect(answeredAllowingFillers("No sé… una tapa", ["Una caña, porfa."], words)).toBe(false);
    const verdict = gradeAllowingFillers("Sí, sí, una caña, porfa", [line("Una caña, porfa.")], [], words);
    expect(verdict.correct).toBe(true);
  });

  it("leaves out the fillers that change what an answer says", () => {
    const sv = fillerWordsOf([
      { id: "sv-slang-heard-06", subsectionId: "sv-slang-heard", text: "Exakt." },
      { id: "sv-slang-heard-07", subsectionId: "sv-slang-heard", text: "Nej, nej." },
      { id: "sv-slang-heard-09", subsectionId: "sv-slang-heard", text: "Så där." },
      { id: "sv-slang-22", subsectionId: "sv-slang-micro", text: "Orka." },
    ]);
    expect(sv).toEqual(["Exakt."]);
  });
});

describe("Talk: when the local says a filler", () => {
  const filler = (source: string, when: ConvFiller["when"], on: number[] | null = null): ConvFiller => ({
    line: { source, en: "", audioId: source },
    when,
    on,
  });
  const turns = [
    { fillers: [] as ConvFiller[] },
    { fillers: [filler("Sí, sí.", "before-reply")] },
    { fillers: [filler("…y tal.", "after-reply")] },
  ];

  it("never on a first play", () => {
    const random = seeded(1);
    for (let n = 0; n < 500; n++) expect(planFillerTurn(turns, true, random)).toBeNull();
  });

  it("in a minority of later runs, only on a beat that has a slot", () => {
    const random = seeded(7);
    let runs = 0;
    for (let n = 0; n < 4000; n++) {
      const at = planFillerTurn(turns, false, random);
      if (at === null) continue;
      runs++;
      expect([1, 2]).toContain(at);
    }
    expect(runs / 4000).toBeGreaterThan(FILLER_RUN_CHANCE - 0.05);
    expect(runs / 4000).toBeLessThan(FILLER_RUN_CHANCE + 0.05);
    expect(planFillerTurn([{ fillers: [] }], false, () => 0)).toBeNull();
  });

  it("fits the line said, does not crowd a reaction, and varies from the last run", () => {
    const turn = {
      fillers: [filler("Sí, sí.", "before-reply", [0]), filler("Pero bueno…", "before-reply", [1])],
    };
    expect(pickFiller(turn, 0, { crowded: false, hasReply: true }, [], () => 0)?.line.source).toBe("Sí, sí.");
    expect(pickFiller(turn, 1, { crowded: false, hasReply: true }, [], () => 0)?.line.source).toBe("Pero bueno…");
    expect(pickFiller(turn, 0, { crowded: true, hasReply: true }, [], () => 0)).toBeNull();
    const two = { fillers: [filler("A", "before-reply"), filler("B", "before-reply")] };
    expect(pickFiller(two, 0, { crowded: false, hasReply: true }, ["A"], () => 0)?.line.source).toBe("B");
    const tail = { fillers: [filler("…y tal.", "after-reply")] };
    expect(pickFiller(tail, 0, { crowded: false, hasReply: false }, [], () => 0)).toBeNull();
  });
});

describe.each(LOCALES.map((l) => l.locale as Locale))("%s: fillers in the content", (locale) => {
  const items = buildQuizItems(locale);
  const fillers = items.filter(isFillerItem);

  it("has its word list of fillers, recorded and in practice", () => {
    expect(fillers.filter((i) => i.kind === "phrase").length).toBe(10);
    expect(fillerWords(locale).length).toBeGreaterThan(0);
  });

  it("adds one filler question to a round once they are reached, never inside Slang", () => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const stages = buildStages(items, getCategoryList(locale)).map((s) => ({
      ...s,
      items: s.itemIds.map((id) => byId.get(id)!),
    }));
    const home = fillers[0]!.categoryId;
    const homeAt = stages.findIndex((s) => s.categoryId === home);
    const before = stages.slice(0, homeAt).find((s) => s.categoryId !== home);
    const after = stages.slice(homeAt).find((s) => s.categoryId !== home);
    const reached = (upTo: number) => stages.slice(0, upTo + 1).flatMap((s) => s.items);
    const random = seeded(3);

    if (before) {
      const all = reached(stages.indexOf(before));
      const round = buildRound(before.items, all);
      expect(withFiller(round, before.items, all, random)).toHaveLength(round.length);
    }
    const homeStage = stages[homeAt]!;
    const homeRound = buildRound(homeStage.items, reached(homeAt));
    expect(withFiller(homeRound, homeStage.items, reached(homeAt), random)).toHaveLength(homeRound.length);

    expect(after, "a stage after Slang").toBeTruthy();
    const all = reached(stages.indexOf(after!));
    for (let n = 0; n < 40; n++) {
      const round = buildRound(after!.items, all);
      const longer = withFiller(round, after!.items, all, random);
      expect(longer).toHaveLength(round.length + 1);
      const at = longer.findIndex((q, i) => q !== round[i]);
      expect(at).toBeGreaterThan(0);
      expect(at).toBeLessThan(longer.length - 1);
      const q = longer[at]!;
      expect(fillers.map((f) => f.id)).toContain(q.itemId);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      // No second right answer among its options.
      for (const option of q.options) {
        if (pickedIt(option, q.accepted)) continue;
        expect(tooAlike(option, q.answer), `${q.itemId}: "${option}" beside "${q.answer}"`).toBe(false);
      }
    }
  });

  it("puts every Talk filler slot on a real beat, with a filler from the list", () => {
    const slots = TALK_FILLERS[locale] ?? {};
    const scripts = new Map((TALK_SCRIPTS[locale] ?? []).map((s) => [s.id, s]));
    const fillerIds = new Set(fillers.filter((i) => i.kind === "phrase").map((i) => i.id));
    const conversations = new Map(buildConversations(locale).map((c) => [c.id, c]));
    for (const [scriptId, steps] of Object.entries(slots)) {
      expect(scripts.has(scriptId), `no Talk script ${scriptId}`).toBe(true);
      const conversation = conversations.get(scriptId)!;
      for (const [stepId, list] of Object.entries(steps)) {
        const turn = conversation.turns.find((t) => t.id === `${scriptId}:${stepId}`) ?? conversation.turns.find((t) => t.id.endsWith(`:${stepId}`))!;
        expect(turn, `${scriptId}/${stepId}`).toBeTruthy();
        for (const slot of list) {
          expect(fillerIds.has(slot.phrase), `${scriptId}/${stepId}: ${slot.phrase} is not a filler`).toBe(true);
          const after = slot.on ?? turn.yourLines.map((_, i) => i);
          // Something for it to sit beside: a reply to come before or to trail.
          expect(after.some((i) => turn.replies[i]), `${scriptId}/${stepId}: ${slot.phrase} has no reply`).toBe(true);
        }
      }
    }
  });
});

describe("filler word lists", () => {
  it("are the three named ones", () => {
    expect([...FILLER_SUBSECTIONS].sort()).toEqual(["de-slang-heard", "slang-heard", "sv-slang-heard"]);
  });
});

// Unused-import guard for the types this file names only in signatures.
export type _Item = QuizItem;
