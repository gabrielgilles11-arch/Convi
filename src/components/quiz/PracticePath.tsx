import { STAGE_CLEAR_SCORE, type Stage } from "../../lib/quizTypes";

/**
 * The practice path: one stone per section, joined by a single winding line,
 * with the Slang final at the end.
 *
 * A section is a category, not a stage. Big categories are still split into
 * parts — a round samples a stage, so a stage wants about a round's worth of
 * material — but a part is not a place. Giving each one its own stone put
 * "Slang — Part 1" through "Part 5" down the path as five separate
 * destinations, which read as thirty-three chores rather than fourteen
 * sections, and made a long category look like a worse category.
 *
 * So the parts live inside the stone: clearing the first of two fills it
 * halfway, and the second click on the same stone is the second part. The ring
 * is the only place the split shows.
 *
 * Geometry is deterministic rather than measured — a fixed column width and row
 * height mean the connecting line can be drawn as one SVG polyline through
 * known coordinates, instead of stitching per-node pseudo-elements together and
 * hoping they line up. The column is narrow enough (320px) to fit a phone
 * without scaling.
 */
const COLUMN = 320;
// Row spacing follows the label type size: at the larger, heavier .stone-label
// a long two-part title runs to four lines, which at the old 124 overlapped the
// stone below it.
const ROW = 146;
const TOP = 56;
const WIND = [0, 62, 0, -62];

const xFor = (i: number) => COLUMN / 2 + WIND[i % WIND.length];
const yFor = (i: number) => TOP + i * ROW;

/** Stone geometry, in the units the progress ring is drawn in. */
const RING = { size: 64, stroke: 5 };
const RING_R = (RING.size - RING.stroke) / 2;
const RING_C = 2 * Math.PI * RING_R;

export interface PathNode {
  id: string;
  title: string;
  cleared: boolean;
  current: boolean;
  locked: boolean;
  isFinal: boolean;
  /** Parts of this section cleared, and how many there are. */
  done: number;
  parts: number;
  /** The part a click starts: the first not yet cleared, or the last one. */
  nextStageId: string;
}

interface Props {
  stages: Stage[];
  bestScores: Record<string, number>;
  suggestedId: string | null;
  finalUnlocked: boolean;
  onStart: (stageId: string) => void;
  finalId: string;
}

/**
 * Groups the stages back into the categories they were cut out of, in path
 * order. `buildStages` already emits a category's parts together and in order,
 * so first-seen order is path order and nothing needs re-sorting.
 */
function sectionsOf(stages: Stage[]): { categoryId: string; title: string; parts: Stage[] }[] {
  const out: { categoryId: string; title: string; parts: Stage[] }[] = [];
  const byId = new Map<string, { categoryId: string; title: string; parts: Stage[] }>();

  for (const stage of stages) {
    let section = byId.get(stage.categoryId);
    if (!section) {
      // The stage title carries the part suffix ("Slang — Part 2"); the stone
      // is the whole section, so the suffix comes off and the count under it
      // says the same thing more usefully.
      section = { categoryId: stage.categoryId, title: stripPart(stage.title), parts: [] };
      byId.set(stage.categoryId, section);
      out.push(section);
    }
    section.parts.push(stage);
  }

  return out;
}

function stripPart(title: string): string {
  return title.replace(/\s*[—-]\s*Part\s+\d+\s*$/i, "");
}

