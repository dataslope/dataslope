import React, { useId } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { I, MathRun } from "../../editorial/math";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (Drift, Kicker, Headline,
 * Mark, Line) follows be-algorithms/parts.tsx and the plot pieces (scales,
 * axes, a curve drawn along its length, decision regions) ds-ml-models' and
 * da-statistics-communication's, copied rather than imported so this video
 * does not move when those are revised. What is local: a log scale, the loss
 * bowl's contours, a model's eleven numbers and a block of training rows (the
 * hook's two models, again in question six), the five groups as a ruled
 * list, outlined diagram boxes and the arrows between them, and the spots.
 */
export { OK, OK_INK };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const RIGHT = 1800;
/** The question's size: one line for most, two for the long ones. */
export const Q_SIZE = 58;

// ── Colors: one meaning each (interview.tsx), brand tokens only ──────────────

/** Data. */
export const DATA = BAR;
/** A filled block of data that must hold its shape on white. */
export const DATA_FILL = ds("blue", 200);
/** Two classes of points: two blues, light and deep. */
export const C0 = ds("blue", 300);
export const C1 = ds("blue", 700);
export const CLASS = [C0, C1] as const;
/** The regions a classifier gives each class, washed out. */
export const TINT = [ds("blue", 50), ds("blue", 100)] as const;
/** What the narration points at, as a line or a ring (the wash is HIGHLIGHT). */
export const POINT = ds("yellow", 600);
export const POINT_INK = inkOf.yellow;
export const MARK_OK = `color-mix(in srgb, ${OK} 22%, transparent)`;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 22%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** "74.5%", "89%". */
export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
/** "10,000,000". */
export const int = (v: number) => Math.round(v).toLocaleString("en-US");
/** A number with a true minus sign: "−0.94". */
export const num = (v: number, digits = 2) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(digits);

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A slow push on the whole scene: a few percent over its life, up to speed
 *  in two seconds, so a long scene never sits still. */
export const Drift: React.FC<{ from: number; to: number; scale?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  scale = 0.02,
  origin = "50% 45%",
  children,
}) => {
  const frame = useCurrentFrame();
  const s = 1 + scale * drift(frame, from, to);
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>;
};

/** Fades its children in on `at` and out on `out`; `dim` sets them back. */
export const Fade: React.FC<{ at: number; out?: number; dim?: number; dur?: number; children: React.ReactNode }> = ({
  at,
  out,
  dim,
  dur = 10,
  children,
}) => {
  const frame = useCurrentFrame();
  const o = ease(frame, at, dur) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  if (o <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: o * (1 - d) }}>{children}</div>;
};

// ── Headings ─────────────────────────────────────────────────────────────────

/** The series' kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={{ ...label(26, ACCENT_INK), fontWeight: 500 }}>{children}</span>
    </Ink>
  );
};

/** A headline in one face on one line, its second half inked on its own cue. */
export const Headline: React.FC<{ lead: string; turn?: string; at: number; turnAt?: number; out?: number; size?: number }> = ({
  lead,
  turn,
  at,
  turnAt,
  out,
  size = 64,
}) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink at={turnAt ?? at + 10} dur={18} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/**
 * A highlighter stroke under the words it wraps, swept on `at`, lifted on
 * `out`. It reaches 0.14em past the words on each side and takes that back as
 * margin, so a neighbour keeps a full space (da-pandas/parts.tsx).
 */
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
    <span style={{ position: "relative", display: "inline-block", margin: "0 0.14em" }}>
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

