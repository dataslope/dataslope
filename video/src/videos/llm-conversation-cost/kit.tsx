import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline as headlineStyle, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { H, Ink, W } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, REPLY, SYSTEM, type Turn, VIDEO } from "./data";

/**
 * What this deep dive needs beyond the shared editorial kit: the colors (the
 * unit video's meanings, so a viewer of both reads one story), a two-ink
 * headline, the watercolor spots, arrows and brackets, and the one chart the
 * video keeps coming back to: the staircase of what each turn sends, which
 * can zoom from two turns to forty, close its gaps into an area, split into a
 * rectangle and a triangle, and shrink its repeat when the cache reads it
 * back. Headline, Spot, Arrow and VBracket follow llm-cost/parts.tsx.
 */

// ── Colors: one meaning each, for the whole video ────────────────────────────

/** Input that is new this turn (llm-cost's input blue). */
export const NEW = ds("blue", 500);
export const NEW_INK = inkOf.blue;
/** Input sent before, sent again (llm-cost's INPUT_SOFT). */
export const SENT = `color-mix(in srgb, ${ds("blue", 500)} 32%, ${PAPER})`;
/** Input read back from the cache (llm-cost's teal). */
export const CACHED = ds("teal", 500);
export const CACHED_INK = inkOf.teal;
/** Output: the replies (llm-cost's orange). */
export const OUTPUT_INK = inkOf.orange;
/** Dollars: every whole bill is drawn in ink (llm-cost's COST). */
export const COST = `color-mix(in srgb, ${INK} 72%, ${PAPER})`;
/** The part of the area that grows in a straight line: the rectangle. */
export const LINE = `color-mix(in srgb, ${INK} 24%, ${PAPER})`;
export const LINE_EDGE = `color-mix(in srgb, ${INK} 62%, ${PAPER})`;
/** The part that grows with the square: the triangle. */
export const TRI = ds("purple", 500);
export const TRI_FILL = `color-mix(in srgb, ${ds("purple", 500)} 34%, ${PAPER})`;
export const TRI_INK = inkOf.purple;
/** Whatever the narration is pointing at: the kit's accent. */
export const POINT = ACCENT;
export const POINT_INK = ACCENT_INK;
export const RULE = `color-mix(in srgb, ${INK} 14%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
/** a → b in color, by t (0..1). */
export const mix = (a: string, b: string, t: number) =>
  t <= 0 ? a : t >= 1 ? b : `color-mix(in srgb, ${a} ${Math.round((1 - t) * 100)}%, ${b})`;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for the thing being named. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI);
};

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const FIG_Y = 286;

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A two-ink headline line: the first phrase in ink, the second following it
 *  in italic accent, each on its own cue. */
export const Headline: React.FC<{
  at: number;
  second?: number;
  out?: number;
  size?: number;
  top?: number;
  children: React.ReactNode;
  italic?: React.ReactNode;
}> = ({ at, second, out, size = 66, top = 146, children, italic }) => {
  const { y } = useLayout();
  return (
    <div
      style={{
        position: "absolute",
        left: 92,
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

/** A watercolor spot from illustrations.json: pops in on `at`, bobs gently,
 *  fades on `out`. Nothing is drawn while the art is not in. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  amp?: number;
}> = ({ id, at, out, left, top, width, height, amp = 5 }) => {
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
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame, amp, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** A straight arrow that draws from `from` to `to`, its head built by
 *  arrowHead() on the drawn line. */
export const Arrow: React.FC<{
  from: readonly [number, number];
  to: readonly [number, number];
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ from, to, at, dur = 14, out, color = INK, width = 2.4 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(15, len * 0.6);
  return (
    <Svg opacity={1 - o}>
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

/** A vertical bracket from y0 to y1, its ticks pointing left at what it spans
 *  (or right with `right`). It opens from its middle. */
export const VBracket: React.FC<{
  x: number;
  y0: number;
  y1: number;
  at: number;
  out?: number;
  color?: string;
  tick?: number;
  width?: number;
  right?: boolean;
}> = ({ x, y0, y1, at, out, color = INK, tick = 12, width = 2.2, right = false }) => {
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
      <path d={`M${x + t},${a} L${x},${a} L${x},${b} L${x + t},${b}`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" />
    </Svg>
  );
};

/** A horizontal bracket from x0 to x1, its ticks pointing down at what it
 *  spans (or up with `up`). It opens from its middle. */
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

/** A line struck through the words it wraps, drawn left to right on `at`. */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = POINT, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
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

/** A horizontal bar that grows from its left end to `w` on `at`. */
export const HBar: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  dur?: number;
  out?: number;
  fill: string;
  opacity?: number;
  radius?: number;
  outline?: string;
  dashed?: boolean;
}> = ({ x, y, w, h, at, dur = 14, out, fill, opacity = 1, radius = 3, outline, dashed }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: Math.max(0, w * p),
        height: h,
        background: fill,
        borderRadius: radius,
        boxShadow: outline && !dashed ? `inset 0 0 0 2px ${outline}` : undefined,
        border: outline && dashed ? `2px dashed ${outline}` : undefined,
        boxSizing: "border-box",
        opacity: opacity * (1 - o),
      }}
    />
  );
};

/** One legend entry: a swatch and its words, inked on `at`. Laid out in a
 *  flex row by the caller. */
export const Key: React.FC<{ at: number; out?: number; swatch: string; edge?: string; children: React.ReactNode }> = ({
  at,
  out,
  swatch,
  edge,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, opacity: p * (1 - o), transform: `translateY(${(1 - p) * 8}px)` }}>
      <span style={{ width: 26, height: 18, borderRadius: 3, background: swatch, boxShadow: edge ? `inset 0 0 0 2px ${edge}` : undefined }} />
      <span style={{ ...label(21, INK_SOFT), fontWeight: 560, whiteSpace: "nowrap" }}>{children}</span>
    </span>
  );
};

// ── The staircase ────────────────────────────────────────────────────────────

/** The chart's frame, in the layout's coordinates. */
export const CHART = {
  x0: 200,
  base: 850,
  top: 380,
  /** The full view: forty turns. */
  slot: 30,
  bar: 23,
  max: 25000,
  /** Up close: the first two turns. */
  slotZ: 190,
  barZ: 130,
  maxZ: 3000,
} as const;

export type Geo = {
  slot: number;
  bar: number;
  /** px per token */
  k: number;
  base: number;
  top: number;
  /** Left edge of a turn's slot. */
  x: (turn: number) => number;
  /** Page y of a token height. */
  ty: (tokens: number) => number;
};

/** The chart's geometry, `z` of the way from the close-up (0) to forty turns
 *  (1). Scales move geometrically, so the pull-back reads as a camera. */
export const useGeo = (z = 1): Geo => {
  const { y, h } = useLayout();
  const height = h(CHART.base - CHART.top);
  const kFull = height / CHART.max;
  const kZoom = height / CHART.maxZ;
  const geom = (a: number, b: number) => a * Math.pow(b / a, z);
  const slot = geom(CHART.slotZ, CHART.slot);
  const bar = geom(CHART.barZ, CHART.bar);
  const k = geom(kZoom, kFull);
  const base = y(CHART.base);
  return {
    slot,
    bar,
    k,
    base,
    top: y(CHART.top),
    x: (turn) => CHART.x0 + (turn - 1) * slot,
    ty: (tokens) => base - tokens * k,
  };
};

const axisText = (size = 21, weight = 500): React.CSSProperties => ({ fontFamily: SANS, fontSize: size, fontWeight: weight, fill: INK_SOFT });

/** Baseline, gridlines and their labels for a geometry. `money` labels the
 *  gridlines in cents of input at Sonnet's price instead of tokens. */
export const Axes: React.FC<{
  geo: Geo;
  at: number;
  out?: number;
  z?: number;
  turns?: number;
  money?: (tokens: number) => string;
  title: string;
}> = ({ geo, at, out, z = 1, turns = 40, money, title }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  if (p <= 0) return null;
  const right = CHART.x0 + turns * CHART.slot + 10;
  const ticks = (step: number, upTo: number) => Array.from({ length: Math.floor(upTo / step) }, (_, i) => (i + 1) * step);
  const fine = 1 - clamp01(z * 3);
  const coarse = clamp01(z * 1.6 - 0.6);
  const tick = (t: number, o: number, text: string) => {
    const ty = geo.ty(t);
    if (o <= 0.01 || ty < geo.top - 6) return null;
    return (
      <g key={`${t}-${text}`} opacity={o}>
        <line x1={CHART.x0 - 12} x2={right} y1={ty} y2={ty} stroke={INK} strokeOpacity={0.12} />
        <text x={CHART.x0 - 22} y={ty + 7} textAnchor="end" style={axisText()}>
          {text}
        </text>
      </g>
    );
  };
  const tokenLabel = (t: number) => (money ? money(t) : t >= 1000 && t % 1000 === 0 ? `${t / 1000}k` : String(t));
  return (
    <Svg opacity={p}>
      <line x1={CHART.x0 - 12} x2={right} y1={geo.base + 0.5} y2={geo.base + 0.5} stroke={INK} strokeWidth={1.6} />
      <text x={CHART.x0 - 22} y={geo.base + 7} textAnchor="end" style={axisText()}>
        0
      </text>
      {ticks(1000, CHART.maxZ).map((t) => tick(t, fine, tokenLabel(t)))}
      {ticks(10000, CHART.max).map((t) => tick(t, coarse, tokenLabel(t)))}
      {/* Turn numbers: every turn up close, every tenth from afar. */}
      {[1, 2].map((t) => (
        <text key={`z${t}`} x={geo.x(t) + geo.bar / 2} y={geo.base + 32} textAnchor="middle" style={axisText(22)} opacity={fine}>
          turn {t}
        </text>
      ))}
      {[1, 10, 20, 30, 40].filter((t) => t <= turns).map((t) => (
        <text key={`f${t}`} x={geo.x(t) + geo.bar / 2} y={geo.base + 30} textAnchor="middle" style={axisText()} opacity={coarse}>
          {t}
        </text>
      ))}
      <text x={right} y={geo.base + 62} textAnchor="end" style={axisText(20, 650)} opacity={coarse}>
        turn
      </text>
      <text x={CHART.x0 - 12} y={geo.top - 16} style={axisText(20, 650)}>
        {title}
      </text>
    </Svg>
  );
};

export type BarState = {
  /** 0..1: the part sent before. */
  sent: number;
  /** 0..1: the new slice. */
  fresh: number;
  /** Arrive by sliding over from the slot before (the resend), rather than
   *  growing up from the baseline. */
  slide?: boolean;
};

/**
 * The bars: for each turn, what it sends again (SENT) under what is new
 * (NEW). Everything else is a transition, each 0..1:
 *  - `merge` widens the bars until their gaps close, so they read as an area;
 *  - `soften` fades the new slices into the rest, so the area is one fill;
 *  - `lineTint` / `triTint` paint the part under the system prompt grey and
 *    the part over it purple: the rectangle and the triangle;
 *  - `cache` turns what was sent before teal and shrinks it to its cached
 *    price, a twentieth, with the new slice riding down on top of it.
 */
export const Stairs: React.FC<{
  geo: Geo;
  turns: readonly Turn[];
  state: (turn: number) => BarState;
  merge?: number;
  soften?: number;
  lineTint?: number;
  triTint?: number;
  cache?: number;
  cacheRate?: number;
  dim?: (turn: number) => number;
  glow?: (turn: number) => number;
  flash?: (turn: number) => number;
  dividers?: number;
}> = ({ geo, turns, state, merge = 0, soften = 0, lineTint = 0, triTint = 0, cache = 0, cacheRate = 1, dim, glow, flash, dividers = 0 }) => {
  const width = lerp(geo.bar, geo.slot + 0.6, merge);
  const sentFill = mix(SENT, CACHED, cache);
  const newFill = mix(NEW, SENT, soften);
  const squash = lerp(1, cacheRate, cache);
  return (
    <Svg>
      {turns.map((t) => {
        const s = state(t.turn);
        if (s.sent <= 0 && s.fresh <= 0) return null;
        const x = geo.x(t.turn);
        const d = dim ? dim(t.turn) : 0;
        const g = glow ? glow(t.turn) : 0;
        const f = flash ? flash(t.turn) : 0;
        const sentH = t.resent * geo.k * squash;
        const freshH = t.newSlice * geo.k;
        const sentX = s.slide ? x - (1 - s.sent) * geo.slot : x;
        const sentShown = s.slide ? (s.sent > 0 ? sentH : 0) : sentH * s.sent;
        const freshTop = geo.base - sentShown - freshH * (s.slide ? 1 : s.fresh);
        const drop = s.slide ? (1 - s.fresh) * 70 : 0;
        const lineTop = geo.base - SYSTEM * geo.k;
        const shown = (t.resent * squash + t.newSlice) * geo.k;
        return (
          <g key={t.turn} opacity={1 - d * 0.72}>
            {sentShown > 0 ? (
              <rect x={sentX} y={geo.base - sentShown} width={width} height={sentShown} fill={sentFill} opacity={s.slide ? Math.min(1, s.sent * 3) : 1} />
            ) : null}
            {s.fresh > 0 ? (
              <rect
                x={x - g * 3}
                y={freshTop - drop}
                width={width + g * 6}
                height={freshH * (s.slide ? 1 : s.fresh) + 0.4}
                fill={newFill}
                opacity={s.slide ? s.fresh : 1}
              />
            ) : null}
            {dividers > 0 && t.turn <= 2 ? (
              // Up close: where the system prompt ends, and where the reply ends.
              <line
                x1={x}
                x2={x + width}
                y1={t.turn === 1 ? lineTop : geo.base - (t.resent + REPLY) * geo.k - drop}
                y2={t.turn === 1 ? lineTop : geo.base - (t.resent + REPLY) * geo.k - drop}
                stroke={PAPER}
                strokeWidth={2.5}
                opacity={dividers * Math.min(1, s.fresh * (t.turn === 1 ? 1.4 : 1))}
              />
            ) : null}
            {lineTint > 0 && s.sent + s.fresh > 0 ? (
              <rect x={x} y={lineTop} width={width} height={SYSTEM * geo.k} fill={LINE} opacity={lineTint} />
            ) : null}
            {triTint > 0 && s.sent + s.fresh > 0 ? (
              <rect x={x} y={geo.base - shown} width={width} height={Math.max(0, shown - SYSTEM * geo.k)} fill={TRI_FILL} opacity={triTint} />
            ) : null}
            {f > 0 ? <rect x={x} y={geo.base - shown} width={width} height={shown} fill={NEW} opacity={f * 0.38} /> : null}
          </g>
        );
      })}
    </Svg>
  );
};

export { INK, INK_SOFT, PAPER };
