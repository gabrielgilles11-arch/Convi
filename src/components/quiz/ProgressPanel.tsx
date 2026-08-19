import { useMemo } from "react";
import { STAGE_CLEAR_SCORE, type QuizItem, type Stage } from "../../lib/quizTypes";
import { loadProgress } from "../../lib/progress";

interface Props {
  items: QuizItem[]; // the full unfiltered set
  stages: Stage[]; // path-ordered, so this list matches the Test dropdown
}

interface Row {
  id: string;
  title: string;
  total: number;
  known: number;
  bestScore: number;
}

export default function ProgressPanel({ items, stages }: Props) {
  const rows = useMemo<Row[]>(() => {
    const progress = loadProgress();
    const known = new Set(progress.knownItemIds);

    return stages.map((stage) => {
      const ids = new Set(stage.itemIds);
      const inStage = items.filter((i) => ids.has(i.id));
      return {
        id: stage.id,
        title: stage.title,
        total: inStage.length,
        known: inStage.filter((i) => known.has(i.id)).length,
        bestScore: progress.bestScores[stage.id] ?? 0,
      };
    });
  }, [items, stages]);

  const totalKnown = rows.reduce((sum, r) => sum + r.known, 0);
  const totalCards = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="progress-panel">
      <p className="progress-summary">
        {totalKnown} of {totalCards} cards marked Got it. Test out of a stage at {STAGE_CLEAR_SCORE}%+ to
        complete it.
      </p>

      <ul className="progress-list">
        {rows.map((row) => {
          const pct = row.total > 0 ? Math.round((row.known / row.total) * 100) : 0;
          const completed = row.bestScore >= STAGE_CLEAR_SCORE;
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
              <p className="progress-row-meta">
                {row.known} / {row.total} cards known
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