/** One line of Inter at one size that inks in on `at`: the scene's notes. */
export const Line: React.FC<{
  at: number;
  x: number;
  y: number;
  size?: number;
  color?: string;
  weight?: number;
  out?: number;
  dim?: number;
  width?: number;
  align?: "left" | "center" | "right";
  wrap?: boolean;
  children: React.ReactNode;
}> = ({ at, x, y, size = 26, color = INK, weight = 500, out, dim, width, align = "left", wrap = false, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  return (
    <Ink
      at={at}
      dur={14}
      out={out}
      style={{
        left: align === "left" ? x : align === "center" ? x - (width ?? 0) / 2 : x - (width ?? 0),
        top: y,
        width,
        textAlign: align,
        whiteSpace: wrap ? "normal" : "nowrap",
        opacity: 1 - d,
      }}
    >
      <span style={{ ...note(size, color), fontWeight: weight }}>{children}</span>
    </Ink>
  );
};

/** The 1px hairline between columns set side by side, drawn down on `at`. */
export const VRule: React.FC<{ x: number; top: number; bottom: number; at: number; out?: number; dim?: number }> = ({
  x,
  top,
  bottom,
  at,
  out,
  dim,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: Math.round(x), top, width: 1, height: (bottom - top) * p, background: HAIRLINE, opacity: (1 - o) * (1 - d) }} />
  );
};

/** A horizontal hairline, drawn left to right on `at`. */
export const HRule: React.FC<{ x: number; y: number; width: number; at: number; out?: number; dim?: number }> = ({ x, y, width, at, out, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top: Math.round(y), width: width * p, height: 1, background: HAIRLINE, opacity: (1 - o) * (1 - d) }} />;
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor from illustrations.json: it pops in on `at` with its sound,
 *  bobs gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  sound?: boolean;
}> = ({ id, at: from, out, dim, left, top, width, height, sound = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS) return null;
  return (
    <>
      {sound ? <Sfx name="el-pop" at={from} level={-30} /> : null}
      {p > 0.001 && o < 1 ? (
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
      ) : null}
    </>
  );
};

/** The art's natural sizes, so a box keeps its aspect. */
export const ART = {
  toucan: [1090, 1023],
  trees: [930, 964],
  paint: [1018, 488],
} as const;
export const artH = (id: keyof typeof ART, w: number) => Math.round((w * ART[id][1]) / ART[id][0]);

// ── Scales and plots ─────────────────────────────────────────────────────────

/** A map from data units onto a span of the page, linear or by powers of ten. */
export type Scale = { lo: number; hi: number; a: number; b: number; log?: boolean };
export const at = (s: Scale, v: number) => {
  const f = s.log ? (Math.log10(v) - Math.log10(s.lo)) / (Math.log10(s.hi) - Math.log10(s.lo)) : (v - s.lo) / (s.hi - s.lo);
  return s.a + f * (s.b - s.a);
};

/** A plot's box in page pixels. */
export type Box = { left: number; top: number; width: number; height: number };

/** The two scales that put data limits onto a box (y grows upward). */
export const scales = (
  box: Box,
  xlim: readonly [number, number],
  ylim: readonly [number, number],
  log: { x?: boolean; y?: boolean } = {},
): { x: Scale; y: Scale } => ({
  x: { lo: xlim[0], hi: xlim[1], a: box.left, b: box.left + box.width, log: log.x },
  y: { lo: ylim[0], hi: ylim[1], a: box.top + box.height, b: box.top, log: log.y },
});

const tickText = (size: number): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: 500,
  fill: INK_SOFT,
  fontVariantNumeric: "tabular-nums",
});

/** A tick's text with a true minus sign: tabular figures give a hyphen-minus
 *  a digit's width. */
const minus = (t: React.ReactNode): React.ReactNode => (typeof t === "string" ? t.replace(/-(?=[\d.])/g, "−") : t);

/**
 * A plot's frame: a baseline with ticks under it, faint dotted gridlines at
 * the y ticks with their numbers on the left, and each axis's title (x at the
 * right end under the ticks, y above the left end). Draws itself on `at`.
 */
