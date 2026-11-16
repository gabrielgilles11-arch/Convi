import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Convi, the welcome screens' host, head to toe.
 *
 * The head is the front page's Convi, shape for shape and color for color:
 * the round face, the ginger hair swept under the straw hat, the green band,
 * the shades, the grin. Below it is the rest of him: a red floral shirt with
 * an open camp collar, khaki shorts, arms and legs in the same flat,
 * outline-free style.
 *
 * He moves like a person rather than a sticker: the upper body breathes, the
 * head tilts from the neck, the right arm waves hello from the shoulder, and
 * the mouth opens and closes while he is "talking" (the bubble typing). Every
 * pivot is a real joint, given in the same coordinates. All of it is off under
 * reduced motion, where he simply stands there smiling.
 *
 * Decorative: what he says is in the bubble as text, which is what a screen
 * reader reads.
 */

const VB = { x: 70, y: 940, w: 520, h: 900 };

/** Where the front page's head sits on the body, and how big. */
const HEAD = { x: 320, y: 1150, scale: 1.3 };

/**
 * A pivot at (x, y) in the drawing's coordinates, as a CSS transform-origin.
 *
 * With `view-box`, the origin is measured from the drawing's own (0, 0), not
 * from the corner of the viewBox, and px are the drawing's units. Percentages
 * of the viewBox look right and are not: they land the pivot hundreds of units
 * away and the waving arm leaves the picture.
 */
function pivot(x: number, y: number): React.CSSProperties {
  return { transformBox: "view-box", transformOrigin: `${x}px ${y}px` };
}

// The front page's palette (ConviPeek.astro).
const SKIN = "#f2c9a0";
const HAIR = "#c8872e";
const HAT = "#f2d388";
const BAND = "#2e7d4f";
const SHADES = "#1d2a33";
const GLINT = "#5c6f7d";
const MOUTH = "#7a2e2e";
// The site's Convi red, now a floral shirt, and the shorts.
const SHIRT = "#e8574a";
const SHIRT_DARK = "#c9433a";
const PETAL = "#fff1d0";
const PETAL_GOLD = "#ffd36b";
const CENTER = "#f29a2e";
const LEAF = "#2d7d50";
const KHAKI = "#cdb07a";
const KHAKI_DARK = "#b0925c";
const SHOE = "#3b2a22";
const SOLE = "#f4ead8";

/** A five-petal flower, the shirt's print. */
function Flower({ x, y, r, gold = false, turn = 0 }: { x: number; y: number; r: number; gold?: boolean; turn?: number }) {
  const petals = [0, 72, 144, 216, 288].map((a) => {
    const rad = ((a + turn) * Math.PI) / 180;
    return { cx: x + Math.cos(rad) * r * 0.62, cy: y + Math.sin(rad) * r * 0.62 };
  });
  return (
    <g>
      {petals.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={r * 0.5} fill={gold ? PETAL_GOLD : PETAL} />
      ))}
      <circle cx={x} cy={y} r={r * 0.32} fill={gold ? CENTER : PETAL_GOLD} />
    </g>
  );
}

function Leaf({ x, y, turn }: { x: number; y: number; turn: number }) {
  return <ellipse cx={x} cy={y} rx={13} ry={6} fill={LEAF} transform={`rotate(${turn} ${x} ${y})`} />;
}

/** The print, laid over whatever shape clips it. */
function Print() {
  return (
    <g>
      <Leaf x={232} y={1352} turn={-30} />
      <Flower x={214} y={1378} r={26} />
      <Leaf x={404} y={1418} turn={35} />
      <Flower x={420} y={1392} r={24} gold turn={20} />
      <Flower x={262} y={1460} r={22} gold turn={10} />
      <Leaf x={372} y={1480} turn={-20} />
      <Flower x={386} y={1504} r={27} turn={30} />
      <Flower x={204} y={1536} r={24} turn={50} />
      <Flower x={300} y={1546} r={18} gold />
      <Leaf x={448} y={1546} turn={60} />
      {/* On the sleeves */}
      <Flower x={162} y={1346} r={17} gold turn={15} />
      <Flower x={480} y={1352} r={17} turn={40} />
    </g>
  );
}

const TORSO =
  "M232 1294 Q320 1312 408 1294 L438 1302 Q462 1312 464 1342 L458 1562 L182 1562 L176 1342 Q178 1312 202 1302 Z";

/** Where each shoulder turns, in the drawing's coordinates. */
const SHOULDER = { left: { x: 190, y: 1322 }, right: { x: 450, y: 1322 } };

/**
 * One arm from the shoulder down: sleeve, arm, hand, hanging a little away
 * from the body the way arms do, rather than glued to the shirt.
 */
