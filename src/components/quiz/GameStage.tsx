import { createContext, useContext, useId, type CSSProperties, type ReactNode } from "react";
import type { EditionInfo, SceneKind } from "../../lib/gameTypes";

/**
 * The cartoon set Game Mode plays on: the same flat style, characters and
 * places as the Convi reels, drawn as one inline SVG so it scales to any width
 * and costs no requests.
 *
 * Convi (straw hat, green band, shades) is always on the left and always the
 * learner. The local on the right is the edition's: a Madrid bartender with a
 * mustache, a Bavarian in a feathered hat, a Viking in a horned helmet. They
 * stand behind whatever the place puts between them (a bar, a taxi's doors,
 * the metro gates, a café counter), which is the composition the reels use and
 * the reason nobody needs legs.
 *
 * Speech bubbles are HTML on top of this, not SVG text, so they wrap.
 */

export type Speaker = "convi" | "local" | null;
export type Mood = "idle" | "happy" | "oops";

interface Props {
  kind: SceneKind;
  edition: EditionInfo;
  talking: Speaker;
  mood: Mood;
  /** Overlays on the scene itself: the speech bubbles. */
  children?: ReactNode;
  /**
   * What sits on the counter in front of them: Convi's thought cloud with the
   * three options. Drawn as more of the counter, so the choices are part of the
   * picture rather than a form under it.
   */
  floor?: ReactNode;
}

/** The color of whatever is in front of the characters, carried on below them. */
function floorColor(kind: SceneKind, edition: EditionInfo): string {
  if (kind === "metro") return "#33414f";
  if (kind === "taxi") return "#5d6770";
  if (kind === "cafe") return "#9a6a43";
  return edition.flag === "de" ? "#4d2f1c" : "#6b3e22";
}

const VIEW_W = 1000;
const VIEW_H = 720;

/** Where the two heads sit, as a share of the stage width. */
export const CONVI_X = 0.31;
export const LOCAL_X = 0.69;

const INK = "#2b1a12";

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

function Mouth({ cy = 52 }: { cy?: number }) {
  return <ellipse className="gs-mouth" cx={0} cy={cy} rx={20} ry={5} fill="#7a2e2e" />;
}

function Convi() {
  return (
    <g>
      <rect x={-118} y={84} width={236} height={210} rx={58} fill="#e8574a" />
      {[-80, -38, 4, 46, 88].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 160 : 118} r={11} fill="#ffd36b" />
      ))}
      <rect x={-22} y={70} width={44} height={40} fill="#f2c9a0" />
      <circle cx={0} cy={0} r={100} fill="#f2c9a0" />
      <path
        d="M-104 -16 Q-96 -96 0 -104 Q96 -96 104 -16 Q74 -54 0 -46 Q-74 -54 -104 -16Z"
        fill="#c8872e"
      />
      <ellipse cx={0} cy={-66} rx={148} ry={26} fill="#f2d388" />
      <path d="M-78 -66 Q-74 -148 0 -152 Q74 -148 78 -66Z" fill="#f2d388" />
      <rect x={-78} y={-86} width={156} height={17} fill="#2e7d4f" />
      <rect x={-74} y={-10} width={62} height={38} rx={15} fill="#1d2a33" />
      <rect x={12} y={-10} width={62} height={38} rx={15} fill="#1d2a33" />
      <rect x={-14} y={0} width={28} height={6} fill="#1d2a33" />
      <rect x={-62} y={-4} width={16} height={6} rx={3} fill="#5c6f7d" />
      <rect x={24} y={-4} width={16} height={6} rx={3} fill="#5c6f7d" />
      <Mouth cy={56} />
    </g>
  );
}

function Eyes({ iris = INK, white = false }: { iris?: string; white?: boolean }) {
  return (
    <g>
      {[-38, 38].map((x) => (
        <g key={x}>
          {white && <circle cx={x} cy={-14} r={15} fill="#fff" />}
          <circle cx={x} cy={-14} r={white ? 9 : 12} fill={iris} />
          <circle cx={x + 4} cy={-18} r={4} fill="#fff" />
        </g>
      ))}
    </g>
  );
}

