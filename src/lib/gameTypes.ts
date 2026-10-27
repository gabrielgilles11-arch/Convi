// Game Mode's client-safe half: the shapes the island receives, how the three
// options on a turn are chosen, how a run is scored, and what stays on the
// device.
//
// No content import. The island gets its scenes from GET /api/game, which
// resolves the scripts in ./gameScripts against content/*.json on the server
// (./gameScenes). Nothing here writes a line of the target language.

import { normalizeAnswer, shuffle, tooAlike } from "./quizTypes";
import { gradeReply, hasSlot, type ConvLine, type ConvTurn } from "./conversationTypes";
import type { SceneKind } from "./gameScripts";

export type { SceneKind } from "./gameScripts";

// ---------------------------------------------------------------------------
// Editions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// What /api/game sends
// ---------------------------------------------------------------------------

/** A sourced line, the same shape Talk uses. */
export type GameLine = ConvLine;

export interface GameOption {
  line: GameLine;
  /** The way locals say it, by the content's own notes. */
  local: boolean;
  /** What comes back, in order. */
  then: GameLine[];
  /** The node it leads to; null ends the scene. */
  next: string | null;
  /** The authored note on the exchange the line comes from, or "". */
  note: string;
}

export interface GameNode {
  id: string;
  /** They speak first. */
  npc: GameLine | null;
  /** Convi starts, and this says what Convi wants, in English. */
  cue: string | null;
  /** The question this node answers, when it was asked in the turn before. */
  asked: GameLine | null;
  /** The authored English moment behind the node. Used to keep wrong options wrong. */
  situation: string;
  /** Exchanges this node's lines come from; their other lines are never offered as wrong. */
  exchangeIds: string[];
  /** Subsections those exchanges sit in, so wrong options can come from the same room. */
  groups: string[];
  options: GameOption[];
}

export interface PlayableScene {
  id: string;
  kind: SceneKind;
  title: string;
  intro: string;
  start: string;
  nodes: Record<string, GameNode>;
}

/** A line Convi could say somewhere in the edition: the stock for wrong options. */
export interface PoolLine {
  line: GameLine;
  exchangeId: string;
  group: string;
  situation: string;
  /** Opens an exchange (a request or question) rather than answering one. */
  opens: boolean;
}

export interface GamePayload {
  scenes: PlayableScene[];
  locked: { kind: SceneKind; title: string }[];
  pool: PoolLine[];
}

// ---------------------------------------------------------------------------
// A, B or C
// ---------------------------------------------------------------------------

/**
 * Words that say nothing about what a line is for. Everything else counts as
 * meaning, including "thanks", "yes" and "no": a wrong answer that shares any
 * of those with a right one is dropped, which costs a few candidates and buys
 * never offering "No, thanks." against "Nothing else, thanks.".
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

/**
 * Whether a line is safe to offer as the wrong answer on this turn.
 *
 * A wrong option that is arguably right is the one thing a multiple choice
 * cannot have, so every test errs toward throwing a candidate away:
 *
 * - it must not pass the grader for any line the turn accepts;
 * - it must not be near-identical to one (`tooAlike`);
 * - it must not share a meaningful word with any accepted line, in English or
 *   in the language itself ("¿Aceptas tarjeta?" is too close to "Con
 *   tarjeta." to be wrong when you are asked how you are paying);
 * - and it must not share one with what was just said to you or the moment
 *   itself, which keeps "Do you take card?" away from "How do you want to
 *   pay?".
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

/** The node as the guards see it: a beat with an opener and accepted lines. */
function asTurn(node: GameNode): ConvTurn {
  return {
    id: node.id,
    situation: [node.situation, node.cue ?? ""].join(" "),
    theirOpener: node.npc ?? node.asked,
    yourLines: node.options.map((o) => o.line),
    theirReply: null,
    note: "",
  };
}

/**
 * Every line that could be offered as wrong on this node, best first.
 *
 * When somebody has just asked you something, the wrong answers are things
 * you would ask, never answers to their other questions: "Blonde." is a fair
 * reply to "What are you having?" even though it was written for "Lager or
 * amber?". When Convi is the one starting, any other line will do, because the
 * cue says what Convi wants and the others want something else.
 *
 * Lines written for the same place come first, so the wrong options sound
 * like they belong in the room.
 */
