// Client-safe half of the conversation layer.
//
// Same rule as quizTypes.ts: this file must never import ../lib/content (or
// anything that does). The Talk island imports these types and gets its data
// from GET /api/conversations, which checks entitlement server-side. Importing
// content here would pull all three content files into the browser bundle.

import {
  coreOf,
  editBudget,
  normalizeAnswer,
  typedAnswerMatches,
  withFoldedSpelling,
  withinEdits,
} from "./quizTypes";

/** A line of the target language with its English meaning. */
export interface ConvLine {
  source: string;
  en: string | null;
  /** Id of the generated clip, where one was made. Null falls back to a voice. */
  audioId: string | null;
}

/**
 * One beat of a conversation: maybe something they say, then you, then maybe
 * something back.
 *
 * Built from a script (./talkScripts), so whose line is whose and what follows
 * what is written down rather than inferred.
 */
export interface ConvTurn {
  id: string;
  /**
   * The moment, in English. Only on screen with Show English on: their line is
   * the prompt, or the cue is.
   */
  situation: string;
  /**
   * What you want to do, in English, on a beat you have to open with nothing
   * of theirs to react to: asking for the check, finding the toilet. Null
   * everywhere else, which is most beats.
   */
  cue: string | null;
  /** Their line, when they speak first. Null on a beat you open. */
  theirOpener: ConvLine | null;
  /**
   * The lines you could say here, all authored and all right. Where one of
   * them changes what happens next, `replies` and `next` say how.
   */
  yourLines: ConvLine[];
  /** What comes back to each of `yourLines`, by position. Null: nothing does. */
  replies: (ConvLine | null)[];
  /** The beat each of `yourLines` leads to, by index into `turns`. Null: the end. */
  next: (number | null)[];
  /**
   * Their closing line after each of `yourLines`, by position, where that line
   * ends the conversation: the local's "Hasta luego" or "Hej hej!", so you are
   * never made to type a goodbye just to finish. Null: nothing more is said.
   */
  outros: (ConvLine | null)[];
  /**
   * Other sourced ways of saying each of `yourLines`, by position. One of
   * these counts as that line: same reply, same way on, and the authored line
   * shown as the one to learn. Never offered on screen.
   */
  accepts: ConvLine[][];
  /** Their short reaction before the reply to each of `yourLines` ("Vale."). */
  reactions: (ConvLine | null)[];
  /** What comes back to the first of your lines. The common case, for display. */
  theirReply: ConvLine | null;
  /** The authored note about this exchange, where it has one. */
  note: string;
}

/**
 * One walkable conversation: an authored subsection, in the order it was
 * written.
 *
 * A subsection is the right unit because it is already one place and one
 * moment — "Taxi / rideshare", "At the door", "Getting seated" — which is why
 * its exchanges read as consecutive beats rather than a list of unrelated
 * lines.
 */
export interface Conversation {
  /** The subsection id. */
  id: string;
  categoryId: string;
  categoryTitle: string;
  /** The category's authored emoji. The picker's first screen is a grid of
   *  categories, and an icon is what makes one scannable at a glance. */
  categoryIcon: string;
  /** The subsection's title, or the category's where it has none. */
  title: string;
  /** Where you are, in a sentence of English. Shown once, above the first line. */
  intro: string;
  /** True when something you say changes what happens next. */
  branches: boolean;
  /** Every beat the script has. A run walks some of them, from the first. */
  turns: ConvTurn[];
  /**
   * The beat a "Huh?" moment is wired into, always: they say their line too
   * fast and you have to ask for it again. Null where it is not wired, which
   * is most conversations; those get one on every third start instead (see
   * lib/repairTypes.ts).
   */
  huhAt: number | null;
  /** Asking them a question back, where the script allows it. */
  askBack: ConvAskBack | null;
}

/**
 * "¿Y vosotros?": a question asked back, and the short answer it gets.
 * See TalkAskBack in ./talkScripts.
 */
export interface ConvAskBack {
  /** Indexes into `turns` where asking back is answered. */
  turns: number[];
  asks: ConvLine[];
  /** Their answer when you only asked back. */
  alone: ConvLine;
  /** Their answer when you answered and then asked back. */
  after: ConvLine;
}

/**
 * A question asked back at the end of what was typed, split off it.
 *
 * "Somos de Irlanda, ¿y vosotros?" is an answer and then a question, and
 * grading the whole thing against the answer either fails it or swallows the
 * question. So the question comes off the end, the rest is graded, and the
 * question is answered. Null where nothing was asked back.
 */