/** Madrid: dark hair, heavy brows, the mustache. */
function Spaniard({ apron }: { apron: boolean }) {
  return (
    <g>
      <rect x={-118} y={84} width={236} height={210} rx={58} fill="#fff6df" />
      {apron && <rect x={-96} y={128} width={192} height={170} rx={26} fill="#2a6f97" />}
      <rect x={-22} y={70} width={44} height={40} fill="#e5ac7e" />
      <circle cx={0} cy={0} r={100} fill="#e5ac7e" />
      <path
        d="M-104 -18 Q-94 -116 0 -122 Q94 -116 104 -18 Q64 -76 0 -70 Q-64 -76 -104 -18Z"
        fill={INK}
      />
      <Eyes />
      <path
        d="M-60 -44 Q-38 -56 -16 -44"
        fill="none"
        stroke={INK}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d="M16 -44 Q38 -56 60 -44"
        fill="none"
        stroke={INK}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path d="M-56 30 Q-30 10 0 28 Q30 10 56 30 Q30 48 0 38 Q-30 48 -56 30Z" fill={INK} />
      <Mouth cy={60} />
    </g>
  );
}

/** Bavaria: the green hat with the feather, rosy cheeks, a handlebar. */
function Bavarian() {
  return (
    <g>
      <rect x={-118} y={84} width={236} height={210} rx={58} fill="#fff6df" />
      <rect x={-70} y={96} width={22} height={200} fill="#7a4a2a" />
      <rect x={48} y={96} width={22} height={200} fill="#7a4a2a" />
      <rect x={-70} y={170} width={140} height={20} rx={6} fill="#7a4a2a" />
      <rect x={-22} y={70} width={44} height={40} fill="#f0c49b" />
      <circle cx={0} cy={0} r={100} fill="#f0c49b" />
      <path
        d="M-102 -10 Q-100 -60 -80 -70 L-80 -20Z M102 -10 Q100 -60 80 -70 L80 -20Z"
        fill="#8a4b23"
      />
      <circle cx={-62} cy={24} r={16} fill="#f29b8b" opacity={0.6} />
      <circle cx={62} cy={24} r={16} fill="#f29b8b" opacity={0.6} />
      <Eyes />
      <path
        d="M-58 -40 Q-38 -50 -18 -40"
        fill="none"
        stroke="#8a4b23"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d="M18 -40 Q38 -50 58 -40"
        fill="none"
        stroke="#8a4b23"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d="M0 24 Q-30 4 -60 20 Q-80 30 -90 10 Q-86 42 -58 42 Q-28 44 0 34 Q28 44 58 42 Q86 42 90 10 Q80 30 60 20 Q30 4 0 24Z"
        fill="#8a4b23"
      />
      <Mouth cy={62} />
      <path
        d="M44 -84 Q70 -150 104 -196 Q90 -140 58 -82Z"
        fill="#f7f1e3"
        stroke="#d9cdb4"
        strokeWidth={3}
      />
      <ellipse cx={0} cy={-62} rx={120} ry={20} fill="#2f6b3a" />
      <path d="M-72 -62 Q-64 -140 0 -144 Q64 -140 72 -62Z" fill="#3d7f47" />
      <rect x={-72} y={-80} width={144} height={14} fill="#6b3e22" />
    </g>
  );
}

/** Sweden: the horned helmet and a blond beard. */
function Viking() {
  return (
    <g>
      <rect x={-118} y={84} width={236} height={210} rx={58} fill="#8a5a35" />
      <rect x={-118} y={150} width={236} height={18} fill="#6b4226" />
      <rect x={-22} y={70} width={44} height={40} fill="#f2c9a0" />
      <circle cx={0} cy={0} r={100} fill="#f2c9a0" />
      <path d="M-100 -30 Q-112 40 -88 96 L-70 20Z M100 -30 Q112 40 88 96 L70 20Z" fill="#e8c25a" />
      <circle cx={-60} cy={22} r={14} fill="#f29b8b" opacity={0.55} />
      <circle cx={60} cy={22} r={14} fill="#f29b8b" opacity={0.55} />
      <Eyes iris="#3b78b5" white />
      <path d="M-92 16 Q-82 104 0 114 Q82 104 92 16 Q62 48 0 50 Q-62 48 -92 16Z" fill="#e8c25a" />
      <path d="M-50 32 Q-24 16 0 30 Q24 16 50 32 Q24 44 0 38 Q-24 44 -50 32Z" fill="#d4a63a" />
      <Mouth cy={62} />
      <path
        d="M-96 -54 Q-158 -64 -172 -148 Q-138 -96 -90 -92Z"
        fill="#f3e3c3"
        stroke="#cdb98f"
        strokeWidth={4}
      />
      <path
        d="M96 -54 Q158 -64 172 -148 Q138 -96 90 -92Z"
        fill="#f3e3c3"
        stroke="#cdb98f"
        strokeWidth={4}
      />
      <path d="M-102 -30 Q-100 -130 0 -134 Q100 -130 102 -30Z" fill="#8a939b" />
      <rect x={-106} y={-44} width={212} height={22} rx={8} fill="#6d757c" />
      {[-80, -40, 0, 40, 80].map((x) => (
        <circle key={x} cx={x} cy={-33} r={5} fill="#c9cfd4" />
      ))}
      <rect x={-8} y={-130} width={16} height={92} fill="#6d757c" />
    </g>
  );
}