export function wrongPool(node: GameNode, pool: PoolLine[], scene?: PlayableScene): GameLine[] {
  const turn = asTurn(node);
  // A line the scene teaches as right somewhere is never marked wrong in it.
  const taught = new Set(
    scene
      ? Object.values(scene.nodes).flatMap((n) =>
          n.options.map((o) => normalizeAnswer(o.line.source))
        )
      : []
  );
  const theyAsked = turn.theirOpener !== null;
  const exchanges = new Set(node.exchangeIds);
  const groups = new Set(node.groups);
  const moment = situationWords(turn.situation);

  const seen = new Set<string>();
  const near: GameLine[] = [];
  const far: GameLine[] = [];

  for (const candidate of pool) {
    if (exchanges.has(candidate.exchangeId)) continue;
    if (theyAsked && !candidate.opens) continue;
    // A line with a blank in it is usually half an answer to something
    // ("I need to go to ___. Which line?" to "Where to?"), so never a wrong one.
    if (hasSlot(candidate.line.source)) continue;
    // A line written for an overlapping moment answers this one too well.
    if (shares(situationWords(candidate.situation), moment)) continue;
    const key = normalizeAnswer(candidate.line.source);
    if (seen.has(key) || taught.has(key)) continue;
    if (!safeDistractor(turn, candidate.line)) continue;
    seen.add(key);
    (groups.has(candidate.group) ? near : far).push(candidate.line);
  }

  return [...near, ...far];
}

export const CHOICES = 3;

export interface Choice {
  line: GameLine;
  /** The scripted option this is, or null for a wrong one. */
  option: GameOption | null;
}

/**
 * Three options for a node.
 *
 * Every scripted option is a fair thing to say, and a node can have up to
 * three of them (a caña, a beer, an iced coffee), which is a choice rather
 * than a test. Wrong options only fill the space that is left, so a turn where
 * there is one right thing to say has two wrong ones beside it, and a turn
 * where you are choosing what to drink may have none.
 */
export function buildNodeChoices(
  node: GameNode,
  pool: PoolLine[],
  random: () => number = Math.random,
  scene?: PlayableScene
): Choice[] {
  const valid = shuffleWith(node.options, random)
    .sort((x, y) => Number(y.local) - Number(x.local))
    .slice(0, CHOICES);
  const wrongNeeded = CHOICES - valid.length;

  const candidates = wrongPool(node, pool, scene);
  const head = shuffleWith(candidates.slice(0, 6), random);
  const ordered = [...head, ...candidates.slice(6)];

  const wrong: GameLine[] = [];
  for (const line of ordered) {
    if (wrong.length >= wrongNeeded) break;
    if (wrong.some((other) => tooAlike(other.source, line.source))) continue;
    wrong.push(line);
  }

  return shuffleWith(
    [
      ...valid.map((option) => ({ line: option.line, option })),
      ...wrong.map((line) => ({ line, option: null })),
    ],
    random
  );
}

/** The option a miss is corrected to: the local one where there is one. */
export function bestOption(node: GameNode): GameOption {
  return node.options.find((o) => o.local) ?? node.options[0]!;
}

/** What a typed answer counts as, against the node's scripted lines. */
export function gradeTyped(
  node: GameNode,
  given: string
): { option: GameOption; correct: boolean; close: boolean } {
  const verdict = gradeReply(
    given,
    node.options.map((o) => o.line)
  );
  const option = node.options.find((o) => o.line === verdict.line) ?? bestOption(node);
  // A miss is corrected to the line it came closest to when it was close, and
  // to the local line otherwise.
  return {
    option: verdict.correct || verdict.close ? option : bestOption(node),
    correct: verdict.correct,
    close: verdict.close,
  };
}

/** The longest run of turns a scene can take, for the progress line. */
export function longestPath(scene: PlayableScene): number {
  const memo = new Map<string, number>();
  const walk = (id: string | null, depth: number): number => {
    if (!id || depth > 20) return 0;
    if (memo.has(id)) return memo.get(id)!;
    const node = scene.nodes[id];
    if (!node) return 0;
    const best = 1 + Math.max(0, ...node.options.map((o) => walk(o.next, depth + 1)));
    memo.set(id, best);
    return best;
  };
  return walk(scene.start, 0);
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
/** Saying it the way locals do is the point of the whole product. */
export const LOCAL_MULTIPLIER = 1.5;
/** Typing the line is harder than spotting it, and pays like it. */
export const TYPED_MULTIPLIER = 2;
/** Each answer in a row adds half again, up to this many. */
export const MAX_COMBO_STEPS = 4;

/**
 * What one turn is worth.
 *
 * `combo` is how many turns in a row were right before this one. A hint
 * halves the turn, and a miss is worth nothing but never takes points away:
 * this is a conversation, and the next line is still worth having.
 */
export function pointsFor(
  correct: boolean,
  combo: number,
  mode: AnswerMode,
  hinted: boolean,
  local = false
): number {
  if (!correct) return 0;
  const streak = 1 + 0.5 * Math.min(Math.max(combo, 0), MAX_COMBO_STEPS);
  const typed = mode === "type" ? TYPED_MULTIPLIER : 1;
  const hint = hinted ? 0.5 : 1;
  const slang = local ? LOCAL_MULTIPLIER : 1;
  return Math.round(BASE_POINTS * streak * typed * hint * slang);
}

/** Stars for a finished scene, from the share of turns right first time. */
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

const STORAGE_KEY = "convi:game:v2";

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