export function splitAskBack(given: string, asks: ConvLine[]): { rest: string } | null {
  const words = given.trim().split(/\s+/).filter(Boolean);
  for (const ask of asks) {
    const want = normalizeAnswer(ask.source);
    if (!want) continue;
    const size = want.split(" ").length;
    if (words.length < size) continue;
    const tail = words.slice(words.length - size).join(" ");
    if (normalizeAnswer(tail) !== want) continue;
    const rest = words
      .slice(0, words.length - size)
      .join(" ")
      .replace(/[\s,;:¿¡-]+$/u, "")
      .trim();
    return { rest };
  }
  return null;
}

export interface ConversationPayload {
  conversations: Conversation[];
  /** The lines a "Huh?" moment is made of, for this edition. */
  repair: import("./repairTypes").RepairKit | null;
}

/**
 * Sections that are a conversation rather than a word list.
 *
 * Keyed by stage rather than category id, the same way `PRACTICE_PATH` is, so
 * one list serves all three editions — ids carry a locale prefix
 * (`sv-beer-food`) and the stage key does not.
 *
 * Having exchanges is not the same as being somewhere you talk. Slang, cussing
 * and flirting are word lists and never had exchanges to begin with; the drunk
 * scale does have them, and they are a scale — eight ways to say how far gone
 * you are, not eight beats of one conversation. Walking that as a dialogue
 * would be a person being asked how drunk they are eight times.
 *
 * What is left is the everyday places a trip takes you where somebody talks
 * back: a bar, a café, a taxi, the metro, a restaurant, a hotel desk, a shop,
 * a club door, a pharmacy. Talk is for those. Being robbed and shaking off a
 * creep are on the scenario pages and in the practice path, and are not
 * conversations anybody wants to rehearse as small talk.
 *
 * `resacon` is the judgement call. Its name is the hangover, but the subsection
 * with the dialogue in it is at the pharmacy asking for something for your
 * head, which is as real a counter conversation as the shop. Drop the line if
 * you disagree — that is the whole change.
 */
export const CONVERSATION_STAGES = [
  "getting-around",
  "basics",
  "starting-convo",
  "beer-food",
  "restaurant",
  "hotel",
  "shopping",
  "nightlife",
  "resacon",
] as const;

/** `sv-beer-food` -> `beer-food`. Mirrors stageKeyOf in quizTypes. */
export function conversationStageOf(categoryId: string): string {
  return categoryId.replace(/^(sv|de)-/, "");
}

export function isConversationCategory(categoryId: string): boolean {
  return (CONVERSATION_STAGES as readonly string[]).includes(
    conversationStageOf(categoryId)
  );
}

/**
 * Beats below which a subsection is a list, not a conversation.
 *
 * Two lines and a comeback is an exchange; it is not something you walk
 * through. Nothing in the three editions currently falls under this — every
 * subsection with exchanges has eight — but a new one might, and a one-beat
 * "conversation" in the picker would be a worse answer than no entry at all.
 */
export const MIN_TURNS = 3;

export interface ConversationGroup {
  categoryId: string;
  categoryTitle: string;
  categoryIcon: string;
  conversations: Conversation[];
}

/** Conversations grouped by the category they were written under, in order. */
export function groupByCategory(conversations: Conversation[]): ConversationGroup[] {
  const out: ConversationGroup[] = [];
  const byId = new Map<string, ConversationGroup>();

  // First-seen order is content order, which is the order the editions were
  // written in and the order the scenario pages list them in.
  for (const convo of conversations) {
    let group = byId.get(convo.categoryId);
    if (!group) {
      group = {
        categoryId: convo.categoryId,
        categoryTitle: convo.categoryTitle,
        categoryIcon: convo.categoryIcon,
        conversations: [],
      };
      byId.set(convo.categoryId, group);
      out.push(group);
    }
    group.conversations.push(convo);
  }

  return out;
}

/** How many lines of yours a conversation asks for — what the picker counts. */
export function turnCount(convo: Conversation): number {
  return convo.turns.length;
}

// ---------------------------------------------------------------------------
// Grading what somebody says back
// ---------------------------------------------------------------------------

/**
 * A fill-in slot: `__` or `[BELOPP]`. Authored content, not missing data — the
 * amount, the street or the station changes every time you say the line.
 *
 * Two patterns rather than one, because a /g regex keeps its own position
 * between `.test()` calls and the two uses here would interfere.
 */
const SLOT_SPLIT = /(_{2,}|\[[^\]]+\])/g;
const IS_SLOT = /^(_{2,}|\[[^\]]+\])$/;
const HAS_SLOT = /(_{2,}|\[[^\]]+\])/;

