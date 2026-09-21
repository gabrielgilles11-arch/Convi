import { STAGE_CLEAR_SCORE, type Stage } from "../../lib/quizTypes";
import StreakBadge from "./StreakBadge";

interface Props {
  stages: Stage[];
  bestScores: Record<string, number>;
  /** Days in a row with a finished round, and how many of them were today. */
  streak: number;
  roundsToday: number;
  /** Replays the welcome and its six questions. */
}

/**
 * Stage scores only.
 *
 * This used to report "N of M cards marked Got it", which came from the
 * flashcard Review mode's Got it / Still learning buttons. Review is gone, so
 * nothing sets that any more and the number would have sat at zero forever.
 * Best score per stage is the honest measure now.
 */
export default function ProgressPanel({
  stages,
  bestScores,
  streak,
  roundsToday,
}: Props) {
  const cleared = stages.filter((s) => (bestScores[s.id] ?? 0) >= STAGE_CLEAR_SCORE).length;

  return (
    <div className="progress-panel">
      {/* First line of the tab that answers "how am I doing": the streak is the
          only number here that is about turning up rather than about scoring,
          and it is the one people come back for. */}
      <StreakBadge streak={streak} roundsToday={roundsToday} variant="panel" />

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
    </div>
  );
}
