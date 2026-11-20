import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { Mark } from "../da-pandas/parts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The plot furniture (scales, axes, dots,
 * reference lines, brackets) is the Data Analyst statistics video's
 * (da-statistics-communication/parts.tsx), and the drift, highlighter and
 * strike are da-pandas's (whose Mark takes its bleed back as margin), so the
 * statistics videos stay one family. What is local: a histogram drawn from
 * results.json's counts and edges with any bin in its own ink, a curve and
 * the area under it, a line of text that inks in, a numbered step, and the
 * spot illustrations with their natural sizes.
 */
export { at, Axes, Bracket, Dots, mulberry32, type Scale, VLine } from "../da-statistics-communication/parts";
export { Drift, Headline, Kicker, lerp, Mark, pulse, Strike, Svg } from "../da-pandas/parts";
export { OK, OK_INK };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
/** The page's right margin. */
export const RIGHT = 1800;

// ── Colors: one meaning each (interview.tsx) ─────────────────────────────────

/** A line or a shape the narration points at: yellow deep enough to find. */
export const POINT = ds("yellow", 600);
export const POINT_FILL = ds("yellow", 300);
export const POINT_INK = inkOf.yellow;
/** The trap or the error. */
export const BAD = ACCENT;
export const BAD_INK = ACCENT_INK;
export const BAD_FILL = ds("red", 300);
export const OK_FILL = ds("green", 300);
/** Data the figure leaves in the background: a wrong answer, an unknown. */
export const MUTED = ds("gray", 300);
export const DATA = BAR;
export const DATA_INK = BLUE_INK;
export const DATA_FILL = ds("blue", 200);
export { HIGHLIGHT, INK, INK_SOFT, PAPER };

/** "9.0%" from 0.0902; trailing ".0" kept only when asked. */
export const pctText = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
export const commas = (v: number) => v.toLocaleString("en-US");

// ── Text ─────────────────────────────────────────────────────────────────────

/** A line of text that inks in at `at` and fades on `out`: the page's notes. */
export const Line: React.FC<{
  at: number;
  x: number;
  y: number;
  out?: number;
  dim?: number;
  size?: number;
  color?: string;
  weight?: number;
  align?: "left" | "right" | "center";
  width?: number;
  children: React.ReactNode;
}> = ({ at, x, y, out, dim, size = 26, color = INK, weight = 500, align = "left", width, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  const left = align === "left" ? x : align === "right" ? x - (width ?? 0) : x - (width ?? 0) / 2;
  return (
    <Ink at={at} dur={14} out={out} style={{ left, top: y, width, textAlign: align, opacity: 1 - d }}>
      <span style={{ ...note(size, color), fontWeight: weight, whiteSpace: "nowrap", fontSize: size }}>{children}</span>
    </Ink>
  );
};

/** A heading over a figure or a column: Inter, ink, one size. */
export const Heading: React.FC<{ at: number; x: number; y: number; out?: number; dim?: number; size?: number; children: React.ReactNode }> = ({
  at,
  x,
  y,
  out,
  dim,
  size = 26,
  children,
}) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  return (
    <Ink at={at} dur={14} out={out} style={{ left: x, top: y, whiteSpace: "nowrap", opacity: 1 - d }}>
      <span style={{ ...label(size, INK), fontWeight: 600 }}>{children}</span>
    </Ink>
  );
};

/** A numbered step's numeral: a tinted disc with no ring (README, badges). */
export const StepDisc: React.FC<{ n: number; size?: number; lit?: number }> = ({ n, size = 26, lit = 0 }) => {
  const d = Math.round(size * 1.6);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: d,
        height: d,
        borderRadius: "50%",
        background: lit > 0.5 ? HIGHLIGHT : `color-mix(in srgb, ${ds("blue", 400)} 24%, transparent)`,
        color: lit > 0.5 ? INK : BLUE_INK,
        ...label(size, lit > 0.5 ? INK : BLUE_INK),
        fontWeight: 600,
        flex: "none",
      }}
    >
      {n}
    </span>
  );
};

// ── Curves, areas and histograms (page pixels) ───────────────────────────────

/**
 * A curve through page-pixel points that draws itself from left to right on
 * `at` over `dur` frames (ds-statistics/parts.tsx).
 */
export const Curve: React.FC<{
  points: readonly (readonly [number, number])[];
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color: string;
  width?: number;
  dash?: string;
  opacity?: number;
}> = ({ points, at: from, dur = 22, out, dim, color, width = 3, dash, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.7;
  if (p <= 0 || o >= 1 || points.length < 2) return null;
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) * opacity }}>
      {dash ? (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeDasharray={dash}
          strokeLinejoin="round"
          style={{ clipPath: `inset(-20px ${(1 - p) * 100}% -20px -20px)` }}
        />
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
      )}
    </svg>
  );
};

/** The area under a curve down to `base`, between page x `x0` and `x1`,
 *  fading in on `at`. `points` are the curve's samples, left to right. */
export const Area: React.FC<{
  points: readonly (readonly [number, number])[];
  x0: number;
  x1: number;
  base: number;
  at: number;
  out?: number;
  color: string;
  opacity?: number;
}> = ({ points, x0, x1, base, at: from, out, color, opacity = 0.6 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const inside = points.filter(([x]) => x >= x0 && x <= x1);
  if (inside.length < 2) return null;
  const path = `M${inside[0][0]},${base} ${inside.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} L${inside[inside.length - 1][0]},${base} Z`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p * (1 - o) * opacity }}>
      <path d={path} fill={color} stroke="none" />
    </svg>
  );
};

