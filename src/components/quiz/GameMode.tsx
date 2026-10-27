import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import {
  gradeReply,
  hintFor,
  readingTime,
  type Conversation,
  type ConvLine,
} from "../../lib/conversationTypes";
import {
  buildChoices,
  editionOf,
  gameScenes,
  loadGame,
  pointsFor,
  recordSceneResult,
  saveAnswerMode,
  starsFor,
  type AnswerMode,
  type Choices,
  type EditionInfo,
  type GameSave,
  type GameScene,
} from "../../lib/gameTypes";
import GameStage, { type Mood, type Speaker } from "./GameStage";
import { playCorrect, playFanfare, playPop, playWrong } from "./sound";
import { prefetchClips, speak, stopSpeaking } from "./speech";

/**
 * Game Mode: Talk Mode played as Convi's trip.
 *
 * Same conversations, same authored lines, a different way in. The local
 * speaks first in their own language, the screen asks what Convi says next,
 * and you either pick it from three or type it. The right answer is always a
 * line somebody wrote for that moment; the two wrong ones are lines written
 * for other moments (see `buildChoices` for how they are kept honestly wrong).
 *
 * A miss is never a dead end, for the same reason as in Talk: Convi says the
 * right line anyway, the local answers it, and the scene carries on. Points
 * and stars are the only thing a miss costs.
 */

interface Props {
  conversations: Conversation[];
  locale: string;
  onBack: () => void;
  /** A scene played to its end counts as the conversation held. */
  onFinish: (conversationId: string) => void;
}