export function hasSlot(line: string): boolean {
  return HAS_SLOT.test(line);
}

/**
 * A blank that holds a number: an age at the door, how many of you there are.
 * Only these take a bare number as the whole answer, so "fyra" at "Hur många
 * är ni?" is "Vi är [ANTAL]." and "dreißig" at "Wie alt seid ihr?" is
 * "Ich bin [ALTER].".
 */
const NUMBER_SLOT = /\[(alter|antal|zahl|numero|age|number)\]/i;

/**
 * A number as somebody would type it: digits, or the word in German or
 * Swedish, 1 to 99. Written to the normalized form (no accents, ß as ss), the
 * way `normalizeAnswer` leaves what was typed. The words and how 21 to 99 are
 * built are from languagesandnumbers.com: German puts the unit first and joins
 * it with "und" (einunddreißig), Swedish puts the ten first with nothing
 * between (fyrtioåtta).
 *
 * This is matching vocabulary, not a line anybody is taught: it never appears
 * on screen.
 */
const DE_UNIT = "ein|zwei|drei|vier|funf|sechs|sieben|acht|neun";
const DE_TEN = "zwanzig|dreissig|vierzig|funfzig|sechzig|siebzig|achtzig|neunzig";
const DE_NUMBER = new RegExp(
  `^(eins|${DE_UNIT}|zehn|elf|zwolf|dreizehn|vierzehn|funfzehn|sechzehn|siebzehn|achtzehn|neunzehn|${DE_TEN}|(${DE_UNIT})und(${DE_TEN}))$`
);
const SV_UNIT = "en|ett|tva|tre|fyra|fem|sex|sju|atta|nio";
const SV_TEN = "tjugo|trettio|fyrtio|femtio|sextio|sjuttio|attio|nittio";
const SV_NUMBER = new RegExp(
  `^(${SV_UNIT}|tio|elva|tolv|tretton|fjorton|femton|sexton|sjutton|arton|nitton|(${SV_TEN})(${SV_UNIT})?)$`
);

/** True when a normalized word is a number, in digits or in words. */
function isNumber(word: string): boolean {
  return /^\d{1,3}$/.test(word) || DE_NUMBER.test(word) || SV_NUMBER.test(word);
}

/** A typed answer that is only a number, for a line whose blank is one. */
function numberOnly(given: string, expected: string): boolean {
  if (!NUMBER_SLOT.test(expected)) return false;
  return isNumber(normalizeAnswer(given));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matching a line that has a blank in it.
 *
 * "A la calle __, número __, por favor." is a correct thing to say and nobody
 * can type it correctly, because the whole point of the blank is that you put
 * your own street in it. So the fixed parts have to match and the blanks have
 * to accept whatever was put there. Everything outside the blanks goes through
 * `normalizeAnswer` first, so accents, case and punctuation are as forgiving
 * here as they are anywhere else.
 */
/**
 * Marks "días/semanas" and "Gröna/röda/blå" as one word with a choice in it,
 * before `normalizeAnswer` turns the slash into a space. "Llevo __
 * días/semanas." normalized to "llevo __ dias semanas", which nobody says, so
 * "Llevo tres días" was marked wrong for the line it is.
 */
const CHOICE_MARK = "\u0001";
const WORD_CHOICE = /[\p{L}\p{M}]+(?:\/[\p{L}\p{M}]+)+/gu;

function normalizedWithChoices(expected: string): string {
  return normalizeAnswer(expected.replace(WORD_CHOICE, (word) => word.split("/").join(CHOICE_MARK)));
}

/** A fixed stretch of a slot line as a pattern, a marked choice as an alternation. */
function fixedPattern(part: string): string {
  return part
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token)) return "\\s+";
      if (!token.includes(CHOICE_MARK)) return escapeRegExp(token);
      return `(?:${token.split(CHOICE_MARK).map(escapeRegExp).join("|")})`;
    })
    .join("");
}

function slotPattern(expected: string): RegExp | null {
  const normalised = normalizedWithChoices(expected);
  if (!HAS_SLOT.test(normalised)) return null;

  const source = normalised
    .split(SLOT_SPLIT)
    .map((part) =>
      IS_SLOT.test(part)
        ? NUMBER_SLOT.test(part)
          ? // A number blank takes a number, in digits or words.
            "(\\S+)"
          : // At least one character, so an empty blank is not an answer.
            "(.+)"
        : fixedPattern(part)
    )
    .join("");

  try {
    return new RegExp(`^${source}$`);
  } catch {
    // A slot pattern that will not compile is not worth failing a conversation
    // over; the plain comparison above it still applies.
    return null;
  }
}

