import { useMemo } from "react";
import type { QuizItem } from "../../lib/quizTypes";
import { loadProgress } from "../../lib/progress";

const MASTERED_SCORE = 90; // best test score that counts as "completed"

interface Props {
  items: QuizItem[]; // the full unfiltered set — progress is reported per category
}

interface Row {
  id: string;
  title: string;
  total: number;
  known: number;
  bestScore: number;
}

export default function ProgressPanel({ items }: Props) {
  const rows = useMemo<Row[]>(() => {
    const progress = loadProgress();
    const known = new Set(progress.knownItemIds);

    const byCategory = new Map<string, Row>();
    for (const item of items) {
      let row = byCategory.get(item.categoryId);
      if (!row) {
        row = { id: item.categoryId, title: item.categoryTitle, total: 0, known: 0, bestScore: 0 };
        byCategory.set(item.categoryId, row);
      }
      row.total += 1;
      if (known.has(item.id)) row.known += 1;
    }

    for (const row of byCategory.values()) {
      row.bestScore = progress.bestScores[row.id] ?? 0;
    }

    return [...byCategory.values()];
  }, [items]);

  const totalKnown = rows.reduce((sum, r) => sum + r.known, 0);
  const totalCards = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="progress-panel">
      <p className="progress-summary">
        {totalKnown} of {totalCards} cards marked <strong>Got it</strong>. Test out of a category at{" "}
        {MASTERED_SCORE}%+ to complete it.
      </p>

      <ul className="progress-list">
        {rows.map((row) => {
          const pct = row.total > 0 ? Math.round((row.known / row.total) * 100) : 0;
          const completed = row.bestScore >= MASTERED_SCORE;
          return (
            <li key={row.id} className={`progress-row${completed ? " completed" : ""}`}>
              <div className="progress-row-head">
                <span className="progress-row-title">{row.title}</span>
                <span className="progress-row-status">
                  {completed ? "Completed" : row.bestScore > 0 ? `Best ${row.bestScore}%` : ""}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="progress-row-meta">
                {row.known} / {row.total} cards known
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