function Local({ edition, apron }: { edition: EditionInfo; apron: boolean }) {
  if (edition.flag === "de") return <Bavarian />;
  if (edition.flag === "se") return <Viking />;
  return <Spaniard apron={apron} />;
}

function Character({
  x,
  y,
  who,
  talking,
  mood,
  children,
}: {
  x: number;
  y: number;
  who: "convi" | "local";
  talking: boolean;
  mood: Mood;
  children: ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.88)`}>
      <g
        className={`gs-char gs-${who}${talking ? " is-talking" : ""}${mood !== "idle" ? ` is-${mood}` : ""}`}
      >
        {children}
      </g>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Signs and flags
// ---------------------------------------------------------------------------

/**
 * The flag's clip path id, unique per stage. The scene picker draws four
 * stages on one page, and four clip paths sharing one id would all resolve to
 * the first of them, which breaks as soon as that one is not rendered.
 */
const FlagClip = createContext("gs-flag-clip");

function Flag({ kind, x, y }: { kind: EditionInfo["flag"]; x: number; y: number }) {
  const clip = useContext(FlagClip);
  const w = 54;
  const h = 36;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={6} fill="#fff" />
      <g clipPath={`url(#${clip})`}>
        {kind === "es" && (
          <>
            <rect width={w} height={h} fill="#c60b1e" />
            <rect y={h / 4} width={w} height={h / 2} fill="#ffc400" />
          </>
        )}
        {kind === "se" && (
          <>
            <rect width={w} height={h} fill="#006aa7" />
            <rect x={16} width={9} height={h} fill="#fecc00" />
            <rect y={13.5} width={w} height={9} fill="#fecc00" />
          </>
        )}
        {kind === "de" && (
          <>
            <rect width={w} height={h / 3} fill="#000" />
            <rect y={h / 3} width={w} height={h / 3} fill="#dd0000" />
            <rect y={(2 * h) / 3} width={w} height={h / 3} fill="#ffce00" />
          </>
        )}
      </g>
      <rect width={w} height={h} rx={6} fill="none" stroke={INK} strokeWidth={3} />
    </g>
  );
}

function Sign({ text, color, edition }: { text: string; color: string; edition: EditionInfo }) {
  const width = 40 + text.length * 17;
  return (
    <g>
      <rect x={26} y={24} width={width} height={50} rx={12} fill={color} />
      <text
        x={26 + width / 2}
        y={58}
        textAnchor="middle"
        fontSize={26}
        fontWeight={800}
        fill="#fff"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "1px" }}
      >
        {text}
      </text>
      <Flag kind={edition.flag} x={26 + width + 12} y={31} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

const BOTTLES = ["#2e7d4f", "#b5382c", "#e0a526", "#2a6f97", "#8e4585", "#c9622b"];

function Shelf({ y }: { y: number }) {
  return <rect x={40} y={y} width={920} height={16} rx={8} fill="#7a4a2a" />;
}

function Bottles({ y, offset }: { y: number; offset: number }) {
  return (
    <g>
      {Array.from({ length: 11 }, (_, i) => {
        const x = 70 + i * 82;
        const col = BOTTLES[(i + offset) % BOTTLES.length]!;
        return (
          <g key={i}>
            <rect x={x} y={y - 96} width={34} height={96} rx={8} fill={col} />
            <rect x={x + 11} y={y - 122} width={12} height={30} rx={4} fill={col} />
            <rect x={x + 6} y={y - 62} width={22} height={30} rx={3} fill="#fff6df" opacity={0.9} />
          </g>
        );
      })}
    </g>
  );
}

