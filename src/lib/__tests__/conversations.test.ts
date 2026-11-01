import { describe, expect, it } from "vitest";
import { buildConversations } from "../conversations";
import { TALK_SCRIPTS, THEY_OPEN } from "../talkScripts";
import { placeName } from "../../components/quiz/ConversationPicker";
import { getCategories, LOCALES, type Locale } from "../content";
import {
  CONVERSATION_STAGES,
  conversationStageOf,
  followingConversation,
  groupByCategory,
  hintFor,
  readingTime,
  READ_CEILING,
  READ_FLOOR,
  gradeReply,
  hasSlot,
  replyMatches,
  type Conversation,
  type ConvLine,
} from "../conversationTypes";

const locales = LOCALES.map((l) => l.locale);

/**
 * Every way through a conversation, as the list of beats it visits.
 *
 * A beat leads somewhere different depending on which of your lines you say,
 * so a conversation is a graph and these are its paths. A path that comes back
 * to a beat it has already visited is a loop, and is returned as it stands so
 * the test can say which one.
 */
function paths(convo: Conversation): number[][] {
  const out: number[][] = [];
  const walk = (at: number, sofar: number[]) => {
    if (sofar.includes(at) || sofar.length > 20) {
      out.push([...sofar, at]);
      return;
    }
    const here = [...sofar, at];
    const nexts = new Set(convo.turns[at]!.next);
    for (const next of nexts) {
      if (next === null) out.push(here);
      else walk(next, here);
    }
  };
  walk(0, []);
  return out;
}

const asks = (line: string | null | undefined) => Boolean(line && /[?？]\s*$/.test(line.trim()));

/** Every line they say: openers and replies. */
function theirLines(convo: Conversation) {
  return convo.turns.flatMap((turn) =>
    [turn.theirOpener, ...turn.replies]
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .map((line) => ({ turn: turn.id, line }))
  );
}

/**
 * What Talk promises, checked against what it actually serves.
 *
 * Every conversation is a script, so the tests walk every path of every
 * script in every edition and hold it to what a real conversation is: it
 * starts with you, it never asks two things before you answer, nobody says a
 * blank out loud, and it ends.
 */
