import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { categorical, ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture is Part 2's
 * (da-pandas/parts.tsx) and the scales and reference lines Part 3's
 * (da-statistics-communication/parts.tsx), so the series stays one family.
 * What is new here is a small charting kit for drawing a chart twice, the
 * wrong way and the right way: bars, a line, a pie, a y axis with its ticks,
 * and the verdict each version gets.
 */
export { Drift, Headline, Kicker, Mark, MARK, MARK_BAD, MARK_OK, Mono, pulse, Strike, Svg, X0 } from "../da-pandas/parts";
export { at, Bracket, mulberry32, type Scale, VLine } from "../da-statistics-communication/parts";

/** Categories, in the brand's non-semantic hues: blue, then the accents. */
export const CATS = [...categorical, ds("blue", 300), ds("teal", 300), ds("purple", 300), ds("orange", 300)];

const tickText = (size = 18): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: 500,
  fill: INK_SOFT,
  fontVariantNumeric: "tabular-nums",
});

/** Where a value lands between a baseline (lo) and a top (hi), in pixels. */
const yOf = (v: number, lo: number, hi: number, base: number, top: number) => base - ((v - lo) / (hi - lo)) * (base - top);

/** The pixel centre of band i of n between x0 and x1. */
export const bandMid = (i: number, n: number, x0: number, x1: number) => x0 + ((i + 0.5) * (x1 - x0)) / n;

export type BarSetProps = {
  values: readonly number[];
  labels?: readonly string[];
  x0: number;
  x1: number;
  base: number;
  top: number;
  lo: number;
  hi: number;
  at: number;
  /** Frames between one bar and the next. */
  step?: number;
  color?: string | readonly string[];
  /** Bar width as a share of its band; 1 makes them touch (a histogram). */
  fill?: number;
  labelSize?: number;
  out?: number;
  dim?: number;
  /** A paper-colored edge round each bar, so touching bars stay countable. */
  edge?: boolean;
};

/**
 * Bars on a baseline, growing one after another from `at`. A value below
 * the domain's floor draws no bar (it would hang below the axis), which is
 * what a truncated axis does to it.
 */
