import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Pt, roundedPolyline } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ACCENT, BAR, BLUE_INK, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { H, Ink, W } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The unit's own pieces, on top of the shared ERD kit (editorial/erd.tsx) and
 * this folder's table kit (kit.tsx). Color roles follow WhyNormalization:
 * keys and the links between tables in the data blue, whatever the narration
 * says is wrong (a copy that disagrees, a refused row, a stale total) in the
 * red accent, and the cell being read in the page's yellow.
 */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/**
 * A layer that fades in on `at` (if given), steps back to `dim`'s level from
 * `dimAt`, and fades out on `out`: for a group (a table, a diagram) the talk
 * moves on from. Optionally slides by `slide` px as it goes.
 */
export const Fade: React.FC<{
  at?: number;
  out?: number;
  dimAt?: number;
  dim?: number;
  dur?: number;
  slide?: number;
  children: React.ReactNode;
}> = ({ at, out, dimAt, dim = 0.35, dur = 14, slide = 0, children }) => {
  const frame = useCurrentFrame();
  const i = at === undefined ? 1 : ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, dur);
  const d = dimAt === undefined ? 0 : ease(frame, dimAt, dur) * (1 - dim);
  if (i <= 0 || o >= 1) return null;
  return (
    <AbsoluteFill style={{ opacity: i * (1 - o) * (1 - d), transform: slide ? `translateX(${-o * slide}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

/**
 * A slow, eased push on a figure while it is talked about: its children scale
 * up by `amount` from `from` to `to`, about `origin`.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  amount?: number;
  origin?: string;
  children: React.ReactNode;
}> = ({ from, to, amount = 0.02, origin = "50% 55%", children }) => {
  const frame = useCurrentFrame();
  const t = clamp01((frame - from) / Math.max(1, to - from));
  const e = t * t * (3 - 2 * t);
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + amount * e})`, transformOrigin: origin }}>{children}</AbsoluteFill>
  );
};

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs gently,
 * and fades on `out`. Drawn no larger than its pixels cover at 4K.
 */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at, out, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/**
 * Postgres's command tag (`UPDATE 1`, `INSERT 0 1`), the way psql answers a
 * statement that worked: set in mono, in the key blue, as a reply.
 */
export const Reply: React.FC<{
  at: number;
  out?: number;
  x: number;
  y: number;
  children: React.ReactNode;
  color?: string;
  size?: number;
}> = ({ at, out, x, y, children, color = BLUE_INK, size = 24 }) => {
  const frame = useCurrentFrame();
  const swell = pulse(frame, at + 6, 20);
  return (
    <Ink at={at} dur={12} out={out} style={{ left: x, top: y, whiteSpace: "nowrap" }}>
      <span
        style={{
          display: "inline-block",
          fontFamily: MONO,
          fontSize: size,
          fontWeight: 600,
          color,
          padding: "4px 12px",
          borderRadius: 4,
          background: `color-mix(in srgb, ${color === BLUE_INK ? BAR : color === INK ? INK_SOFT : ACCENT} ${10 + swell * 14}%, ${PAPER})`,
        }}
      >
        {children}
      </span>
    </Ink>
  );
};

/** A tick, drawn as a stroke on `at`: a constraint that holds. */
export const Tick: React.FC<{ x: number; y: number; at: number; size?: number; color?: string; out?: number }> = ({
  x,
  y,
  at,
  size = 22,
  color = BLUE_INK,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const s = size;
  return (
    <Svg opacity={1 - o}>
      <path
        d={`M${x},${y + s * 0.52} L${x + s * 0.36},${y + s * 0.86} L${x + s},${y + s * 0.08}`}
        fill="none"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </Svg>
  );
};

/**
 * A functional dependency, drawn the way a textbook draws one over a table's
 * column titles: from the determinant's edge out to a level, across, and
 * back in to the column it determines, with an arrowhead on arrival. The
 * line draws itself from its tail on `at`; the head, built by arrowHead() on
 * the whole line, arrives as the line does. `level` is the y the line runs
 * along (above the titles, or below the table for one drawn underneath).
 */
export const DepArrow: React.FC<{
  from: Pt;
  to: Pt;
  level: number;
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
}> = ({ from, to, level, at, dur = 18, out, dim, color = INK, width = 2.6 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const head = 14;
  const points: Pt[] = [from, [from[0], level], [to[0], level], to];
  const { d: path, samples } = roundedPolyline(points, 14);
  // The line stops a little inside the head's base, so the head covers its end.
  const total = samples.reduce((n, pt, i) => (i ? n + Math.hypot(pt[0] - samples[i - 1][0], pt[1] - samples[i - 1][1]) : 0), 0);
  const reach = (total - head * 0.6) / total;
  return (
    <Svg opacity={(1 - o) * (1 - d)}>
      <circle cx={from[0]} cy={from[1]} r={4.5} fill={color} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p * reach} 1`}
      />
      <path d={arrowHead(samples, head, 7.5, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 6)} />
    </Svg>
  );
};

/** A count that runs up to `value` over `dur` frames from `at`. */
export const Count: React.FC<{ value: number; at: number; dur?: number }> = ({ value, at, dur = 24 }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, at, dur);
  return <>{Math.round(value * t).toLocaleString("en-US")}</>;
};

/** A note in the soft ink, for the right-hand column. */
export const noteStyle = (size = 22, color: string = INK_SOFT): React.CSSProperties => ({
  ...note(size, color),
  whiteSpace: "nowrap",
});

/** A short straight arrow that draws itself on `at`, its head from arrowHead(). */
export const SmallArrow: React.FC<{ from: Pt; to: Pt; at: number; color?: string; width?: number; out?: number }> = ({
  from,
  to,
  at,
  color = INK_SOFT,
  width = 2,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: Pt = [lerp(from[0], to[0], p), lerp(from[1], to[1], p)];
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const head = Math.min(9, len * 0.5);
  return (
    <Svg opacity={1 - o}>
      <line x1={from[0]} y1={from[1]} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
      {p >= 1 ? (
        <path d={arrowHead([from, to], head, head * 0.6)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </Svg>
  );
};
