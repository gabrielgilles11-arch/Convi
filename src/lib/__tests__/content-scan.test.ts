import { describe, expect, it } from "vitest";
import { buildQuizItems } from "../quizItems";
import {
  getCategories,
  isDialogueSubsection,
  LOCALES,
  REGION_LABELS,
  type DialogueSubsection,
  type Locale,
  type PhrasebookSubsection,
} from "../content";
import { buildRound, normalizeAnswer, tooAlike, type QuizItem } from "../quizTypes";

const locales = LOCALES.map((l) => l.locale);

function itemsOf(locale: Locale) {
  const out: {
    id: string;
    sub: string;
    source: string;
    gloss: string | null;
    situation: string | null;
  }[] = [];
  for (const category of getCategories(locale)) {
    for (const sub of category.subsections) {
      if (isDialogueSubsection(sub)) {
        const d = sub as DialogueSubsection;
        for (const ex of d.exchanges ?? []) {
          out.push({
            id: ex.id,
            sub: sub.id,
            source: ex.question.es,
            gloss: ex.question.en,
            situation: ex.situation.en,
          });
        }
        (d.items ?? []).forEach((tip, i) =>
          out.push({ id: `${sub.id}-tip${i}`, sub: sub.id, source: tip.es, gloss: tip.en, situation: null })
        );
      } else {
        for (const p of (sub as PhrasebookSubsection).phrases) {
          out.push({ id: p.id, sub: sub.id, source: p.es, gloss: p.en, situation: null });
        }
      }
    }
  }
  return out;
}

describe("content integrity", () => {
  it("keeps every id unique across all three editions at once", () => {
    const seen = new Map<string, string>();
    for (const locale of locales) {
      for (const { id } of itemsOf(locale)) {
        expect(seen.has(id), `${id} appears in both ${seen.get(id)} and ${locale}`).toBe(false);
        seen.set(id, locale);
      }
    }
  });

  describe.each(locales)("%s", (locale) => {
    const items = itemsOf(locale);

    it("teaches no line twice", () => {
      const seen = new Map<string, string>();
      const clashes: string[] = [];
      for (const { id, source } of items) {
        const key = normalizeAnswer(source);
        if (seen.has(key)) clashes.push(`"${source}": ${seen.get(key)} + ${id}`);
        else seen.set(key, id);
      }
      expect(clashes).toEqual([]);
    });

    it("gives no two items the same English gloss", () => {
      // The phrase question asks what a line means, and the gloss is the answer.
      // Two items sharing one has no defensible answer.
      const seen = new Map<string, string>();
      const clashes: string[] = [];
      for (const { id, gloss } of items) {
        if (!gloss) continue;
        const key = normalizeAnswer(gloss);
        if (seen.has(key)) clashes.push(`"${gloss}": ${seen.get(key)} + ${id}`);
        else seen.set(key, id);
      }
      expect(clashes).toEqual([]);
    });

    it("gives every situation prompt its own wording", () => {
      // The situation is the whole question, so two identical prompts expecting
      // different lines is a question with no answerable form.
      const seen = new Map<string, string>();
      const clashes: string[] = [];
      for (const { id, situation } of items) {
        if (!situation) continue;
        const key = normalizeAnswer(situation);
        if (seen.has(key)) clashes.push(`"${situation}": ${seen.get(key)} + ${id}`);
        else seen.set(key, id);
      }
      expect(clashes).toEqual([]);
    });

    it("never puts two interchangeable answers in one subsection", () => {
      const bySub = new Map<string, QuizItem[]>();
      for (const item of buildQuizItems(locale)) {
        if (!bySub.has(item.subsectionId)) bySub.set(item.subsectionId, []);
        bySub.get(item.subsectionId)!.push(item);
      }
      const clashes: string[] = [];
      for (const [sub, group] of bySub) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const a = group[i];
            const b = group[j];
            if (a.kind !== b.kind) continue;
            if (tooAlike(a.correctAnswer, b.correctAnswer)) {
              clashes.push(`${sub}: ${a.id} "${a.correctAnswer}" / ${b.id} "${b.correctAnswer}"`);
            }
          }
        }
      }
      expect(clashes).toEqual([]);
    });

    it("answers back whenever someone else started the exchange", () => {
      // A line of your own can end the conversation — a farewell, or telling
      // someone to take their hands off you. But when they spoke first, the
      // payoff shown after you answer is their comeback, and without one the
      // card settles on a blank.
      const silent: string[] = [];
      for (const category of getCategories(locale)) {
        for (const sub of category.subsections) {
          if (!isDialogueSubsection(sub)) continue;
          for (const ex of (sub as DialogueSubsection).exchanges ?? []) {
            if (ex.speaker === "them" && !ex.likelyReply?.es) silent.push(ex.id);
          }
        }
      }
      expect(silent).toEqual([]);
    });

    it("drops nothing on the way into the deck", () => {
      // A `them` exchange with no answers has no line for the learner to
      // produce, so quizItems skips it and the authored card silently
      // never appears in practice.
      const authored = items.length;
      const built = buildQuizItems(locale).length;
      expect(built, `${authored - built} authored item(s) never reach practice`).toBe(authored);
    });

    it("sizes every subsection for a round", () => {
      for (const category of getCategories(locale)) {
        for (const sub of category.subsections) {
          const count = isDialogueSubsection(sub)
            ? ((sub as DialogueSubsection).exchanges?.length ?? 0) +
              ((sub as DialogueSubsection).items?.length ?? 0)
            : (sub as PhrasebookSubsection).phrases.length;
          expect(count, `${sub.id} has ${count}`).toBeGreaterThanOrEqual(8);
          expect(count, `${sub.id} has ${count}`).toBeLessThanOrEqual(14);
        }
      }
    });

    it("tags regions with values the badge knows how to render", () => {
      for (const category of getCategories(locale)) {
        for (const sub of category.subsections) {
          const tagged = isDialogueSubsection(sub)
            ? ((sub as DialogueSubsection).exchanges ?? [])
            : (sub as PhrasebookSubsection).phrases;
          for (const item of tagged) {
            if (!item.region) continue;
            expect(REGION_LABELS[item.region], `${item.id}: ${item.region}`).toBeTruthy();
          }
        }
      }
    });

    it("plays a hundred rounds without asking the same thing twice", () => {
      const deck = buildQuizItems(locale);
      for (let run = 0; run < 100; run++) {
        const round = buildRound(deck);
        // Keyed on what is shown as well as which item: a match screen bundles
        // several items, so one may legitimately also appear as a situation.
        const asked = round.map((q) => `${q.itemId}:${q.shown}`);
        expect(new Set(asked).size, `run ${run} repeated an item`).toBe(asked.length);
        for (const q of round) {
          // A match screen's answer is the pairing, not a line, so it has none.
          if (q.form === "match") continue;
          expect(q.answer, `run ${run}: ${q.itemId} has no answer`).toBeTruthy();
          if (q.form === "choice") {
            expect(q.options).toContain(q.answer);
            expect(new Set(q.options).size).toBe(q.options.length);
          }
        }
      }
    });
  });
});
