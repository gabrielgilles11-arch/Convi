import { STAGE_CLEAR_SCORE, type Stage } from "../../lib/quizTypes";

/**
 * The practice path: one stone per stage, joined by a single winding line, with
 * the Slang final at the end.
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

export interface PathNode {
  id: string;
  title: string;
  cleared: boolean;
  current: boolean;
  locked: boolean;
  isFinal: boolean;
  bestScore: number;
}

interface Props {
  stages: Stage[];
  bestScores: Record<string, number>;
  suggestedId: string | null;
  finalUnlocked: boolean;
  onStart: (stageId: string) => void;
  finalId: string;
}

export default function PracticePath({
  stages,
  bestScores,
  suggestedId,
  finalUnlocked,
  onStart,
  finalId,
}: Props) {
  const nodes: PathNode[] = stages.map((stage) => {
    const best = bestScores[stage.id] ?? 0;
    return {
      id: stage.id,
      title: stage.title,
      cleared: best >= STAGE_CLEAR_SCORE,
      current: stage.id === suggestedId,
      locked: false,
      isFinal: false,
      bestScore: best,
    };
  });

  nodes.push({
    id: finalId,
    title: "Slang final",
    cleared: (bestScores[finalId] ?? 0) >= STAGE_CLEAR_SCORE,
    current: finalUnlocked && !suggestedId,
    locked: !finalUnlocked,
    isFinal: true,
    bestScore: bestScores[finalId] ?? 0,
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
        {nodes.map((node, i) => (
          <li
            key={node.id}
            className="path-node"
            style={{ left: xFor(i), top: yFor(i) }}
          >
            <button
              type="button"
              className={[
                "stone",
                node.cleared ? "is-cleared" : "",
                node.current ? "is-current" : "",
                node.locked ? "is-locked" : "",
                node.isFinal ? "is-final" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={node.locked}
              onClick={() => onStart(node.id)}
              aria-label={
                node.locked
                  ? `${node.title} — locked until every stage is cleared`
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
              ) : (
                <span className="stone-dot" aria-hidden="true" />
              )}
            </button>

            <span className="stone-label">
              {node.title}
              {node.bestScore > 0 && <span className="stone-score">{node.bestScore}%</span>}
            </span>

            {node.current && <span className="stone-here">Start here</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