export default function PracticePath({
  stages,
  bestScores,
  suggestedId,
  finalUnlocked,
  onStart,
  finalId,
}: Props) {
  const cleared = (id: string) => (bestScores[id] ?? 0) >= STAGE_CLEAR_SCORE;

  const nodes: PathNode[] = sectionsOf(stages).map((section) => {
    const done = section.parts.filter((p) => cleared(p.id)).length;
    // Clicking a section means "carry on with it", so it opens the first part
    // still owing. A section with nothing owing replays its last part rather
    // than doing nothing, because a finished stone is still a place to go back
    // to and practise.
    const next = section.parts.find((p) => !cleared(p.id)) ?? section.parts[section.parts.length - 1];
    return {
      id: section.categoryId,
      title: section.title,
      cleared: done === section.parts.length,
      current: section.parts.some((p) => p.id === suggestedId),
      locked: false,
      isFinal: false,
      done,
      parts: section.parts.length,
      nextStageId: next.id,
    };
  });

  nodes.push({
    id: finalId,
    title: "Slang final",
    cleared: cleared(finalId),
    current: finalUnlocked && !suggestedId,
    locked: !finalUnlocked,
    isFinal: true,
    done: cleared(finalId) ? 1 : 0,
    parts: 1,
    nextStageId: finalId,
  });

  const height = TOP + (nodes.length - 1) * ROW + TOP;
  const points = nodes.map((_, i) => `${xFor(i)},${yFor(i)}`).join(" ");

  return (
    <div className="practice-path" style={{ width: COLUMN, height }}>
      <svg
        className="path-line"
        width={COLUMN}
        height={height}
        viewBox={`0 0 ${COLUMN} ${height}`}
        aria-hidden="true"
        focusable="false"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <ol className="path-nodes">
        {nodes.map((node, i) => {
          // Part way through, and not yet finished: the only state the ring is
          // for. A cleared stone says so with a tick and a locked one with a
          // padlock, and drawing a full ring over either just adds a second
          // thing to read.
          const partial = !node.cleared && !node.locked && node.done > 0;

          return (
            <li
              key={node.id}
              className="path-node"
              style={{ left: xFor(i), top: yFor(i) }}
            >
              <div className="stone-wrap">
                {partial && (
                  <svg
                    className="stone-ring"
                    viewBox={`0 0 ${RING.size} ${RING.size}`}
                    aria-hidden="true"
                    focusable="false"
                  >
                    {/* The unfilled remainder, so the arc reads as a fraction
                        of something rather than as a stray stroke. */}
                    <circle
                      cx={RING.size / 2}
                      cy={RING.size / 2}
                      r={RING_R}
                      fill="none"
                      stroke="var(--color-border)"
                      strokeWidth={RING.stroke}
                    />
                    <circle
                      cx={RING.size / 2}
                      cy={RING.size / 2}
                      r={RING_R}
                      fill="none"
                      stroke="var(--color-success-deep)"
                      strokeWidth={RING.stroke}
                      strokeLinecap="round"
                      strokeDasharray={`${(RING_C * node.done) / node.parts} ${RING_C}`}
                      // Start at twelve o'clock and fill clockwise. An arc that
                      // begins at three o'clock reads as two thirds when it is
                      // a half.
                      transform={`rotate(-90 ${RING.size / 2} ${RING.size / 2})`}
                    />
                  </svg>
                )}

                <button
                  type="button"
                  className={[
                    "stone",
                    node.cleared ? "is-cleared" : "",
                    node.current ? "is-current" : "",
                    node.locked ? "is-locked" : "",
                    node.isFinal ? "is-final" : "",
                    partial ? "is-partial" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={node.locked}
                  onClick={() => onStart(node.nextStageId)}
                  aria-label={
                    node.locked
                      ? `${node.title} — locked until every section is cleared`
                      : node.parts > 1
                        ? `${node.cleared ? "Practise" : "Continue"} ${node.title} — ${node.done} of ${node.parts} parts cleared`
                        : `Start ${node.title}`
                  }
                >
                  {node.cleared ? (
                    <svg viewBox="0 0 24 24" className="stone-check" aria-hidden="true">
                      <path
                        d="M5 12.5 L10 17.5 L19 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : node.locked ? (
                    <svg viewBox="0 0 24 24" className="stone-lock" aria-hidden="true">
                      <rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="currentColor" />
                      <path
                        d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : node.isFinal ? (
                    <svg viewBox="0 0 24 24" className="stone-star" aria-hidden="true">
                      <path
                        d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : node.parts > 1 ? (
                    // Which part comes next, rather than an anonymous dot: on a
                    // stone you come back to three times, the one thing worth
                    // knowing at a glance is where you left off.
                    <span className="stone-part" aria-hidden="true">
                      {node.done + 1}
                      <span className="stone-part-of">/{node.parts}</span>
                    </span>
                  ) : (
                    <span className="stone-dot" aria-hidden="true" />
                  )}
                </button>
              </div>

              <span className="stone-label">
                {node.title}
                {/* Only once there is progress to report. "0 of 5 done" under
                    every untouched section is the to-do list the stone count
                    was already accused of being, and the stone itself already
                    says which part is next. */}
                {node.parts > 1 && node.done > 0 && !node.cleared && (
                  <span className="stone-score">
                    {node.done} of {node.parts} done
                  </span>
                )}
              </span>

              {node.current && <span className="stone-here">Start here</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