function Arm({ side }: { side: "left" | "right" }) {
  const s = side === "left" ? -1 : 1;
  const { x: sx, y: sy } = SHOULDER[side];
  const ax = sx + s * 20; // the arm's center line
  const id = `convi-sleeve-${side}`;
  const sleeve = `M${sx - s * 26} 1298 Q${sx + s * 20} 1294 ${sx + s * 40} 1328 L${sx + s * 46} 1404 L${sx - s * 6} 1410 Z`;
  return (
    <g transform={`rotate(${s * -5} ${sx} ${sy})`}>
      {/* Arm and hand first, so the sleeve covers the top of the arm. */}
      <rect x={ax - 16} y={1370} width={32} height={140} rx={16} fill={SKIN} />
      <circle cx={ax} cy={1512} r={21} fill={SKIN} />
      <clipPath id={id}>
        <path d={sleeve} />
      </clipPath>
      <path d={sleeve} fill={SHIRT} />
      <g clipPath={`url(#${id})`}>
        <Print />
      </g>
      <path
        d={`M${sx + s * 46} 1404 L${sx - s * 6} 1410`}
        stroke={SHIRT_DARK}
        strokeWidth={5}
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * The head: the front page's Convi, shape for shape (ConviPeek.astro, and
 * `Convi()` in GameStage.tsx, which share it). A round face, ginger hair
 * swept under the straw hat, the green band, the shades, the grin. Drawn in
 * its own coordinates around the middle of the face and scaled onto the body,
 * so the numbers can be checked against the front page's one for one.
 *
 * Talking swaps the grin for the same smile held open, nothing more.
 */
function Head({ mouthOpen }: { mouthOpen: boolean }) {
  return (
    <g transform={`translate(${HEAD.x} ${HEAD.y}) scale(${HEAD.scale})`}>
      <rect x={-22} y={70} width={44} height={40} fill={SKIN} />
      <circle cx={0} cy={0} r={100} fill={SKIN} />
      <path d="M-104 -16 Q-96 -96 0 -104 Q96 -96 104 -16 Q74 -54 0 -46 Q-74 -54 -104 -16Z" fill={HAIR} />
      <ellipse cx={0} cy={-66} rx={148} ry={26} fill={HAT} />
      <path d="M-78 -66 Q-74 -148 0 -152 Q74 -148 78 -66Z" fill={HAT} />
      <rect x={-78} y={-86} width={156} height={17} fill={BAND} />
      <rect x={-74} y={-10} width={62} height={38} rx={15} fill={SHADES} />
      <rect x={12} y={-10} width={62} height={38} rx={15} fill={SHADES} />
      <rect x={-14} y={0} width={28} height={6} fill={SHADES} />
      <rect x={-62} y={-4} width={16} height={6} rx={3} fill={GLINT} />
      <rect x={24} y={-4} width={16} height={6} rx={3} fill={GLINT} />
      {mouthOpen ? (
        <path d="M-26 46 Q0 52 26 46 Q22 76 0 78 Q-22 76 -26 46Z" fill={MOUTH} />
      ) : (
        <path d="M-26 48 Q0 70 26 48" fill="none" stroke={MOUTH} strokeWidth={8} strokeLinecap="round" />
      )}
    </g>
  );
}

export function ConviFigure({
  className = "",
  talking = false,
  wave = true,
}: {
  className?: string;
  /** Mouth moving, while what he says is still coming in. */
  talking?: boolean;
  /** Wave hello once when he appears. */
  wave?: boolean;
}) {
  const [mouthOpen, setMouthOpen] = useState(false);
  useEffect(() => {
    if (!talking) {
      setMouthOpen(false);
      return;
    }
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      // No matchMedia: let him talk.
    }
    if (reduced) return;
    const id = window.setInterval(() => setMouthOpen((open) => !open), 130);
    return () => window.clearInterval(id);
  }, [talking]);

  return (
    <svg
      className={`convi-figure ${className}`.trim()}
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      aria-hidden="true"
      focusable="false"
    >
      <clipPath id="convi-torso">
        <path d={TORSO} />
      </clipPath>

      {/* Legs stand still; everything above the waist breathes. */}
      <g className="convi-legs">
        <rect x={214} y={1600} width={50} height={196} rx={14} fill={SKIN} />
        <rect x={376} y={1600} width={50} height={196} rx={14} fill={SKIN} />
        <path d="M200 1782 Q200 1764 222 1764 L262 1764 Q272 1764 272 1780 L272 1808 L188 1808 Q188 1790 200 1782 Z" fill={SHOE} />
        <rect x={186} y={1802} width={88} height={12} rx={6} fill={SOLE} />
        <path d="M440 1782 Q440 1764 418 1764 L378 1764 Q368 1764 368 1780 L368 1808 L452 1808 Q452 1790 440 1782 Z" fill={SHOE} />
        <rect x={366} y={1802} width={88} height={12} rx={6} fill={SOLE} />
      </g>

      <g className="convi-upper">
        {/* Shorts, with a waistband and a turn-up at each leg. */}
        <path d="M184 1546 L456 1546 L466 1690 L334 1690 L320 1626 L306 1690 L174 1690 Z" fill={KHAKI} />
        <rect x={184} y={1546} width={272} height={18} fill={KHAKI_DARK} />
        <rect x={174} y={1676} width={132} height={14} fill={KHAKI_DARK} />
        <rect x={334} y={1676} width={132} height={14} fill={KHAKI_DARK} />
        <path d="M320 1564 L320 1626" stroke={KHAKI_DARK} strokeWidth={4} />
        <path d="M206 1578 Q226 1604 252 1600" fill="none" stroke={KHAKI_DARK} strokeWidth={4} strokeLinecap="round" />
        <path d="M434 1578 Q414 1604 388 1600" fill="none" stroke={KHAKI_DARK} strokeWidth={4} strokeLinecap="round" />

        {/* The shirt: red, printed, an open collar and a button placket. */}
        <path d={TORSO} fill={SHIRT} />
        <g clipPath="url(#convi-torso)">
          <Print />
        </g>
        <path d="M284 1296 L356 1296 L320 1350 Z" fill={SKIN} />
        <path d="M272 1294 L320 1352 L298 1374 L252 1320 Z" fill={SHIRT_DARK} />
        <path d="M368 1294 L320 1352 L342 1374 L388 1320 Z" fill={SHIRT_DARK} />
        <path d="M320 1360 L320 1560" stroke={SHIRT_DARK} strokeWidth={4} />
        {[1408, 1462, 1516].map((y) => (
          <circle key={y} cx={320} cy={y} r={6} fill={PETAL} />
        ))}

        <Arm side="left" />

        {/* The waving arm turns at the shoulder. */}
        <g className={wave ? "convi-wave" : undefined} style={pivot(SHOULDER.right.x, SHOULDER.right.y)}>
          <Arm side="right" />
        </g>

        {/* The head turns at the neck. */}
        <g className="convi-head" style={pivot(320, 1292)}>
          <Head mouthOpen={mouthOpen} />
        </g>
      </g>
    </svg>
  );
}