export const Axes: React.FC<{
  x: Scale;
  y: Scale;
  xTicks: readonly number[];
  yTicks?: readonly number[];
  xFormat?: (v: number) => React.ReactNode;
  yFormat?: (v: number) => React.ReactNode;
  xTitle?: React.ReactNode;
  yTitle?: React.ReactNode;
  at: number;
  out?: number;
  dim?: number;
  size?: number;
}> = ({ x, y, xTicks, yTicks = [], xFormat = String, yFormat = String, xTitle, yTitle, at: from, out, dim, size = 20 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 16);
  const t = ease(frame, from + 6, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const base = y.a;
  const left = x.a;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <g opacity={t}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={left} x2={x.b} y1={at(y, v)} y2={at(y, v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
            <text x={left - 14} y={at(y, v) + 7} textAnchor="end" style={tickText(size)}>
              {minus(yFormat(v))}
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <g key={v}>
            <line x1={at(x, v)} x2={at(x, v)} y1={base + 1} y2={base + 7} stroke={INK} strokeWidth={1.2} />
            <text x={at(x, v)} y={base + 30} textAnchor="middle" style={tickText(size)}>
              {minus(xFormat(v))}
            </text>
          </g>
        ))}
        {xTitle ? (
          <text x={x.b} y={base + 60} textAnchor="end" style={{ ...tickText(20), fontVariantNumeric: "normal" }}>
            {xTitle}
          </text>
        ) : null}
        {yTitle ? (
          <text x={left - 14} y={y.b - 28} textAnchor="start" style={{ ...tickText(20), fontVariantNumeric: "normal" }}>
            {yTitle}
          </text>
        ) : null}
      </g>
      <line x1={left} x2={left + (x.b - left) * p} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
    </svg>
  );
};

/**
 * A line through data points, drawn along its length from `at` over `dur`
 * frames and clipped to `clip`, so a curve that leaves the plot leaves
 * through its frame. A dashed line wipes in behind a growing clip instead.
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
}> = ({ points, x, y, at: from, dur = 24, out, dim, color, width = 3, dash, clip, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.7;
  if (p <= 0 || o >= 1) return null;
  const px = points.map(([a, b]) => [at(x, a), at(y, b)] as const);
  const path = px.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const x0 = clip ? clip.left - 4 : 0;
  const wipe = dash ? px[0][0] + (px[px.length - 1][0] - px[0][0]) * p : undefined;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: opacity * (1 - o) * (1 - d) }}>
      <defs>
        <clipPath id={`c${id}`}>
          <rect
            x={x0}
            y={clip ? clip.top - 4 : 0}
            width={(wipe ?? (clip ? clip.left + clip.width + 4 : 1920)) - x0}
            height={clip ? clip.height + 8 : 1080}
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

/** A point in page pixels for `Dots`: its ink, its radius, when it pops. */
export type Dot = { x: number; y: number; at: number; color: string; r?: number };

/** Data points in page pixels, each popping in on its own frame. */
export const Dots: React.FC<{ dots: readonly Dot[]; r?: number; opacity?: number; out?: number; dim?: number; ring?: string }> = ({
  dots,
  r = 5,
  opacity = 0.9,
  out,
  dim,
  ring = PAPER,
}) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.7;
  if (o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {dots.map((p, i) => {
        const s = ease(frame, p.at, 8);
        if (s <= 0) return null;
        return <circle key={i} cx={p.x} cy={p.y} r={(p.r ?? r) * s} fill={p.color} opacity={opacity} stroke={ring} strokeWidth={1.2} />;
      })}
    </svg>
  );
};

/** A plot box's frame: a hairline rectangle, drawn on `at`. */
export const Frame: React.FC<{ box: Box; at: number; out?: number; dim?: number }> = ({ box, at: from, out, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return (
    <Svg opacity={0.5 * p * (1 - o) * (1 - d)}>
      <rect x={box.left} y={box.top} width={box.width} height={box.height} fill="none" stroke={INK_SOFT} strokeWidth={1.2} rx={8} />
    </Svg>
  );
};

/**
 * A classifier's decision regions from check.mjs's grid (one string a row, a
 * digit a cell, bottom row first), wiped in left to right on `at` and
 * clipped to its box; `edge` draws the boundary between the two classes.
 */
export const Regions: React.FC<{
  grid: readonly string[];
  box: Box;
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  edge?: string;
}> = ({ grid, box, at: from, dur = 18, out, dim, edge }) => {
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
  const edges: string[] = [];
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
    // The boundary runs between neighbouring cells of different classes.
    for (let c = 0; c < nx; c++) {
      const cx = box.left + c * cw;
      const cy = box.top + box.height - r * ch;
      if (c + 1 < nx && row[c] !== row[c + 1]) edges.push(`M${cx + cw / 2},${cy - ch / 2} L${cx + cw / 2},${cy + ch / 2}`);
      if (r + 1 < ny && row[c] !== grid[r + 1][c]) edges.push(`M${cx - cw / 2},${cy - ch / 2} L${cx + cw / 2},${cy - ch / 2}`);
    }
  });
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <defs>
        <clipPath id={`r${id}`}>
          <rect x={box.left} y={box.top} width={box.width * p} height={box.height} rx={8} />
        </clipPath>
      </defs>
      <g clipPath={`url(#r${id})`}>
        {rects}
        {edge ? <path d={edges.join(" ")} fill="none" stroke={edge} strokeWidth={2.2} strokeLinecap="square" /> : null}
      </g>
    </svg>
  );
};

