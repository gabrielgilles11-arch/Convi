import { describe, expect, it } from "vitest";
import { buildConversations } from "../conversations";
import { getCategories, LOCALES, type DialogueSubsection, type Locale } from "../content";
import { MIN_TURNS, groupByCategory } from "../conversationTypes";

const locales = LOCALES.map((l) => l.locale);

/**
 * What Talk promises, checked against the content rather than against itself.
 *
 * The screen makes one claim worth testing — every line it offers was written
 * by hand, in the order it was written — so these tests are all the same shape:
 * take a beat off the screen and find it in the JSON. Nothing here checks how it
 * looks; the builder is the part with the decisions in it.
 */
describe.each(locales)("conversations: %s", (locale: Locale) => {
  const conversations = buildConversations(locale);

  /** Every exchange in the edition, by id, for looking a beat back up. */
  const exchangesById = new Map(
    getCategories(locale).flatMap((category) =>
      category.subsections.flatMap((sub) =>
        ((sub as DialogueSubsection).exchanges ?? []).map((ex) => [ex.id, ex] as const)
      )
    )
  );

  it("has conversations at all", () => {
    expect(conversations.length).toBeGreaterThan(0);
  });

  it("only offers subsections long enough to be a conversation", () => {
    for (const convo of conversations) {
      expect(convo.turns.length).toBeGreaterThanOrEqual(MIN_TURNS);
    }
  });

  it("walks each subsection in the order it was authored", () => {
    for (const convo of conversations) {
      const authored = getCategories(locale)
        .flatMap((c) => c.subsections)
        .find((sub) => sub.id === convo.id) as DialogueSubsection | undefined;

      expect(authored).toBeDefined();
      expect(convo.turns.map((t) => t.id)).toEqual(
        (authored!.exchanges ?? []).map((ex) => ex.id)
      );
    }
  });

  it("always gives the learner at least one line to say", () => {
    for (const convo of conversations) {
      for (const turn of convo.turns) {
        expect(turn.yourLines.length).toBeGreaterThan(0);
        for (const line of turn.yourLines) expect(line.source.trim()).not.toBe("");
      }
    }
  });

  /**
   * The one thing that cannot be inferred from the text, and the only real
   * decision the builder makes: whose line is whose. When they open, your lines
   * are the authored answers; when you open, your line is the question and
   * everything else is theirs.
   */
  it("puts every line on the side its speaker field says", () => {
    for (const convo of conversations) {
      for (const turn of convo.turns) {
        const ex = exchangesById.get(turn.id);
        expect(ex).toBeDefined();

        if (ex!.speaker === "them") {
          expect(turn.theirOpener?.source).toBe(ex!.question.es);
          expect(turn.yourLines.map((l) => l.source)).toEqual(ex!.answers.map((a) => a.es));
          expect(turn.theirReply?.source ?? null).toBe(ex!.likelyReply?.es ?? null);
        } else {
          expect(turn.theirOpener).toBeNull();
          expect(turn.yourLines.map((l) => l.source)).toEqual([ex!.question.es]);
          // Their answer to what you just said, or the follow-up line where the
          // exchange has no answers at all.
          const theirs = ex!.answers[0]?.es ?? ex!.likelyReply?.es ?? null;
          expect(turn.theirReply?.source ?? null).toBe(theirs);
        }
      }
    }
  });

  /**
   * Their comeback is never one of your options.
   *
   * Deliberately not the stronger claim that no line of theirs may also be one
   * of yours: on "Someone greets you" the German and Swedish editions both have
   * them say "Hallo!" / "Tja!" and you say it straight back, which is what
   * greeting somebody is. An echo is authored; being handed their answer to
   * your own line as something to say is not.
   */
  it("never offers their comeback as a line for you to say", () => {
    for (const convo of conversations) {
      for (const turn of convo.turns) {
        if (!turn.theirReply) continue;
        const mine = new Set(turn.yourLines.map((l) => l.source));
        expect(mine.has(turn.theirReply.source)).toBe(false);
      }
    }
  });

  it("names clips the way the audio generator writes them", () => {
    for (const convo of conversations) {
      for (const turn of convo.turns) {
        const ex = exchangesById.get(turn.id)!;
        if (ex.speaker === "them") {
          expect(turn.theirOpener?.audioId).toBe(`${turn.id}-q`);
          turn.yourLines.forEach((line, i) => expect(line.audioId).toBe(`${turn.id}-a${i}`));
          if (turn.theirReply) expect(turn.theirReply.audioId).toBe(`${turn.id}-r`);
        } else {
          expect(turn.yourLines[0]!.audioId).toBe(`${turn.id}-q`);
        }
      }
    }
  });

  it("carries a situation on every beat, since that is the whole prompt", () => {
    for (const convo of conversations) {
      for (const turn of convo.turns) expect(turn.situation.trim()).not.toBe("");
    }
  });

  it("gives every conversation a title and a category that exists", () => {
    const categoryIds = new Set(getCategories(locale).map((c) => c.id));
    for (const convo of conversations) {
      expect(convo.title.trim()).not.toBe("");
      expect(categoryIds.has(convo.categoryId)).toBe(true);
    }
  });

  it("lists each conversation once", () => {
    const ids = conversations.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("groups without dropping or reordering anything", () => {
    const groups = groupByCategory(conversations);
    expect(groups.flatMap((g) => g.conversations.map((c) => c.id))).toEqual(
      conversations.map((c) => c.id)
    );
    // One group per category, so the picker can't list the same heading twice.
    const headings = groups.map((g) => g.categoryId);
    expect(new Set(headings).size).toBe(headings.length);
  });
});

describe("conversations across editions", () => {
  it("keeps ids unique, so one id is enough to find a conversation", () => {
    const ids = locales.flatMap((l) => buildConversations(l).map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
