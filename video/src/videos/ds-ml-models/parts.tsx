import React, { useId } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { BAR, INK_SOFT, PAPER, label } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";
import { at, type Scale } from "../da-statistics-communication/parts";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture and the plot pieces (the
 * slow push, headings, highlighter and strike, axes, dots, reference lines,
 * brackets) come from the Data Analyst statistics video, so the two series
 * stay one family. What is new here is what a classifier draws: two classes
 * of points, the regions a model assigns to each, and a plot box to hold
 * them, plus a curve drawn along its length.
 */
export {
  at,
  Axes,
  Bracket,
  chartLabel,
  Dots,
  Drift,
  ElbowArrow,
  Headline,
  Kicker,
  Mark,
  MARK_OK,
  mulberry32,
  OK,
  OK_INK,
  pulse,
  type Scale,
  Strike,
  Svg,
  VLine,
  WARM,
  WARM_INK,
  X0,
} from "../da-statistics-communication/parts";

/** The two classes every classifier here separates, and a third for k-means. */
export const C0 = BAR;
export const C1 = ds("purple", 500);
export const C2 = ds("teal", 500);
export const CLASS = [C0, C1, C2] as const;
/** The regions behind them: the same hues, washed out. */
export const TINT = [
  ds("blue", 100),
  ds("purple", 100),
  ds("teal", 100),
] as const;

/** A plot's box in page pixels. */
export type Box = { left: number; top: number; width: number; height: number };

/** The two scales that put data limits onto a box (y grows upward). */
export const scales = (
  box: Box,
  xlim: readonly [number, number],
  ylim: readonly [number, number],
): { x: Scale; y: Scale } => ({
  x: { lo: xlim[0], hi: xlim[1], a: box.left, b: box.left + box.width },
  y: { lo: ylim[0], hi: ylim[1], a: box.top + box.height, b: box.top },
});

/**
 * A classifier's decision regions: one row of the grid per string, a digit
 * per cell, bottom row first, as check.mjs wrote them. Each run of one class
 * along a row is one rectangle, and the whole map wipes in left to right on
 * `at`, clipped to its box.
 */
export const Regions: React.FC<{
  grid: readonly string[];
  box: Box;
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  opacity?: number;
}> = ({ grid, box, at: from, dur = 18, out, dim, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const ny = grid.length;
  const nx = grid[0].length;
  const cw = box.width / (nx - 1);
  const ch = box.height / (ny - 1);
  const rects: React.ReactNode[] = [];
  grid.forEach((row, r) => {
    let start = 0;
    for (let c = 1; c <= nx; c++) {
      if (c === nx || row[c] !== row[start]) {
        rects.push(
          <rect
            key={`${r}-${start}`}
            x={box.left + (start - 0.5) * cw}
            y={box.top + box.height - (r + 0.5) * ch}
            width={(c - start) * cw + 0.6}
            height={ch + 0.6}
            fill={TINT[Number(row[start])]}
          />,
        );
        start = c;
      }
    }
  });
  return (
    <svg
      width={1920}
      height={1080}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        opacity: opacity * (1 - o) * (1 - d),
      }}
    >
      <defs>
        <clipPath id={`r${id}`}>
          <rect
            x={box.left}
            y={box.top}
            width={box.width * p}
            height={box.height}
            rx={6}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#r${id})`}>{rects}</g>
    </svg>
  );
};

/** A plot box's frame: a hairline rectangle, drawn on `at`. */
export const Frame: React.FC<{
  box: Box;
  at: number;
  out?: number;
  color?: string;
}> = ({ box, at: from, out, color = INK_SOFT }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <svg
      width={1920}
      height={1080}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        opacity: 0.55 * p * (1 - o),
      }}
    >
      <rect
        x={box.left}
        y={box.top}
        width={box.width}
        height={box.height}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        rx={6}
      />
    </svg>
  );
};