// ── Smooth contours of a function sampled on a grid ─────────────────────────

/** A contour's polylines in grid units (column, row; row 0 the bottom row),
 *  by marching squares with linear interpolation along each cell edge, the
 *  segments chained through the edges they share, so a dashed line keeps its
 *  rhythm. A saddle cell is resolved by its centre's value. Cached per grid
 *  and level: the scenes ask for the same contour on every frame. */
const contourCache = new WeakMap<readonly (readonly number[])[], Map<number, [number, number][][]>>();
export const contour = (f: readonly (readonly number[])[], level: number): [number, number][][] => {
  let byLevel = contourCache.get(f);
  if (!byLevel) {
    byLevel = new Map();
    contourCache.set(f, byLevel);
  }
  const hit = byLevel.get(level);
  if (hit) return hit;
  const ny = f.length;
  const nx = f[0].length;
  const v = (r: number, c: number) => f[r][c] - level;
  // An edge: "h r c" joins (r, c)-(r, c+1); "v r c" joins (r, c)-(r+1, c).
  const point = (id: string): [number, number] => {
    const [k, rs, cs] = id.split(" ");
    const r = Number(rs);
    const c = Number(cs);
    const a = v(r, c);
    const b = k === "h" ? v(r, c + 1) : v(r + 1, c);
    const t = a / (a - b);
    return k === "h" ? [c + t, r] : [c, r + t];
  };
  const links = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    links.set(a, [...(links.get(a) ?? []), b]);
    links.set(b, [...(links.get(b) ?? []), a]);
  };
  for (let r = 0; r + 1 < ny; r++) {
    for (let c = 0; c + 1 < nx; c++) {
      const bl = v(r, c) >= 0;
      const br = v(r, c + 1) >= 0;
      const tr = v(r + 1, c + 1) >= 0;
      const tl = v(r + 1, c) >= 0;
      const b = `h ${r} ${c}`;
      const t = `h ${r + 1} ${c}`;
      const l = `v ${r} ${c}`;
      const rt = `v ${r} ${c + 1}`;
      const cut = [bl !== br ? b : null, br !== tr ? rt : null, tr !== tl ? t : null, tl !== bl ? l : null].filter((e): e is string => e !== null);
      if (cut.length === 2) link(cut[0], cut[1]);
      else if (cut.length === 4) {
        const centre = (v(r, c) + v(r, c + 1) + v(r + 1, c + 1) + v(r + 1, c)) / 4 >= 0;
        if (centre === bl) {
          link(b, rt);
          link(l, t);
        } else {
          link(b, l);
          link(rt, t);
        }
      }
    }
  }
  const seen = new Set<string>();
  const lines: [number, number][][] = [];
  // Open lines start at an edge with one neighbour; closed loops anywhere.
  const starts = [...links.keys()].sort((a, b) => (links.get(a)!.length === 1 ? 0 : 1) - (links.get(b)!.length === 1 ? 0 : 1));
  for (const s0 of starts) {
    if (seen.has(s0)) continue;
    const ids = [s0];
    seen.add(s0);
    let cur = s0;
    for (;;) {
      const next = (links.get(cur) ?? []).find((e) => !seen.has(e));
      if (!next) break;
      ids.push(next);
      seen.add(next);
      cur = next;
    }
    if ((links.get(cur) ?? []).includes(s0) && ids.length > 2) ids.push(s0);
    if (ids.length > 1) lines.push(ids.map(point));
  }
  byLevel.set(level, lines);
  return lines;
};

