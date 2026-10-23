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
  fmt,
  HAIRLINE,
  HIGHLIGHT,
  headline as headlineStyle,
  INK,
  INK_SOFT,
  label,
  PAPER,
  TABULAR,
} from "../../editorial/style";
import { H, Ink, W } from "../../editorial/ui";
import { colors, ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The video's own pieces beyond the shared editorial kit, after Estimation's
 * and WhyDesign's parts.tsx: a part's kicker, a two-ink headline, marker and
 * strike-through, a slow push on a finished figure, arrows and brackets, the
 * watercolor spots, a counter, a 0 to 100 score track, and check and cross
 * marks.
 *
 * Color roles, one meaning each for the whole video:
 *   - the leading model, or the one the narration backs, in the kit's data
 *     blue (A); the model beside it in a soft gray (B);
 *   - a ceiling, a trap or a number not to trust in the red accent;
 *   - a right answer in green, a wrong one in red (the harness);
 *   - the phrase being spoken under a yellow marker.
 */
export const A = BAR;
export const A_INK = BLUE_INK;
export const B = ds("gray", 400);
export const B_INK = INK_SOFT;
export const TRAP = ACCENT;
export const TRAP_INK = ACCENT_INK;
export const OK = colors.ok;
export const OK_INK = colors.okInk;
export const MARK = HIGHLIGHT;
export const FAINT = ds("gray", 200);
export const PANEL = ds("gray", 50);

export const X0 = 120;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for the thing being named. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI);
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
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

/** A two-ink headline line: the first phrase in ink, the second following it
 *  in italic accent, each on its own cue; both leave on `out`. The row takes
 *  the headline's own size, so the word space between the halves (an `em`
 *  gap) is measured in that face rather than in the page's 16px. */
export const Headline: React.FC<{
  at: number;
  second?: number;
  out?: number;
  size?: number;
  top?: number;
  left?: number;
  children: React.ReactNode;
  italic?: React.ReactNode;
}> = ({ at, second, out, size = 64, top = 150, left = 92, children, italic }) => {
  const { y } = useLayout();
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: y(top),
        display: "flex",
        gap: "0.28em",
        whiteSpace: "nowrap",
        fontSize: headlineStyle(size).fontSize,
      }}
    >
      <Ink at={at} dur={20} out={out} style={{ position: "relative", ...headlineStyle(size) }}>
        {children}
      </Ink>
      {italic && second !== undefined ? (
        <Ink at={second} dur={18} out={out} style={{ position: "relative", ...headlineStyle(size, true), color: ACCENT_INK }}>
          {italic}
        </Ink>
      ) : null}
    </div>
  );
};

/** A marker stroke behind words: grows left to right on `at`, sized to the
 *  text it wraps in any face. */
