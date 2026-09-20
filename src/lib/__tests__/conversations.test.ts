import { describe, expect, it } from "vitest";
import { buildConversations } from "../conversations";
import { getCategories, LOCALES, type DialogueSubsection, type Locale } from "../content";
import {
  MIN_TURNS,
  CONVERSATION_STAGES,
  conversationStageOf,
  groupByCategory,
  gradeReply,
  hasSlot,
  nextBeat,
  replyMatches,
  skipBudget,
  type ConvLine,
} from "../conversationTypes";

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

  /**
   * Talk Mode is the places where somebody talks back. Having exchanges is not
   * the same thing: the drunk scale has eight of them and they are a scale, so
   * walking it as a dialogue is a person being asked how drunk they are eight
   * times over.
   */
  it("only offers sections that are somewhere you talk", () => {
    for (const convo of conversations) {
      expect(CONVERSATION_STAGES).toContain(conversationStageOf(convo.categoryId));
    }
  });

  it("leaves the word lists and the drunk scale out", () => {
    const stages = new Set(conversations.map((c) => conversationStageOf(c.categoryId)));
    for (const excluded of ["drunk-scale", "slang", "cuss-words", "flirting"]) {
      expect(stages.has(excluded)).toBe(false);
    }
  });

  it("keeps the places a trip actually takes you", () => {
    const stages = new Set(conversations.map((c) => conversationStageOf(c.categoryId)));
    for (const kept of ["getting-around", "beer-food", "restaurant", "hotel"]) {
      expect(stages.has(kept)).toBe(true);
    }
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

/**
 * Grading what somebody types back.
 *
 * The screen corrects rather than fails: a wrong answer is shown the line it
 * came closest to, in both languages, and the conversation carries on. So the
 * thing worth testing is that "right" is generous in the ways a person typing
 * a foreign language on an English keyboard needs it to be, and that the line
 * it corrects you against is the one you were reaching for.
 */
describe("gradeReply", () => {
  const line = (source: string, en: string | null = null): ConvLine => ({
    source,
    en,
    audioId: null,
  });

  const options = [line("Una ca\u00f1a, por favor.", "A small beer, please."),
                   line("Un vino tinto, por favor.", "A red wine, please.")];

  it("accepts the line as written", () => {
    expect(gradeReply("Una ca\u00f1a, por favor.", options).correct).toBe(true);
  });

  it("accepts it without the accent, the case or the punctuation", () => {
    // Nobody should lose a turn to a keyboard that has no \u00f1 on it.
    expect(gradeReply("una cana por favor", options).correct).toBe(true);
    expect(gradeReply("UNA CA\u00d1A POR FAVOR", options).correct).toBe(true);
  });

  /**
   * Every authored line counts, not just the first. Where a beat offers a
   * polite version and a blunt one, both are things people say there, and
   * marking one wrong would be teaching that it isn't.
   */
  it("accepts any of the lines the beat was written with", () => {
    const verdict = gradeReply("Un vino tinto, por favor.", options);
    expect(verdict.correct).toBe(true);
    expect(verdict.line.source).toBe("Un vino tinto, por favor.");
  });

  it("rejects something else entirely, and says it was not close", () => {
    const verdict = gradeReply("where is the train station", options);
    expect(verdict.correct).toBe(false);
    expect(verdict.close).toBe(false);
  });

  it("corrects you against the line you were reaching for", () => {
    // Most of the right words, one of them wrong: the correction should be the
    // wine line, not whichever option happens to be first.
    const verdict = gradeReply("Un vino blanco, por favor.", options);
    expect(verdict.correct).toBe(false);
    expect(verdict.close).toBe(true);
    expect(verdict.line.source).toBe("Un vino tinto, por favor.");
  });

  it("always has a line to correct against", () => {
    expect(gradeReply("", options).line).toBeDefined();
    expect(gradeReply("qqqq", [options[0]!]).line.source).toBe(options[0]!.source);
  });
});

describe("replyMatches and blanks", () => {
  it("accepts either side of a slash variant", () => {
    expect(replyMatches("\u00a1Oye!", "\u00a1Perdona! / \u00a1Oye!")).toBe(true);
    expect(replyMatches("\u00a1Perdona!", "\u00a1Perdona! / \u00a1Oye!")).toBe(true);
  });

  /**
   * A line with a blank in it is a correct thing to say that nobody can type
   * correctly, because the whole point of the blank is that your own street
   * goes in it.
   */
  it("lets a blank be filled with anything", () => {
    const expected = "A la calle __, n\u00famero __, por favor.";
    expect(hasSlot(expected)).toBe(true);
    expect(replyMatches("A la calle Mayor, n\u00famero 12, por favor.", expected)).toBe(true);
    expect(replyMatches("a la calle gran via numero 4 por favor", expected)).toBe(true);
  });

  it("still requires the words around the blank", () => {
    const expected = "A la calle __, n\u00famero __, por favor.";
    expect(replyMatches("al aeropuerto, por favor", expected)).toBe(false);
    // An empty blank is not an answer.
    expect(replyMatches("A la calle , n\u00famero , por favor.", expected)).toBe(false);
  });

  it("handles a named blank the same way", () => {
    expect(replyMatches("Tio till Slussen, tack.", "Tio till [STATION], tack.")).toBe(true);
    expect(replyMatches("Tio till, tack.", "Tio till [STATION], tack.")).toBe(false);
  });
});

describe("conversations across editions", () => {
  it("keeps ids unique, so one id is enough to find a conversation", () => {
    const ids = locales.flatMap((l) => buildConversations(l).map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/**
 * The half-answer.
 *
 * Somebody at a counter says "café", not "Un café con leche, por favor", and a
 * conversation that marks the first one wrong is teaching recitation. These are
 * the cases that has to cover, and the ones it must still refuse.
 */
describe("replyMatches is generous about how much you say", () => {
  const coffee = "Un café con leche, por favor.";

  it("takes the order without the packaging", () => {
    expect(replyMatches("café", coffee)).toBe(true);
    expect(replyMatches("cafe con leche", coffee)).toBe(true);
    expect(replyMatches("un cafe", coffee)).toBe(true);
  });

  it("takes it with more packaging than was written", () => {
    expect(replyMatches("Quiero un café con leche, por favor.", coffee)).toBe(true);
  });

  it("does not take a different order", () => {
    expect(replyMatches("una cerveza", coffee)).toBe(false);
    expect(replyMatches("un té", coffee)).toBe(false);
    // Politeness on its own says nothing about what you want.
    expect(replyMatches("por favor", coffee)).toBe(false);
    expect(replyMatches("", coffee)).toBe(false);
  });

  it("forgives a slip of the hand in a line long enough to be sure", () => {
    expect(replyMatches("Un cafe con lece, por favor.", coffee)).toBe(true);
    expect(replyMatches("¿Dónde esta el metrro?", "¿Dónde está el metro?")).toBe(true);
  });

  it("still refuses a word that is merely nearby", () => {
    // One edit apart, and two different verbs.
    expect(replyMatches("Vamos tres", "Somos tres")).toBe(false);
  });

  it("does not care about punctuation or accents either way", () => {
    expect(replyMatches("donde esta el metro", "¿Dónde está el metro?")).toBe(true);
    expect(replyMatches("¡¿Dónde… está el metro?!", "Dónde está el metro")).toBe(true);
  });

  it("works the same way in the other two editions", () => {
    expect(replyMatches("öl", "En öl, tack.")).toBe(true);
    expect(replyMatches("Bier", "Ich hätte gern ein Bier, bitte.")).toBe(true);
    expect(replyMatches("Wasser", "Ich hätte gern ein Bier, bitte.")).toBe(false);
  });
});

/**
 * Branching.
 *
 * Nothing here invents a beat. What it does is let an answer decide which of
 * the next few authored beats is worth having, so saying you only want a drink
 * does not walk you through the one about food anyway.
 */
describe("nextBeat", () => {
  const line = (source: string, en: string): ConvLine => ({ source, en, audioId: null });

  const turns = [
    {
      id: "t0",
      situation: "The bartender asks what you want",
      theirOpener: line("¿Qué te pongo?", "What can I get you?"),
      yourLines: [line("Una caña.", "A small beer.")],
      theirReply: null,
      note: "",
    },
    {
      id: "t1",
      situation: "They ask whether you want something to eat with it",
      theirOpener: line("¿Algo de comer?", "Anything to eat?"),
      yourLines: [line("Una tapa.", "A tapa, please.")],
      theirReply: null,
      note: "",
    },
    {
      id: "t2",
      situation: "You ask for the bill",
      theirOpener: null,
      yourLines: [line("La cuenta, por favor.", "The bill, please.")],
      theirReply: null,
      note: "",
    },
    {
      id: "t3",
      situation: "They tell you where to pay",
      theirOpener: line("En la barra.", "At the bar."),
      yourLines: [line("Vale, gracias.", "Fine, thanks.")],
      theirReply: null,
      note: "",
    },
  ];

  it("carries on in authored order when nothing was said", () => {
    expect(nextBeat(turns, 0, null, 0)).toEqual({ index: 1, skipped: [] });
  });

  it("carries on in authored order when the answer fits the next beat", () => {
    expect(nextBeat(turns, 0, "A tapa, please.", 0)?.index).toBe(1);
  });

  it("steps over a beat the answer has already closed", () => {
    const next = nextBeat(turns, 0, "The bill, please. Nothing to eat.", 0);
    expect(next?.index).toBe(2);
    expect(next?.skipped).toEqual([1]);
  });

  it("stops at the end rather than walking off it", () => {
    expect(nextBeat(turns, turns.length - 1, "anything", 0)).toBeNull();
  });

  it("spends a skip budget and then walks the rest as written", () => {
    expect(skipBudget(turns)).toBe(1);
    // Budget already spent: the branch is not taken a second time.
    expect(nextBeat(turns, 0, "The bill, please.", 1)).toEqual({ index: 1, skipped: [] });
  });

  it("keeps a conversation long enough to be one", () => {
    for (const locale of locales) {
      for (const convo of buildConversations(locale)) {
        expect(convo.turns.length - skipBudget(convo.turns)).toBeGreaterThanOrEqual(MIN_TURNS);
      }
    }
  });
});