/**
 * Contours of a function on a grid over `range` (both axes, as `Regions`),
 * drawn smooth in page pixels and wiped in left to right on `at` like the
 * regions under them: the boundary as a solid line, a margin dashed.
 */
export const Contours: React.FC<{
  f: readonly (readonly number[])[];
  box: Box;
  lines: readonly { level: number; color: string; width: number; dash?: string; at: number }[];
  dur?: number;
  out?: number;
  dim?: number;
}> = ({ f, box, lines, dur = 20, out, dim }) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (o >= 1) return null;
  const nx = f[0].length;
  const ny = f.length;
  const px = ([c, r]: [number, number]) => `${(box.left + (c / (nx - 1)) * box.width).toFixed(1)},${(box.top + box.height - (r / (ny - 1)) * box.height).toFixed(1)}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {lines.map((ln, k) => {
        const p = ease(frame, ln.at, dur);
        if (p <= 0) return null;
        const d0 = contour(f, ln.level)
          .map((pl) => `M${pl.map(px).join(" L")}`)
          .join(" ");
        return (
          <g key={k}>
            <defs>
              <clipPath id={`c${id}${k}`}>
                <rect x={box.left} y={box.top} width={box.width * p} height={box.height} rx={8} />
              </clipPath>
            </defs>
            <path d={d0} clipPath={`url(#c${id}${k})`} fill="none" stroke={ln.color} strokeWidth={ln.width} strokeDasharray={ln.dash} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
};

/** A small title over a panel, in the chart face. */
export const PanelTitle: React.FC<{
  x: number;
  y: number;
  at: number;
  out?: number;
  dim?: number;
  color?: string;
  size?: number;
  children: React.ReactNode;
}> = ({ x, y, at: from, out, dim, color = INK, size = 24, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 12) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, whiteSpace: "nowrap", opacity: o * (1 - d), ...label(size, color), fontWeight: 500 }}>
      {children}
    </div>
  );
};

// ── The loss bowl ────────────────────────────────────────────────────────────

/**
 * Contours of a quadratic loss over two weights, dᵀ·H·d = c around `centre`
 * for each `c` in `levels`, drawn from the eigenvectors of the 2×2 `H`
 * (GD.bowl), the innermost first. Each ellipse draws itself on `at`.
 */
export const Bowl: React.FC<{
  H: readonly (readonly [number, number])[];
  centre: readonly [number, number];
  levels: readonly number[];
  x: Scale;
  y: Scale;
  at: number;
  out?: number;
  dim?: number;
  clip?: Box;
}> = ({ H, centre, levels, x, y, at: from, out, dim, clip }) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (frame < from || o >= 1) return null;
  const [[a, b], [, c]] = H;
  // Eigen-decomposition of the symmetric 2×2.
  const tr = a + c;
  const disc = Math.sqrt(((a - c) / 2) ** 2 + b * b);
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  // The first eigenvector is (b, l1 − a), or an axis when the bowl is not
  // tilted; the second is at right angles to it.
  const e = Math.abs(b) > 1e-9 ? [b, l1 - a] : a >= c ? [1, 0] : [0, 1];
  const el = Math.hypot(e[0], e[1]);
  const v1 = [e[0] / el, e[1] / el];
  const v2 = [-v1[1], v1[0]];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {clip ? (
        <defs>
          <clipPath id={`b${id}`}>
            <rect x={clip.left} y={clip.top} width={clip.width} height={clip.height} rx={8} />
          </clipPath>
        </defs>
      ) : null}
      <g clipPath={clip ? `url(#b${id})` : undefined}>
        {levels.map((lv, i) => {
          const p = ease(frame, from + i * 3, 18);
          if (p <= 0) return null;
          const r1 = Math.sqrt(lv / l1);
          const r2 = Math.sqrt(lv / l2);
          const pts = Array.from({ length: 97 }, (_, k) => {
            const t = (k / 96) * Math.PI * 2;
            const dx = r1 * Math.cos(t) * v1[0] + r2 * Math.sin(t) * v2[0];
            const dy = r1 * Math.cos(t) * v1[1] + r2 * Math.sin(t) * v2[1];
            return `${k ? "L" : "M"}${at(x, centre[0] + dx).toFixed(1)},${at(y, centre[1] + dy).toFixed(1)}`;
          }).join(" ");
          return (
            <path
              key={lv}
              d={pts}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth={1.4}
              opacity={0.5}
              pathLength={1}
              strokeDasharray={`${p} 1`}
            />
          );
        })}
      </g>
    </svg>
  );
};