/**
 * True when what was typed is the line with its blanks filled in: anything in
 * a blank for a name or a place, a number in a blank for a number. A line
 * whose blank is a number also takes the number on its own, which is how
 * people answer "how old are you?" and "how many of you?" at a door.
 */
function fillsTheBlanks(given: string, expected: string): boolean {
  return strictFill(given, expected) !== null;
}

/**
 * What went in the blanks, for a line typed with them filled: one entry per
 * blank, normalized. Null when it is not the line.
 */
function strictFill(given: string, expected: string): string[] | null {
  if (numberOnly(given, expected)) return [normalizeAnswer(given)];
  const pattern = slotPattern(expected);
  if (!pattern) return null;
  const match = pattern.exec(normalizeAnswer(given));
  if (!match) return null;
  const blanks = normalizeAnswer(expected).match(new RegExp(SLOT_SPLIT.source, "g")) ?? [];
  if (!blanks.every((blank, i) => !NUMBER_SLOT.test(blank) || isNumber(match[i + 1] ?? ""))) return null;
  return match.slice(1).map((fill) => fill ?? "");
}

/**
 * Words that answer a question with a yes or a no. A blank on its own takes
 * almost anything, so a bare "No" would otherwise count as the name in "Sí, a
 * nombre de __." and walk you into the branch you just said no to.
 */
const YES_OR_NO = new Set(["si", "no", "ja", "nej", "nein", "nee", "jo", "japp", "nope"]);

/** Thanks and please, which a line can end on after its blank. */
const POLITE = new Set(["tack", "gracias", "danke", "bitte", "porfa", "favor", "por", "please"]);

/** Fixed words before a blank, at most, for the blank to be said on its own. */
const BARE_FRAME = 4;

/**
 * A blank line said the way people actually answer.
 *
 * Asked "¿De dónde eres?", nobody in Madrid says "Soy de Irlanda." every time.
 * They say "De Irlanda." or "Irlanda." Asked their name, "Ana." At the club
 * door, "Tres." Into a taxi, "Calle Mayor, cinco." `fillsTheBlanks` wants the
 * whole frame round the blank, and all of those came back wrong.
 *
 * So the start of the frame may be dropped, from the front, a word at a time;
 * whatever follows the first blank may be left off; and the blank keeps the
 * rest. Dropping the whole frame, which leaves the blank alone, is held to
 * short frames ("Me llamo", "Somos", "Ich bin"), to a short answer, and to an
 * answer that does not start with a yes or a no.
 *
 * Never for a question. A blank in a question is you asking ("¿Cómo se dice
 * __?"), and a bare word there is not the question.
 *
 * Returns what went in the blank, normalized, and whether it was said inside
 * some of the frame, or null. A blank said alone is a guess at where the blank
 * ends: "Soy Ana" for "Me llamo [NOMBRE]." is right, and its blank is "Ana",
 * not "Soy Ana", so leading function words come off a bare one.
 */
interface LooseFill {
  fill: string;
  framed: boolean;
}

function looseFill(given: string, expected: string): LooseFill | null {
  if (!HAS_SLOT.test(expected) || coreOf(expected).includes("?")) return null;
  const said = normalizeAnswer(given).split(" ").filter(Boolean);
  if (said.length === 0) return null;

  const tokens = normalizedWithChoices(coreOf(expected)).split(" ").filter(Boolean);
  const firstBlank = tokens.findIndex((token) => IS_SLOT.test(token));
  if (firstBlank < 0) return null;
  const frame = tokens.slice(0, firstBlank);
  const numberBlank = tokens.some((token) => IS_SLOT.test(token) && NUMBER_SLOT.test(token));
  const tail = tokens.slice(firstBlank + 1).filter((token) => !IS_SLOT.test(token));
  const blankEndsTheLine = tail.every((token) => FUNCTION_WORDS.has(token) || POLITE.has(token));

  const same = (word: string, token: string) =>
    token.includes(CHOICE_MARK) ? token.split(CHOICE_MARK).some((side) => sameWord(word, side)) : sameWord(word, token);

  for (let drop = 0; drop <= frame.length; drop++) {
    const kept = frame.slice(drop);
    if (kept.length > said.length) continue;
    if (!kept.every((token, i) => same(said[i]!, token))) continue;

    const rest = said.slice(kept.length);
    // The words after the blank are optional: "Tengo treinta" for "Tengo __
    // años", "Ich bin 30" for "Ich bin [ALTER] Jahre alt". Where some of them
    // are there, they come off the end rather than being read as the blank.
    const before = rest.length;
    while (rest.length > 1 && tail.some((token) => same(rest[rest.length - 1]!, token))) rest.pop();
    if (rest.length === 0) continue;
    const saidTheTail = rest.length < before;

    if (kept.length === 0) {
      if (frame.length > BARE_FRAME) continue;
      // The blank on its own is the answer only where the line ends on it:
      // "Somos __.", "Me llamo [NOMBRE].", "Till [ADRESS], tack.". In
      // "Prefiero por __, si puede ser." the blank is a detail of a longer
      // sentence, and "hola" there is not a route.
      if (!blankEndsTheLine && !saidTheTail) continue;
      if (rest.length > 3 || YES_OR_NO.has(rest[0]!)) continue;
      while (rest.length > 1 && FUNCTION_WORDS.has(rest[0]!)) rest.shift();
    }
    if (numberBlank && !rest.some(isNumber)) continue;
    return { fill: rest.join(" "), framed: kept.length > 0 };
  }
  return null;
}

