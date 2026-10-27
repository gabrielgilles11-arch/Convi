// Game Mode: Talk Mode played as a game, on the same authored conversations.
//
// Client-safe, like conversationTypes.ts: no content import. The island gets
// its conversations from GET /api/conversations, the same deck Talk walks.
//
// Nothing here writes a line of the target language. A scene is an authored
// subsection, the right answer is one of the lines its author wrote for that
// beat, and the wrong answers are lines the same author wrote for other beats.
// What this file adds is the choosing: which lines are safe to offer as wrong,
// how a run is scored, and what a finished scene is worth.

import { normalizeAnswer, shuffle, tooAlike } from "./quizTypes";
import { gradeReply, type Conversation, type ConvLine, type ConvTurn } from "./conversationTypes";

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

export type SceneKind = "taxi" | "bar" | "metro" | "cafe";

export interface SceneDef {
  kind: SceneKind;
  /**
   * The authored subsection the scene plays. Null where the edition has no
   * dialogue for the place yet: the tile shows as coming soon rather than the
   * game inventing a conversation to fill it.
   */
  subsectionId: string | null;
  title: string;
  /** One line to set the scene, in English. */
  intro: string;
}

export interface EditionInfo {
  country: string;
  /** Drawn, not an emoji: flag emoji render as two letters on Windows. */
  flag: "es" | "se" | "de";
}

export const EDITIONS: Record<string, EditionInfo> = {
  "es-ES": { country: "Spain", flag: "es" },
  "sv-SE": { country: "Sweden", flag: "se" },
  "de-DE": { country: "Germany", flag: "de" },
};

export function editionOf(locale: string): EditionInfo {
  return EDITIONS[locale] ?? EDITIONS["es-ES"]!;
}

const TAXI_INTRO = "Convi just landed with a heavy suitcase. Get from the airport to the hotel.";
const BAR_INTRO = "First night out. Convi walks up to the bar, thirsty.";
const METRO_INTRO = "Convi wants to see the city without a taxi this time.";
const CAFE_INTRO = "Morning after. Convi needs a coffee before anything else.";

/**
 * The game's four places, in the order a trip goes: land, go out, get about,
 * recover. Keyed by locale because the subsection ids carry a locale prefix
 * and Swedish calls its coffee break by its own name.
 */
export const GAME_SCENES: Record<string, SceneDef[]> = {
  "es-ES": [
    { kind: "taxi", subsectionId: "taxi", title: "Taxi from the airport", intro: TAXI_INTRO },
    { kind: "bar", subsectionId: "beer-food-main", title: "Ordering at the bar", intro: BAR_INTRO },
    { kind: "metro", subsectionId: "metro", title: "Taking the metro", intro: METRO_INTRO },
    { kind: "cafe", subsectionId: "beer-food-coffee", title: "Coffee shop", intro: CAFE_INTRO },
  ],
  "sv-SE": [
    {
      kind: "taxi",
      subsectionId: "sv-getting-around-taxi",
      title: "Taxi from the airport",
      intro: TAXI_INTRO,
    },
    {
      kind: "bar",
      subsectionId: "sv-beer-food-main",
      title: "Ordering at the bar",
      intro: BAR_INTRO,
    },
    {
      kind: "metro",
      subsectionId: "sv-getting-around-metro",
      title: "Taking the tunnelbana",
      intro: METRO_INTRO,
    },
    {
      kind: "cafe",
      subsectionId: "sv-beer-food-fika",
      title: "Fika at the café",
      intro: "Three o'clock in Stockholm, which means coffee and a bun.",
    },
  ],
  "de-DE": [
    {
      kind: "taxi",
      subsectionId: "de-getting-around-taxi",
      title: "Taxi from the airport",
      intro: TAXI_INTRO,
    },
    {
      kind: "bar",
      subsectionId: "de-beer-food-main",
      title: "Ordering at the bar",
      intro: BAR_INTRO,
    },
    {
      kind: "metro",
      subsectionId: "de-getting-around-metro",
      title: "Taking the U-Bahn",
      intro: METRO_INTRO,
    },
    // No German café dialogue has been written and sourced yet. The tile stays
    // locked until it is, rather than the game making one up.
    { kind: "cafe", subsectionId: null, title: "Coffee shop", intro: CAFE_INTRO },
  ],
};

