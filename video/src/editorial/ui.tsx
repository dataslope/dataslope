import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { ease } from "../components/motion";
import { ds } from "../theme/brand";
import { ACCENT_INK, INK, PAPER, label } from "./style";

export const W = 1920;
export const H = 1080;
/** Left and right page margins. */
export const MARGIN = 96;

export type Pt = readonly [number, number];

/**
 * The page: warm paper with a whisper of grain, as pre-rendered images of
 * <PaperSource> below. Drawing the two full-frame noise filters live made
 * every frame of every editorial video about 3.6x slower to render, for a
 * picture that never changes.
 *
 * The 2x file is chosen whenever the render is scaled up (a 4K render is
 * --scale=2), so the grain stays at device resolution instead of being
 * stretched. Both come from `npm run paper`, which must be re-run after any
 * change to PaperSource, PAPER, INK or the yellow tone.
 */
export const Paper: React.FC = () => {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Img
        src={staticFile(dpr > 1 ? "editorial/paper@2x.webp" : "editorial/paper@1x.webp")}
        alt=""
        style={{ position: "absolute", inset: 0, width: W, height: H }}
      />
    </AbsoluteFill>
  );
};

/**
 * The source of the paper images: two seeded feTurbulence fields (fine
 * tooth, and a broad uneven tone) composited through brand inks, so it is
 * identical on every machine. Rendered by the PaperTexture still, never
 * placed in a video directly.
 */
export const PaperSource: React.FC = () => (
  <AbsoluteFill style={{ background: PAPER }}>
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, willChange: "transform" }}>
      <filter id="ed-tooth" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.2 0 0 0 -1.05"
          result="mask"
        />
        <feFlood style={{ floodColor: INK }} result="ink" />
        <feComposite in="ink" in2="mask" operator="in" />
      </filter>
      <filter id="ed-tone" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.0045" numOctaves="3" seed="4" result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.8 0 0 0 -0.7"
          result="mask"
        />
        <feFlood style={{ floodColor: ds("yellow", 300) }} result="tone" />
        <feComposite in="tone" in2="mask" operator="in" />
      </filter>
      <rect width={W} height={H} filter="url(#ed-tone)" opacity={0.16} />
      <rect width={W} height={H} filter="url(#ed-tooth)" opacity={0.075} />
    </svg>
  </AbsoluteFill>
);

/** Room the ink-in mask leaves around its glyphs, in px. */
const INK_BLEED = 40;

/**
 * A soft left-to-right wipe with a brief blur, the way ink soaks into paper.
 * `out` (optional) fades the block away again.
 */
export const Ink: React.FC<{
  at: number;
  dur?: number;
  out?: number;
  outDur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, dur = 18, out, outDur = 10, style, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const gone = out === undefined ? 0 : ease(frame, out, outDur);
  if (p <= 0 || gone >= 1) return null;
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, ${INK} ${edge - 18}%, transparent ${edge + 4}%)`;
  return (
    <div
      style={{
        position: "absolute",
        // A mask paints only inside the element's own box, and type set at a
        // line height near 1 hangs its descenders (g, p, y) and italic
        // overhangs outside it, so they were invisible until the reveal
        // finished and the mask came off. The bleed grows the box around the
        // glyphs without moving them. content-box keeps a caller's `width`
        // the width of the text: under border-box the padding came out of
        // it, and every sized block lost 80px.
        padding: INK_BLEED,
        margin: -INK_BLEED,
        boxSizing: "content-box",
        WebkitMaskImage: p < 1 ? mask : undefined,
        maskImage: p < 1 ? mask : undefined,
        filter: p < 1 ? `blur(${(1 - p) * 1.6}px)` : undefined,
        opacity: 1 - gone,
        transform: gone > 0 ? `translateY(${-gone * 10}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** An annotation that slides in from the side, optionally dimmed later. */
export const Note: React.FC<{
  at: number;
  x: number;
  y: number;
  dim?: number;
  out?: number;
  from?: "left" | "right" | "up";
  width?: number;
  align?: "left" | "right";
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, x, y, dim, out, from = "left", width, align = "left", style, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.72;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const dx = from === "left" ? -18 : from === "right" ? 18 : 0;
  const dy = from === "up" ? 14 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: align === "left" ? x : undefined,
        right: align === "right" ? W - x : undefined,
        top: y,
        width,
        textAlign: align,
        opacity: p * (1 - d) * (1 - o),
        transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** A thin leader line that draws itself from its first point to its last,
 *  ending in a small dot on the thing it points at. */
export const Leader: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  dim?: number;
  out?: number;
  color?: string;
  width?: number;
  dot?: boolean;
  dash?: string;
}> = ({ points, at, dur = 14, dim, out, color = INK, width = 1.6, dot = true, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.72;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const [ex, ey] = points[points.length - 1];
  return (
    <svg
      width={W}
      height={H}
      style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - d) * (1 - o) }}
    >
      {dash ? (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeDasharray={dash}
          style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}
        />
      ) : (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width}
          pathLength={1}
          strokeDasharray={`${p} 1`}
        />
      )}
      {dot ? <circle cx={ex} cy={ey} r={4} fill={color} opacity={ease(frame, at + dur - 4, 6)} /> : null}
    </svg>
  );
};

/** Figure labels share one size so the number and the title read as one
 *  line; the number takes the accent. */
const FIG_SIZE = 24;

/** "Fig. 1" and its title, set the way a data desk titles a chart: Inter,
 *  one size, the number in the accent. */
export const FigLabel: React.FC<{
  n: string;
  title: string;
  at: number;
  x: number;
  y: number;
  out?: number;
}> = ({ n, title, at, x, y, out }) => (
  <Ink at={at} out={out} style={{ left: x, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 12 }}>
    <span style={{ ...label(FIG_SIZE, ACCENT_INK), fontWeight: 700 }}>Fig. {n}</span>
    <span style={{ ...label(FIG_SIZE, INK), fontWeight: 560 }}>{title}</span>
  </Ink>
);