export default function GameMode({ conversations, locale, onBack, onFinish }: Props) {
  const edition = editionOf(locale);
  const scenes = useMemo(() => gameScenes(locale, conversations), [locale, conversations]);
  const playable = useMemo(
    () => scenes.flatMap((s) => (s.conversation ? [s.conversation] : [])),
    [scenes],
  );

  // Read after mount: localStorage has no server-side view.
  const [save, setSave] = useState<GameSave>({ best: {}, mode: "choice" });
  const [mode, setMode] = useState<AnswerMode>("choice");
  useEffect(() => {
    const loaded = loadGame();
    setSave(loaded);
    setMode(loaded.mode);
  }, []);

  const [sceneIndex, setSceneIndex] = useState<number | null>(null);
  /** Bumped to restart the same scene from scratch. */
  const [run, setRun] = useState(0);

  function chooseMode(next: AnswerMode) {
    setMode(next);
    saveAnswerMode(next);
  }

  const current = sceneIndex === null ? null : scenes[sceneIndex];
  if (current?.conversation) {
    const nextIndex = scenes.findIndex((s, i) => i > sceneIndex! && s.conversation);
    return (
      <ScenePlay
        key={`${current.conversation.id}-${run}`}
        scene={current}
        conversation={current.conversation}
        edition={edition}
        locale={locale}
        playable={playable}
        mode={mode}
        onMode={chooseMode}
        onExit={() => {
          stopSpeaking();
          setSave(loadGame());
          setSceneIndex(null);
        }}
        onReplay={() => setRun((r) => r + 1)}
        nextTitle={nextIndex >= 0 ? scenes[nextIndex]!.def.title : null}
        onNext={() => {
          if (nextIndex >= 0) {
            setSceneIndex(nextIndex);
            setRun((r) => r + 1);
          }
        }}
        onComplete={(score, stars) => {
          recordSceneResult(current.conversation!.id, { score, stars });
          setSave(loadGame());
          onFinish(current.conversation!.id);
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

      <p className="convo-intro">
        Travel through {edition.country} with Convi. The locals talk, you decide what Convi says
        next. Get it right in a row for bonus points.
      </p>

      <AnswerModeToggle mode={mode} onChange={chooseMode} />

      <ul className="game-scenes">
        {scenes.map((scene, i) => {
          const best = scene.conversation ? save.best[scene.conversation.id] : undefined;
          const locked = !scene.conversation;
          return (
            <li key={scene.def.kind}>
              <button
                type="button"
                className={`game-scene-card${locked ? " is-locked" : ""}`}
                disabled={locked}
                onClick={() => {
                  setSceneIndex(i);
                  setRun((r) => r + 1);
                }}
                aria-label={
                  locked
                    ? `${scene.def.title}, coming soon`
                    : `${scene.def.title}${best ? `, best ${best.stars} of 3 stars` : ""}`
                }
              >
                <span className="game-scene-thumb" aria-hidden="true">
                  <GameStage kind={scene.def.kind} edition={edition} talking={null} mood="idle" />
                </span>
                <span className="game-scene-body">
                  <span className="game-scene-step">Scene {i + 1}</span>
                  <span className="game-scene-title">{scene.def.title}</span>
                  {locked ? (
                    <span className="game-scene-meta">Coming soon</span>
                  ) : (
                    <span className="game-scene-meta">
                      <Stars count={best?.stars ?? 0} />
                      {best ? (
                        <span>{best.score.toLocaleString("en-US")} pts</span>
                      ) : (
                        <span>Not played</span>
                      )}
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
}: {
  mode: AnswerMode;
  onChange: (m: AnswerMode) => void;
}) {
  return (
    <div className="game-answer-toggle" role="group" aria-label="How you answer">
      <button type="button" aria-pressed={mode === "choice"} onClick={() => onChange("choice")}>
        Pick A, B or C
      </button>
      <button type="button" aria-pressed={mode === "type"} onClick={() => onChange("type")}>
        Type it <span className="game-x2">2x pts</span>
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

// ---------------------------------------------------------------------------
// One scene
// ---------------------------------------------------------------------------

type Phase = "intro" | "their" | "ask" | "answered" | "done";

interface Bubble {
  who: "convi" | "local";
  /** Null is Convi thinking: the beat is theirs to open. */
  line: ConvLine | null;
}

interface Verdict {
  correct: boolean;
  close: boolean;
  /** The authored line Convi ends up saying. */
  line: ConvLine;
  /** What was picked or typed, where it differs from `line`. */
  given: string | null;
  points: number;
}

const RIGHT_WORDS = ["Nailed it.", "Sounds local.", "Smooth.", "That's the one.", "Spot on."];

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

interface PlayProps {
  scene: GameScene;
  conversation: Conversation;
  edition: EditionInfo;
  locale: string;
  playable: Conversation[];
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
  conversation,
  edition,
  locale,
  playable,
  mode,
  onMode,
  onExit,
  onReplay,
  onNext,
  nextTitle,
  onComplete,
}: PlayProps) {
  const turns = conversation.turns;

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<Choices | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hinted, setHinted] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [right, setRight] = useState(0);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [showEn, setShowEn] = useState(false);
  const [talking, setTalking] = useState<Speaker>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [float, setFloat] = useState<{ key: number; value: number } | null>(null);
  const [stars, setStars] = useState(0);

  /** Every sequence checks this before each step, so leaving or skipping ahead stops it. */
  const token = useRef(0);
  const nextButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const turn = turns[index]!;

  useEffect(() => {
    void prefetchClips(
      locale,
      turns.flatMap((t) => [
        t.theirOpener?.audioId ?? null,
        t.theirReply?.audioId ?? null,
        ...t.yourLines.map((l) => l.audioId),
      ]),
    );
    return () => {
      token.current++;
      stopSpeaking();
    };
  }, [locale, turns]);

  async function say(who: "convi" | "local", line: ConvLine, mine: number) {
    setTalking(who);
    const spoke = await speak(locale, line.audioId, line.source, "practice", { untilDone: true });
    // No voice on this device: keep the mouth moving long enough to read.
    if (!spoke) await wait(Math.min(2200, readingTime(line.source)));
    if (mine === token.current) setTalking(null);
  }

  function startTurn(i: number) {
    const mine = ++token.current;
    const t = turns[i]!;
    setIndex(i);
    setPicked(null);
    setTyped("");
    setVerdict(null);
    setHinted(false);
    setMood("idle");
    setShowEn(false);
    setChoices(buildChoices(t, conversation, playable));

    if (t.theirOpener) {
      setBubble({ who: "local", line: t.theirOpener });
      setPhase("their");
      playPop();
      void say("local", t.theirOpener, mine).then(() => {
        if (mine === token.current) setPhase((p) => (p === "their" ? "ask" : p));
      });
      // The options do not wait for the voice to finish: a quick reader should
      // not be held up by a slow clip.
      void wait(900).then(() => {
        if (mine === token.current) setPhase((p) => (p === "their" ? "ask" : p));
      });
    } else {
      setBubble({ who: "convi", line: null });
      setTalking(null);
      setPhase("ask");
    }
  }

  // Keep the cursor in the box between beats when typing.
  useEffect(() => {
    if (phase === "ask" && mode === "type") input.current?.focus();
    if (phase === "answered") nextButton.current?.focus({ preventScroll: true });
  }, [phase, mode, index]);

  function settle(correct: boolean, close: boolean, line: ConvLine, given: string | null) {
    if (phase !== "ask" && phase !== "their") return;
    const mine = ++token.current;
    stopSpeaking();

    const points = pointsFor(correct, combo, mode, hinted);
    setVerdict({ correct, close, line, given, points });
    setPhase("answered");
    setScore((s) => s + points);
    setCombo((c) => (correct ? c + 1 : 0));
    if (correct) setRight((r) => r + 1);
    setMood(correct ? "happy" : "oops");
    if (correct) playCorrect();
    else playWrong();
    if (points) setFloat({ key: Date.now(), value: points });

    setBubble({ who: "convi", line });
    setShowEn(false);

    void (async () => {
      await wait(380);
      if (mine !== token.current) return;
      await say("convi", line, mine);
      if (mine !== token.current) return;
      setMood("idle");
      const reply = turn.theirReply;
      if (reply) {
        await wait(250);
        if (mine !== token.current) return;
        setBubble({ who: "local", line: reply });
        playPop();
        await say("local", reply, mine);
      }
    })();
  }

  function pick(i: number) {
    if (!choices || (phase !== "ask" && phase !== "their")) return;
    setPicked(i);
    const option = choices.options[i]!;
    const correct = i === choices.answer;
    settle(
      correct,
      false,
      correct ? option : choices.options[choices.answer]!,
      correct ? null : option.source,
    );
  }

  function submitTyped(event: SubmitEvent) {
    event.preventDefault();
    const given = typed.trim();
    if (!given) return;
    const result = gradeReply(given, turn.yourLines);
    settle(result.correct, result.close, result.line, given);
  }

  function next() {
    stopSpeaking();
    if (index + 1 < turns.length) {
      startTurn(index + 1);
      return;
    }
    token.current++;
    const earned = starsFor(right, turns.length);
    setStars(earned);
    setBubble(null);
    setTalking(null);
    setMood("happy");
    setPhase("done");
    playFanfare();
    onComplete(score, earned);
  }

  // 1, 2, 3 or A, B, C to answer; the Next button has focus after that.
  useEffect(() => {
    if (mode !== "choice" || (phase !== "ask" && phase !== "their")) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      const i = ["1", "2", "3"].indexOf(k) >= 0 ? Number(k) - 1 : ["a", "b", "c"].indexOf(k);
      if (i >= 0 && choices && i < choices.options.length) {
        e.preventDefault();
        pick(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const hint = hintFor(turn);
  const answering = phase === "ask" || phase === "their";
  const last = index + 1 >= turns.length;

  return (
    <div className="game game-play">
      <p className="stage-line">
        <button type="button" className="stage-jump" onClick={onExit}>
          All scenes
        </button>
        <span>{scene.def.title}</span>
      </p>

      {/* The title and end cards sit on the stage on a wide screen and under it
          on a phone, where a stage 200px tall has no room for a card. */}
      <div className="game-stage-wrap">
        <GameStage kind={scene.def.kind} edition={edition} talking={talking} mood={mood}>
          {bubble && phase !== "intro" && phase !== "done" && (
            <button
              type="button"
              key={`${bubble.who}-${bubble.line?.source ?? "think"}-${index}`}
              className={`game-bubble is-${bubble.who}${bubble.line ? "" : " is-thinking"}`}
              onClick={() => bubble.line?.en && setShowEn((v) => !v)}
              aria-label={bubble.line ? undefined : "Convi is thinking"}
              disabled={!bubble.line?.en}
            >
              {bubble.line ? (
                <>
                  <span className="game-bubble-line">{bubble.line.source}</span>
                  {showEn && bubble.line.en && (
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
            <span key={float.key} className="game-float" aria-hidden="true">
              +{float.value}
            </span>
          )}
        </GameStage>
        {phase === "intro" && (
          <div className="game-card">
            <span className="game-card-kicker">
              Scene {playable.indexOf(conversation) + 1} · {edition.country}
            </span>
            <strong className="game-card-title">{scene.def.title}</strong>
            <span className="game-card-text">{scene.def.intro}</span>
            <button type="button" className="game-primary" onClick={() => startTurn(0)}>
              Start
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="game-card is-done">
            <strong className="game-card-title">Sound like a local in {edition.country}</strong>
            <Stars count={stars} big />
            <span className="game-card-score">{score.toLocaleString("en-US")} pts</span>
            <span className="game-card-text">
              {right} of {turns.length} right
            </span>
            <span className="game-card-actions">
              {nextTitle && (
                <button type="button" className="game-primary" onClick={onNext}>
                  Next: {nextTitle}
                </button>
              )}
              <button type="button" className="game-secondary" onClick={onReplay}>
                Play again
              </button>
              {!nextTitle && (
                <button type="button" className="game-secondary" onClick={onExit}>
                  All scenes
                </button>
              )}
            </span>
          </div>
        )}
      </div>

      {phase !== "intro" && phase !== "done" && (
        <div className="game-panel">
          <div className="game-hud">
            <span className="game-dots" aria-label={`Line ${index + 1} of ${turns.length}`}>
              {turns.map((t, i) => (
                <i key={t.id} className={i < index ? "is-past" : i === index ? "is-now" : ""} />
              ))}
            </span>
            {combo >= 2 && (
              <span className="game-combo" aria-label={`${combo} in a row`}>
                {combo} in a row
              </span>
            )}
            <span className="game-score">{score.toLocaleString("en-US")} pts</span>
          </div>

          <p className="game-situation">{turn.situation}</p>

          {answering && (
            <>
              <div className="game-ask-row">
                <p className="game-ask">What does Convi say?</p>
                {hint && !hinted && (
                  <button type="button" className="game-hint" onClick={() => setHinted(true)}>
                    Hint
                  </button>
                )}
              </div>
              {hinted && hint && <p className="game-hint-text">Convi wants to say: “{hint}”</p>}
            </>
          )}

          {mode === "choice" && choices && (
            <ol className="game-options">
              {choices.options.map((option, i) => {
                const state = !verdict
                  ? ""
                  : i === choices.answer
                    ? " is-right"
                    : i === picked
                      ? " is-wrong"
                      : " is-out";
                return (
                  <li key={option.source}>
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
                        <span>{option.source}</span>
                        {verdict && option.en && (
                          <span className="game-option-en">{option.en}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          {mode === "type" && (
            <form className="game-type" onSubmit={submitTyped}>
              <input
                ref={input}
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={!answering}
                placeholder="Type what Convi says"
                aria-label="What Convi says"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                lang={locale}
              />
              <button type="submit" className="game-primary" disabled={!answering || !typed.trim()}>
                Say it
              </button>
              {answering && (
                <button
                  type="button"
                  className="game-secondary"
                  onClick={() => settle(false, false, turn.yourLines[0]!, null)}
                >
                  Not sure
                </button>
              )}
            </form>
          )}

          {verdict && (
            <div className={`game-verdict${verdict.correct ? " is-right" : ""}`} role="status">
              <strong>
                {verdict.correct
                  ? RIGHT_WORDS[index % RIGHT_WORDS.length]
                  : verdict.close
                    ? "So close."
                    : "Not quite."}
                {verdict.points > 0 && ` +${verdict.points}`}
              </strong>
              {!verdict.correct && (
                <span>
                  A local would say <em lang={locale}>{verdict.line.source}</em>
                  {verdict.line.en && <> ({verdict.line.en})</>}
                </span>
              )}
              {verdict.correct && mode === "type" && verdict.line.source !== verdict.given && (
                <span>
                  Written as <em lang={locale}>{verdict.line.source}</em>
                </span>
              )}
              <button ref={nextButton} type="button" className="game-primary" onClick={next}>
                {last ? "See results" : "Next"}
              </button>
            </div>
          )}

          <AnswerModeToggle mode={mode} onChange={onMode} />
        </div>
      )}
    </div>
  );
}