/**
 * Points in data units, colored by class: each pops in on its own frame
 * across `spread`, ringed in paper so it reads on any region behind it.
 * `r` may be one radius or one per point (AdaBoost's weights).
 */
export const Points: React.FC<{
  xs: readonly number[];
  ys: readonly number[];
  labels?: readonly number[];
  sx: Scale;
  sy: Scale;
  at: number;
  spread?: number;
  r?: number | readonly number[];
  out?: number;
  dim?: number;
  color?: string;
  opacity?: number;
}> = ({
  xs,
  ys,
  labels,
  sx,
  sy,
  at: from,
  spread = 16,
  r = 6,
  out,
  dim,
  color,
  opacity = 0.9,
}) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.7;
  if (o >= 1) return null;
  return (
    <svg
      width={1920}
      height={1080}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        opacity: (1 - o) * (1 - d),
      }}
    >
      {xs.map((x, i) => {
        const s = ease(frame, from + (i / Math.max(1, xs.length)) * spread, 8);
        if (s <= 0) return null;
        const rad = typeof r === "number" ? r : r[i];
        const fill = color ?? CLASS[labels ? labels[i] : 0];
        return (
          <circle
            key={i}
            cx={at(sx, x)}
            cy={at(sy, ys[i])}
            r={rad * s}
            fill={fill}
            opacity={opacity}
            stroke={PAPER}
            strokeWidth={1.4}
          />
        );
      })}
    </svg>
  );
};

/**
 * A line through data points, drawn along its length from `at` over `dur`
 * frames and clipped to `clip`, so a fit that leaves the plot leaves through
 * the frame instead of over the page. `out` fades it; `dim` sets it back.
 */
export const Curve: React.FC<{
  points: readonly (readonly [number, number])[];
  x: Scale;
  y: Scale;
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color: string;
  width?: number;
  dash?: string;
  clip?: Box;
  opacity?: number;
}> = ({
  points,
  x,
  y,
  at: from,
  dur = 24,
  out,
  dim,
  color,
  width = 3,
  dash,
  clip,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.75;
  if (p <= 0 || o >= 1) return null;
  const px = points.map(([a, b]) => [at(x, a), at(y, b)] as const);
  const path = px
    .map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`)
    .join(" ");
  // A dashed line cannot also be drawn by its dash array, so it wipes in
  // behind a growing clip instead.
  const x0 = clip ? clip.left : 0;
  const wipe = dash
    ? px[0][0] + (px[px.length - 1][0] - px[0][0]) * p
    : undefined;
  return (
    <svg
      width={1920}
      height={1080}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        opacity: opacity * (1 - o) * (1 - d),
      }}
    >
      <defs>
        <clipPath id={`c${id}`}>
          <rect
            x={x0}
            y={clip ? clip.top : 0}
            width={(wipe ?? (clip ? clip.left + clip.width : 1920)) - x0}
            height={clip ? clip.height : 1080}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={dash ? undefined : 1}
          strokeDasharray={dash ?? `${p} 1`}
        />
      </g>
    </svg>
  );
};

/** Fades its children in from `from` and, optionally, out from `out`. */
export const Fade: React.FC<{
  from: number;
  out?: number;
  children: React.ReactNode;
}> = ({ from, out, children }) => {
  const frame = useCurrentFrame();
  const o =
    ease(frame, from, 8) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  return o > 0 ? (
    <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
  ) : null;
};

/** A small title over a panel, in the chart face. */
export const PanelTitle: React.FC<{
  x: number;
  y: number;
  at: number;
  out?: number;
  dim?: number;
  color?: string;
  children: React.ReactNode;
}> = ({ x, y, at: from, out, dim, color = INK_SOFT, children }) => {
  const frame = useCurrentFrame();
  const o =
    ease(frame, from, 12) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        whiteSpace: "nowrap",
        opacity: o * (1 - d),
        ...label(22, color),
        fontWeight: 650,
      }}
    >
      {children}
    </div>
  );
};

/** The watercolor hero from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
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
  // Another video's art is already on disk; only this video's own waits for import.
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
