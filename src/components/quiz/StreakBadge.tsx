import { DAILY_GOAL } from "../../lib/progress";

/**
 * The streak, where it can be seen.
 *
 * The number has been kept since the first round anyone ever finished; until
 * now the only place it appeared was the summary screen at the end of a round,
 * which is the one moment you already know how you are doing. A streak is a
 * reason to come back, so it belongs on the screen you come back to.
 *
 * Zero is rendered too, deliberately. "No streak yet" and a sentence saying how
 * to start one is a smaller lie than an empty corner, and it stops the badge
 * appearing out of nowhere on the day somebody finally does.
 */
interface Props {
  streak: number;
  roundsToday: number;
  /** `header` sits in a row above the path; `panel` is the Progress tab's. */
  variant?: "header" | "panel";
}

export default function StreakBadge({ streak, roundsToday, variant = "header" }: Props) {
  const live = streak > 0;
  const goalHit = roundsToday >= DAILY_GOAL;

  return (
    <div className={`streak-badge streak-badge--${variant}${live ? " is-live" : ""}`}>
      {/* A flame drawn rather than typed: the emoji is a different colour, a
          different size and a different shape in every font it lands in, and
          this one sits next to a number it has to match. */}
      <svg className="streak-flame" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 2.5c3.2 3.4 6.5 6 6.5 10.3A6.5 6.5 0 0 1 12 21.5a6.5 6.5 0 0 1-6.5-8.7C5.5 9 8.8 6 12 2.5z"
          fill="currentColor"
        />
        <path
          d="M12 11c1.5 1.7 2.8 2.9 2.8 4.8A2.9 2.9 0 0 1 12 18.8a2.9 2.9 0 0 1-2.8-3c0-1.9 1.3-3.1 2.8-4.8z"
          fill="var(--color-card)"
          opacity="0.85"
        />
      </svg>

      <span className="streak-count">
        <strong>{live ? streak : 0}</strong>
        <span className="streak-unit">{streak === 1 ? "day" : "days"}</span>
      </span>

      <span className="streak-note">
        {!live
          ? "Finish a round today to start a streak"
          : goalHit
            ? "Daily goal hit"
            : `${roundsToday} of ${DAILY_GOAL} rounds today`}
      </span>
    </div>
  );
}
