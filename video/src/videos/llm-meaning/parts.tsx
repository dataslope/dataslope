import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Pt, roundedPolyline } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label, note, TABULAR } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { colors, ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a part's kicker, a
 * two-ink headline, highlighter marks, a slow push on a finished figure, the
 * watercolor spots and an arrow (after DbDesign-1's parts.tsx), plus what a
 * video about vectors needs: a token chip, a vector set as a row of number
 * cells, a number that changes its value in place, and a cubic arrow.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
export const FIG_Y = 300;

// ── Colors: brand tokens and the editorial palette only ──────────────────────
//
// One meaning per color, all video long: blue is data (vectors, bars, points);
// red is what the narration is pointing at; the highlighter is the spoken
// phrase. Query, key and value keep a hue each wherever they appear (purple,
// teal, orange: the non-semantic accents).

export const DATA = BAR;
export const DATA_SOFT = ds("blue", 200);
export const DATA_TINT = `color-mix(in srgb, ${ds("blue", 500)} 12%, ${PAPER})`;
export const POINT = ACCENT;
export const POINT_INK = ACCENT_INK;
export const MARK = HIGHLIGHT;
export const QUERY = ds("purple", 500);
export const QUERY_INK = inkOf.purple;
export const KEY = ds("teal", 500);
export const KEY_INK = inkOf.teal;
export const VALUE = ds("orange", 500);
export const VALUE_INK = inkOf.orange;
export const LINE = colors.line;
export const FAINT = colors.inkFaint;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a brief swell for something named
 *  again once it is already on the page. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * One headline line in two inks: the lead in roman on `at`, the turn in
 * italic accent on `turnAt`, the second laid out after the first. `out` takes
 * the whole line away, so the next headline can take its place.
 */
export const Headline: React.FC<{
  lead: React.ReactNode;
  turn?: React.ReactNode;
  at: number;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ lead, turn, at, turnAt, out, size = 72, top = HEAD_Y }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink
          at={turnAt ?? at + 12}
          dur={18}
          out={out}
          style={{ position: "relative", ...headline(size, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/** A highlighter stroke laid under the words it wraps, swept on `at` and
 *  lifted on `out`. Sized in em and to the words. */
export const Mark: React.FC<{ at: number; out?: number; dur?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  dur = 12,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 14);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.14em",
          top: "0.04em",
          bottom: "-0.06em",
          width: `calc((100% + 0.28em) * ${p})`,
          background: color,
          borderRadius: "0.14em",
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
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
}> = ({ from, to, amount = 0.016, origin = "50% 55%", children }) => {
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
  opacity?: number;
}> = ({ from, to, at, dur = 16, out, color = INK, width = 2.4, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: Pt = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(16, len * 0.6);
  return (
    <Svg opacity={(1 - o) * opacity}>
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

/** A sampled line, resampled every `step` px, so a part of it can be drawn. */
const densify = (line: readonly Pt[], step = 3): Pt[] => {
  const out: Pt[] = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
};

/**
 * An arrow along a polyline with rounded corners, drawn from its start on
 * `at`. Its last segment is straight, so the head built by arrowHead() sits
 * on a line that has stopped turning.
 */
export const PathArrow: React.FC<{
  points: readonly Pt[];
  radius?: number;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ points, radius = 40, at, dur = 20, out, color = INK, width = 2.6 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const all = densify(roundedPolyline(points, radius).samples);
  const drawn = all.slice(0, Math.max(2, Math.round(all.length * p)));
  const d = drawn.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <Svg opacity={1 - o}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      {/* The head waits for the last, straight segment: a tip still inside a
          rounded corner would sit on a bend (arrow.ts). */}
      {p > 0.99 ? (
        <path d={arrowHead(drawn, 15, 9)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </Svg>
  );
};

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs, and
 * fades on `out`. Nothing is drawn while the art is not in.
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
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.7;
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

// ── Tokens and vectors ───────────────────────────────────────────────────────

/** A token as a chip: its text in mono on a rounded box. A leading space is
 *  drawn as a faint dot, the way the tokenizer lessons show it. */
export const TokenChip: React.FC<{
  text: string;
  size?: number;
  color?: string;
  border?: string;
  fill?: string;
  style?: React.CSSProperties;
}> = ({ text, size = 28, color = INK, border = INK, fill = PAPER, style }) => {
  const lead = text.startsWith(" ");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily: MONO,
        fontSize: size,
        fontWeight: 600,
        color,
        background: fill,
        border: `2px solid ${border}`,
        borderRadius: 10,
        padding: "6px 14px 8px",
        whiteSpace: "pre",
        lineHeight: 1.1,
        ...style,
      }}
    >
      {lead ? <span style={{ color: FAINT }}>·</span> : null}
      {lead ? text.slice(1) : text}
    </span>
  );
};

/** One number of a vector, set the way the lesson prints it ("0.9", "1.0"). */
export const fix = (x: number, digits = 1) => {
  const s = Math.abs(x).toFixed(digits);
  return x < 0 ? `−${s}` : s;
};

/**
 * A vector as a row of cells, one number each, in tabular mono. `values` may
 * change frame to frame (a counter); `highlight` washes chosen cells.
 */
export const VectorCells: React.FC<{
  values: readonly number[];
  digits?: number;
  size?: number;
  cell?: number;
  color?: string;
  border?: string;
  fill?: string;
  highlight?: readonly (number | undefined)[];
  highlightColor?: string;
}> = ({ values, digits = 1, size = 24, cell, color = INK, border = DATA, fill = DATA_TINT, highlight, highlightColor = MARK }) => {
  const w = cell ?? Math.round(size * (digits + 2.4) * 0.8);
  return (
    <span style={{ display: "inline-flex", border: `2px solid ${border}`, borderRadius: 6, overflow: "hidden", background: fill }}>
      {values.map((v, i) => {
        const h = highlight?.[i] ?? 0;
        return (
          <span
            key={i}
            style={{
              width: w,
              textAlign: "center",
              padding: "6px 0 7px",
              fontFamily: MONO,
              fontSize: size,
              fontWeight: 600,
              color,
              borderLeft: i ? `1px solid color-mix(in srgb, ${border} 45%, transparent)` : undefined,
              background: h > 0 ? `color-mix(in srgb, ${highlightColor} ${Math.round(h * 100)}%, transparent)` : undefined,
              ...TABULAR,
            }}
          >
            {fix(v, digits)}
          </span>
        );
      })}
    </span>
  );
};

/** A small label in the soft ink, over or beside a figure part. */
export const Tag: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children,
  size = 20,
  color = INK_SOFT,
  style,
}) => <span style={{ ...label(size, color), whiteSpace: "nowrap", ...style }}>{children}</span>;

/** Running text on a figure, in Inter. */
export const Say: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children,
  size = 24,
  color = INK,
  style,
}) => <span style={{ ...note(size, color), whiteSpace: "nowrap", ...style }}>{children}</span>;

/** Text in the mono face, inside running text, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight = 600 }) => (
  <span style={{ fontFamily: MONO, fontWeight: weight, color, fontVariantLigatures: "none" }}>{children}</span>
);

/** Fades its children in on `at` (and out on `out`), sliding up a little. */
export const Fade: React.FC<{
  at: number;
  out?: number;
  dur?: number;
  dy?: number;
  dim?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, out, dur = 12, dy = 10, dim, style, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.68;
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", opacity: p * (1 - o) * (1 - d), transform: `translateY(${(1 - p) * dy}px)`, ...style }}>
      {children}
    </div>
  );
};

/** A dot that marks a data point, with a ring that swells on `ring`. */
export const Dot: React.FC<{ x: number; y: number; at: number; r?: number; color?: string; ring?: number }> = ({
  x,
  y,
  at,
  r = 9,
  color = DATA,
  ring,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 12);
  const g = ring === undefined ? 0 : pulse(frame, ring, 24);
  if (p <= 0.001) return null;
  return (
    <g>
      {g > 0 ? <circle cx={x} cy={y} r={r + 10 * g} fill="none" stroke={POINT} strokeWidth={2.4} opacity={g} /> : null}
      <circle cx={x} cy={y} r={r * Math.min(1.15, p)} fill={color} />
    </g>
  );
};