export const BarSet: React.FC<BarSetProps> = ({
  values,
  labels,
  x0,
  x1,
  base,
  top,
  lo,
  hi,
  at: from,
  step = 2,
  color = BAR,
  fill = 0.68,
  labelSize = 18,
  out,
  dim,
  edge = false,
}) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (o >= 1 || frame < from) return null;
  const n = values.length;
  const band = (x1 - x0) / n;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <line x1={x0} x2={x0 + (x1 - x0) * ease(frame, from, 14)} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
      {values.map((v, i) => {
        const g = ease(frame, from + 4 + i * step, 12);
        const h = Math.max(0, base - yOf(Math.max(v, lo), lo, hi, base, top)) * g;
        const w = band * fill;
        const x = x0 + i * band + (band - w) / 2;
        const c = typeof color === "string" ? color : color[i % color.length];
        return (
          <g key={i}>
            {h > 0 ? <rect x={x} y={base - h} width={w} height={h} fill={c} stroke={edge ? PAPER : undefined} strokeWidth={edge ? 1.5 : undefined} /> : null}
            {labels ? (
              <text x={x + w / 2} y={base + 24} textAnchor="middle" style={tickText(labelSize)} opacity={ease(frame, from + 6 + i * step, 8)}>
                {labels[i]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

/** A line through values at band centres, drawn on from `at`, with dots. */
export const LineSet: React.FC<{
  values: readonly (number | null)[];
  x0: number;
  x1: number;
  base: number;
  top: number;
  lo: number;
  hi: number;
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  dots?: boolean;
  labels?: readonly string[];
  labelSize?: number;
  axis?: boolean;
  out?: number;
  dim?: number;
  /** Draw the line in bands rather than at band centres (a time axis). */
  edges?: boolean;
}> = ({ values, x0, x1, base, top, lo, hi, at: from, dur = 20, color = BAR, width = 3.2, dots = true, labels, labelSize = 18, axis = true, out, dim, edges = false }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (o >= 1 || frame < from) return null;
  const n = values.length;
  const xAt = (i: number) => (edges ? x0 + (i * (x1 - x0)) / (n - 1) : bandMid(i, n, x0, x1));
  const p = ease(frame, from + 4, dur);
  // Runs of present values, so a null breaks the line instead of bridging it.
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push([xAt(i), yOf(v, lo, hi, base, top)]);
  });
  if (run.length) runs.push(run);
  const reach = x0 + (x1 - x0) * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {axis ? <line x1={x0} x2={x0 + (x1 - x0) * ease(frame, from, 14)} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} /> : null}
      <g style={{ clipPath: `inset(-40px ${1920 - reach}px -40px 0px)` }}>
        {runs.map((r, k) => (
          <path key={k} d={r.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {dots ? runs.flat().map(([x, y], i) => <circle key={i} cx={x} cy={y} r={width * 1.5} fill={color} />) : null}
      </g>
      {labels
        ? labels.map((l, i) => (
            <text key={i} x={xAt(i)} y={base + 24} textAnchor="middle" style={tickText(labelSize)} opacity={ease(frame, from + 6, 10)}>
              {l}
            </text>
          ))
        : null}
    </svg>
  );
};

/** Ticks and their numbers up the left of a plot, drawn on `at`. */
export const YTicks: React.FC<{
  ticks: readonly number[];
  x: number;
  x1?: number;
  base: number;
  top: number;
  lo: number;
  hi: number;
  at: number;
  format?: (v: number) => string;
  out?: number;
  grid?: boolean;
  color?: string;
}> = ({ ticks, x, x1, base, top, lo, hi, at: from, format = String, out, grid = false, color = INK_SOFT }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p * (1 - o) }}>
      {ticks.map((t) => {
        const y = yOf(t, lo, hi, base, top);
        return (
          <g key={t}>
            {grid && x1 !== undefined ? <line x1={x} x2={x1} y1={y} y2={y} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} /> : null}
            <text x={x - 10} y={y + 6} textAnchor="end" style={{ ...tickText(17), fill: color }}>
              {format(t)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** Numbers along a continuous x axis, at their own positions, drawn on `at`. */
export const XTicks: React.FC<{
  ticks: readonly number[];
  x0: number;
  x1: number;
  lo: number;
  hi: number;
  y: number;
  at: number;
  out?: number;
  format?: (v: number) => string;
  size?: number;
  /** A pulse (0 to 1) that lifts the numbers, when the narration points at them. */
  lift?: number;
}> = ({ ticks, x0, x1, lo, hi, y, at: from, out, format = String, size = 18, lift = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p * (1 - o) }}>
      {ticks.map((t) => {
        const x = x0 + ((t - lo) / (hi - lo)) * (x1 - x0);
        return (
          <g key={t} transform={`translate(${x},${y}) scale(${1 + 0.18 * lift})`}>
            <line x1={0} x2={0} y1={-24} y2={-17} stroke={INK} strokeWidth={1.4} />
            <text x={0} y={0} textAnchor="middle" style={{ ...tickText(size), fill: lift > 0.05 ? INK : INK_SOFT }}>
              {format(t)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** A pie as wedges swept in from twelve o'clock, on `at`. */
export const Pie: React.FC<{
  values: readonly number[];
  cx: number;
  cy: number;
  r: number;
  at: number;
  colors?: readonly string[];
  out?: number;
  labels?: readonly string[];
  labelSize?: number;
}> = ({ values, cx, cy, r, at: from, colors = CATS, out, labels, labelSize = 17 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 22);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const total = values.reduce((s, v) => s + v, 0);
  let a = -Math.PI / 2;
  const sweep = 2 * Math.PI * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      {values.map((v, i) => {
        const span = (v / total) * 2 * Math.PI;
        const a0 = a;
        a += span;
        const start = Math.min(a0 + Math.PI / 2, sweep) - Math.PI / 2;
        const end = Math.min(a0 + span + Math.PI / 2, sweep) - Math.PI / 2;
        if (end <= start) return null;
        const large = end - start > Math.PI ? 1 : 0;
        const d = `M${cx},${cy} L${cx + r * Math.cos(start)},${cy + r * Math.sin(start)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(end)},${cy + r * Math.sin(end)} Z`;
        const mid = (a0 + a0 + span) / 2;
        return (
          <g key={i}>
            <path d={d} fill={colors[i % colors.length]} stroke={PAPER} strokeWidth={2} />
            {labels && p >= 1 ? (
              <text
                x={cx + r * 1.22 * Math.cos(mid)}
                y={cy + r * 1.22 * Math.sin(mid) + 6}
                textAnchor={Math.cos(mid) > 0.2 ? "start" : Math.cos(mid) < -0.2 ? "end" : "middle"}
                style={{ ...tickText(labelSize), fill: INK }}
                opacity={ease(frame, from + 22, 10)}
              >
                {labels[i]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

/**
 * A version's verdict, in the series' colors: a green tick for the chart
 * that answers the question, a red cross for the one that misleads, with a
 * few words beside it.
 */
export const Verdict: React.FC<{ ok: boolean; x: number; y: number; at: number; out?: number; children?: React.ReactNode }> = ({
  ok,
  x,
  y,
  at: from,
  out,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 10);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const color = ok ? OK : ACCENT;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 10, opacity: (1 - o) * p, whiteSpace: "nowrap" }}>
      <svg width={28} height={28} viewBox="0 0 24 24" style={{ overflow: "visible" }}>
        {ok ? (
          <path d="M4 12.5 L10 18 L20 6" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
        ) : (
          <path d="M5 5 L19 19 M19 5 L5 19" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
        )}
      </svg>
      {children ? <span style={{ ...label(22, ok ? OK_INK : ACCENT_INK) }}>{children}</span> : null}
    </div>
  );
};

/** A small panel title over a chart. */
export const PanelTitle: React.FC<{ x: number; y: number; at: number; out?: number; children: React.ReactNode }> = ({ x, y, at: from, out, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top: y, ...label(22, INK), whiteSpace: "nowrap", opacity: p * (1 - o) }}>{children}</div>;
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  /** Another video's folder, for art the series shares. */
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, video = VIDEO, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  // Another video's art is always there; this video's waits for its file.
  if ((video === VIDEO && !ILLUSTRATIONS) || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={video}
      id={id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};