function Mugs({ y }: { y: number }) {
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const x = 64 + i * 76;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y - 64}
              width={42}
              height={64}
              rx={6}
              fill="#fbe7b0"
              stroke="#d9c38a"
              strokeWidth={3}
            />
            <path
              d={`M${x + 42} ${y - 52} q18 0 18 18 q0 18 -18 18`}
              fill="none"
              stroke="#d9c38a"
              strokeWidth={6}
            />
          </g>
        );
      })}
    </g>
  );
}

function Diamonds() {
  const cells: ReactNode[] = [];
  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 18; c++) {
      if ((r + c) % 2) continue;
      const x = c * 60 - (r % 2) * 30;
      const y = r * 44;
      cells.push(
        <path
          key={`${r}-${c}`}
          d={`M${x} ${y + 22} L${x + 30} ${y} L${x + 60} ${y + 22} L${x + 30} ${y + 44}Z`}
          fill="#6aa9e0"
        />
      );
    }
  }
  return <g>{cells}</g>;
}

function Bunting({ colors }: { colors: string[] }) {
  return (
    <g>
      <path d="M0 18 Q500 52 1000 18" fill="none" stroke="#3a2a20" strokeWidth={3} />
      {Array.from({ length: 16 }, (_, i) => {
        const x = 20 + i * 62;
        const sag = 18 + Math.sin((x / 1000) * Math.PI) * 30;
        return (
          <path
            key={i}
            d={`M${x} ${sag} L${x + 40} ${sag + 2} L${x + 20} ${sag + 36}Z`}
            fill={colors[i % colors.length]}
          />
        );
      })}
    </g>
  );
}

/** The bar top and its front panels: the line everybody stands behind. */
function Counter({ top = "#8a5330", front = "#6b3e22", panel = "#7a4a2a" }) {
  return (
    <g>
      <rect x={0} y={540} width={VIEW_W} height={36} fill={top} />
      <rect x={0} y={576} width={VIEW_W} height={VIEW_H - 576} fill={front} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={24 + i * 162} y={598} width={140} height={110} rx={12} fill={panel} />
      ))}
    </g>
  );
}

function Beer({ x }: { x: number }) {
  return (
    <g>
      <rect
        x={x}
        y={462}
        width={56}
        height={84}
        rx={10}
        fill="#f2b632"
        stroke={INK}
        strokeWidth={4}
      />
      <rect
        x={x - 2}
        y={448}
        width={60}
        height={24}
        rx={12}
        fill="#fff"
        stroke={INK}
        strokeWidth={4}
      />
    </g>
  );
}

