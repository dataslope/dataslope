import React, { useId } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { INK_SOFT, label } from "../../editorial/style";
import { ILLUSTRATIONS, VIDEO } from "./data";
import { at, type Scale } from "../da-statistics-communication/parts";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture and the plot pieces (the
 * slow push, headings, highlighter and strike, axes, dots, reference lines,
 * brackets) come from the Data Analyst statistics video, so the two series
 * stay one family; what is new here is a curve drawn along its length and
 * clipped to its plot, which every figure in this video is made of.
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

/** A plot's box in page pixels, for clipping what runs past its domain. */
export type Box = { left: number; right: number; top: number; bottom: number };

/**
 * A line through data points, drawn along its length from `at` over `dur`
 * frames and clipped to `clip`, so a fit that leaves the plot (degree 9
 * between its points, a run that diverges) leaves through the frame instead
 * of over the page. `out` fades it; `dim` sets it back.
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
  dots?: number;
}> = ({ points, x, y, at: from, dur = 24, out, dim, color, width = 3, dash, clip, dots }) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.75;
  if (p <= 0 || o >= 1) return null;
  const px = points.map(([a, b]) => [at(x, a), at(y, b)] as const);
  const path = px.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  // A dashed line cannot also be drawn by its dash array, so it wipes in
  // behind a growing clip instead.
  const wipe = dash ? px[0][0] + (px[px.length - 1][0] - px[0][0]) * p : undefined;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <defs>
        <clipPath id={`c${id}`}>
          <rect
            x={clip ? clip.left : 0}
            y={clip ? clip.top : 0}
            width={(wipe ?? (clip ? clip.right : 1920)) - (clip ? clip.left : 0)}
            height={clip ? clip.bottom - clip.top : 1080}
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
        {dots
          ? px.map(([a, b], i) => (
              <circle key={i} cx={a} cy={b} r={dots * ease(frame, from + (i / px.length) * dur, 8)} fill={color} />
            ))
          : null}
      </g>
    </svg>
  );
};

/** Fades its children in from `from` and, optionally, out from `out`. */
export const Fade: React.FC<{ from: number; out?: number; children: React.ReactNode }> = ({ from, out, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 8) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  return o > 0 ? <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill> : null;
};

/** A small title over a panel, in the chart face. */
export const PanelTitle: React.FC<{ x: number; y: number; at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  x,
  y,
  at: from,
  out,
  color = INK_SOFT,
  children,
}) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 12) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, whiteSpace: "nowrap", opacity: o, ...label(22, color), fontWeight: 650 }}>
      {children}
    </div>
  );
};

/** The watercolor hero from illustrations.json (or another video's spot):
 *  it pops in on `at`, bobs gently, and fades on `out`. */
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