describe.each(locales)("conversations: %s", (locale: Locale) => {
  const conversations = buildConversations(locale);

  it("has a conversation for every script, so none was silently dropped", () => {
    expect(conversations.length).toBeGreaterThan(10);
    expect(conversations.map((c) => c.id).sort()).toEqual(
      (TALK_SCRIPTS[locale] ?? []).map((s) => s.id).sort()
    );
  });

  it("only offers the everyday places a trip takes you", () => {
    const stages = new Set(conversations.map((c) => conversationStageOf(c.categoryId)));
    for (const convo of conversations) {
      expect(CONVERSATION_STAGES).toContain(conversationStageOf(convo.categoryId));
    }
    for (const excluded of ["drunk-scale", "slang", "cuss-words", "flirting", "emergencies", "for-the-girls"]) {
      expect(stages.has(excluded)).toBe(false);
    }
    for (const kept of ["getting-around", "beer-food", "restaurant", "hotel", "shopping", "nightlife"]) {
      expect(stages.has(kept)).toBe(true);
    }
  });

  it("is opened by you, the way you open one on a trip", () => {
    for (const convo of conversations) {
      if (THEY_OPEN.has(convo.id)) continue;
      expect(convo.turns[0]!.theirOpener, convo.id).toBeNull();
    }
  });

  it("ends on every path, without going round in circles", () => {
    for (const convo of conversations) {
      for (const path of paths(convo)) {
        expect(new Set(path).size, `${convo.id} loops: ${path.join(" > ")}`).toBe(path.length);
      }
    }
  });

  it("runs between three and ten of your lines, whichever way it goes", () => {
    for (const convo of conversations) {
      for (const path of paths(convo)) {
        expect(path.length, `${convo.id}: ${path.join(" > ")}`).toBeGreaterThanOrEqual(3);
        expect(path.length, `${convo.id}: ${path.join(" > ")}`).toBeLessThanOrEqual(10);
      }
    }
  });

  it("reaches every beat it has, so no step is written and never played", () => {
    for (const convo of conversations) {
      const seen = new Set(paths(convo).flat());
      convo.turns.forEach((turn, i) => expect(seen.has(i), turn.id).toBe(true));
    }
  });

  /**
   * The bug that started this: a reply that asks you something, and then the
   * next beat asking something else before you have answered it.
   */
  it("never asks you a second thing before you have answered the first", () => {
    const clashes: string[] = [];
    for (const convo of conversations) {
      for (const turn of convo.turns) {
        turn.replies.forEach((reply, i) => {
          const next = turn.next[i];
          if (next === null || !asks(reply?.source)) return;
          const opener = convo.turns[next]!.theirOpener;
          if (opener) clashes.push(`${turn.id}: "${reply!.source}" then "${opener.source}"`);
        });
      }
    }
    expect(clashes).toEqual([]);
  });

  /**
   * Your turn with nothing to answer and nothing saying what you want is the
   * screen probing you. Every such beat is either reached through something
   * they said, or carries a cue. The goodbye is the exception: after "Here's
   * your receipt", saying bye needs nobody to tell you to.
   */
  it("never leaves you a turn with nothing to react to", () => {
    const bare: string[] = [];
    for (const convo of conversations) {
      convo.turns.forEach((turn) => {
        turn.next.forEach((next, i) => {
          if (next === null) return;
          const target = convo.turns[next]!;
          if (target.theirOpener || target.cue || turn.replies[i]) return;
          if (/:(bye|thanks)$/.test(target.id)) return;
          bare.push(`${turn.id} -> ${target.id}`);
        });
      });
    }
    expect(bare).toEqual([]);
  });

  it("never has them say a blank, a slash or a list of options out loud", () => {
    for (const convo of conversations) {
      for (const { turn, line } of theirLines(convo)) {
        expect(hasSlot(line.source), `${turn}: ${line.source}`).toBe(false);
        expect(line.source, turn).not.toMatch(/\s\/\s|\w\/\w/);
      }
    }
  });

  /**
   * Except a hello or a goodbye, where saying it straight back is the whole
   * exchange: "Hallo!" gets "Hallo!", "Hasta luego." gets "Hasta luego."
   */
  it("never hands you their reply as a line to say back", () => {
    for (const convo of conversations) {
      for (const turn of convo.turns) {
        if (/:(hi|bye)$/.test(turn.id)) continue;
        const mine = new Set(turn.yourLines.map((l) => l.source));
        turn.replies.forEach((reply) => {
          if (reply) expect(mine.has(reply.source), `${turn.id}: ${reply.source}`).toBe(false);
        });
      }
    }
  });

  it("gives every beat a line to say, and every line its English", () => {
    for (const convo of conversations) {
      for (const turn of convo.turns) {
        expect(turn.yourLines.length, turn.id).toBeGreaterThan(0);
        expect(turn.replies).toHaveLength(turn.yourLines.length);
        expect(turn.next).toHaveLength(turn.yourLines.length);
        for (const line of [...turn.yourLines, ...theirLines(convo).map((x) => x.line)]) {
          expect(line.source.trim(), turn.id).not.toBe("");
          expect(line.en?.trim(), `${turn.id}: ${line.source}`).toBeTruthy();
        }
      }
    }
  });

  it("sets the scene for every conversation and keeps the cues short", () => {
    for (const convo of conversations) {
      expect(convo.intro.trim(), convo.id).not.toBe("");
      for (const turn of convo.turns) {
        expect(turn.situation.trim()).not.toBe("");
        if (turn.cue) expect(turn.cue.length, turn.id).toBeLessThanOrEqual(60);
      }
    }
  });

  /**
   * Which line you said decides where a branching conversation goes, so every
   * line has to count as itself and not as a neighbor it nearly contains:
   * "Ta med, tack." went down the "Här, tack." branch before this.
   */
  it("counts every line you can say as that line, not a neighbor", () => {
    for (const convo of conversations) {
      for (const turn of convo.turns) {
        for (const line of turn.yourLines) {
          const verdict = gradeReply(line.source, turn.yourLines);
          expect(verdict.correct, `${turn.id}: ${line.source}`).toBe(true);
          expect(verdict.line.source, `${turn.id}: ${line.source}`).toBe(line.source);
        }
      }
    }
  });

  it("branches somewhere, so what you say matters", () => {
    expect(conversations.some((c) => c.branches)).toBe(true);
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
describe("gradeReply on lines that overlap", () => {
  const line = (source: string): ConvLine => ({ source, en: source, audioId: null });

  it("takes the line typed over one it nearly contains", () => {
    const here = line("Här, tack.");
    const away = line("Ta med, tack.");
    expect(gradeReply("Ta med, tack.", [here, away]).line).toBe(away);
    expect(gradeReply("ta med tack", [here, away]).line).toBe(away);

    const byes = [line("Hej då!"), line("Hej hej!"), line("Tack hej!")];
    expect(gradeReply("Tack hej!", byes).line.source).toBe("Tack hej!");
    expect(gradeReply("hej hej", byes).line.source).toBe("Hej hej!");

    const thanks = [line("Muchas gracias, hasta otra."), line("Gracias."), line("Muchas gracias.")];
    expect(gradeReply("Gracias.", thanks).line.source).toBe("Gracias.");
    expect(gradeReply("muchas gracias", thanks).line.source).toBe("Muchas gracias.");
  });
});

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
    // One edit apart, and two different verbs. The first letter is what
    // separates a slip of the hand from a different word.
    expect(replyMatches("Vamos tres", "Somos tres")).toBe(false);
  });

  /**
   * Reported from a Swedish café, with a screenshot: this is the same order as
   * the authored line and it came back wrong. Two things did it — a greeting
   * the author did not happen to write, which had to land on a word in the
   * line and could not, and "kafe" for "kaffe", one letter in a word too short
   * to be given any slack at all.
   */
  it("takes the order with a hello on the front and a typo in the middle", () => {
    expect(
      replyMatches(
        "Hej kan jag har en kanellbulle och kafe tack",
        "En kaffe och en kanelbulle, tack."
      )
    ).toBe(true);
  });

  it("does not let a greeting carry an order that isn't there", () => {
    expect(replyMatches("Hej tack", "En kaffe och en kanelbulle, tack.")).toBe(false);
    expect(replyMatches("Hej kan jag har en öl tack", "En kaffe och en kanelbulle, tack.")).toBe(
      false
    );
  });

  it("wants most of the line, not two words of it", () => {
    // Four words in five. "Nej … tack" is two thirds of "Nej tack, jag är
    // nöjd" and does not carry it.
    expect(replyMatches("Nej tack, jag är nöjd.", "Nej tack, jag är nöjd.")).toBe(true);
    expect(replyMatches("Nej ice kaffee tack", "Nej tack, jag är nöjd.")).toBe(false);
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
/**
 * What the picker's first screen is built from.
 *
 * Talk Mode opens on a grid of places rather than every conversation at once,
 * and a tile is an icon, a title and a count. The icon comes from the content
 * file, so a category that loses one renders a tile with a hole in it and
 * nothing else would notice.
 */
describe("grouping conversations into places", () => {
  for (const locale of LOCALES.map((l) => l.locale)) {
    describe(locale, () => {
      const groups = groupByCategory(buildConversations(locale));

      it("gives every place an icon and a title", () => {
        expect(groups.length).toBeGreaterThan(0);
        for (const group of groups) {
          expect(group.categoryTitle, `${group.categoryId} title`).toBeTruthy();
          expect(group.categoryIcon, `${group.categoryId} icon`).toBeTruthy();
        }
      });

      it("puts every conversation in exactly one place", () => {
        const all = buildConversations(locale);
        const grouped = groups.flatMap((g) => g.conversations);
        expect(grouped).toHaveLength(all.length);
        expect(new Set(grouped.map((c) => c.id)).size).toBe(all.length);
      });

      it("keeps the tile grid short enough to scan", () => {
        // The whole point of the two screens: the first one should fit on a
        // laptop without scrolling. Three columns of tiles means twelve or so
        // is the ceiling before it stops being a glance.
        expect(groups.length).toBeLessThanOrEqual(12);
      });
    });
  }
});

/**
 * Tile titles.
 *
 * The picker's first screen shows a place name beside an icon, cut down from
 * the authored category title. The cut has to be safe on every title in every
 * edition, because a bad one leaves a fragment on the tile and nobody would
 * see it until they opened that language.
 */
describe("shortening a category title for a tile", () => {
  it("drops a trailing parenthetical and anything after a dash", () => {
    expect(placeName("Getting around (taxi + metro)")).toBe("Getting around");
    expect(placeName("Checking in (hotel/hostel/Airbnb)")).toBe("Checking in");
    expect(placeName("Nightlife — into the club & making friends")).toBe("Nightlife");
  });

  it("leaves a title alone when cutting it would leave a fragment", () => {
    expect(placeName("Robbed & emergencies")).toBe("Robbed & emergencies");
    expect(placeName("Shopping, markets & haggling")).toBe("Shopping, markets & haggling");
    expect(placeName("At a restaurant")).toBe("At a restaurant");
  });

  it("never returns an empty or stub name for any real category", () => {
    for (const locale of LOCALES.map((l) => l.locale)) {
      for (const group of groupByCategory(buildConversations(locale))) {
        const name = placeName(group.categoryTitle);
        expect(name.length, `${locale} ${group.categoryId} -> "${name}"`).toBeGreaterThanOrEqual(3);
        // A cut that ends on punctuation means the split landed mid-phrase.
        expect(name, `${locale} ${group.categoryId}`).not.toMatch(/[,&/(-]$/);
      }
    }
  });
});

describe("readingTime", () => {
  it("gives a one-word reply the floor, not nothing", () => {
    expect(readingTime("Sí.")).toBe(READ_FLOOR);
  });

  it("gives more to read more time", () => {
    const short = readingTime("Vale.");
    const long = readingTime("De barril, gracias.", "Draft, thanks.", "¿Cuál? Tenemos Mahou o Estrella.");
    expect(long).toBeGreaterThan(short);
  });

  it("never holds the conversation past the ceiling", () => {
    expect(readingTime("x".repeat(2000))).toBe(READ_CEILING);
  });

  it("ignores lines that are not there", () => {
    expect(readingTime(null, undefined, "Vale.")).toBe(readingTime("Vale."));
  });
});

describe.each(locales)("carrying on inside the thread: %s", (locale: Locale) => {
  const conversations = buildConversations(locale);

  it("leads every conversation but the last somewhere", () => {
    conversations.slice(0, -1).forEach((convo, i) => {
      expect(followingConversation(conversations, convo.id)?.conversation.id).toBe(
        conversations[i + 1]!.id
      );
    });
    expect(followingConversation(conversations, conversations.at(-1)!.id)).toBeNull();
  });

  it("says whether the next one is the same place or somewhere new", () => {
    for (const convo of conversations) {
      const next = followingConversation(conversations, convo.id);
      if (next) expect(next.samePlace).toBe(next.conversation.categoryId === convo.categoryId);
    }
  });

  it("gives nothing for an id it does not know", () => {
    expect(followingConversation(conversations, "not-a-conversation")).toBeNull();
  });

  it("hints with the authored English of a line you could say, and nothing else", () => {
    for (const convo of conversations) {
      for (const turn of convo.turns) {
        const hint = hintFor(turn);
        if (hint === null) {
          expect(turn.yourLines.every((line) => !line.en?.trim())).toBe(true);
        } else {
          expect(turn.yourLines.map((line) => line.en?.trim())).toContain(hint);
        }
      }
    }
  });
});