function Background({ kind, edition }: { kind: SceneKind; edition: EditionInfo }) {
  if (kind === "bar") {
    if (edition.flag === "de") {
      return (
        <g>
          <rect width={VIEW_W} height={VIEW_H} fill="#ffffff" />
          <Diamonds />
          <Bunting colors={["#2f6fa8", "#ffffff"]} />
          <Shelf y={236} />
          <Mugs y={236} />
          <Shelf y={392} />
          <Mugs y={392} />
          <Sign text="BIERHAUS" color="#2f6fa8" edition={edition} />
        </g>
      );
    }
    if (edition.flag === "se") {
      return (
        <g>
          <rect width={VIEW_W} height={VIEW_H} fill="#2f4f46" />
          {Array.from({ length: 13 }, (_, i) => (
            <rect key={i} x={i * 80} y={0} width={74} height={VIEW_H} fill="#36584e" />
          ))}
          <Bunting colors={["#006aa7", "#fecc00"]} />
          <Shelf y={250} />
          <Bottles y={250} offset={2} />
          <Shelf y={410} />
          <Bottles y={410} offset={4} />
          <Sign text="PUB" color="#006aa7" edition={edition} />
        </g>
      );
    }
    return (
      <g>
        <rect width={VIEW_W} height={VIEW_H} fill="#f4d9a8" />
        {Array.from({ length: 8 }, (_, r) =>
          Array.from({ length: 9 }, (_, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * 120 - (r % 2) * 60}
              y={r * 80}
              width={118}
              height={78}
              rx={8}
              fill={(r + c) % 2 ? "#f0cf97" : "#f7dfb4"}
            />
          ))
        )}
        <line x1={880} y1={0} x2={880} y2={120} stroke="#5b3a29" strokeWidth={5} />
        <path d="M850 126 Q842 210 880 270 Q918 210 910 126Z" fill="#b4503c" />
        <path
          d="M858 136 Q854 200 880 236"
          fill="none"
          stroke="#e89a86"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <Shelf y={260} />
        <Bottles y={260} offset={0} />
        <Shelf y={420} />
        <Bottles y={420} offset={3} />
        <Sign text="BAR PEPE" color="#2a6f97" edition={edition} />
      </g>
    );
  }

  if (kind === "metro") {
    const sign =
      edition.flag === "se"
        ? { text: "TUNNELBANA", color: "#1f5aa6" }
        : edition.flag === "de"
          ? { text: "U-BAHN", color: "#1d4f9a" }
          : { text: "METRO", color: "#c8102e" };
    return (
      <g>
        <rect width={VIEW_W} height={VIEW_H} fill="#eef1f2" />
        {Array.from({ length: 34 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={i * 30}
            y1={0}
            x2={i * 30}
            y2={VIEW_H}
            stroke="#d9dfe2"
            strokeWidth={2}
          />
        ))}
        {Array.from({ length: 25 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i * 30}
            x2={VIEW_W}
            y2={i * 30}
            stroke="#d9dfe2"
            strokeWidth={2}
          />
        ))}
        <rect x={0} y={150} width={VIEW_W} height={12} fill={sign.color} />
        <rect x={-20} y={200} width={1040} height={250} rx={36} fill="#2a5ea8" />
        <rect x={-20} y={318} width={1040} height={16} fill="#f2f2f2" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={20 + i * 118} y={222} width={96} height={86} rx={12} fill="#9fd0f0" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <rect
            key={`d${i}`}
            x={30 + i * 118}
            y={344}
            width={76}
            height={96}
            rx={8}
            fill="#1f4c8c"
          />
        ))}
        <rect x={0} y={452} width={VIEW_W} height={10} fill="#f6c518" />
        <Sign text={sign.text} color={sign.color} edition={edition} />
      </g>
    );
  }

  if (kind === "taxi") {
    const buildings = ["#e9b17a", "#d9785f", "#f0d39a", "#c9a27e", "#e7c38a", "#b98f6b"];
    return (
      <g>
        <rect width={VIEW_W} height={VIEW_H} fill="#bfe3f5" />
        <circle cx={860} cy={110} r={56} fill="#ffd36b" />
        {Array.from({ length: 7 }, (_, i) => {
          const h = 230 + ((i * 53) % 140);
          return (
            <g key={i}>
              <rect
                x={i * 150 - 20}
                y={460 - h}
                width={140}
                height={h + 80}
                fill={buildings[i % buildings.length]}
              />
              {Array.from({ length: Math.floor(h / 70) }, (_, r) => (
                <g key={r}>
                  <rect
                    x={i * 150}
                    y={480 - h + r * 70}
                    width={36}
                    height={44}
                    rx={4}
                    fill="#fff6df"
                    opacity={0.85}
                  />
                  <rect
                    x={i * 150 + 60}
                    y={480 - h + r * 70}
                    width={36}
                    height={44}
                    rx={4}
                    fill="#fff6df"
                    opacity={0.85}
                  />
                </g>
              ))}
            </g>
          );
        })}
        <path d="M600 140 l60 -18 l10 10 l-48 26Z" fill="#fff" stroke="#9ab" strokeWidth={3} />
        <Sign text="TAXI" color="#2b2b2b" edition={edition} />
      </g>
    );
  }

  // Café
  if (edition.flag === "se") {
    return (
      <g>
        <rect width={VIEW_W} height={VIEW_H} fill="#dcecf3" />
        {Array.from({ length: 20 }, (_, i) => (
          <rect key={i} x={i * 50} y={0} width={4} height={VIEW_H} fill="#cbe0ea" />
        ))}
        <Shelf y={250} />
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <rect
              x={80 + i * 112}
              y={186}
              width={64}
              height={64}
              rx={10}
              fill={i % 2 ? "#ffffff" : "#f7d36b"}
              stroke={INK}
              strokeWidth={3}
            />
            <path d={`M${144 + i * 112} 200 q22 4 0 30`} fill="none" stroke={INK} strokeWidth={4} />
          </g>
        ))}
        <rect x={680} y={300} width={250} height={150} rx={16} fill="#2b2b2b" />
        <path
          d="M710 340 q40 -20 80 0 M710 380 q60 -16 120 0 M710 420 q30 -14 70 0"
          fill="none"
          stroke="#fff"
          strokeWidth={4}
          opacity={0.75}
        />
        <Sign text="FIKA" color="#006aa7" edition={edition} />
      </g>
    );
  }
  return (
    <g>
      <rect width={VIEW_W} height={VIEW_H} fill="#f6e3c6" />
      <rect x={0} y={0} width={VIEW_W} height={120} fill="#efd3a8" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 90} y={0} width={44} height={120} fill="#e8c38f" />
      ))}
      <rect
        x={70}
        y={170}
        width={300}
        height={190}
        rx={16}
        fill="#2b2b2b"
        stroke="#7a4a2a"
        strokeWidth={10}
      />
      <path
        d="M100 210 q60 -20 120 0 M100 250 q90 -18 200 0 M100 290 q50 -14 110 0 M100 330 q80 -18 160 0"
        fill="none"
        stroke="#fff"
        strokeWidth={4}
        opacity={0.75}
      />
      <rect
        x={720}
        y={300}
        width={200}
        height={170}
        rx={18}
        fill="#b8c2c8"
        stroke={INK}
        strokeWidth={4}
      />
      <rect x={740} y={320} width={160} height={40} rx={8} fill="#8c979e" />
      <rect x={770} y={360} width={18} height={50} fill={INK} />
      <rect x={852} y={360} width={18} height={50} fill={INK} />
      <Sign text="CAFÉ" color="#8a5330" edition={edition} />
    </g>
  );
}

