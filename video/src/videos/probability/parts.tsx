import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  BLUE_INK,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  label,
  note,
  PAPER,
} from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The unit's color roles. Raw outcomes (flips, users, people) in the kit's
 * data blue or set back in a soft ink; whatever the narration is pointing at,
 * an estimate or the answer, in the red accent; the truth (a probability the
 * process really has) in dashed ink. Part 3 keeps the BaseRate video's pair:
 * people who have it in blue, false alarms in red.
 */
export const DATA = BAR;
export const DATA_INK = BLUE_INK;
export const STAT = ACCENT;
export const STAT_INK = ACCENT_INK;
export const SOFT = `color-mix(in srgb, ${INK_SOFT} 42%, transparent)`;
export const FAINT = `color-mix(in srgb, ${INK_SOFT} 24%, ${PAPER})`;
/** Part 4's car, in the brand's "look here" yellow. */
export const GOLD = ds("yellow", 500);
export const GOLD_DEEP = ds("yellow", 700);
export const GOLD_INK = "var(--ds-amber-ink)";

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const Svg: React.FC<{ opacity?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  opacity = 1,
  style,
  children,
}) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity, ...style }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * Two phrases of one headline, set as a single flowing line: the second, in
 * italic and the accent, inks in after the first, at its own cue, and sits a
 * word space after it in any face.
 */
export const Headline: React.FC<{
  top: number;
  left?: number;
  size?: number;
  first: React.ReactNode;
  second?: React.ReactNode;
  firstAt: number;
  secondAt?: number;
  out?: number;
  secondColor?: string;
}> = ({ top, left = 92, size = 76, first, second, firstAt, secondAt, out, secondColor = STAT_INK }) => (
  <div style={{ position: "absolute", left, top, display: "flex", gap: "0.26em", ...headline(size) }}>
    <Ink at={firstAt} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
      {first}
    </Ink>
    {second !== undefined && secondAt !== undefined ? (
      <Ink
        at={secondAt}
        dur={18}
        out={out}
        style={{ position: "relative", ...headline(size, true), color: secondColor, whiteSpace: "nowrap" }}
      >
        {second}
      </Ink>
    ) : null}
  </div>
);

/** Inks in over a hidden copy of itself, so a phrase inside a flowing layout
 *  holds its place before it appears and nothing beside it moves. */
export const Held: React.FC<{
  at: number;
  out?: number;
  dur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, out, dur = 16, style, children }) => (
  <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", ...style }}>
    <span style={{ visibility: "hidden" }}>{children}</span>
    <Ink at={at} dur={dur} out={out} style={{ left: 0, top: 0, whiteSpace: "nowrap" }}>
      {children}
    </Ink>
  </span>
);

/**
 * A highlighter stroke that sweeps under the words it wraps on `at`, the way
 * the narration's stress falls on them. Sized in em, so it fits any face.
 */
export const Sweep: React.FC<{ at: number; dur?: number; color?: string; out?: number; children: React.ReactNode }> = ({
  at,
  dur = 12,
  color = HIGHLIGHT,
  out,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.08em",
          top: "0.52em",
          height: "0.4em",
          width: `calc((100% + 0.16em) * ${p})`,
          background: color,
          borderRadius: "0.08em",
          opacity: 1 - o,
        }}
      />
      {/* The words lift a touch as the stroke passes under them. */}
      <span style={{ position: "relative", display: "inline-block", transform: p > 0 && p < 1 ? `scale(${1 + 0.07 * Math.sin(Math.PI * p)})` : undefined }}>
        {children}
      </span>
    </span>
  );
};

/** A line struck through the words it wraps, drawn left to right on `at`. */
export const Strike: React.FC<{ at: number; color?: string; top?: string; children: React.ReactNode }> = ({
  at,
  color = ACCENT,
  top = "0.52em",
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 1 }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top,
          width: `calc((100% + 0.12em) * ${p})`,
          height: "0.07em",
          minHeight: 3,
          background: color,
          borderRadius: 2,
          transform: "rotate(-2.5deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/** A value that counts up from `from` to `to` between `at` and `at + dur`. */
export const Count: React.FC<{
  at: number;
  dur?: number;
  from?: number;
  to: number;
  format: (v: number) => string;
  /** Count at an even pace, for a count that runs under a whole phrase. */
  steady?: boolean;
  style?: React.CSSProperties;
}> = ({ at, dur = 24, from = 0, to, format, steady = false, style }) => {
  const frame = useCurrentFrame();
  const p = steady ? Math.min(1, Math.max(0, (frame - at) / dur)) : ease(frame, at, dur);
  return <span style={{ fontVariantNumeric: "tabular-nums lining-nums", ...style }}>{format(lerp(from, to, p))}</span>;
};

/** A ring that swells out of a point and fades: "this one", as it is named. */
export const Pulse: React.FC<{ x: number; y: number; at: number; color?: string; r?: number; dur?: number }> = ({
  x,
  y,
  at,
  color = STAT,
  r = 26,
  dur = 22,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  if (p <= 0 || p >= 1) return null;
  return (
    <Svg>
      <circle cx={x} cy={y} r={r * (0.4 + p)} fill="none" stroke={color} strokeWidth={5} opacity={1 - p} />
    </Svg>
  );
};

/** A straight arrow that draws from `from` to `to`, its head built by
 *  arrowHead() on the drawn line. */
export const Arrow: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
}> = ({ from, to, at, dur = 16, out, dim, color = INK, width = 2.4 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.7;
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(16, len * 0.6);
  return (
    <Svg opacity={(1 - o) * (1 - d)}>
      <line x1={from[0]} y1={from[1]} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path
        d={arrowHead([from, tip], headLen, headLen * 0.6)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/** A bracket from x0 to x1 at `y`, its end ticks pointing at what it
 *  measures (down, or up with `up`). It opens from its middle. */
export const Bracket: React.FC<{
  x0: number;
  x1: number;
  y: number;
  at: number;
  out?: number;
  color?: string;
  tick?: number;
  width?: number;
  up?: boolean;
}> = ({ x0, x1, y, at, out, color = INK, tick = 12, width = 2.2, up = false }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const a = mid + (x0 - mid) * p;
  const b = mid + (x1 - mid) * p;
  const t = up ? -tick : tick;
  return (
    <Svg opacity={1 - o}>
      <path d={`M${a},${y + t} L${a},${y} L${b},${y} L${b},${y + t}`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" />
    </Svg>
  );
};

/** A vertical bracket from y0 to y1 at `x`, ticks pointing left (or right
 *  with `right`). It opens from its middle. */
export const VBracket: React.FC<{
  y0: number;
  y1: number;
  x: number;
  at: number;
  out?: number;
  color?: string;
  tick?: number;
  right?: boolean;
}> = ({ y0, y1, x, at, out, color = INK, tick = 12, right = false }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (y0 + y1) / 2;
  const a = mid + (y0 - mid) * p;
  const b = mid + (y1 - mid) * p;
  const t = right ? tick : -tick;
  return (
    <Svg opacity={1 - o}>
      <path d={`M${x + t},${a} L${x},${a} L${x},${b} L${x + t},${b}`} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
    </Svg>
  );
};

/** A coin seen face on: heads in the data blue, tails in a soft ink, with
 *  its letter. It pops in on `at`. */
export const Coin: React.FC<{
  x: number;
  y: number;
  heads: boolean;
  at: number;
  r?: number;
  lit?: number;
  dim?: number;
}> = ({ x, y, heads, at, r = 22, lit = 0, dim = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 12);
  if (p <= 0.001) return null;
  const s = Math.min(1.08, p);
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: heads ? DATA : `color-mix(in srgb, ${INK_SOFT} 30%, ${PAPER})`,
        boxShadow: lit > 0 ? `0 0 0 ${4 * lit}px color-mix(in srgb, ${HIGHLIGHT} ${Math.round(lit * 100)}%, transparent)` : undefined,
        transform: `scale(${s})`,
        opacity: Math.min(1, p) * (1 - dim * 0.65),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...note(Math.round(r * 0.95), heads ? PAPER : INK),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {heads ? "H" : "T"}
    </div>
  );
};

/** The big number of a scene, set in the headline face. */
export const Big: React.FC<{ size?: number; color?: string; italic?: boolean; children: React.ReactNode }> = ({
  size = 120,
  color = INK,
  italic = false,
  children,
}) => <span style={{ ...headline(size, italic), color, whiteSpace: "nowrap" }}>{children}</span>;

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs gently,
 * and fades on `out`. Nothing is drawn while the art is not in.
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

/** A label set in Inter, for a figure's annotations. */
export const Tag: React.FC<{ size?: number; color?: string; weight?: number; children: React.ReactNode }> = ({
  size = 22,
  color = INK,
  weight = 600,
  children,
}) => <span style={{ ...note(size, color), fontWeight: weight, whiteSpace: "nowrap" }}>{children}</span>;

/**
 * A scene's way out: in the last moments before its cut, the whole page eases
 * up a little and sets back, so the next scene arrives over a page that is
 * already leaving rather than one that has stopped.
 */
export const Exit: React.FC<{ at: number | null; dur?: number; children: React.ReactNode }> = ({ at, dur = 30, children }) => {
  const frame = useCurrentFrame();
  const p = at === null ? 0 : ease(frame, at, dur);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - p * 0.55, transform: p > 0 ? `translateY(${-p * 14}px)` : undefined }}>
      {children}
    </div>
  );
};