export interface GameScene {
  def: SceneDef;
  /** Null when the scene has no authored conversation in this edition. */
  conversation: Conversation | null;
}

export function gameScenes(locale: string, conversations: Conversation[]): GameScene[] {
  const defs = GAME_SCENES[locale] ?? GAME_SCENES["es-ES"]!;
  return defs.map((def) => ({
    def,
    conversation: def.subsectionId
      ? (conversations.find((c) => c.id === def.subsectionId) ?? null)
      : null,
  }));
}

// ---------------------------------------------------------------------------
// A, B or C
// ---------------------------------------------------------------------------

/**
 * Words that say nothing about what a line is for. Everything else counts as
 * meaning, including "thanks", "yes" and "no": a wrong answer that shares any
 * of those with the right one is dropped, which costs a few candidates and
 * buys never offering "No, thanks." against "Nothing else, thanks.".
 */
const EN_GRAMMAR = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "and",
  "or",
  "i",
  "im",
  "you",
  "your",
  "youre",
  "we",
  "it",
  "its",
  "is",
  "are",
  "am",
  "be",
  "do",
  "does",
  "did",
  "can",
  "could",
  "would",
  "will",
  "shall",
  "should",
  "me",
  "my",
  "this",
  "that",
  "these",
  "those",
  "what",
  "how",
  "if",
  "there",
  "theyre",
  "they",
  "them",
  "s",
  "re",
  "ll",
  "ve",
  "d",
]);

/**
 * Words every situation is made of. Two moments are only "the same moment"
 * when they share something past these: "platform" in both, not "you want".
 */
const SITUATION_FILLER = new Set([
  "youre",
  "youve",
  "want",
  "know",
  "dont",
  "need",
  "someone",
  "but",
  "not",
  "which",
  "whether",
  "ask",
  "asks",
  "asked",
  "about",
  "before",
  "after",
  "just",
  "get",
  "got",
  "still",
  "one",
  "where",
  "from",
  "into",
  "out",
]);

function englishWords(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !EN_GRAMMAR.has(w))
    // The crudest stemmer there is, and enough: "platforms" and "platform"
    // are one word, and so are "stops" and "stop".
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
  return new Set(words);
}

function situationWords(text: string): Set<string> {
  return new Set([...englishWords(text)].filter((w) => !SITUATION_FILLER.has(w)));
}

/** Target-language words long enough to carry meaning on their own. */
function sourceWords(text: string): Set<string> {
  return new Set(
    normalizeAnswer(text)
      .split(" ")
      .filter((w) => w.length >= 4 && !/^_+$/.test(w))
  );
}

function shares(a: Set<string>, b: Set<string>): boolean {
  for (const word of a) if (b.has(word)) return true;
  return false;
}

/** A line somebody could say, and where it was written. */
interface Candidate {
  line: ConvLine;
  conversationId: string;
  turnId: string;
  /** The moment the line was written for. */
  situation: string;
  /** Opened a beat (a request or question) rather than answered one. */
  opens: boolean;
}

function candidatesFrom(conversations: Conversation[]): Candidate[] {
  const out: Candidate[] = [];
  for (const convo of conversations) {
    for (const turn of convo.turns) {
      const opens = turn.theirOpener === null;
      for (const line of turn.yourLines) {
        out.push({
          line,
          conversationId: convo.id,
          turnId: turn.id,
          situation: turn.situation,
          opens,
        });
      }
    }
  }
  return out;
}

