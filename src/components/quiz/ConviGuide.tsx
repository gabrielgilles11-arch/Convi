import type { ReactNode } from "react";

/**
 * Convi, speaking: the welcome screens' host.
 *
 * The same character as the reels, the home page (ConviPeek.astro) and Game
 * Mode (`Convi()` in GameStage.tsx): straw hat, green band, shades, red shirt
 * with yellow spots. The shapes are copied from those two so he can never look
 * like somebody else. If one of them changes, change this too.
 *
 * Decorative: what he says is in the bubble as text, which is what a screen
 * reader reads. The bob is transform-only and off under reduced motion.
 */
const SKIN = "#f2c9a0";

export function ConviFigure({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`convi-figure ${className}`.trim()}
      viewBox="-160 -160 320 460"
      aria-hidden="true"
      focusable="false"
    >
      <g className="convi-figure-body">
        <rect x={-118} y={84} width={236} height={210} rx={58} fill="#e8574a" />
        {[-80, -38, 4, 46, 88].map((x, i) => (
          <circle key={x} cx={x} cy={i % 2 ? 160 : 118} r={11} fill="#ffd36b" />
        ))}
        <g className="convi-figure-head">
          <rect x={-22} y={70} width={44} height={40} fill={SKIN} />
          <circle cx={0} cy={0} r={100} fill={SKIN} />
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
          <path
            d="M-30 46 Q0 76 30 46"
            fill="#7a2e2e"
            stroke="#7a2e2e"
            strokeWidth={8}
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}

/** Convi beside a speech bubble. The bubble holds whatever he is saying. */
export default function ConviGuide({
  children,
  size = "large",
}: {
  children: ReactNode;
  size?: "large" | "small";
}) {
  return (
    <div className={`convi-guide convi-guide--${size}`}>
      <ConviFigure />
      <div className="convi-bubble">{children}</div>
    </div>
  );
}
