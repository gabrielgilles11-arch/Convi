import { useMemo, useState } from "react";
import { quizItems, getCategoryList } from "../../lib/quizItems";
import ReviewMode from "./ReviewMode";
import TestMode from "./TestMode";
import "./quiz.css";

type Mode = "review" | "test";

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
        </div>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {mode === "review" ? (
        <ReviewMode items={filteredItems} />
      ) : (
        <TestMode items={filteredItems} categoryFilter={categoryFilter} />
      )}
    </div>
  );
}