/**
 * Whether a line is safe to offer as the wrong answer on this beat.
 *
 * A distractor that is arguably right is the one thing a multiple choice
 * cannot have, so every test here errs toward throwing a candidate away:
 *
 * - it must not pass the grader for any line the beat accepts;
 * - it must not be near-identical to one (`tooAlike`);
 * - it must not share a meaningful word with any accepted line, in English or
 *   in the language itself ("¿Aceptas tarjeta?" is too close to "Con
 *   tarjeta." to be wrong when you are asked how you are paying);
 * - and it must not share one with what was just said to you or the moment
 *   itself, which is what keeps "Do you take card?" away from "How do you want
 *   to pay?".
 */
export function safeDistractor(turn: ConvTurn, candidate: ConvLine): boolean {
  const accepted = turn.yourLines;
  if (accepted.some((line) => normalizeAnswer(line.source) === normalizeAnswer(candidate.source))) {
    return false;
  }
  if (gradeReply(candidate.source, accepted).correct) return false;
  if (accepted.some((line) => tooAlike(line.source, candidate.source))) return false;

  const candidateSource = sourceWords(candidate.source);
  if (accepted.some((line) => shares(candidateSource, sourceWords(line.source)))) return false;
  if (turn.theirOpener && shares(candidateSource, sourceWords(turn.theirOpener.source)))
    return false;

  const candidateEn = englishWords(candidate.en);
  // A line with no English cannot be checked for meaning, so it is not offered.
  if (candidateEn.size === 0) return false;
  for (const line of accepted) if (shares(candidateEn, englishWords(line.en))) return false;
  if (shares(candidateEn, englishWords(turn.theirOpener?.en))) return false;
  if (shares(candidateEn, englishWords(turn.situation))) return false;

  return true;
}

/**
 * Every line that could be offered as wrong on this beat, best first.
 *
 * When somebody has just asked you something, the wrong answers are things
 * you would ask, never answers to their other questions: "Blonde." is a fair
 * reply to "What are you having?" even though it was written for "Lager or
 * amber?". When you are the one speaking first, any other line will do,
 * because the moment says what you want and the others want something else.
 *
 * Lines from the same scene come first, so the wrong options sound like they
 * belong in the room. The other scenes in the edition are the reserve.
 */
export function distractorPool(
  turn: ConvTurn,
  conversation: Conversation,
  others: Conversation[]
): ConvLine[] {
  const theyAsked = turn.theirOpener !== null;
  const pool = candidatesFrom([conversation, ...others.filter((c) => c.id !== conversation.id)]);

  const seen = new Set<string>();
  const near: ConvLine[] = [];
  const far: ConvLine[] = [];

  for (const candidate of pool) {
    if (candidate.turnId === turn.id) continue;
    if (theyAsked && !candidate.opens) continue;
    // A line written for a moment that overlaps this one ("two platforms, which
    // one?" and "am I on the right platform?") answers it too well to be wrong.
    if (shares(situationWords(candidate.situation), situationWords(turn.situation))) continue;
    const key = normalizeAnswer(candidate.line.source);
    if (seen.has(key)) continue;
    if (!safeDistractor(turn, candidate.line)) continue;
    seen.add(key);
    (candidate.conversationId === conversation.id ? near : far).push(candidate.line);
  }

  return [...near, ...far];
}

export const CHOICES = 3;

export interface Choices {
  options: ConvLine[];
  /** Index of the authored line for this beat within `options`. */
  answer: number;
}

/**
 * Three options, one of them right.
 *
 * The right one is a random pick among the lines written for the beat, so a
 * replay offers the other way of saying it. The two wrong ones are drawn from
 * the front of the pool, which keeps them in the same room where it can, and
 * are checked against each other so the two wrong answers are not the same
 * wrong answer twice.
 */