/** What sits in front of the characters: the bar, the taxi's doors, the gates. */
function Foreground({ kind, edition }: { kind: SceneKind; edition: EditionInfo }) {
  if (kind === "bar") {
    const de = edition.flag === "de";
    return (
      <g>
        <Counter
          top={de ? "#7a4a2a" : "#8a5330"}
          front={de ? "#4d2f1c" : "#6b3e22"}
          panel={de ? "#5d3a23" : "#7a4a2a"}
        />
        <Beer x={150} />
        <ellipse cx={500} cy={548} rx={70} ry={16} fill="#fff6df" />
        {de ? (
          <path
            d="M470 538 q30 -36 60 0 q-30 -10 -60 0 M478 520 q22 26 44 0"
            fill="none"
            stroke="#a8622b"
            strokeWidth={10}
            strokeLinecap="round"
          />
        ) : (
          [0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={466 + i * 17} cy={534 + (i % 2) * 6} r={14} fill="#d8872f" />
          ))
        )}
      </g>
    );
  }

  if (kind === "metro") {
    return (
      <g>
        <rect x={0} y={540} width={VIEW_W} height={36} fill="#8f9aa3" />
        <rect x={0} y={576} width={VIEW_W} height={VIEW_H - 576} fill="#33414f" />
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x={24 + i * 162} y={598} width={140} height={110} rx={12} fill="#3d4d5c" />
        ))}
        {[40, 900].map((x) => (
          <g key={x}>
            <rect x={x} y={524} width={60} height={30} rx={6} fill="#1f2a33" />
            <rect x={x + 12} y={532} width={36} height={12} rx={3} fill="#3ccf6e" />
          </g>
        ))}
      </g>
    );
  }

  if (kind === "taxi") {
    const body = edition.flag === "de" ? "#efe4c3" : edition.flag === "se" ? "#f4f4f4" : "#ffffff";
    return (
      <g>
        <rect x={0} y={640} width={VIEW_W} height={80} fill="#5d6770" />
        {/* Roof and pillars over the heads, then the doors below them. */}
        <rect
          x={60}
          y={196}
          width={880}
          height={30}
          rx={14}
          fill={body}
          stroke={INK}
          strokeWidth={5}
        />
        <rect
          x={420}
          y={150}
          width={160}
          height={48}
          rx={10}
          fill="#ffd23f"
          stroke={INK}
          strokeWidth={5}
        />
        <text
          x={500}
          y={184}
          textAnchor="middle"
          fontSize={30}
          fontWeight={800}
          fill={INK}
          style={{ fontFamily: "var(--font-display)" }}
        >
          TAXI
        </text>
        <rect x={60} y={222} width={22} height={330} fill={body} stroke={INK} strokeWidth={5} />
        <rect x={918} y={222} width={22} height={330} fill={body} stroke={INK} strokeWidth={5} />
        <rect x={489} y={222} width={22} height={330} fill={body} stroke={INK} strokeWidth={5} />
        <rect
          x={30}
          y={530}
          width={940}
          height={130}
          rx={30}
          fill={body}
          stroke={INK}
          strokeWidth={5}
        />
        {edition.flag === "es" && <path d="M40 600 L960 560 L960 590 L40 630Z" fill="#c8102e" />}
        {edition.flag === "se" && <rect x={30} y={584} width={940} height={22} fill="#fecc00" />}
        <rect x={420} y={556} width={60} height={12} rx={6} fill={INK} />
        <rect x={860} y={556} width={60} height={12} rx={6} fill={INK} />
        <circle cx={200} cy={676} r={52} fill="#22282d" />
        <circle cx={200} cy={676} r={22} fill="#9aa4ab" />
        <circle cx={800} cy={676} r={52} fill="#22282d" />
        <circle cx={800} cy={676} r={22} fill="#9aa4ab" />
      </g>
    );
  }

  // Café counter: cups and something to eat, by country.
  return (
    <g>
      <Counter top="#c58b5a" front="#9a6a43" panel="#a8774e" />
      {[150, 210].map((x) => (
        <g key={x}>
          <rect
            x={x}
            y={500}
            width={46}
            height={44}
            rx={8}
            fill="#fff"
            stroke={INK}
            strokeWidth={4}
          />
          <path d={`M${x + 46} 510 q16 2 0 24`} fill="none" stroke={INK} strokeWidth={4} />
        </g>
      ))}
      <ellipse cx={520} cy={548} rx={80} ry={16} fill="#fff6df" />
      {edition.flag === "se" ? (
        [0, 1, 2].map((i) => (
          <g key={i}>
            <circle cx={480 + i * 40} cy={528} r={20} fill="#c98a45" />
            <path
              d={`M${470 + i * 40} 528 a10 10 0 1 1 10 8`}
              fill="none"
              stroke="#8a5328"
              strokeWidth={4}
            />
          </g>
        ))
      ) : (
        <path
          d="M466 540 Q520 492 574 540 Q520 526 466 540Z"
          fill="#e0a052"
          stroke="#a8622b"
          strokeWidth={4}
        />
      )}
    </g>
  );
}