/** A path of steps in data units: dots joined by a thin line, each step
 *  arriving `every` frames after the last from `at`. */
export const StepPath: React.FC<{
  path: readonly (readonly [number, number])[];
  x: Scale;
  y: Scale;
  at: number;
  every: number;
  color: string;
  r?: number;
  out?: number;
  dim?: number;
  clip?: Box;
}> = ({ path, x, y, at: from, every, color, r = 4.5, out, dim, clip }) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  if (frame < from || o >= 1) return null;
  const px = path.map(([a, b]) => [at(x, a), at(y, b)] as const);
  const reached = (i: number) => ease(frame, from + i * every, Math.max(4, every));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {clip ? (
        <defs>
          <clipPath id={`p${id}`}>
            <rect x={clip.left} y={clip.top} width={clip.width} height={clip.height} rx={8} />
          </clipPath>
        </defs>
      ) : null}
      <g clipPath={clip ? `url(#p${id})` : undefined}>
        {px.map(([a, b], i) => {
          if (i === 0) return null;
          const q = reached(i);
          if (q <= 0) return null;
          const [a0, b0] = px[i - 1];
          return <line key={`l${i}`} x1={a0} y1={b0} x2={a0 + (a - a0) * q} y2={b0 + (b - b0) * q} stroke={color} strokeWidth={2} opacity={0.7} />;
        })}
        {px.map(([a, b], i) => {
          const q = i === 0 ? ease(frame, from - 4, 6) : reached(i);
          if (q <= 0) return null;
          return <circle key={`d${i}`} cx={a} cy={b} r={(i === 0 ? r + 2 : r) * q} fill={i === 0 ? INK : color} />;
        })}
      </g>
    </svg>
  );
};

/** The least-squares answer: a small ring with a cross in it. */
export const Target: React.FC<{ px: Pt; at: number; out?: number; dim?: number; color?: string; ring?: boolean }> = ({
  px,
  at: from,
  out,
  dim,
  color = INK,
  ring = true,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 10);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const [cx, cy] = px;
  return (
    <Svg opacity={p * (1 - o) * (1 - d)}>
      {ring ? <circle cx={cx} cy={cy} r={9} fill="none" stroke={color} strokeWidth={2} /> : null}
      <path
        d={ring ? `M${cx - 4},${cy - 4} L${cx + 4},${cy + 4} M${cx + 4},${cy - 4} L${cx - 4},${cy + 4}` : `M${cx - 7},${cy - 7} L${cx + 7},${cy + 7} M${cx + 7},${cy - 7} L${cx - 7},${cy + 7}`}
        stroke={color}
        strokeWidth={ring ? 2 : 2.6}
        strokeLinecap="round"
      />
    </Svg>
  );
};

// ── Bars ─────────────────────────────────────────────────────────────────────

/**
 * A value drawn as a horizontal bar: its label on a line of its own above,
 * the bar growing from `x` on `at` to `value / max` of `w`, the number at its
 * end in the label's size. A value too small to see still draws a sliver.
 */