/**
 * Words that carry no order in them.
 *
 * Articles, pronouns, prepositions and the politeness a line is padded with,
 * across all three editions at once. One list rather than three because a
 * Spanish function word is not a German content word: nothing in any edition
 * is taught by asking somebody to produce "der" or "por" on its own, and a
 * list per language would be three places to forget to update.
 *
 * Deliberately conservative. "Sí", "No", "Vale", "Tack" and "Danke" are whole
 * answers somebody might give, so they stay out of it — a line that is nothing
 * but politeness ends up with no content words at all, and `keywordMatch`
 * declines to judge those rather than accepting anything polite.
 */
const FUNCTION_WORDS = new Set([
  // Spanish
  "un", "una", "unos", "unas", "el", "la", "los", "las", "lo", "de", "del",
  "al", "a", "en", "con", "sin", "por", "para", "y", "e", "o", "u", "que",
  "me", "te", "se", "le", "nos", "les", "mi", "tu", "su", "es", "esta",
  "estoy", "soy", "hay", "muy", "mas", "porfa", "porfavor", "favor", "pues",
  "oye", "quiero", "querria", "pongame", "pones", "puedo", "puede",
  // Swedish
  "en", "ett", "den", "det", "har", "dar", "jag", "du", "vi", "ni", "ar",
  "vill", "skulle", "kan", "att", "och", "eller", "pa", "till", "med", "for",
  "av", "sa", "ha", "garna", "jarna",
  // German
  "ein", "eine", "einen", "einem", "einer", "eines", "der", "die", "das",
  "den", "dem", "des", "ich", "wir", "ihr", "sie", "ist", "sind", "habe",
  "hatte", "haette", "gern", "gerne", "bitte", "und", "oder", "mit", "ohne",
  "auf", "zu", "an", "von", "im", "ins", "mal", "doch", "noch", "wurde",
  // The German way of asking, as "quiero" and "kan jag få" are above: in
  // "Kann ich ein Pils bestellen?" the order is the Pils.
  "kann", "nehme", "bestellen", "mochte", "moechte",
]);

/**
 * The words in a line that actually say what it is.
 *
 * Blanks are dropped with the function words: a slot is the part of the line
 * that changes every time it is said, so it cannot be something a learner is
 * asked to have got right.
 */
function contentWords(line: string): string[] {
  return normalizeAnswer(coreOf(line))
    .split(" ")
    .filter((word) => word && !FUNCTION_WORDS.has(word) && !IS_SLOT.test(word));
}

/**
 * Two words that are the same word, give or take a slip of the hand.
 *
 * The first letter has to survive. One edit is most of a short word and
 * Spanish is full of pairs a single letter apart — "vamos" and "somos",
 * "pero" and "perro" — but almost nobody's slip is on the letter they started
 * with, so holding that one fixed separates "kafe" for "kaffe" from a
 * different word entirely. Below four letters nothing is forgiven at all.
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const longest = Math.max(a.length, b.length);
  if (longest < 4 || a[0] !== b[0]) return false;
  return withinEdits(a, b, Math.max(1, editBudget(longest)));
}

/**
 * How much of the authored line has to be in what you said.
 *
 * Four words in five. Enough that "hej kan jag har en kanellbulle och kafe
 * tack" is the same order as "En kaffe och en kanelbulle, tack" — which it
 * plainly is — and not so little that two words in common carries a different
 * sentence over the line.
 */
const COVERAGE = 0.8;

