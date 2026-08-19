import { useEffect, useMemo, useState } from "react";
import {
  buildStages,
  recommendedStageId,
  MISTAKES_STAGE_ID,
  type QuizPayload,
  type Stage,
} from "../../lib/quizTypes";
import { loadProgress, missedItemIds } from "../../lib/progress";
import ReviewMode from "./ReviewMode";
import TestMode from "./TestMode";
import ProgressPanel from "./ProgressPanel";
import "./quiz.css";

type Mode = "review" | "test" | "progress";

const ALL = "all";

interface Props {
  locale?: string; // which language deck to load; the API validates it
}

export default function QuizApp({ locale }: Props) {
  const [mode, setMode] = useState<Mode>("review");
  // Pinned to the first uncleared stage once the deck arrives. Landing on "all"
  // gave no sense of where to start; the dropdown still selects anything.
  const [stageId, setStageId] = useState<string>(ALL);
  const [pinned, setPinned] = useState(false);
  const [mistakes, setMistakes] = useState<string[]>([]);

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

  useEffect(() => {
    if (!payload) return;
    setMistakes(missedItemIds());
  }, [payload, mode, stageId]);

  const suggestedId = useMemo(() => {
    if (!stages.length) return null;
    return recommendedStageId(stages, loadProgress().bestScores);
  }, [stages]);

  useEffect(() => {
    if (!payload || pinned) return;
    setPinned(true);
    if (suggestedId) setStageId(suggestedId);
  }, [payload, suggestedId, pinned]);

  const stageIndex = stages.findIndex((s) => s.id === stageId);
  const nextStage = stageIndex >= 0 && stageIndex + 1 < stages.length ? stages[stageIndex + 1] : null;

  const items = useMemo(() => {
    if (!payload) return [];
    if (stageId === ALL) return payload.items;
    if (stageId === MISTAKES_STAGE_ID) {
      const set = new Set(mistakes);
      return payload.items.filter((i) => set.has(i.id));
    }
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return payload.items;
    const set = new Set(stage.itemIds);
    return payload.items.filter((i) => set.has(i.id));
  }, [payload, stages, stageId, mistakes]);

  if (error) return <p className="quiz-error">{error}</p>;
  if (!payload) return <p className="quiz-loading">Loading your deck...</p>;

  // Ad-hoc sets (everything / the mistake queue) aren't a stage, so they don't
  // record a stage score.
  const scoreKey = stageId === ALL || stageId === MISTAKES_STAGE_ID ? null : stageId;

  return (
    <div className="quiz-app">
      <div className="quiz-toolbar">
        <div className="mode-toggle" role="tablist">
          <button type="button" className={mode === "review" ? "active" : ""} onClick={() => setMode("review")}>
            Review
          </button>
          <button type="button" className={mode === "test" ? "active" : ""} onClick={() => setMode("test")}>
            Test
          </button>
          <button type="button" className={mode === "progress" ? "active" : ""} onClick={() => setMode("progress")}>
            Progress
          </button>
        </div>

        {mode !== "progress" && (
          <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
            <option value={ALL}>All categories</option>
            {mistakes.length > 0 && (
              <option value={MISTAKES_STAGE_ID}>Mistakes ({mistakes.length})</option>
            )}
            {stages.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i + 1}. {s.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {mode === "test" && stageIndex >= 0 && (
        <p className="stage-line">
          Stage {stageIndex + 1} of {stages.length}
          {suggestedId === stageId && <span className="stage-flag">Suggested next</span>}
          {suggestedId && suggestedId !== stageId && (
            <button type="button" className="stage-jump" onClick={() => setStageId(suggestedId)}>
              Back to suggested
            </button>
          )}
        </p>
      )}

      {mode === "test" && stageId === MISTAKES_STAGE_ID && (
        <p className="stage-line">Drilling the {items.length} you keep getting wrong.</p>
      )}

      {mode === "review" && <ReviewMode items={items} />}
      {mode === "test" && (
        <TestMode
          items={items}
          allItems={payload.items}
          setId={stageId}
          scoreKey={scoreKey}
          nextStageId={nextStage?.id ?? null}
          nextStageTitle={nextStage?.title ?? null}
          onChooseStage={setStageId}
          onRoundComplete={() => setMistakes(missedItemIds())}
          onDrillMistakes={() => {
            setMistakes(missedItemIds());
            setStageId(MISTAKES_STAGE_ID);
          }}
        />
      )}
      {mode === "progress" && <ProgressPanel items={payload.items} stages={stages} />}
    </div>
  );
}
