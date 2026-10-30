import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../components/motion";
import { ACCENT_INK, body, HAIRLINE, INK, label, TABULAR } from "./style";

export const W = 1920;
export const H = 1080;
/** Left and right page margins. */
export const MARGIN = 96;

export type Pt = readonly [number, number];

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
        transform: gone > 0 ? `translateY(${-gone * 10}px)` : undefined,
        ...style,
        // A caller's own opacity (a dim) multiplies the fade-out rather than
        // replacing it: as a plain style it won, and anything passing both
        // stayed fully inked through its exit, then vanished.
        opacity: (1 - gone) * Number(style?.opacity ?? 1),
      }}
    >
      {children}
    </div>
  );
};

/**
 * A number in digits of one width, for a counter or a column that must not
 * shift as its digits change. Use it on the number alone: TABULAR over a
 * whole phrase also sets every hyphen a digit wide ("p - value").
 * `src/editorial/tabular.test.ts` fails on TABULAR over a hyphenated word.
 */
export const Num: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={TABULAR}>{children}</span>;

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

/**
 * The last words on screen of a video in a series: a hairline, then what the
 * next video takes up, cued to the narration's bridge into it. It sits in the
 * closing scene, wherever that scene has room, rather than on a card of its
 * own: the series has no end cards. `y` is a page position, already through
 * `useLayout().y()`.
 */
export const NextLine: React.FC<{
  at: number;
  x: number;
  y: number;
  width: number;
  children: React.ReactNode;
}> = ({ at, x, y, width, children }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <div
        style={{ position: "absolute", left: x, top: y, width, height: 1, background: HAIRLINE, opacity: ease(frame, at - 4, 12) }}
      />
      <Ink at={at} dur={18} style={{ left: x, top: y + 20, ...body(34, true), color: INK, whiteSpace: "nowrap" }}>
        Next: {children}
      </Ink>
    </>
  );
};