export const HBar: React.FC<{
  x: number;
  y: number;
  w: number;
  max: number;
  value: number;
  at: number;
  dur?: number;
  color?: string;
  ink?: string;
  label: React.ReactNode;
  valueText: React.ReactNode;
  size?: number;
  barH?: number;
  out?: number;
  dim?: number;
  lit?: number;
}> = ({ x, y, w, max, value, at: from, dur = 22, color = DATA, ink = INK, label: name, valueText, size = 24, barH = 26, out, dim, lit = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const full = Math.max(3, (value / max) * w);
  const bw = full * p;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, p * 2) * (1 - o) * (1 - d) }}>
      <div style={{ ...note(size, INK), fontWeight: 500, whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ position: "relative", height: barH, marginTop: 12 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: bw, height: barH, background: color, borderRadius: 4 }} />
        <div
          style={{
            position: "absolute",
            left: bw + 16,
            top: barH / 2,
            transform: "translateY(-50%)",
            ...note(size, ink),
            ...TABULAR,
            fontWeight: 500,
            whiteSpace: "nowrap",
            opacity: ease(frame, from + dur * 0.6, 8),
          }}
        >
          {lit > 0 ? <Mark at={from + dur}>{valueText}</Mark> : valueText}
        </div>
      </div>
    </div>
  );
};

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/**
 * A diagram's box: no fill, black text, a 2px near-black outline (the owner,
 * 2026-11-12). A highlight colors the outline and the text together.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
  size?: number;
  subSize?: number;
  dim?: number;
  out?: number;
}> = ({ x, y, w, h, at: from, title, sub, color = INK, size = 24, subSize = 20, dim, out }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px solid ${color}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
      }}
    >
      <span style={{ ...label(size, color), fontWeight: 500, whiteSpace: "nowrap" }}>{title}</span>
      {sub ? <span style={{ ...note(subSize, color === INK ? INK_SOFT : color), whiteSpace: "nowrap" }}>{sub}</span> : null}
    </div>
  );
};

/** An arrow along `points` (corners rounded), drawn from its tail on `at`,
 *  its head from arrowHead() on the straight last stretch. */
export const Flow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  dim?: number;
  out?: number;
}> = ({ points, at: from, dur = 14, color = INK, width = 2.4, head = 14, dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2 ? roundedPolyline(points, 18) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = Math.max(0, (len - head + 1) / len);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      <path d={arrowHead(line, head, 7, { filled: true })} fill={color} opacity={ease(frame, from + dur - 4, 5)} />
    </svg>
  );
};

// ── The hook's two models (and question six's) ───────────────────────────────

/**
 * A logistic regression, all of it: ten weights and a bias, one a row, the
 * names in the math face and the values in the data blue. Rows ink in from
 * `at`, `every` frames apart.
 */
export const ElevenNumbers: React.FC<{
  weights: readonly number[];
  bias: number;
  x: number;
  top: number;
  row: number;
  at: number;
  every?: number;
  size?: number;
  dim?: number;
  out?: number;
}> = ({ weights, bias, x, top, row, at: from, every = 2, size = 24, dim, out }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (o >= 1) return null;
  const rows = [...weights.map((w, i) => ({ name: "w", sub: String(i + 1), v: w })), { name: "b", sub: "", v: bias }];
  return (
    <div style={{ position: "absolute", left: x, top, opacity: (1 - o) * (1 - d) }}>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: i * row,
            display: "flex",
            alignItems: "baseline",
            fontSize: size,
            whiteSpace: "nowrap",
            opacity: ease(frame, from + i * every, 8),
          }}
        >
          <span style={{ width: 52, color: INK }}>
            <MathRun>
              <I>{r.name}</I>
              {r.sub ? <sub style={{ fontSize: "0.68em" }}>{r.sub}</sub> : null}
            </MathRun>
          </span>
          <span style={{ ...note(size, BLUE_INK), ...TABULAR, width: 80, textAlign: "right" }}>{num(r.v)}</span>
        </div>
      ))}
    </div>
  );
};

/** A small seeded generator, so a block's shading is the same every frame. */
export const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SHADES = [ds("blue", 200), ds("blue", 300), ds("blue", 400)] as const;

/**
 * Training rows as a block: each row a strip of `cells` small filled squares
 * (one per feature), strips set `cols` to a line. Strips arrive `rate` per
 * frame from `at`; `count` may grow during a scene (question six's ten
 * million rows fill the block). Filled shapes, so no outline.
 */