export function buildChoices(
  turn: ConvTurn,
  conversation: Conversation,
  others: Conversation[],
  random: () => number = Math.random
): Choices {
  const right = turn.yourLines[Math.floor(random() * turn.yourLines.length)] ?? turn.yourLines[0]!;
  const pool = distractorPool(turn, conversation, others);

  // Shuffle within the near and far halves separately would need the split
  // back; a light shuffle of the first handful keeps "same room" first while
  // still varying which two appear.
  const head = shuffleWith(pool.slice(0, 6), random);
  const ordered = [...head, ...pool.slice(6)];

  const wrong: ConvLine[] = [];
  for (const line of ordered) {
    if (wrong.length >= CHOICES - 1) break;
    if (wrong.some((other) => tooAlike(other.source, line.source))) continue;
    wrong.push(line);
  }

  const options = shuffleWith([right, ...wrong], random);
  return { options, answer: options.indexOf(right) };
}

function shuffleWith<T>(items: T[], random: () => number): T[] {
  if (random === Math.random) return shuffle(items);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export type AnswerMode = "choice" | "type";

export const BASE_POINTS = 100;
/** Typing the line is harder than spotting it, and pays like it. */
export const TYPED_MULTIPLIER = 2;
/** Each answer in a row adds half again, up to this many. */
export const MAX_COMBO_STEPS = 4;

/**
 * What one beat is worth.
 *
 * `combo` is how many beats in a row were right before this one. A hint
 * halves the beat, and a miss is worth nothing but never takes points away:
 * this is a conversation, and the next line is still worth having.
 */
export function pointsFor(
  correct: boolean,
  combo: number,
  mode: AnswerMode,
  hinted: boolean
): number {
  if (!correct) return 0;
  const streak = 1 + 0.5 * Math.min(Math.max(combo, 0), MAX_COMBO_STEPS);
  const typed = mode === "type" ? TYPED_MULTIPLIER : 1;
  const hint = hinted ? 0.5 : 1;
  return Math.round(BASE_POINTS * streak * typed * hint);
}

/** Stars for a finished scene, from the share of beats right first time. */
export function starsFor(right: number, total: number): 1 | 2 | 3 {
  if (total <= 0) return 1;
  const share = right / total;
  if (share >= 0.85) return 3;
  if (share >= 0.6) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// What stays on the device
// ---------------------------------------------------------------------------

const STORAGE_KEY = "convi:game:v1";

export interface SceneBest {
  stars: number;
  score: number;
}

export interface GameSave {
  best: Record<string, SceneBest>;
  mode: AnswerMode;
}

function emptySave(): GameSave {
  return { best: {}, mode: "choice" };
}

/** Same rules as progress.ts: local only, and no storage means a fresh game. */
export function loadGame(): GameSave {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<GameSave>;
    return {
      best: parsed.best && typeof parsed.best === "object" ? parsed.best : {},
      mode: parsed.mode === "type" ? "type" : "choice",
    };
  } catch {
    return emptySave();
  }
}

function saveGame(save: GameSave): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Private mode: the stars last as long as the tab.
  }
}

export function saveAnswerMode(mode: AnswerMode): void {
  saveGame({ ...loadGame(), mode });
}

/** Keeps the better of the old and new result. Returns whether it beat it. */
export function recordSceneResult(sceneId: string, result: SceneBest): boolean {
  const save = loadGame();
  const old = save.best[sceneId];
  const better =
    !old || result.stars > old.stars || (result.stars === old.stars && result.score > old.score);
  if (better) {
    save.best[sceneId] = result;
    saveGame(save);
  }
  return better;
}

// ---------------------------------------------------------------------------
// Talk or Game
// ---------------------------------------------------------------------------

const TALK_STYLE_KEY = "convi:talk-style:v1";

export type TalkStyle = "talk" | "game";

export function loadTalkStyle(): TalkStyle {
  try {
    return window.localStorage.getItem(TALK_STYLE_KEY) === "game" ? "game" : "talk";
  } catch {
    return "talk";
  }
}

export function saveTalkStyle(style: TalkStyle): void {
  try {
    window.localStorage.setItem(TALK_STYLE_KEY, style);
  } catch {
    // Nothing to do; the toggle just resets next visit.
  }
}
