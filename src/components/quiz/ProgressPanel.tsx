import { STAGE_CLEAR_SCORE, type Stage } from "../../lib/quizTypes";

interface Props {
  stages: Stage[];
  bestScores: Record<string, number>;
}

/**
 * Stage scores only.
 *
 * This used to report "N of M cards marked Got it", which came from the
 * flashcard Review mode's Got it / Still learning buttons. Review is gone, so
 * nothing sets that any more and the number would have sat at zero forever.
 * Best score per stage is the honest measure now.
 */
export default function ProgressPanel({ stages, bestScores }: Props) {
  const cleared = stages.filter((s) => (bestScores[s.id] ?? 0) >= STAGE_CLEAR_SCORE).length;

  return (
    <div className="progress-panel">
      <p className="progress-summary">
        {cleared} of {stages.length} stages cleared. A stage counts as cleared once you test out of
        it at {STAGE_CLEAR_SCORE}% or better.
      </p>

      <ul className="progress-list">
        {stages.map((stage) => {
          const best = bestScores[stage.id] ?? 0;
          const done = best >= STAGE_CLEAR_SCORE;
          return (
            <li key={stage.id} className={`progress-row${done ? " completed" : ""}`}>
              <div className="progress-row-head">
                <span className="progress-row-title">{stage.title}</span>
                <span className="progress-row-status">
                  {done ? "Cleared" : best > 0 ? `Best ${best}%` : "Not started"}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${best}%` }} />
              </div>
              <p className="progress-row-meta">{stage.itemIds.length} phrases</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
