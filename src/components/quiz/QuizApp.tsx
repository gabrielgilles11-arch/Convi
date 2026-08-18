import { useEffect, useMemo, useState } from "react";
import type { QuizPayload } from "../../lib/quizTypes";
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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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
            {payload.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {mode === "review" && <ReviewMode items={filteredItems} />}
      {mode === "test" && <TestMode items={filteredItems} categoryFilter={categoryFilter} />}
      {mode === "progress" && <ProgressPanel items={payload.items} />}
    </div>
  );
}
