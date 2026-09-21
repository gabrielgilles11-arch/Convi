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
import {
  buildRound,
  normalizeAnswer,
  splitNote,
  tooAlike,
  wonLine,
  type QuizItem,
} from "../quizTypes";

const locales = LOCALES.map((l) => l.locale);

/**
 * Everything authored in an edition, whichever array it sits in, tagged with
 * whether practice asks about it.
 *
 * Four arrays now, not one: `exchanges` and `phrases` are what the scenario
 * page shows, `scenes` are practice-only, and a phrase carrying
 * `practice: false` is the reverse — page only. The uniqueness checks below
 * want all of it, since two lines that collide collide wherever they are
 * shown; only the deck-size check cares about the split.
 */
function itemsOf(locale: Locale) {
  const out: {
    id: string;
    sub: string;
    source: string;
    gloss: string | null;
    situation: string | null;
    inPractice: boolean;
  }[] = [];
  for (const category of getCategories(locale)) {
    for (const sub of category.subsections) {
      const d = sub as DialogueSubsection;
      for (const ex of [...(d.exchanges ?? []), ...(sub.scenes ?? [])]) {
        out.push({
          id: ex.id,
          sub: sub.id,
          source: ex.question.es,
          gloss: ex.question.en,
          situation: ex.situation.en,
          inPractice: true,
        });
      }
      (d.items ?? []).forEach((tip, i) =>
        out.push({
          id: `${sub.id}-tip${i}`,
          sub: sub.id,
          source: tip.es,
          gloss: tip.en,
          situation: null,
          inPractice: true,
        })
      );
      for (const p of (sub as PhrasebookSubsection).phrases ?? []) {
        out.push({
          id: p.id,
          sub: sub.id,
          source: p.es,
          gloss: p.en,
          situation: null,
          inPractice: p.practice !== false,
        });
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

    it("never expects the same line from two different questions", () => {
      // Per-subsection is not enough: the deck a round draws from is the whole
      // edition, so two situations in different categories that both expect
      // "Ja, gerne." are still two questions with one answer between them.
      // Which line that is depends on `speaker`, so it is read off the built
      // deck rather than off the JSON.
      const seen = new Map<string, string>();
      const clashes: string[] = [];
      for (const item of buildQuizItems(locale)) {
        const key = `${item.kind}|${normalizeAnswer(item.correctAnswer)}`;
        if (seen.has(key)) clashes.push(`"${item.correctAnswer}": ${seen.get(key)} + ${item.id}`);
        else seen.set(key, item.id);
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
      // never appears in practice. A phrase held back with `practice: false`
      // is the one deliberate omission, and is excluded from the count rather
      // than allowed to hide an accidental one.
      const authored = items.filter((i) => i.inPractice).length;
      const built = buildQuizItems(locale).length;
      expect(built, `${authored - built} authored item(s) never reach practice`).toBe(authored);
    });

    it("sizes every subsection for a round", () => {
      // Counted as practice sees it: a round is built out of stages, and a
      // stage is cut out of what reaches the deck, not out of what the
      // scenario page lists.
      const bySub = new Map<string, number>();
      for (const item of items) {
        if (!item.inPractice) continue;
        bySub.set(item.sub, (bySub.get(item.sub) ?? 0) + 1);
      }
      for (const category of getCategories(locale)) {
        for (const sub of category.subsections) {
          const count = bySub.get(sub.id) ?? 0;
          expect(count, `${sub.id} gives practice ${count}`).toBeGreaterThanOrEqual(8);
          expect(count, `${sub.id} gives practice ${count}`).toBeLessThanOrEqual(14);
        }
      }
    });

    it("asks what a word means at most three times per subsection", () => {
      // The cap the scenes were written for. A round samples a stage, and a
      // stage is cut out of a category rather than a subsection — so the only
      // place to hold the ratio is at the source. Past three, a section starts
      // asking what a word means over and over, which is what the scenes
      // replaced.
      for (const category of getCategories(locale)) {
        for (const sub of category.subsections) {
          if ((sub.scenes ?? []).length === 0) continue; // untouched section
          const words = ((sub as PhrasebookSubsection).phrases ?? []).filter(
            (p) => p.practice !== false
          ).length;
          expect(words, `${sub.id} still asks ${words} bare words`).toBeLessThanOrEqual(3);
        }
      }
    });

    it("hands every word it stops asking about to a scene", () => {
      // The invariant the whole split rests on. A phrase marked
      // `practice: false` has come out of the deck because a scene now teaches
      // it inside a line — so if no scene claims it, the word is on the
      // scenario page and nowhere else, and practice quietly stopped teaching
      // it. Checked both ways: a scene naming a word that is still asked as a
      // definition is the same mistake from the other end.
      for (const category of getCategories(locale)) {
        for (const sub of category.subsections) {
          const scenes = sub.scenes ?? [];
          const phrases = (sub as PhrasebookSubsection).phrases ?? [];
          // Nothing to hand over where there is no word list: scenes on a
          // dialogue subsection are simply material that was missing.
          if (scenes.length === 0 || phrases.length === 0) continue;
          const known = new Set(phrases.map((p) => p.id));
          const taught = scenes.map((s) => s.teaches);

          for (const id of taught) {
            expect(id, `a scene in ${sub.id} names no phrase`).toBeTruthy();
            expect(known.has(id!), `${sub.id}: no phrase ${id} for a scene to teach`).toBe(true);
          }
          expect(new Set(taught).size, `${sub.id} has two scenes on one word`).toBe(taught.length);

          const dropped = phrases.filter((p) => p.practice === false).map((p) => p.id);
          expect([...dropped].sort(), `${sub.id}: dropped words and taught words differ`).toEqual(
            [...taught].sort()
          );
        }
      }
    });

    it("never writes two scenes in one section that ask the same thing", () => {
      // Two kinds of sameness, and both make a question unanswerable rather
      // than merely repetitive: the same moment wanting different lines, and
      // the same English wanting different lines. The second is the one that
      // slipped through while these were being written — "I'm a bit tipsy."
      // and "I'm a bit merry." are one question asked twice, and asked in the
      // "how do you say this" direction only one of the two answers counts.
      //
      // Overlap both ways, not containment: "I like you" sits inside "I like
      // the way you think" and nobody confuses those two questions.
      const overlap = (a: string, b: string) => {
        const ta = new Set(normalizeAnswer(a).split(" ").filter(Boolean));
        const tb = new Set(normalizeAnswer(b).split(" ").filter(Boolean));
        if (!ta.size || !tb.size) return 0;
        const shared = [...ta].filter((t) => tb.has(t)).length;
        return shared / (ta.size + tb.size - shared);
      };

      const clashes: string[] = [];
      for (const category of getCategories(locale)) {
        const scenes = category.subsections.flatMap((sub) => sub.scenes ?? []);
        for (let i = 0; i < scenes.length; i++) {
          for (let j = i + 1; j < scenes.length; j++) {
            const a = scenes[i];
            const b = scenes[j];
            const mine = (s: typeof a) => (s.speaker === "them" ? s.answers[0] : s.question);
            for (const [what, x, y] of [
              ["moment", a.situation.en, b.situation.en],
              ["meaning", mine(a)?.en ?? "", mine(b)?.en ?? ""],
            ] as const) {
              if (!x || !y || overlap(x, y) < 0.6) continue;
              if (overlap(mine(a)?.es ?? "", mine(b)?.es ?? "") >= 0.6) continue;
              clashes.push(`${category.id} ${what}: ${a.id} "${x}" / ${b.id} "${y}"`);
            }
          }
        }
      }
      expect(clashes).toEqual([]);
    });

    it("tags regions with values the badge knows how to render", () => {
      for (const category of getCategories(locale)) {
        for (const sub of category.subsections) {
          const tagged = [
            ...((sub as DialogueSubsection).exchanges ?? []),
            ...((sub as PhrasebookSubsection).phrases ?? []),
          ];
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

/**
 * The line a passing round tells you you can now say.
 *
 * `wonLine` has to pick the target-language side of an item, and which field
 * that is flips with the kind. Getting it backwards produces a summary that
 * lists English back at somebody who just typed Spanish, which would look
 * fine in code review and wrong on screen.
 */
describe("the line an item teaches", () => {
  for (const locale of locales) {
    describe(locale, () => {
      const items = buildQuizItems(locale);

      it("always returns something to show", () => {
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
          expect(wonLine(item).source, `${item.id} (${item.kind})`).toBeTruthy();
        }
      });

      it("returns the target language, never the English", () => {
        // The gloss and the line are different strings on every item in every
        // edition, so if the two were swapped this would catch it on all of
        // them at once rather than on whichever one happened to be sampled.
        for (const item of items) {
          const line = wonLine(item);
          if (item.kind === "situation") {
            expect(line.source, item.id).toBe(item.correctAnswer);
            expect(line.source, item.id).not.toBe(item.front);
          } else {
            expect(line.source, item.id).toBe(item.front);
            expect(line.source, item.id).not.toBe(item.correctAnswer);
          }
        }
      });

      it("shows the meaning without the aside bolted to it", () => {
        // The content writes the meaning and the note about it in one field:
        // "A small draft beer, please — how locals order". The summary wants
        // the first half. What it must not do is invent or truncate anything
        // else, so the contract is exactly `splitNote`, which is what every
        // other quiz screen shows.
        for (const item of items) {
          const raw = item.kind === "situation" ? item.correctAnswerTranslation : item.correctAnswer;
          if (!raw) continue;
          expect(wonLine(item).en, item.id).toBe(splitNote(raw).text);
          expect(wonLine(item).en!.length, item.id).toBeLessThanOrEqual(raw.length);
        }
      });

      it("actually drops an aside where the content has one", () => {
        // Guards against `splitNote` being swapped for a pass-through: at
        // least some items in every edition carry an aside, and if none of
        // them shortened, the stripping is not running.
        const shortened = items.filter((item) => {
          const raw = item.kind === "situation" ? item.correctAnswerTranslation : item.correctAnswer;
          return raw && wonLine(item).en !== raw;
        });
        expect(shortened.length).toBeGreaterThan(0);
      });
    });
  }
});
