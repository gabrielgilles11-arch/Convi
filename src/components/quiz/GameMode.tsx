import { Fragment, useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import { readingTime } from "../../lib/conversationTypes";
import { SCENE_ORDER } from "../../lib/gameScripts";
import {
  bestOption,
  buildNodeChoices,
  editionOf,
  gradeTyped,
  loadGame,
  pointsFor,
  recordSceneResult,
  saveAnswerMode,
  starsFor,
  type AnswerMode,
  type Choice,
  type EditionInfo,
  type GameLine,
  type GameNode,
  type GameOption,
  type GamePayload,
  type GameSave,
  type PlayableScene,
  type PoolLine,
} from "../../lib/gameTypes";
import AudioButton from "./AudioButton";
import GameStage, { type Mood, type Speaker } from "./GameStage";
import { duckMusic, musicEnabled, setMusicEnabled, startMusic, stopMusic } from "./music";
import { playCorrect, playFanfare, playPop, playWrong } from "./sound";
import { prefetchClips, speak, stopSpeaking } from "./speech";

/**
 * Game Mode: Convi's trip, one short conversation per place.
 *
 * Each scene is a script (lib/gameScripts.ts) built from sourced lines: the
 * local talks first wherever a local would, Convi answers, and what Convi
 * picks decides what happens next. Order a caña and nobody asks "draft or
 * bottle?"; ask for an iced coffee and it just comes. English appears at the
 * start of a scene and when Convi has to be the one to speak, and otherwise
 * only when asked for, the same as Talk.
 *
 * The three options sit in Convi's thought cloud on the counter, inside the
 * picture. Where more than one line is a fair thing to say they are all on
 * offer, and the way locals say it is worth more. A miss is never a dead end:
 * Convi says the local line anyway and the conversation carries on.
 */

interface Props {
  locale: string;
  onBack: () => void;
}

export default function GameMode({ locale, onBack }: Props) {
  const edition = editionOf(locale);

  const [payload, setPayload] = useState<GamePayload | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/game?locale=${encodeURIComponent(locale)}`)
      .then(async (res) => {
        if (res.status === 403)
          throw new Error("This practice content needs a purchase to unlock.");
        if (!res.ok) throw new Error("Couldn't load Game Mode.");
        return (await res.json()) as GamePayload;
      })
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Read after mount: localStorage has no server-side view.
  const [save, setSave] = useState<GameSave>({ best: {}, mode: "choice" });
  const [mode, setMode] = useState<AnswerMode>("choice");
  useEffect(() => {
    const loaded = loadGame();
    setSave(loaded);
    setMode(loaded.mode);
  }, []);

  const [sceneId, setSceneId] = useState<string | null>(null);
  /** Bumped to restart a scene from scratch. */
  const [run, setRun] = useState(0);

  // Leaving Game Mode altogether takes the music with it.
  useEffect(() => () => stopMusic(), []);

  function chooseMode(next: AnswerMode) {
    setMode(next);
    saveAnswerMode(next);
  }

  const tiles = useMemo(() => {
    if (!payload) return [];
    const open = payload.scenes.map((scene) => ({ kind: scene.kind, title: scene.title, scene }));
    const locked = payload.locked.map((l) => ({ kind: l.kind, title: l.title, scene: null }));
    return [...open, ...locked].sort(
      (x, y) => SCENE_ORDER.indexOf(x.kind) - SCENE_ORDER.indexOf(y.kind)
    );
  }, [payload]);

  if (error) return <p className="quiz-error">{error}</p>;
  if (!payload) return <p className="quiz-loading">Loading Game Mode...</p>;

  const scenes = payload.scenes;
  const current = sceneId ? scenes.find((s) => s.id === sceneId) : null;

  if (current) {
    const index = scenes.indexOf(current);
    const next = scenes[index + 1] ?? null;
    return (
      <ScenePlay
        key={`${current.id}-${run}`}
        scene={current}
        sceneNumber={tiles.findIndex((t) => t.scene === current) + 1}
        pool={payload.pool}
        edition={edition}
        locale={locale}
        mode={mode}
        onMode={chooseMode}
        onExit={() => {
          stopSpeaking();
          stopMusic();
          setSave(loadGame());
          setSceneId(null);
        }}
        onReplay={() => setRun((r) => r + 1)}
        nextTitle={next?.title ?? null}
        onNext={() => {
          if (next) {
            setSceneId(next.id);
            setRun((r) => r + 1);
          }
        }}
        onComplete={(score, stars) => {
          recordSceneResult(current.id, { score, stars });
          setSave(loadGame());
        }}
      />
    );
  }

  return (
    <div className="game">
      <p className="stage-line">
        <button type="button" className="stage-jump" onClick={onBack}>
          Back to the path
        </button>
        <span>Game Mode</span>
      </p>

      {/* Two sentences, the way Talk Mode introduces itself. */}
      <p className="convo-intro">
        Pick a place and play Convi's side of the conversation in {edition.country}. They talk, you
        choose what Convi says, and saying it like a local scores more.
      </p>

      <AnswerModeToggle mode={mode} onChange={chooseMode} />

      <ul className="game-scenes">
        {tiles.map((tile, i) => {
          const best = tile.scene ? save.best[tile.scene.id] : undefined;
          const locked = !tile.scene;
          return (
            <li key={tile.kind}>
              <button
                type="button"
                className={`game-scene-card${locked ? " is-locked" : ""}`}
                disabled={locked}
                onClick={() => {
                  if (!tile.scene) return;
                  setSceneId(tile.scene.id);
                  setRun((r) => r + 1);
                }}
                aria-label={
                  locked
                    ? `${tile.title}, coming soon`
                    : `${tile.title}${best ? `, best ${best.stars} of 3 stars` : ""}`
                }
              >
                <span className="game-scene-thumb" aria-hidden="true">
                  <GameStage kind={tile.kind} edition={edition} talking={null} mood="idle" />
                </span>
                <span className="game-scene-body">
                  <span className="game-scene-step">Scene {i + 1}</span>
                  <span className="game-scene-title">{tile.title}</span>
                  {locked ? (
                    <span className="game-scene-meta">Coming soon</span>
                  ) : (
                    <span className="game-scene-meta">
                      <Stars count={best?.stars ?? 0} />
                      <span>
                        {best ? `${best.score.toLocaleString("en-US")} pts` : "Not played yet"}
                      </span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AnswerModeToggle({
  mode,
  onChange,
  compact = false,
}: {
  mode: AnswerMode;
  onChange: (m: AnswerMode) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`game-answer-toggle${compact ? " is-compact" : ""}`}
      role="group"
      aria-label="How you answer"
    >
      <button type="button" aria-pressed={mode === "choice"} onClick={() => onChange("choice")}>
        {compact ? "A B C" : "Pick A, B or C"}
      </button>
      <button type="button" aria-pressed={mode === "type"} onClick={() => onChange("type")}>
        Type it{!compact && <span className="game-x2">2x pts</span>}
      </button>
    </div>
  );
}

function Stars({ count, big = false }: { count: number; big?: boolean }) {
  return (
    <span className={`game-stars${big ? " is-big" : ""}`} aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <svg key={n} viewBox="0 0 24 24" aria-hidden="true" className={n <= count ? "is-on" : ""}>
          <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * A line with its blanks drawn as blanks.
 *
 * "A la calle __, número __" and "Det blir [BELOPP] kronor" are authored with
 * a slot where the street or the amount goes. Shown raw, the brackets read as
 * a typo; drawn as a blank, they read as the gap they are.
 */
const SLOT_SPLIT = /(_{2,}|\[[^\]]+\])/;
const IS_SLOT = /^(_{2,}|\[[^\]]+\])$/;
function Said({ text }: { text: string }) {
  return (
    <>
      {text
        .split(SLOT_SPLIT)
        .map((part, i) =>
          IS_SLOT.test(part) ? (
            <span key={i} className="game-slot" aria-label="blank" />
          ) : (
            <Fragment key={i}>{part}</Fragment>
          )
        )}
    </>
  );
}

function MusicButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="game-music-toggle"
      aria-pressed={on}
      title={on ? "Music on" : "Music off"}
      onClick={onToggle}
    >
      <span className="sr-only">{on ? "Turn music off" : "Turn music on"}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M9 17.5V6.2l10-2.2v11.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="6.5" cy="17.5" r="2.6" fill="currentColor" />
        <circle cx="16.5" cy="15.3" r="2.6" fill="currentColor" />
        {!on && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// One scene
// ---------------------------------------------------------------------------

type Phase = "intro" | "their" | "ask" | "answered" | "done";

/** How a turn was settled: picked or typed, or the line was asked for. */
type Settled = "answered" | "revealed";

interface Bubble {
  who: "convi" | "local";
  /** Null is Convi thinking: it is Convi's turn to start. */
  line: GameLine | null;
}

interface Verdict {
  how: Settled;
  correct: boolean;
  close: boolean;
  /** The scripted option the conversation follows: what Convi ends up saying. */
  option: GameOption;
  points: number;
}

const RIGHT_WORDS = ["Nailed it.", "Smooth.", "That's the one.", "Spot on.", "Nice."];

/** Talk Mode's own words for a correction, so the two modes read as one. */
function correctionHead(verdict: Verdict): string {
  if (verdict.how === "revealed") return "Here's the line:";
  return verdict.close ? "Almost. It goes like this:" : "Not quite. Here's the line:";
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * The rhythm of a turn: a beat before Convi speaks, a beat between lines, and a
 * pause after the last one before the next turn starts on its own. Kept short,
 * because a conversation that waits on itself stops feeling like one; the
 * voices take the time they take, and these are only the gaps between them.
 */
const BEFORE_CONVI = 150;
const BETWEEN_LINES = 120;
const SETTLE_PAUSE = 500;

interface PlayProps {
  scene: PlayableScene;
  sceneNumber: number;
  pool: PoolLine[];
  edition: EditionInfo;
  locale: string;
  mode: AnswerMode;
  onMode: (m: AnswerMode) => void;
  onExit: () => void;
  onReplay: () => void;
  onNext: () => void;
  nextTitle: string | null;
  onComplete: (score: number, stars: number) => void;
}

function ScenePlay({
  scene,
  sceneNumber,
  pool,
  edition,
  locale,
  mode,
  onMode,
  onExit,
  onReplay,
  onNext,
  nextTitle,
  onComplete,
}: PlayProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [nodeId, setNodeId] = useState(scene.start);
  const [turn, setTurn] = useState(0);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hinted, setHinted] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [right, setRight] = useState(0);
  const [locals, setLocals] = useState(0);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [showEn, setShowEn] = useState(false);
  const [talking, setTalking] = useState<Speaker>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [float, setFloat] = useState<{ key: number; value: number; local: boolean } | null>(null);
  const [stars, setStars] = useState(0);
  /** Off by default, as in Talk: tap a line for its meaning, or turn this on. */
  const [english, setEnglish] = useState(false);
  const [music, setMusic] = useState(false);

  /** Every sequence checks this before each step, so leaving or skipping ahead stops it. */
  const token = useRef(0);
  /**
   * The turn already settled, by token. State is a frame behind a fast double
   * tap, so two taps on two options could both see the turn as open; this
   * ref cannot be.
   */
  const settledAt = useRef(-1);
  /** The running totals, for code that runs after an await and so sees old state. */
  const tally = useRef({ score: 0, right: 0, turn: 0 });
  const nextButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const node: GameNode = scene.nodes[nodeId]!;

  useEffect(() => {
    setMusic(musicEnabled());
    const ids = Object.values(scene.nodes).flatMap((n) => [
      n.npc?.audioId ?? null,
      ...n.options.flatMap((o) => [o.line.audioId, ...o.then.map((l) => l.audioId)]),
    ]);
    void prefetchClips(locale, ids);
    return () => {
      token.current++;
      stopSpeaking();
      duckMusic(false);
    };
  }, [locale, scene]);

  // The music dips whenever anybody is talking.
  useEffect(() => {
    duckMusic(talking !== null);
  }, [talking]);

  async function say(who: "convi" | "local", line: GameLine, mine: number) {
    setTalking(who);
    const spoke = await speak(locale, line.audioId, line.source, "practice", { untilDone: true });
    // No voice on this device: keep the mouth moving long enough to read.
    if (!spoke) await wait(Math.min(2200, readingTime(line.source)));
    if (mine === token.current) setTalking(null);
  }

  function startNode(id: string, number: number) {
    const mine = ++token.current;
    const n = scene.nodes[id]!;
    tally.current.turn = number;
    setNodeId(id);
    setTurn(number);
    setPicked(null);
    setTyped("");
    setVerdict(null);
    setHinted(false);
    setMood("idle");
    setShowEn(false);
    setChoices(buildNodeChoices(n, pool, Math.random, scene));

    if (n.npc) {
      setBubble({ who: "local", line: n.npc });
      setPhase("their");
      playPop();
      void say("local", n.npc, mine).then(() => {
        if (mine === token.current) setPhase((p) => (p === "their" ? "ask" : p));
      });
      // A quick reader is not held up by a slow clip.
      void wait(900).then(() => {
        if (mine === token.current) setPhase((p) => (p === "their" ? "ask" : p));
      });
    } else if (n.asked) {
      // They have just asked it, at the end of the last turn: answer now.
      setBubble({ who: "local", line: n.asked });
      setTalking(null);
      setPhase("ask");
    } else {
      setBubble({ who: "convi", line: null });
      setTalking(null);
      setPhase("ask");
    }
  }

  function begin() {
    startMusic(edition.flag);
    setMusic(musicEnabled());
    startNode(scene.start, 1);
  }

  // Keep the cursor in the box between turns when typing.
  useEffect(() => {
    if (phase === "ask" && mode === "type") input.current?.focus({ preventScroll: true });
    if (phase === "answered") nextButton.current?.focus({ preventScroll: true });
  }, [phase, mode, nodeId]);

  function settle(how: Settled, correct: boolean, close: boolean, option: GameOption) {
    if (phase !== "ask" || settledAt.current === token.current) return;
    const mine = ++token.current;
    settledAt.current = mine;
    stopSpeaking();

    const local = correct && option.local;
    const points = pointsFor(correct, combo, mode, hinted, local);
    tally.current.score += points;
    if (correct) tally.current.right += 1;
    setVerdict({ how, correct, close, option, points });
    setPhase("answered");
    setScore(tally.current.score);
    setRight(tally.current.right);
    setCombo((c) => (correct ? c + 1 : 0));
    if (local) setLocals((l) => l + 1);
    setMood(correct ? "happy" : "oops");
    if (correct) playCorrect();
    else playWrong();
    if (points) setFloat({ key: Date.now(), value: points, local });

    setBubble({ who: "convi", line: option.line });
    setShowEn(false);

    void (async () => {
      await wait(BEFORE_CONVI);
      if (mine !== token.current) return;
      await say("convi", option.line, mine);
      if (mine !== token.current) return;
      setMood("idle");
      for (const line of option.then) {
        await wait(BETWEEN_LINES);
        if (mine !== token.current) return;
        setBubble({ who: "local", line });
        playPop();
        await say("local", line, mine);
        if (mine !== token.current) return;
      }
      // A right answer keeps the conversation moving on its own, the way a
      // conversation does. A miss waits, so the correction can be read.
      if (correct) {
        await wait(SETTLE_PAUSE);
        if (mine === token.current) advance(option);
      }
    })();
  }

  function pick(i: number) {
    if (phase !== "ask" || settledAt.current === token.current) return;
    const choice = choices[i];
    if (!choice) return;
    setPicked(i);
    if (choice.option) settle("answered", true, false, choice.option);
    else settle("answered", false, false, bestOption(node));
  }

  function submitTyped(event: SubmitEvent) {
    event.preventDefault();
    const given = typed.trim();
    if (!given) return;
    const result = gradeTyped(node, given);
    settle("answered", result.correct, result.close, result.option);
  }

  function advance(option: GameOption) {
    stopSpeaking();
    if (option.next && scene.nodes[option.next]) {
      startNode(option.next, tally.current.turn + 1);
      return;
    }
    finish();
  }

  function finish() {
    token.current++;
    const earned = starsFor(tally.current.right, tally.current.turn);
    setStars(earned);
    setBubble(null);
    setTalking(null);
    setMood("happy");
    setPhase("done");
    playFanfare();
    onComplete(tally.current.score, earned);
  }

  function toggleMusic() {
    const on = !music;
    setMusic(on);
    setMusicEnabled(on);
    if (on && phase !== "intro") startMusic(edition.flag);
  }

  // 1, 2, 3 or A, B, C to answer; the Next button has focus after that.
  useEffect(() => {
    if (mode !== "choice" || phase !== "ask") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      const i = ["1", "2", "3"].includes(k) ? Number(k) - 1 : ["a", "b", "c"].indexOf(k);
      if (i >= 0 && i < choices.length) {
        e.preventDefault();
        pick(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // As in Talk, nobody answers over somebody still talking.
  const answering = phase === "ask";
  const asked = node.npc ?? node.asked;
  const fallback = bestOption(node).line.en;
  const hint = asked
    ? asked.en
      ? { label: "They asked", text: asked.en }
      : null
    : fallback
      ? { label: "You want to say", text: fallback }
      : null;

  let cloud;
  if (phase === "intro") {
    cloud = (
      <div className="game-cloud is-card">
        <span className="game-card-kicker">
          Scene {sceneNumber} · {edition.country}
        </span>
        <strong className="game-card-title">{scene.title}</strong>
        <span className="game-card-text">{scene.intro}</span>
        <button type="button" className="game-primary" onClick={begin}>
          Start
        </button>
      </div>
    );
  } else if (phase === "done") {
    cloud = (
      <div className="game-cloud is-card is-done">
        <strong className="game-card-title">Sound like a local in {edition.country}</strong>
        <Stars count={stars} big />
        <span className="game-card-score">{score.toLocaleString("en-US")} pts</span>
        <span className="game-card-text">
          {right} / {turn} lines landed
          {locals > 0 && `, ${locals} said like a local`}
        </span>
        <span className="game-card-actions">
          {nextTitle && (
            <button type="button" className="game-primary" onClick={onNext}>
              Keep going: {nextTitle}
            </button>
          )}
          <button type="button" className="game-secondary" onClick={onReplay}>
            Run it again
          </button>
          <button type="button" className="game-secondary" onClick={onExit}>
            Somewhere else
          </button>
        </span>
      </div>
    );
  } else {
    cloud = (
      <div className="game-cloud">
        {node.cue && !verdict && <p className="game-cue">{node.cue}</p>}
        {!verdict && (
          <p className="game-ask">{answering ? "What does Convi say?" : "They're talking…"}</p>
        )}
        {answering && hinted && hint && (
          <p className="convo-hint game-hint-text">
            <span className="convo-hint-label">{hint.label}</span>
            {hint.text}
          </p>
        )}

        {mode === "choice" && (
          <ol className="game-options">
            {choices.map((choice, i) => {
              let state = "";
              if (verdict) {
                if (i === picked && !choice.option) state = " is-wrong";
                else if (choice.option && (i === picked || choice.option === verdict.option))
                  state = " is-right";
                else state = " is-out";
              }
              return (
                <li key={choice.line.source}>
                  <button
                    type="button"
                    className={`game-option${state}`}
                    onClick={() => pick(i)}
                    disabled={!answering}
                  >
                    <span className="game-option-key" aria-hidden="true">
                      {"ABC"[i]}
                    </span>
                    <span className="game-option-text">
                      <span lang={locale}>
                        <Said text={choice.line.source} />
                      </span>
                      {verdict && english && choice.line.en && (
                        <span className="game-option-en">{choice.line.en}</span>
                      )}
                    </span>
                    {verdict && choice.option?.local && (
                      <span className="game-local-tag">Local</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {mode === "type" && !verdict && (
          <form className="game-type" onSubmit={submitTyped}>
            <input
              ref={input}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={!answering}
              placeholder={answering ? "Type what you'd say…" : "They're talking…"}
              aria-label="Your reply, in the language you're learning"
              autoComplete="off"
              autoCapitalize="sentences"
              spellCheck={false}
              lang={locale}
            />
            <button type="submit" className="game-primary" disabled={!answering || !typed.trim()}>
              Say it
            </button>
          </form>
        )}

        {/* Talk Mode's way out, in the same two steps: the meaning first,
            and (when typing) the line itself only after that. */}
        {answering && (
          <div className="convo-help game-help">
            {hint && !hinted ? (
              <button type="button" className="convo-stuck" onClick={() => setHinted(true)}>
                Stuck? Get a hint
              </button>
            ) : mode === "type" ? (
              <button
                type="button"
                className="convo-stuck"
                onClick={() => settle("revealed", false, false, bestOption(node))}
              >
                Show me the line
              </button>
            ) : null}
          </div>
        )}

        {verdict && (
          <div className={`game-verdict${verdict.correct ? " is-right" : ""}`} role="status">
            <strong>
              {verdict.correct
                ? verdict.option.local
                  ? "Like a local."
                  : RIGHT_WORDS[turn % RIGHT_WORDS.length]
                : correctionHead(verdict)}
              {verdict.points > 0 && ` +${verdict.points}`}
            </strong>
            {/* Both languages, always, as in Talk's correction: the line,
                then what it means. */}
            {!verdict.correct && (
              <span className="game-correction">
                <span className="game-correction-line">
                  <em lang={locale}>
                    <Said text={verdict.option.line.source} />
                  </em>
                  <AudioButton
                    locale={locale}
                    audioId={verdict.option.line.audioId}
                    text={verdict.option.line.source}
                    surface="practice"
                  />
                </span>
                {verdict.option.line.en && (
                  <span className="game-correction-en">{verdict.option.line.en}</span>
                )}
              </span>
            )}
            {verdict.option.local && verdict.option.note && (
              <span className="game-note">{verdict.option.note}</span>
            )}
            <button
              ref={nextButton}
              type="button"
              className="game-primary"
              onClick={() => advance(verdict.option)}
            >
              {verdict.option.next ? "Next" : "See results"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="game game-play">
      <p className="stage-line">
        <button type="button" className="stage-jump" onClick={onExit}>
          All places
        </button>
        <span>{scene.title}</span>
        <span className="game-line-tools">
          <MusicButton on={music} onToggle={toggleMusic} />
          <button
            type="button"
            className="convo-english-toggle"
            aria-pressed={english}
            onClick={() => setEnglish((on) => !on)}
          >
            {english ? "Hide English" : "Show English"}
          </button>
        </span>
      </p>

      <GameStage
        kind={scene.kind}
        edition={edition}
        talking={talking}
        mood={mood}
        floor={
          <>
            {cloud}
            {phase !== "intro" && phase !== "done" && (
              <div className="game-hud">
                <span className="game-turn">Turn {turn}</span>
                {combo >= 2 && (
                  <span className="game-combo" aria-label={`${combo} in a row`}>
                    {combo} in a row
                  </span>
                )}
                <span className="game-score">{score.toLocaleString("en-US")} pts</span>
                <AnswerModeToggle mode={mode} onChange={onMode} compact />
              </div>
            )}
          </>
        }
      >
        {bubble && phase !== "intro" && phase !== "done" && (
          <button
            type="button"
            key={`${bubble.who}-${bubble.line?.source ?? "think"}-${nodeId}`}
            className={`game-bubble is-${bubble.who}${bubble.line ? "" : " is-thinking"}`}
            onClick={() => bubble.line?.en && setShowEn((v) => !v)}
            aria-label={bubble.line ? undefined : "Convi is thinking"}
            disabled={!bubble.line?.en}
          >
            {bubble.line ? (
              <>
                <span className="game-bubble-line" lang={locale}>
                  <Said text={bubble.line.source} />
                </span>
                {(showEn || english) && bubble.line.en && (
                  <span className="game-bubble-en">{bubble.line.en}</span>
                )}
              </>
            ) : (
              <span className="game-bubble-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
          </button>
        )}

        {float && (
          <span
            key={float.key}
            className={`game-float${float.local ? " is-local" : ""}`}
            aria-hidden="true"
          >
            +{float.value}
            {float.local && <small>local</small>}
          </span>
        )}
      </GameStage>
    </div>
  );
}
