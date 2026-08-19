import { useEffect, useMemo, useState } from "react";
import {
  buildStages,
  recommendedStageId,
  allStagesCleared,
  slangFinalItems,
  MISTAKES_STAGE_ID,
  SLANG_FINAL_ID,
  type QuizPayload,
  type Stage,
} from "../../lib/quizTypes";
import { loadProgress, missedItemIds } from "../../lib/progress";
import PracticePath from "./PracticePath";
import TestMode from "./TestMode";
import ProgressPanel from "./ProgressPanel";
import "./quiz.css";

type Mode = "path" | "test" | "progress";

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
            Work along the path. Each stone is one round of 10 — clear it at {80}% to move on.
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
            allItems={payload.items}
            locale={locale ?? "es-ES"}
            setId={stageId}
            scoreKey={scoreKey}
            nextStageId={nextStage?.id ?? null}
            nextStageTitle={nextStage?.title ?? null}
            onChooseStage={startStage}
            onDrillMistakes={() => startStage(MISTAKES_STAGE_ID)}
            onRoundComplete={() => setScoreVersion((v) => v + 1)}
            onBackToPath={() => setMode("path")}
          />
        </>
      )}

      {mode === "progress" && <ProgressPanel stages={stages} bestScores={bestScores} />}
    </div>
  );
}
