import { useEffect, useMemo, useState } from "react";
import {
  sortCategoriesByPath,
  recommendedCategoryId,
  type QuizPayload,
} from "../../lib/quizTypes";
import { loadProgress } from "../../lib/progress";
import ReviewMode from "./ReviewMode";
import TestMode from "./TestMode";
import ProgressPanel from "./ProgressPanel";
import "./quiz.css";

type Mode = "review" | "test" | "progress";

interface Props {
  locale?: string; // which language's deck to load; the API validates it
}

export default function QuizApp({ locale }: Props) {
  const [mode, setMode] = useState<Mode>("review");
  // Left null until the deck arrives, then pinned to the first uncleared stage.
  // Landing on "all categories" gave no sense of where to start; the dropdown
  // still lets anyone override it.
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [pinnedStage, setPinnedStage] = useState(false);

  // Quiz data is fetched rather than bundled: /api/quiz-items verifies the
  // entitlement cookie server-side, so paid content never reaches an
  // unentitled browser. Importing it at build time would ship the whole
  // content file to everyone.
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
  }, []);

  // Categories in path order, plus which stage to push the user into.
  const orderedCategories = useMemo(
    () => (payload ? sortCategoriesByPath(payload.categories) : []),
    [payload]
  );

  const suggestedId = useMemo(() => {
    if (!payload) return null;
    return recommendedCategoryId(payload.categories, loadProgress().bestScores);
  }, [payload]);

  useEffect(() => {
    if (!payload || pinnedStage) return;
    setPinnedStage(true);
    if (suggestedId) setCategoryFilter(suggestedId);
  }, [payload, suggestedId, pinnedStage]);

  const stageIndex = orderedCategories.findIndex((c) => c.id === categoryFilter);
  const nextStage =
    stageIndex >= 0 && stageIndex + 1 < orderedCategories.length
      ? orderedCategories[stageIndex + 1]
      : null;

  const filteredItems = useMemo(() => {
    if (!payload) return [];
    return categoryFilter === "all"
      ? payload.items
      : payload.items.filter((i) => i.categoryId === categoryFilter);
  }, [payload, categoryFilter]);

  if (error) return <p className="quiz-error">{error}</p>;
  if (!payload) return <p className="quiz-loading">Loading your deck…</p>;

  return (
    <div className="quiz-app">
      <div className="quiz-toolbar">
        <div className="mode-toggle" role="tablist">
          <button
            type="button"
            className={mode === "review" ? "active" : ""}
            onClick={() => setMode("review")}
          >
            Review
          </button>
          <button type="button" className={mode === "test" ? "active" : ""} onClick={() => setMode("test")}>
            Test
          </button>
          <button
            type="button"
            className={mode === "progress" ? "active" : ""}
            onClick={() => setMode("progress")}
          >
            Progress
          </button>
        </div>

        {mode !== "progress" && (
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {orderedCategories.map((c, i) => (
              <option key={c.id} value={c.id}>
                {i + 1}. {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {mode === "test" && stageIndex >= 0 && (
        <p className="stage-line">
          Stage {stageIndex + 1} of {orderedCategories.length}
          {suggestedId === categoryFilter && <span className="stage-flag">Suggested next</span>}
          {suggestedId && suggestedId !== categoryFilter && (
            <button type="button" className="stage-jump" onClick={() => setCategoryFilter(suggestedId)}>
              Back to suggested
            </button>
          )}
        </p>
      )}

      {mode === "review" && <ReviewMode items={filteredItems} />}
      {mode === "test" && (
        <TestMode
          items={filteredItems}
          allItems={payload.items}
          categoryFilter={categoryFilter}
          nextStageId={nextStage?.id ?? null}
          nextStageTitle={nextStage?.title ?? null}
          onChooseCategory={setCategoryFilter}
        />
      )}
      {mode === "progress" && <ProgressPanel items={payload.items} />}
    </div>
  );
}