/**
 * The half-answer, and the one with a greeting bolted on the front.
 *
 * A barista asks what you want and you say "café". That is what somebody
 * standing at a counter in Madrid actually says, and the authored line is "Un
 * café con leche, por favor" — so grading it letter by letter marks a correct
 * order wrong and teaches that the app wants a recitation rather than a
 * sentence.
 *
 * Two ways to be right, because there are two ways to be brief:
 *
 * **Everything you said is in the line.** The short order: "café". Nothing is
 * missing that was not simply left unsaid.
 *
 * **You covered enough of the line.** The long way round: "hej kan jag har en
 * kanellbulle och kafe tack" says everything "En kaffe och en kanelbulle,
 * tack" says, plus a hello and a false start. Extra words cost nothing here,
 * which is the whole difference: requiring every word you typed to land on one
 * in the line meant a greeting the author did not happen to write was enough
 * to mark a correct order wrong.
 *
 * What it will not do is guess. "Una cerveza" covers none of the coffee, a
 * line whose content is nothing but politeness is left to the exact
 * comparisons above rather than matched on an empty set, and a line with a
 * blank in it is `slotPattern`'s business alone: the blank is the part being
 * asked for, and content words drop it.
 */
function keywordMatch(given: string, expected: string): boolean {
  if (hasSlot(expected)) return false;

  const said = contentWords(given);
  const line = contentWords(expected);
  if (said.length === 0 || line.length === 0) return false;

  const inTheLine = said.every((word) => line.some((other) => sameWord(word, other)));
  if (inTheLine) return true;

  const covered = line.filter((word) => said.some((other) => sameWord(word, other))).length;
  return covered / line.length >= COVERAGE;
}

/** True when what somebody said is this line, blanks and all. */
export function replyMatches(given: string, expected: string): boolean {
  if (typedAnswerMatches(given, expected)) return true;
  return withFoldedSpelling(given, expected, (g, e) => fillsTheBlanks(g, e) || keywordMatch(g, e));
}

/**
 * The same, and also a blank line said the short way: "De Irlanda" for "Soy
 * de __.". Only Talk takes this one, and only after every line on the beat
 * has had its turn at the stricter comparisons, so a short answer that is
 * another line on the beat is that line rather than a guess at a blank.
 */
function saysItLoosely(given: string, expected: string): boolean {
  return withFoldedSpelling(given, expected, (g, e) => looseFill(g, e) !== null);
}

/**
 * Whether a typed answer says what a line says, for a Practice question that
 * asks what you would say in a moment.
 *
 * Talk takes the same answer it would take at the bar: "una jarra" for "Una
 * jarra de cerveza, por favor.", "Soy de Irlanda" for "Soy de __.". Practice
 * used to want the line to the letter, so the same answer that carried a
 * conversation was marked wrong in a round. One difference: here the words you
 * typed have to be at least half of what the line is about, so "metro" on its
 * own is not "Perdona, ¿dónde está la entrada del metro?".
 */
export function saysTheLine(given: string, expected: string): boolean {
  if (typedAnswerMatches(given, expected)) return true;
  return withFoldedSpelling(given, expected, saysTheLineAsTyped);
}

function saysTheLineAsTyped(given: string, expected: string): boolean {
  if (hasSlot(expected)) return fillsTheBlanks(given, expected);

  const said = contentWords(given);
  const line = contentWords(expected);
  if (said.length === 0 || line.length === 0) return false;
  if (!said.every((word) => line.some((other) => sameWord(word, other)))) return false;
  const covered = line.filter((word) => said.some((other) => sameWord(word, other))).length;
  return covered / line.length >= 0.5;
}

