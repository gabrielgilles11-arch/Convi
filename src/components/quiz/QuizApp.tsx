import { useMemo, useState } from "react";
import { quizItems, getCategoryList } from "../../lib/quizItems";
import ReviewMode from "./ReviewMode";
import TestMode from "./TestMode";
import ProgressPanel from "./ProgressPanel";
import "./quiz.css";

type Mode = "review" | "test" | "progress";

export default function QuizApp() {
  const [mode, setMode] = useState<Mode>("review");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(() => getCategoryList(), []);
  const filteredItems = useMemo(
    () => (categoryFilter === "all" ? quizItems : quizItems.filter((i) => i.categoryId === categoryFilter)),
    [categoryFilter]
  );

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
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {mode === "review" && <ReviewMode items={filteredItems} />}
      {mode === "test" && <TestMode items={filteredItems} categoryFilter={categoryFilter} />}
      {mode === "progress" && <ProgressPanel />}
    </div>
  );
}