/** A normal density's samples as page points: `mu`, `sd` in data units over
 *  `lo..hi`, mapped to `x0..x1`, peak `height` px above `base`. */
export const normalPoints = (o: { mu: number; sd: number; lo: number; hi: number; x0: number; x1: number; base: number; height: number; steps?: number }) => {
  const steps = o.steps ?? 160;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const v = o.lo + ((o.hi - o.lo) * i) / steps;
    const z = (v - o.mu) / o.sd;
    return [o.x0 + ((v - o.lo) / (o.hi - o.lo)) * (o.x1 - o.x0), o.base - Math.exp(-0.5 * z * z) * o.height] as const;
  });
};

/**
 * A histogram from counts and their bin edges (results.json), as filled bars
 * with no outline on a baseline. `ink(i)` colors a bar (a tail, an interval);
 * `grow(i)` raises bars one after another. Heights scale so the tallest bar is
 * `height` px.
 */
export const Hist: React.FC<{
  counts: readonly number[];
  edges: readonly number[];
  x: (v: number) => number;
  base: number;
  height: number;
  max?: number;
  ink?: (i: number) => string;
  grow?: (i: number) => number;
  gap?: number;
  out?: number;
  dim?: number;
}> = ({ counts, edges, x, base, height, max, ink, grow, gap = 2, out, dim }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (o >= 1) return null;
  const top = max ?? Math.max(...counts);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {counts.map((c, i) => {
        const g = grow ? grow(i) : 1;
        if (c <= 0 || g <= 0) return null;
        const x0 = x(edges[i]);
        const w = Math.max(1, x(edges[i + 1]) - x0 - gap);
        const h = (c / top) * height * g;
        return <rect key={i} x={x0 + gap / 2} y={base - h} width={w} height={h} fill={ink ? ink(i) : DATA} />;
      })}
    </svg>
  );
};

/** A plain baseline with ticks and their numbers under it, in page pixels. */
export const Baseline: React.FC<{
  x0: number;
  x1: number;
  base: number;
  ticks: readonly { v: number; x: number; text: React.ReactNode }[];
  at: number;
  out?: number;
  size?: number;
  title?: React.ReactNode;
}> = ({ x0, x1, base, ticks, at: from, out, size = 20, title }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 16);
  const t = ease(frame, from + 6, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
        <line x1={x0} x2={x0 + (x1 - x0) * p} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
        <g opacity={t}>
          {ticks.map((k) => (
            <line key={k.v} x1={k.x} x2={k.x} y1={base + 1} y2={base + 7} stroke={INK} strokeWidth={1.2} />
          ))}
        </g>
      </svg>
      {ticks.map((k) => (
        <div
          key={k.v}
          style={{
            position: "absolute",
            left: k.x - 80,
            width: 160,
            top: base + 10,
            textAlign: "center",
            ...label(size, INK_SOFT),
            fontVariantNumeric: "tabular-nums lining-nums",
            whiteSpace: "nowrap",
            opacity: t * (1 - o),
          }}
        >
          {k.text}
        </div>
      ))}
      {title ? (
        <div style={{ position: "absolute", right: 1920 - x1, top: base + 44, ...label(19, INK_SOFT), whiteSpace: "nowrap", opacity: t * (1 - o) }}>{title}</div>
      ) : null}
    </>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each watercolor's natural size in pixels, after the import's trim. At 4K
 *  an image may be drawn at most half that on the 1080p layout. */
export const SPOTS = {
  zebra: [1034, 1017],
  bank: [1018, 973],
  "ice-cream": [574, 1024],
} as const satisfies Record<string, readonly [number, number]>;
export type SpotId = keyof typeof SPOTS;

/** A spot's drawn height at width `w`, from its natural aspect. */
export const spotH = (id: SpotId, w: number) => Math.round((w * SPOTS[id][1]) / SPOTS[id][0]);

/**
 * A watercolor from illustrations.json, `w` wide at (x, y): it pops in on
 * `at` (with an `el-pop` cued by the scene on the same frame), bobs gently,
 * and fades on `out`.
 */
export const Spot: React.FC<{ id: SpotId; at: number; out?: number; x: number; y: number; w: number; phase?: number }> = ({
  id,
  at,
  out,
  x,
  y,
  w,
  phase = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={`${VIDEO}-${id}`}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: spotH(id, w),
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame + phase, 4, 100) + (1 - p) * 24}px) scale(${0.85 + 0.15 * Math.min(1, p)})`,
      }}
    />
  );
};

/** Red and green as the series means them, for a tone picked by name. */
export const TONE_INK = { bad: BAD_INK, ok: OK_INK, point: POINT_INK, data: DATA_INK, ink: INK, soft: INK_SOFT } as const;
export const TONE_LINE = { bad: BAD, ok: OK, point: POINT, data: DATA, ink: INK, soft: INK_SOFT } as const;

/**
 * A question's key term, highlighted as it is read (the page moves while the
 * question is spoken). The punctuation after it stays with it on one line and
 * takes back the highlight's bleed, so "error?" does not read "error ?".
 */
export const QMark: React.FC<{ at: number; after?: string; children: React.ReactNode }> = ({ at, after, children }) => (
  <span style={{ whiteSpace: "nowrap" }}>
    <Mark at={at}>{children}</Mark>
    {after ? <span style={{ marginLeft: "-0.12em" }}>{after}</span> : null}
  </span>
);
