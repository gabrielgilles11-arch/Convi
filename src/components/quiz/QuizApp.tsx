import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  loadProgress,
  missedItemIds,
  roundsCompleted,
  currentDayStreak,
  roundsCompletedToday,
  markConversationFinished,
  finishedConversations,
} from "../../lib/progress";
import type { Conversation, ConversationPayload } from "../../lib/conversationTypes";
import { markReminderPrompt, reminderPromptAnswered } from "../../lib/reminderClient";
import { recordRound } from "../../lib/usage";
import PracticePath from "./PracticePath";
import TestMode from "./TestMode";
import ProgressPanel from "./ProgressPanel";
import Welcome from "./Welcome";
import EmailPrompt from "./EmailPrompt";
import StreakBadge from "./StreakBadge";
import RemindPrompt from "./RemindPrompt";
import ConversationPicker from "./ConversationPicker";
import ConversationMode from "./ConversationMode";
import { soundEnabled, setSoundEnabled } from "./sound";
import { setVoiceEnabled, stopSpeaking, voiceEnabled } from "./speech";
import "./quiz.css";

type Mode = "intro" | "taster" | "path" | "test" | "progress" | "talk";

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
  // Same story as the settings above: the streak lives in localStorage, so it
  // starts at zero and is corrected after mount rather than read during render.
  const [streak, setStreak] = useState(0);
  const [roundsToday, setRoundsToday] = useState(0);

  // Talk. The deck is fetched the first time the tab is opened rather than
  // alongside the quiz deck: it carries both sides of every exchange, and most
  // sessions never open it.
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [convoError, setConvoError] = useState("");
  const [convoId, setConvoId] = useState<string | null>(null);
  const [convoDone, setConvoDone] = useState<string[]>([]);
  const [askRemind, setAskRemind] = useState(false);
  useEffect(() => {
    setSound(soundEnabled());
    setVoice(voiceEnabled());
    // Same reason the settings are read here: localStorage is a client fact,
    // so the intro decision cannot be made while rendering on the server.
    if (!introSeen()) setMode("intro");
  }, []);

  // Re-read whenever a round is scored, and on every screen change: the streak
  // is written by TestMode straight into localStorage, which signals React
  // nothing at all.
  useEffect(() => {
    setStreak(currentDayStreak());
    setRoundsToday(roundsCompletedToday());
  }, [scoreVersion, mode]);

  /**
   * The streak in the tab title while it is alive.
   *
   * The page's own title is captured once, on mount, and restored on the way
   * out — reading it again on each change would read back a title this effect
   * had already prefixed, and the flames would stack up one per round.
   */
  const pageTitle = useRef("");
  useEffect(() => {
    pageTitle.current = document.title;
    return () => {
      document.title = pageTitle.current;
    };
  }, []);

  useEffect(() => {
    if (!pageTitle.current) return;
    document.title = streak > 0 ? `\u{1F525} ${streak} \u00b7 ${pageTitle.current}` : pageTitle.current;
  }, [streak]);

  /**
   * Says when the island owns the screen, so the page can get out of its way.
   *
   * A round and a conversation are the app; the header above them is a shop
   * window with a "Get started" button in it, which means nothing to somebody
   * who started four questions ago. The layout reads this attribute and drops
   * its own chrome \u2014 see `body[data-focus]` in Layout.astro.
   */
  useEffect(() => {
    const focused = mode === "test" || mode === "taster" || mode === "talk";
    if (focused) document.body.dataset.focus = "round";
    else delete document.body.dataset.focus;
    return () => {
      delete document.body.dataset.focus;
    };
  }, [mode]);

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

  // Fires once: `conversations` is only null before the first open, and the
  // catch below sets an error rather than leaving it null and re-fetching.
  useEffect(() => {
    if (mode !== "talk" || conversations !== null || convoError) return;
    let cancelled = false;
    const query = locale ? `?locale=${encodeURIComponent(locale)}` : "";

    fetch(`/api/conversations${query}`)
      .then(async (res) => {
        if (res.status === 403) throw new Error("This practice content needs a purchase to unlock.");
        if (!res.ok) throw new Error("Couldn't load the conversations.");
        return (await res.json()) as ConversationPayload;
      })
      .then((data) => {
        if (!cancelled) setConversations(data.conversations);
      })
      .catch((err: Error) => {
        if (!cancelled) setConvoError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, conversations, convoError, locale]);

  useEffect(() => {
    if (mode === "talk") setConvoDone(finishedConversations());
  }, [mode, convoId]);

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

  /**
   * Whether any section has been cleared, read from storage rather than from
   * `bestScores`: this is called from inside the round-complete handler, and the
   * memo it would otherwise read has not been recomputed yet at that point.
   */
  function anyStageCleared(): boolean {
    const scores = loadProgress().bestScores;
    return stages.some((stage) => (scores[stage.id] ?? 0) >= STAGE_CLEAR_SCORE);
  }

  // A stale id — a locale switch while a conversation was open — resolves to
  // nothing, and nothing means the picker rather than a crash.
  const chosenConvo = convoId ? (conversations?.find((c) => c.id === convoId) ?? null) : null;

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
          {/* Path stays lit through a round, because a round is the path: the
              test screen is where a stone takes you, not a second place. Talk
              Mode is not a tab — it sits beside the circles, which is where
              somebody looking at the path can see it. */}
          <button
            type="button"
            className={mode === "path" || mode === "test" || mode === "taster" ? "active" : ""}
            onClick={() => setMode("path")}
          >
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
          <div className="path-header">
            <StreakBadge streak={streak} roundsToday={roundsToday} />
          </div>
          <p className="path-intro">
            Work along the path. A round is {ROUND_LENGTH} questions: clear it at{" "}
            {STAGE_CLEAR_SCORE}% and the circle fills. Bigger sections take a few rounds, so keep
            tapping the same circle until it's full.
          </p>
          <div className="path-stage">
            <PracticePath
              stages={stages}
              bestScores={bestScores}
              suggestedId={suggestedId}
              finalUnlocked={finalUnlocked}
              finalId={SLANG_FINAL_ID}
              onStart={startStage}
            />

            {/* Beside the circles rather than in the tab strip: the path is a
                list of drills, and the thing worth offering next to it is the
                place you use them. Sticky, so it is still there four sections
                down. */}
            <div className="talk-rail">
              <button
                type="button"
                className="talk-launch"
                onClick={() => {
                  setConvoId(null);
                  setMode("talk");
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M4.5 5h15a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19.5 16H12l-4.5 3.5V16H4.5A1.5 1.5 0 0 1 3 14.5v-8A1.5 1.5 0 0 1 4.5 5z"
                    fill="currentColor"
                  />
                </svg>
                <span className="talk-launch-title">Talk Mode</span>
                <span className="talk-launch-sub">Hold a real conversation</span>
              </button>
            </div>
          </div>
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
            <span>A taste of what's ahead: six questions, nothing scored</span>
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
              //
              // Reminders come first when this is the round that cleared a
              // section: it is the better ask of the two — there is now a
              // streak to protect — and two modals stacked on one summary is
              // how people learn to close things without reading them.
              if (anyStageCleared() && !reminderPromptAnswered()) {
                setAskRemind(true);
              } else if (roundsCompleted() >= PROMPT_AFTER_ROUNDS && !emailPromptAnswered()) {
                setAskEmail(true);
              }
            }}
            onBackToPath={() => setMode("path")}
          />
        </>
      )}

      {mode === "talk" &&
        (convoError ? (
          <p className="quiz-error">{convoError}</p>
        ) : conversations === null ? (
          <p className="quiz-loading">Loading the conversations...</p>
        ) : chosenConvo ? (
          <ConversationMode
            conversation={chosenConvo}
            locale={locale ?? "es-ES"}
            onBack={() => setConvoId(null)}
            onFinish={(id) => {
              markConversationFinished(id);
              setConvoDone(finishedConversations());
            }}
          />
        ) : (
          <ConversationPicker
            conversations={conversations}
            finished={convoDone}
            onStart={setConvoId}
            onBack={() => setMode("path")}
          />
        ))}

      {askRemind && (
        <RemindPrompt
          locale={locale ?? "es-ES"}
          streak={streak}
          onClose={() => {
            markReminderPrompt("dismissed");
            setAskRemind(false);
          }}
          onEnabled={(channel) => markReminderPrompt(channel)}
        />
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
          streak={streak}
          roundsToday={roundsToday}
          onReplayIntro={() => {
            markIntroSeen(false);
            setMode("intro");
          }}
        />
      )}
    </div>
  );
}
