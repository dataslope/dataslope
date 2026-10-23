import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The plot furniture (linear scales, axes,
 * dots, reference lines, brackets) is the Data Analyst statistics video's
 * (da-statistics-communication/parts.tsx), and the page furniture under it
 * Part 2's, so the two series stay one family. What is local: a curve drawn
 * from sampled points, a running count of labelled values, and the spot
 * illustration bound to this video.
 */
export {
  at,
  Axes,
  Bracket,
  chartLabel,
  Dots,
  Drift,
  Headline,
  Kicker,
  lerp,
  Mark,
  MARK_BAD,
  MARK_OK,
  mulberry32,
  OK,
  OK_INK,
  pulse,
  RULE,
  type Scale,
  Strike,
  Svg,
  VLine,
  WARM,
  WARM_INK,
  X0,
} from "../da-statistics-communication/parts";

/** A note in the annotation face that never wraps. */
export const noteText = (size = 24, color: string = INK): React.CSSProperties => ({ ...note(size, color), whiteSpace: "nowrap" });

/** A small caps-free label for a figure's parts. */
export const partLabel = (size = 21, color: string = INK_SOFT): React.CSSProperties => ({ ...label(size, color), whiteSpace: "nowrap" });

/**
 * A curve through page-pixel points that draws itself from left to right on
 * `at` over `dur` frames. `fill` shades the area under it down to `base`.
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
  fill?: string;
  base?: number;
}> = ({ points, at: from, dur = 22, out, dim, color, width = 3, dash, fill, base }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.7;
  if (p <= 0 || o >= 1 || points.length < 2) return null;
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const x0 = points[0][0];
  const x1 = points[points.length - 1][0];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {fill && base !== undefined ? (
        <path
          d={`${path} L${x1},${base} L${x0},${base} Z`}
          fill={fill}
          stroke="none"
          style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}
        />
      ) : null}
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
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${p} 1`}
        />
      )}
    </svg>
  );
};

/** A watercolor spot from this video's illustrations.json, or another
 *  video's: it pops in on `at`, bobs gently, and fades on `out`. Only this
 *  video's own art waits on ILLUSTRATIONS. */
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
