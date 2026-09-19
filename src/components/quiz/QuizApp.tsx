import { useEffect, useMemo, useState } from "react";
import {
  buildStages,
  recommendedStageId,
  allStagesCleared,
  slangFinalItems,
  ROUND_LENGTH,
  STAGE_CLEAR_SCORE,
  MISTAKES_STAGE_ID,
  SLANG_FINAL_ID,
  type QuizPayload,
  type Stage,
} from "../../lib/quizTypes";
import { buildTasterRound } from "../../lib/quizTypes";
import { loadProgress, missedItemIds, roundsCompleted } from "../../lib/progress";
import { recordRound } from "../../lib/usage";
import PracticePath from "./PracticePath";
import TestMode from "./TestMode";
import ProgressPanel from "./ProgressPanel";
import Welcome from "./Welcome";
import EmailPrompt from "./EmailPrompt";
import { soundEnabled, setSoundEnabled } from "./sound";
import { setVoiceEnabled, stopSpeaking, voiceEnabled } from "./speech";
import "./quiz.css";

type Mode = "intro" | "taster" | "path" | "test" | "progress";

/**
 * Set once the welcome and its six questions have been seen. Somebody who has
 * just bought gets the introduction; everybody else goes straight to the path,
 * which is what they opened the app for.
 */
const INTRO_KEY = "convi:intro:v1";

function introSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_KEY) === "done";
  } catch {
    // No storage: show the path. Repeating the intro every visit would be a
    // worse failure than never showing it.
    return true;
  }
}

/**
 * Set once the email prompt has been answered either way — registered, or
 * dismissed. One ask is a fair ask; the same modal on every fifth round is how
 * people learn to close things without reading them.
 */
const EMAIL_KEY = "convi:email-prompt:v1";

/** Rounds finished before the prompt appears. */
const PROMPT_AFTER_ROUNDS = 5;

function emailPromptAnswered(): boolean {
  try {
    return !!window.localStorage.getItem(EMAIL_KEY);
  } catch {
    // No storage: never ask, rather than ask on every round.
    return true;
  }
}

function markEmailPrompt(answer: "registered" | "dismissed"): void {
  try {
    window.localStorage.setItem(EMAIL_KEY, answer);
  } catch {
    // Nothing to do — it just may come back next session.
  }
}

function markIntroSeen(seen: boolean): void {
  try {
    if (seen) window.localStorage.setItem(INTRO_KEY, "done");
    else window.localStorage.removeItem(INTRO_KEY);
  } catch {
    // Nothing to do — it just shows again next time.
  }
}

interface Props {
  locale?: string; // which language deck to load; the API validates it
}