export const Marked: React.FC<{ at: number; color?: string; out?: number; children: React.ReactNode }> = ({
  at,
  color = MARK,
  out,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.08em",
          right: "-0.08em",
          top: "0.12em",
          bottom: "0.02em",
          background: color,
          borderRadius: "0.1em",
          transformOrigin: "left center",
          transform: `scaleX(${p})`,
          opacity: 1 - o,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A line struck through the words it wraps, drawn left to right on `at`. */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = TRAP, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top: "0.55em",
          width: `calc((100% + 0.12em) * ${p})`,
          height: "0.08em",
          minHeight: 3,
          background: color,
          borderRadius: 2,
          transform: "rotate(-1.5deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/**
 * A slow, eased push on a figure: its children scale up by `amount` from
 * `from` to `to` about `origin`, so a figure being talked about is never
 * quite frozen. Keep illustrations outside it: they are drawn at their
 * pixels' size.
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
    <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + amount * e})`, transformOrigin: origin }}>
      {children}
    </div>
  );
};

/** A straight arrow drawn from `from` to `to`, its head built by arrowHead()
 *  on the drawn line. */
export const Arrow: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  dash?: string;
  opacity?: number;
}> = ({ from, to, at, dur = 14, out, color = INK, width = 2.4, dash, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: Pt = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(15, len * 0.6);
  return (
    <Svg opacity={opacity * (1 - o)}>
      <line
        x1={from[0]}
        y1={from[1]}
        x2={tip[0]}
        y2={tip[1]}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dash}
      />
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

/** A horizontal bracket from x0 to x1, its end ticks pointing at what it
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
  opacity?: number;
}> = ({ x0, x1, y, at, out, color = INK, tick = 12, width = 2.2, up = false, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const a = mid + (x0 - mid) * p;
  const b = mid + (x1 - mid) * p;
  const t = up ? -tick : tick;
  return (
    <Svg opacity={opacity * (1 - o)}>
      <path d={`M${a},${y + t} L${a},${y} L${b},${y} L${b},${y + t}`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" />
    </Svg>
  );
};

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs gently,
 * and fades on `out`. Nothing is drawn while the art is not in.
 */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
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
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** A number counting from `from` to `to` over `dur` frames from `at`. It is
 *  not drawn before `at`, so it never shows a value nobody has said. */
export const Count: React.FC<{
  at: number;
  to: number;
  from?: number;
  dur?: number;
  digits?: number;
  prefix?: string;
  suffix?: string;
}> = ({ at, to, from = 0, dur = 16, digits = 0, prefix = "", suffix = "" }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const v = lerp(from, to, ease(frame, at, dur));
  return (
    <>
      {prefix}
      <span style={TABULAR}>{fmt(v, digits)}</span>
      {suffix}
    </>
  );
};

/** A tick and a cross, drawn as strokes so they take any color. */
export const Check: React.FC<{ x: number; y: number; size?: number; at: number; color?: string; width?: number }> = ({
  x,
  y,
  size = 22,
  at,
  color = OK,
  width = 3.4,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  const s = size;
  return (
    <path
      d={`M${x - s * 0.45},${y + s * 0.02} L${x - s * 0.12},${y + s * 0.34} L${x + s * 0.5},${y - s * 0.38}`}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={`${p} 1`}
    />
  );
};
export const Cross: React.FC<{ x: number; y: number; size?: number; at: number; color?: string; width?: number }> = ({
  x,
  y,
  size = 20,
  at,
  color = TRAP,
  width = 3.4,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 8);
  const q = ease(frame, at + 4, 8);
  if (p <= 0) return null;
  const h = size / 2;
  return (
    <g stroke={color} strokeWidth={width} strokeLinecap="round">
      <line x1={x - h} y1={y - h} x2={x - h + 2 * h * p} y2={y - h + 2 * h * p} />
      {q > 0 ? <line x1={x + h} y1={y - h} x2={x + h - 2 * h * q} y2={y - h + 2 * h * q} /> : null}
    </g>
  );
};

/** A score track, 0 to 100: a hairline with ticks at 0, 50 and 100, drawn
 *  left to right on `at`. `x(v)` maps a score to the page. */
export const track = (x0: number, x1: number) => (v: number) => x0 + ((x1 - x0) * v) / 100;
export const Track: React.FC<{
  x0: number;
  x1: number;
  y: number;
  at: number;
  ticks?: readonly number[];
  opacity?: number;
}> = ({ x0, x1, y, at, ticks = [0, 50, 100], opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  const t = ease(frame, at + 8, 12);
  if (p <= 0) return null;
  const X = track(x0, x1);
  return (
    <Svg opacity={opacity}>
      <line x1={x0} x2={x0 + (x1 - x0) * p} y1={y} y2={y} stroke={HAIRLINE} strokeWidth={2} strokeLinecap="round" />
      <g opacity={t}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={y + 2} y2={y + 9} stroke={INK_SOFT} strokeWidth={1.4} />
            <text x={X(v)} y={y + 32} textAnchor="middle" style={{ ...label(20, INK_SOFT), fontWeight: 500, ...TABULAR }}>
              {v}
            </text>
          </g>
        ))}
      </g>
    </Svg>
  );
};

/** A dot on a track that drops in on `at`. */
export const Dot: React.FC<{ x: number; y: number; at: number; r?: number; color: string; ring?: boolean }> = ({
  x,
  y,
  at,
  r = 11,
  color,
  ring = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 13);
  if (p <= 0.001) return null;
  return ring ? (
    <circle cx={x} cy={y} r={r * p} fill={PAPER} stroke={color} strokeWidth={3} />
  ) : (
    <circle cx={x} cy={y} r={r * p} fill={color} stroke={PAPER} strokeWidth={2} />
  );
};

/** A small rounded tag, inked in on `at`. */
export const Tag: React.FC<{
  at: number;
  x: number;
  y: number;
  out?: number;
  dim?: number;
  color?: string;
  fill?: string;
  dashed?: boolean;
  width?: number;
  children: React.ReactNode;
}> = ({ at, x, y, out, dim, color = INK, fill = PAPER, dashed = false, width, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        boxSizing: "border-box",
        padding: "9px 18px",
        borderRadius: 10,
        border: `2px ${dashed ? "dashed" : "solid"} ${color}`,
        background: fill,
        opacity: p * (1 - o) * (1 - d),
        transform: `translateX(${(1 - p) * -14}px)`,
        ...label(22, INK),
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

/** A full-width hairline, drawn left to right on `at`. */
export const Rule: React.FC<{ x0: number; x1: number; y: number; at: number; color?: string; width?: number; opacity?: number }> = ({
  x0,
  x1,
  y,
  at,
  color = HAIRLINE,
  width = 1.4,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  return (
    <Svg opacity={opacity}>
      <line x1={x0} x2={x0 + (x1 - x0) * p} y1={y} y2={y} stroke={color} strokeWidth={width} />
    </Svg>
  );
};

