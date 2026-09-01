import { STAGE_CLEAR_SCORE, type Stage } from "../../lib/quizTypes";

interface Props {
  stages: Stage[];
  bestScores: Record<string, number>;
  /** Replays the welcome and its six questions. */
  onReplayIntro?: () => void;
}

/**
 * Stage scores only.
 *
 * This used to report "N of M cards marked Got it", which came from the
 * flashcard Review mode's Got it / Still learning buttons. Review is gone, so
 * nothing sets that any more and the number would have sat at zero forever.
 * Best score per stage is the honest measure now.
 */
export default function ProgressPanel({ stages, bestScores, onReplayIntro }: Props) {
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

      {/* The intro shows once, on the first unlock. It is still the clearest
          answer to "what is this app", so it stays reachable rather than being
          gone the moment it's been seen. */}
      {onReplayIntro && (
        <button type="button" className="replay-intro" onClick={onReplayIntro}>
          Replay the intro
        </button>
      )}
    </div>
  );
}