/** Shared words over total distinct words, for "close" rather than "right". */
function overlap(a: string, b: string): number {
  const ta = new Set(normalizeAnswer(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeAnswer(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  const shared = [...ta].filter((t) => tb.has(t)).length;
  return shared / (ta.size + tb.size - shared);
}

/** Enough of the right words that "almost" is true rather than encouraging. */
const CLOSE_ENOUGH = 0.45;

export interface ReplyVerdict {
  correct: boolean;
  /**
   * The authored line this counts as. On a correct answer it is what they
   * said; on a wrong one it is the line they were closest to, which is what
   * the correction shows.
   */
  line: ConvLine;
  /** Wrong, but recognisably an attempt at `line` rather than something else. */
  close: boolean;
  /**
   * On a correct answer that was not the line as written, the line as written:
   * what to say next time. "si perfecto" is right and gets "Sí, perfecto." back
   * under it, accent and all; "café" gets the whole order; "De Irlanda" gets
   * "Soy de Irlanda.", with their own word in the blank. Null when they said it
   * exactly, and on a wrong answer, where the correction already shows it.
   */
  recommended: ConvLine | null;
}

/**
 * Grading a turn.
 *
 * Every authored line for the turn is acceptable, not just the first: where a
 * beat offers a polite version and a blunt one, both are things a person says
 * there, and marking one of them wrong would be teaching that it isn't.
 *
 * A wrong answer is never a dead end. It is corrected against the line it came
 * closest to and the conversation carries on, because this is a conversation
 * and not a test — the round screens are the test.
 */
export function gradeReply(given: string, options: ConvLine[], accepts: ConvLine[][] = []): ReplyVerdict {
  const fallback = options[0]!;
  // The line you actually typed first, before the generous match gets a look.
  // The generous match is about how much of a line you said, so on a beat
  // where one line nearly contains another it took whichever came first:
  // "Ta med, tack." counted as "Här, tack." and the café got the wrong order,
  // "Tack hej!" counted as "Hej hej!". In a branching conversation which line
  // it counts as decides what happens next, so an exact match wins outright.
  const right = (option: ConvLine): ReplyVerdict => ({
    correct: true,
    line: option,
    close: false,
    recommended: recommendationFor(given, option),
  });
  for (const option of options) {
    if (typedAnswerMatches(given, option.source)) return right(option);
  }
  // Another sourced way of saying a line, before the generous match, so
  // "¿Qué plan tienes hoy?" is the plans line and not a near miss of it.
  for (const [i, option] of options.entries()) {
    for (const other of accepts[i] ?? []) {
      if (typedAnswerMatches(given, other.source)) return { ...right(option), recommended: option };
    }
  }
  for (const option of options) {
    if (replyMatches(given, option.source)) return right(option);
  }
  for (const [i, option] of options.entries()) {
    for (const other of accepts[i] ?? []) {
      if (replyMatches(given, other.source)) return { ...right(option), recommended: option };
    }
  }
  // Last, a blank said the short way. After every other line has been tried,
  // so "No" at "¿Con reserva?" is "No, sin reserva." and not a name.
  for (const option of options) {
    if (saysItLoosely(given, option.source)) return right(option);
  }

  let best = fallback;
  let bestScore = 0;
  for (const option of options) {
    const score = overlap(given, option.source);
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }

  return { correct: false, line: best, close: bestScore >= CLOSE_ENOUGH, recommended: null };
}

/**
 * A line compared the way it is written: case, punctuation and spacing do not
 * count, accents do. Grading forgives a missing accent; showing the line back
 * is where the accent is learned.
 */
function asWritten(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[¿¡?!.,;:"'’‘‚“”„«»()\-–—…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The words someone typed, as they typed them, each with its normalized form. */
function typedWords(given: string): { raw: string; key: string }[] {
  const out: { raw: string; key: string }[] = [];
  for (const raw of given.trim().split(/\s+/)) {
    const bare = raw.replace(/^[¿¡"'“«(]+|[?!.,;:"'”»)]+$/g, "");
    for (const key of normalizeAnswer(bare).split(" ").filter(Boolean)) out.push({ raw: bare, key });
  }
  return out;
}

/**
 * The fill as the learner typed it, capitals and accents and all, found by its
 * normalized words. Falls back to the normalized fill.
 */
function rawFill(given: string, fill: string): string {
  const words = typedWords(given);
  const want = fill.split(" ").filter(Boolean);
  for (let start = words.length - want.length; start >= 0; start--) {
    if (want.every((key, i) => words[start + i]!.key === key)) {
      const picked: string[] = [];
      for (const word of words.slice(start, start + want.length)) {
        if (picked[picked.length - 1] !== word.raw) picked.push(word.raw);
      }
      return picked.join(" ");
    }
  }
  return fill;
}

function recommendationFor(given: string, line: ConvLine): ConvLine | null {
  if (!hasSlot(line.source)) {
    return asWritten(given) === asWritten(line.source) ? null : line;
  }

  // A blank line is recommended with their own word in it, where there is one
  // blank and the word can be found. With two blanks the frame is shown as it
  // is written.
  const blanks = line.source.match(new RegExp(SLOT_SPLIT.source, "g")) ?? [];
  if (blanks.length !== 1) return line;
  const fill =
    withFoldedFill(given, line.source, (g, e) => strictFill(g, e)?.[0] ?? null) ??
    withFoldedFill(given, line.source, (g, e) => {
      // Their word goes in the frame only where it is plainly the word: they
      // said some of the frame round it, or it is one word on its own.
      const loose = looseFill(g, e);
      return loose && (loose.framed || !loose.fill.includes(" ")) ? loose.fill : null;
    });
  if (!fill) return line;
  const chosen = resolveChoices(given, line.source);
  if (!chosen) return line;
  // A phone capitalizes the first word typed. A name keeps it; a number word
  // in the middle of a sentence does not: "Vi är fyra.", not "Vi är Fyra.".
  let word = rawFill(given, fill);
  if (isNumber(normalizeAnswer(word)) && !line.source.trimStart().match(/^(_{2,}|\[)/)) {
    word = word.charAt(0).toLowerCase() + word.slice(1);
  }
  const filled = chosen.replace(HAS_SLOT, word);
  if (asWritten(given) === asWritten(filled)) return null;
  return {
    source: filled,
    // The English stays as written: their word in it would be a Spanish or
    // Swedish word in an English sentence, and the frame says what it means.
    en: line.en,
    // The clip, where there is one, says the frame and not their word. The
    // device voice reads the line as it is now.
    audioId: null,
  };
}

/**
 * "Llevo __ días/semanas." with the side they said: "días" for "Llevo tres
 * días". Null where they said neither side exactly, because the only other
 * honest thing to show is the frame as written. "Llevo una semana" is right,
 * and "Llevo una semanas." is not Spanish.
 */
function resolveChoices(given: string, line: string): string | null {
  const said = new Set(normalizeAnswer(given).split(" ").filter(Boolean));
  let unresolved = false;
  const out = line.replace(WORD_CHOICE, (word) => {
    const side = word.split("/").find((option) => said.has(normalizeAnswer(option)));
    if (!side) unresolved = true;
    return side ?? word;
  });
  return unresolved ? null : out;
}

/** A fill read as typed, then with umlaut spellings folded, as everywhere else. */
function withFoldedFill(
  given: string,
  expected: string,
  read: (given: string, expected: string) => string | null
): string | null {
  const plain = read(given, expected);
  if (plain) return plain;
  let found: string | null = null;
  withFoldedSpelling(given, expected, (g, e) => {
    found = read(g, e);
    return found !== null;
  });
  return found;
}

// ---------------------------------------------------------------------------
// Pacing, hints and moving on
// ---------------------------------------------------------------------------

/**
 * How long new text stays on screen before the conversation moves past it.
 *
 * A fixed pause was the same 1.4 seconds for "Sí." as for a correction, the
 * line it corrects, its English and their comeback, which is too long for one
 * and nowhere near long enough for the other. This is a slow reading pace for
 * somebody reading a language they are learning, with a floor so a one-word
 * reply still registers and a ceiling so nothing stalls a conversation.
 */
export const READ_FLOOR = 900;
export const READ_CEILING = 6000;
const MS_PER_CHARACTER = 42;

export function readingTime(...texts: (string | null | undefined)[]): number {
  const characters = texts.reduce((sum, text) => sum + (text?.trim().length ?? 0), 0);
  return Math.min(READ_CEILING, Math.max(READ_FLOOR, 300 + characters * MS_PER_CHARACTER));
}

/**
 * The nudge before the answer: what you want to say, in English.
 *
 * "I don't know" used to go straight to the line, which ends the attempt. Most
 * people who are stuck know the words and not which thing to say, and the
 * meaning of the line is enough to get them saying it themselves. Only the
 * authored English is used, and a beat whose line has none has no hint: the
 * next step is the line itself.
 */
export function hintFor(turn: ConvTurn): string[] | null {
  // Every way the beat was written, not just the first: "a small draft beer"
  // or "a beer" says there is a choice to make, and which one you pick decides
  // where the conversation goes. Three at most, so a hint stays a hint.
  const seen = new Set<string>();
  const options: string[] = [];
  for (const line of turn.yourLines) {
    const en = line.en?.trim();
    if (!en || seen.has(en.toLowerCase())) continue;
    seen.add(en.toLowerCase());
    options.push(en);
  }
  if (options.length === 0) return null;
  return options.slice(0, 3);
}

export interface FollowingConversation {
  conversation: Conversation;
  /** Same category: the next room of the same place, not somewhere new. */
  samePlace: boolean;
}

/**
 * Where a conversation leads once it is over.
 *
 * The next one written for the same place first, because the subsections of a
 * category are already the order a visit goes in: seated, ordering, a problem,
 * the bill. After the last one, the first conversation of the next place, so
 * finishing the restaurant walks you out into the hotel rather than back to a
 * menu. Content order throughout, and nothing after the very last one: a
 * conversation that wraps round to the airport would be a strange evening.
 */
export function followingConversation(
  conversations: Conversation[],
  id: string
): FollowingConversation | null {
  const index = conversations.findIndex((c) => c.id === id);
  if (index < 0) return null;
  const next = conversations[index + 1];
  if (!next) return null;
  return { conversation: next, samePlace: next.categoryId === conversations[index]!.categoryId };
}
