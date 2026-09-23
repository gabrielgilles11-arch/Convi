import { STAGE_CLEAR_SCORE, type Stage } from "../../lib/quizTypes";
import StreakBadge from "./StreakBadge";
import { sectionsOf } from "./PracticePath";

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
  const sections = sectionsOf(stages);
  const isCleared = (id: string) => (bestScores[id] ?? 0) >= STAGE_CLEAR_SCORE;
  const clearedSections = sections.filter((s) => s.parts.every((p) => isCleared(p.id))).length;

  return (
    <div className="progress-panel">
      {/* First line of the tab that answers "how am I doing": the streak is the
          only number here that is about turning up rather than about scoring,
          and it is the one people come back for. */}
      <StreakBadge streak={streak} roundsToday={roundsToday} variant="panel" />

      {/* Sections, the way the path counts them. This tab used to list every
          part as its own row, "Getting around: Part 1" through "Part 3", so the
          path said fourteen places and this said thirty-three chores. */}
      <p className="progress-summary">
        {clearedSections} of {sections.length} sections cleared. A round clears at{" "}
        {STAGE_CLEAR_SCORE}% or better, and a bigger section takes a few rounds.
      </p>

      <ul className="progress-list">
        {sections.map((section) => {
          const parts = section.parts;
          const partsDone = parts.filter((p) => isCleared(p.id)).length;
          const done = partsDone === parts.length;
          const bests = parts.map((p) => bestScores[p.id] ?? 0);
          const started = bests.some((b) => b > 0);
          // Each part counts up to the clearing score and no further, so a
          // section reads full exactly when every part of it is cleared.
          const fill =
            (bests.reduce((sum, b) => sum + Math.min(b, STAGE_CLEAR_SCORE), 0) /
              (parts.length * STAGE_CLEAR_SCORE)) *
            100;
          const phrases = parts.reduce((sum, p) => sum + p.itemIds.length, 0);
          const status = done
            ? "Cleared"
            : !started
              ? "Not started"
              : parts.length > 1
                ? `${partsDone} of ${parts.length} parts`
                : `Best ${bests[0]}%`;

          return (
            <li key={section.categoryId} className={`progress-row${done ? " completed" : ""}`}>
              <div className="progress-row-head">
                <span className="progress-row-title">{section.title}</span>
                <span className="progress-row-status">{status}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${fill}%` }} />
              </div>
              <p className="progress-row-meta">
                {phrases} phrases{parts.length > 1 ? ` in ${parts.length} parts` : ""}
              </p>
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