/**
 * Text that types itself in, line after line, the way Convi says it.
 *
 * Every line is laid out at full length from the start, invisibly, and the
 * typed text sits over it, so nothing below moves while he talks. A screen
 * reader gets each line whole. A tap on the bubble finishes it at once, and
 * with reduced motion it is simply all there.
 */
export interface SpokenLine {
  text: string;
  className?: string;
  /** BCP 47 tag for a line in another language, for screen readers. */
  lang?: string;
}

function useTyping(lines: SpokenLine[]) {
  const total = lines.reduce((n, l) => n + l.text.length, 0);
  const [shown, setShown] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      // Type it out.
    }
    if (reduced) {
      setShown(total);
      return;
    }
    setShown(0);
    let count = 0;
    let line = 0;
    let inLine = 0;
    const step = () => {
      if (count >= total) return;
      count += 1;
      inLine += 1;
      setShown(count);
      // A short beat at the end of each line, as if drawing breath.
      let delay = 34;
      if (inLine >= lines[line]!.text.length) {
        line += 1;
        inLine = 0;
        delay = 420;
      }
      timer.current = window.setTimeout(step, delay);
    };
    timer.current = window.setTimeout(step, 450);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
    // The lines are fixed for a screen; retype only when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, lines.map((l) => l.text).join("|")]);

  function finish() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setShown(total);
  }

  return { shown, done: shown >= total, finish };
}

/** Convi beside a speech bubble that types out what he says. */
export default function ConviGuide({
  lines,
  children,
  size = "large",
  onDone,
}: {
  /** What he says, typed in one line after another. */
  lines?: SpokenLine[];
  /** Or plain content, shown at once. */
  children?: ReactNode;
  size?: "large" | "small";
  onDone?: () => void;
}) {
  const typed = useTyping(lines ?? []);
  const talking = Boolean(lines) && !typed.done;
  const reported = useRef(false);
  useEffect(() => {
    if (typed.done && lines && !reported.current) {
      reported.current = true;
      onDone?.();
    }
  }, [typed.done, lines, onDone]);

  let left = typed.shown;
  return (
    <div className={`convi-guide convi-guide--${size}`}>
      <ConviFigure talking={talking} />
      <div
        className={`convi-bubble${lines ? " convi-bubble--typed" : ""}`}
        onClick={lines && !typed.done ? typed.finish : undefined}
      >
        {lines
          ? lines.map((line, i) => {
              const visible = line.text.slice(0, Math.max(0, left));
              const typing = left > 0 && left < line.text.length;
              left -= line.text.length;
              return (
                <p key={i} className={`convi-line ${line.className ?? ""}`.trim()} lang={line.lang}>
                  <span className="convi-line-ghost" aria-hidden="true">
                    {line.text}
                  </span>
                  <span className="convi-line-live" aria-hidden="true">
                    {visible}
                    {typing && <span className="convi-caret" />}
                  </span>
                  <span className="sr-only">{line.text}</span>
                </p>
              );
            })
          : children}
      </div>
    </div>
  );
}