export default function GameStage({ kind, edition, talking, mood, children, floor }: Props) {
  const clip = `gs-flag-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // Heads sit lower in a taxi, framed by the windows.
  const headY = kind === "taxi" ? 410 : 432;
  const apron = kind === "bar" || kind === "cafe";

  return (
    <div
      className={`game-stage gs-scene-${kind}${floor ? " has-floor" : ""}`}
      style={{ "--floor": floorColor(kind, edition) } as CSSProperties}
    >
      <div className="game-stage-scene">
        <svg
          className="game-stage-svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={`Convi and a local, ${kind === "cafe" ? "at a café" : kind === "bar" ? "at a bar" : kind === "metro" ? "in the metro" : "in a taxi"} in ${edition.country}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <clipPath id={clip}>
              <rect width={54} height={36} rx={6} />
            </clipPath>
          </defs>
          <FlagClip.Provider value={clip}>
            <Background kind={kind} edition={edition} />
          </FlagClip.Provider>
          {kind === "taxi" && <rect x={82} y={226} width={836} height={320} fill="#cfe9f7" />}
          <Character
            x={CONVI_X * VIEW_W}
            y={headY}
            who="convi"
            talking={talking === "convi"}
            mood={mood}
          >
            <Convi />
          </Character>
          <Character
            x={LOCAL_X * VIEW_W}
            y={headY}
            who="local"
            talking={talking === "local"}
            mood="idle"
          >
            <Local edition={edition} apron={apron} />
          </Character>
          <Foreground kind={kind} edition={edition} />
        </svg>
        {children}
      </div>
      {floor && <div className="game-floor">{floor}</div>}
    </div>
  );
}