export default function QuizApp({ locale }: Props) {
  const [mode, setMode] = useState<Mode>("path");
  const [stageId, setStageId] = useState<string>("");
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [scoreVersion, setScoreVersion] = useState(0);

  const [payload, setPayload] = useState<QuizPayload | null>(null);
  const [error, setError] = useState("");
  // Read after mount, never during render: the setting lives in localStorage,
  // which the server has no view of, so seeding state from it directly would
  // make the first client render disagree with the server's HTML.
  const [sound, setSound] = useState(true);
  const [voice, setVoice] = useState(true);
  const [askEmail, setAskEmail] = useState(false);
  useEffect(() => {
    setSound(soundEnabled());
    setVoice(voiceEnabled());
    // Same reason the settings are read here: localStorage is a client fact,
    // so the intro decision cannot be made while rendering on the server.
    if (!introSeen()) setMode("intro");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = locale ? `?locale=${encodeURIComponent(locale)}` : "";

    fetch(`/api/quiz-items${query}`)
      .then(async (res) => {
        if (res.status === 403) throw new Error("This practice content needs a purchase to unlock.");
        if (!res.ok) throw new Error("Couldn't load the practice deck.");
        return (await res.json()) as QuizPayload;
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

  const stages = useMemo<Stage[]>(
    () => (payload ? buildStages(payload.items, payload.categories) : []),
    [payload]
  );

  const bestScores = useMemo(
    () => loadProgress().bestScores,
    // Re-read after each scored round; the source of truth is localStorage, so
    // nothing else signals React that it changed.
    [scoreVersion, payload]
  );

  useEffect(() => {
    if (payload) setMistakes(missedItemIds());
  }, [payload, mode, stageId, scoreVersion]);

  const suggestedId = useMemo(
    () => (stages.length ? recommendedStageId(stages, bestScores) : null),
    [stages, bestScores]
  );

  const finalUnlocked = useMemo(
    () => allStagesCleared(stages, bestScores),
    [stages, bestScores]
  );

  const stageIndex = stages.findIndex((s) => s.id === stageId);
  const nextStage = stageIndex >= 0 && stageIndex + 1 < stages.length ? stages[stageIndex + 1] : null;

  /**
   * Everything the learner has reached: this stage plus every stage before it
   * on the path. A round borrows from here when its own stage is too small,
   * so an import is always revision rather than a phrase from a category
   * further along that they have not met yet.
   */
  const seenPool = useMemo(() => {
    if (!payload) return [];
    // The mistake drill and the final draw on the whole deck by definition:
    // one is made of things already answered, the other is the capstone.
    if (stageId === MISTAKES_STAGE_ID || stageId === SLANG_FINAL_ID) return payload.items;
    const idx = stages.findIndex((s) => s.id === stageId);
    if (idx < 0) return payload.items;
    const reached = new Set(stages.slice(0, idx + 1).flatMap((s) => s.itemIds));
    return payload.items.filter((i) => reached.has(i.id));
  }, [payload, stages, stageId]);

  const items = useMemo(() => {
    if (!payload) return [];
    if (stageId === MISTAKES_STAGE_ID) {
      const set = new Set(mistakes);
      return payload.items.filter((i) => set.has(i.id));
    }
    if (stageId === SLANG_FINAL_ID) return slangFinalItems(payload.items);
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return [];
    const set = new Set(stage.itemIds);
    return payload.items.filter((i) => set.has(i.id));
  }, [payload, stages, stageId, mistakes]);

  if (error) return <p className="quiz-error">{error}</p>;
  if (!payload) return <p className="quiz-loading">Loading your deck...</p>;

  const currentTitle =
    stageId === MISTAKES_STAGE_ID
      ? `Mistakes (${items.length})`
      : stageId === SLANG_FINAL_ID
        ? "Slang final"
        : (stages.find((s) => s.id === stageId)?.title ?? "");

  // The mistake drill isn't a stage, so it records no stage score. The final is
  // scored under its own id so the path can show it cleared.
  const scoreKey = stageId === MISTAKES_STAGE_ID ? null : stageId;

  function startStage(id: string) {
    setStageId(id);
    setMode("test");
  }

  // The intro owns the screen. Path/Progress tabs and a mistakes link on top of
  // "Welcome to Try Convi" would undercut the one moment the app gets to
  // introduce itself.
  if (mode === "intro") {
    return (
      <div className="quiz-app">
        <Welcome
          onStart={() => setMode("taster")}
          onSkip={() => {
            markIntroSeen(true);
            setMode("path");
          }}
        />
      </div>
    );
  }

  return (
    <div className="quiz-app">
      <div className="quiz-toolbar">
        <div className="mode-toggle" role="tablist">
          <button type="button" className={mode !== "progress" ? "active" : ""} onClick={() => setMode("path")}>
            Path
          </button>
          <button type="button" className={mode === "progress" ? "active" : ""} onClick={() => setMode("progress")}>
            Progress
          </button>
        </div>

        <button
          type="button"
          className="voice-toggle"
          aria-pressed={voice}
          title={voice ? "Voices on" : "Voices off"}
          onClick={() => {
            const next = !voice;
            setVoice(next);
            setVoiceEnabled(next);
            if (!next) stopSpeaking();
          }}
        >
          <span className="sr-only">
            {voice ? "Turn spoken lines off" : "Turn spoken lines on"}
          </span>
          {/* A mouth speaking, not a loudspeaker: this toggles the language
              being read aloud, where the speaker icon next to it toggles the
              two answer tones. Two speakers side by side would be a coin
              flip. */}
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 12h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity={voice ? 0 : 1}
              transform={voice ? "" : "rotate(45 12 12)"}
            />
            <path
              d="M7 9.5c1.6-2 3.2-3 5-3s3.4 1 5 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              opacity={voice ? 1 : 0.35}
            />
            <path
              d="M6 13c2 3 4 4.5 6 4.5s4-1.5 6-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <button
          type="button"
          className="sound-toggle"
          aria-pressed={sound}
          title={sound ? "Sound on" : "Sound off"}
          onClick={() => {
            const next = !sound;
            setSound(next);
            setSoundEnabled(next);
          }}
        >
          <span className="sr-only">{sound ? "Turn sound off" : "Turn sound on"}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
            {sound ? (
              <path
                d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M16.5 9.5l5 5M21.5 9.5l-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>

        {mode === "test" && mistakes.length > 0 && stageId !== MISTAKES_STAGE_ID && (
          <button
            type="button"
            className="mistake-link"
            onClick={() => startStage(MISTAKES_STAGE_ID)}
          >
            Mistakes ({mistakes.length})
          </button>
        )}
      </div>

      {mode === "path" && (
        <>
          <p className="path-intro">
            Work along the path. A round is {ROUND_LENGTH} questions — clear it at{" "}
            {STAGE_CLEAR_SCORE}% and the circle fills. Bigger sections take a few rounds, so keep
            tapping the same circle until it's full.
          </p>
          <PracticePath
            stages={stages}
            bestScores={bestScores}
            suggestedId={suggestedId}
            finalUnlocked={finalUnlocked}
            finalId={SLANG_FINAL_ID}
            onStart={startStage}
          />
          {mistakes.length > 0 && (
            <button type="button" className="path-mistakes" onClick={() => startStage(MISTAKES_STAGE_ID)}>
              Drill your {mistakes.length} mistake{mistakes.length === 1 ? "" : "s"}
            </button>
          )}
        </>
      )}

      {mode === "taster" && (
        <>
          <p className="stage-line">
            <span>A taste of what's ahead — six questions, nothing scored</span>
          </p>
          <TestMode
            items={payload.items}
            allItems={payload.items}
            locale={locale ?? "es-ES"}
            setId="__taster__"
            scoreKey={null}
            nextStageId={null}
            nextStageTitle={null}
            makeRound={(all) => buildTasterRound(all)}
            taster
            onChooseStage={startStage}
            onDrillMistakes={() => startStage(MISTAKES_STAGE_ID)}
            onRoundComplete={() => {
              setScoreVersion((v) => v + 1);
              recordRound(locale ?? "es-ES");
            }}
            onBackToPath={() => {
              markIntroSeen(true);
              setMode("path");
            }}
          />
        </>
      )}

      {mode === "test" && (
        <>
          <p className="stage-line">
            <button type="button" className="stage-jump" onClick={() => setMode("path")}>
              Back to path
            </button>
            <span>{currentTitle}</span>
          </p>
          <TestMode
            items={items}
            allItems={seenPool}
            locale={locale ?? "es-ES"}
            setId={stageId}
            scoreKey={scoreKey}
            nextStageId={nextStage?.id ?? null}
            nextStageTitle={nextStage?.title ?? null}
            onChooseStage={startStage}
            onDrillMistakes={() => startStage(MISTAKES_STAGE_ID)}
            onRoundComplete={() => {
              setScoreVersion((v) => v + 1);
              recordRound(locale ?? "es-ES");
              // Asked after the round is scored and the summary is up, which is
              // the one moment in a session where nothing is half-finished.
              if (roundsCompleted() >= PROMPT_AFTER_ROUNDS && !emailPromptAnswered()) {
                setAskEmail(true);
              }
            }}
            onBackToPath={() => setMode("path")}
          />
        </>
      )}

      {askEmail && (
        <EmailPrompt
          onClose={() => {
            markEmailPrompt("dismissed");
            setAskEmail(false);
          }}
          onRegistered={() => markEmailPrompt("registered")}
        />
      )}

      {mode === "progress" && (
        <ProgressPanel
          stages={stages}
          bestScores={bestScores}
          onReplayIntro={() => {
            markIntroSeen(false);
            setMode("intro");
          }}
        />
      )}
    </div>
  );
}