export const RowsBlock: React.FC<{
  x: number;
  top: number;
  cols: number;
  count: number;
  cells?: number;
  cell?: number;
  cellH?: number;
  gapX?: number;
  gapY?: number;
  at: number;
  rate?: number;
  dim?: number;
  out?: number;
  lit?: (i: number) => number;
}> = ({ x, top, cols, count, cells = 10, cell = 9, cellH = 9, gapX = 22, gapY = 6, at: from, rate = 4, dim, out, lit }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (frame < from || o >= 1) return null;
  const rnd = mulberry32(7);
  const shades = Array.from({ length: count * cells }, () => SHADES[Math.floor(rnd() * 3)]);
  const shown = Math.min(count, Math.floor((frame - from) * rate));
  const stripW = cells * (cell + 1) - 1;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {Array.from({ length: shown }, (_, i) => {
        const cx = x + (i % cols) * (stripW + gapX);
        const cy = top + Math.floor(i / cols) * (cellH + gapY);
        const l = lit ? lit(i) : 0;
        return (
          <g key={i}>
            {Array.from({ length: cells }, (_, k) => (
              <rect
                key={k}
                x={cx + k * (cell + 1)}
                y={cy}
                width={cell}
                height={cellH}
                rx={1.5}
                fill={l > 0 ? `color-mix(in srgb, ${ds("blue", 700)} ${l * 100}%, ${shades[i * cells + k]})` : shades[i * cells + k]}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

// ── The five groups ──────────────────────────────────────────────────────────

export const GROUPS = [
  { range: "1–3", name: "Finding the numbers" },
  { range: "4–5", name: "One model, one loss" },
  { range: "6–8", name: "Models that keep the data" },
  { range: "9–10", name: "What features need" },
  { range: "11–13", name: "Many models" },
] as const;

/**
 * The video's plan as a ruled list: each group's question numbers and its
 * name, a hairline between rows, and the quick round in grey at the foot.
 * `lit` is the row the narration is on (a yellow band); `done` ticks every
 * row green.
 */
export const PlanList: React.FC<{
  x: number;
  top: number;
  row: number;
  width: number;
  at: number;
  quickAt: number;
  litAt?: number;
  lit?: number;
  doneAt?: number;
  out?: number;
  size?: number;
}> = ({ x, top, row, width, at: from, quickAt, litAt, lit = 0, doneAt, out, size = 30 }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (o >= 1) return null;
  const rows = [...GROUPS.map((g) => ({ ...g, quick: false })), { range: "14–18", name: "Quick ones", quick: true }];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - o }}>
      {rows.map((r, i) => {
        const a = r.quick ? quickAt : from + i * 4;
        const p = ease(frame, a, 12);
        if (p <= 0) return null;
        const band = litAt !== undefined && i === lit ? ease(frame, litAt, 12) : 0;
        const tick = doneAt !== undefined ? ease(frame, doneAt + i * 3, 10) : 0;
        const ink = r.quick ? INK_SOFT : INK;
        return (
          <div key={r.range} style={{ position: "absolute", left: x, top: top + i * row, width, height: row, opacity: p }}>
            {i > 0 ? <div style={{ position: "absolute", left: 0, top: 0, width: width * p, height: 1, background: HAIRLINE }} /> : null}
            <div
              style={{
                position: "absolute",
                left: -14,
                right: 0,
                top: 8,
                bottom: 8,
                background: HIGHLIGHT,
                borderRadius: 4,
                opacity: band,
              }}
            />
            <div style={{ position: "absolute", left: 0, top: 0, height: row, display: "flex", alignItems: "center", fontSize: size, whiteSpace: "nowrap" }}>
              <span style={{ ...note(size, r.quick ? INK_SOFT : ACCENT_INK), ...TABULAR, width: 120 }}>{r.range}</span>
              <span style={{ ...note(size, ink) }}>{r.name}</span>
              {tick > 0 ? (
                <svg width={size} height={size} viewBox="0 0 24 24" style={{ marginLeft: 18, overflow: "visible" }}>
                  <path
                    d="M4 12.5 L10 18 L20 6"
                    fill="none"
                    stroke={OK}
                    strokeWidth={3.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray={`${tick} 1`}
                  />
                </svg>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** A red cross, drawn on `at`: a wrong assignment, an error. */
export const Cross: React.FC<{ x: number; y: number; at: number; size?: number; color?: string }> = ({ x, y, at: from, size = 14, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 10);
  if (p <= 0) return null;
  const s = size / 2;
  return (
    <Svg>
      <path d={`M${x - s},${y - s} L${x + s},${y + s} M${x + s},${y - s} L${x - s},${y + s}`} stroke={color} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
    </Svg>
  );
};

export { ACCENT, ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT };
