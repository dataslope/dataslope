import type { LucideIcon } from "lucide-react";
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, outlineBadgeStyle, type OutlineTone } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The drift, the highlighter and the arrow follow
 * be-scaling's parts (whose Mark takes its bleed back as margin, as
 * da-pandas's does); the boxes are outlined, never filled, and filled shapes
 * (bars, grid cells, blocks) carry no outline, as the owner's 2026-11-20
 * review asks. What is local: token chips, small vectors, square grids of
 * pairs and masks, and the spot art with its natural sizes.
 */
export { OK, OK_INK };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
/** The page's right margin. */
export const RIGHT = 1824;
/** A deep dive's question, its headline size. */
export const Q_SIZE = 56;

// ── Colors: inkOf (theme/brand.ts) and the editorial palette only ────────────

export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 24%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 24%, transparent)`;
/** A filled shape that must hold its shape on white: a step deeper than a tint. */
export const DATA_FILL = ds("blue", 200);
export const DATA_DEEP = ds("blue", 400);
export const BAD_FILL = ds("red", 200);
export const OK_FILL = ds("green", 200);
export const QUIET = ds("gray", 200);
export const QUIET_INK = ds("gray", 500);
export const GOLD = ds("yellow", 600);
export const YELLOW_INK = inkOf.yellow;
export { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT };

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const commas = (v: number) => v.toLocaleString("en-US");
export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** A full-page SVG layer. */
export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A slow push on a finished figure (drift() in components/motion.ts). */
export const Drift: React.FC<{ from: number; to: number; scale?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  scale = 0.018,
  origin = "50% 45%",
  children,
}) => {
  const frame = useCurrentFrame();
  const s = 1 + scale * drift(frame, from, to);
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>;
};

/** Fades a group away from `at` (and keeps it gone): a part of a scene that
 *  the next part replaces. */
export const Clear: React.FC<{ at: number; dur?: number; children: React.ReactNode }> = ({ at, dur = 12, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, at, dur);
  if (o >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - o, transform: `translateY(${-o * 8}px)` }}>{children}</div>;
};

/** Dims a group from `at` (a figure the narration has moved past, still in view). */
export const Dim: React.FC<{ at: number; to?: number; children: React.ReactNode }> = ({ at, to = 0.35, children }) => {
  const frame = useCurrentFrame();
  const d = ease(frame, at, 14);
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - (1 - to) * d }}>{children}</div>;
};

// ── Headings ─────────────────────────────────────────────────────────────────

/** The series' kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(26, ACCENT_INK)}>{children}</span>
    </Ink>
  );
};

/** A headline under the kicker, in the variant's face. */
export const Headline: React.FC<{ at: number; out?: number; size?: number; top?: number; width?: number; children: React.ReactNode }> = ({
  at,
  out,
  size = 64,
  top = 150,
  width,
  children,
}) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={20} out={out} style={{ left: 92, top: y(top), width, ...headline(size), whiteSpace: width ? undefined : "nowrap", textWrap: "balance" }}>
      {children}
    </Ink>
  );
};

/**
 * A highlighter stroke laid under the words it wraps, swept left to right on
 * `at` (be-scaling/parts.tsx). It reaches 0.14em past the words on each side
 * and takes that back as margin, so a neighbour keeps a full space.
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

/** A line of text that inks in at `at`: the page's notes and statements. */
export const Line: React.FC<{
  at: number;
  x: number;
  y: number;
  out?: number;
  dim?: number;
  size?: number;
  color?: string;
  weight?: number;
  align?: "left" | "right" | "center";
  width?: number;
  children: React.ReactNode;
}> = ({ at, x, y, out, dim, size = 26, color = INK, weight = 500, align = "left", width, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  const left = align === "left" ? x : align === "right" ? x - (width ?? 0) : x - (width ?? 0) / 2;
  return (
    <Ink at={at} dur={14} out={out} style={{ left, top: y, width, textAlign: align, opacity: 1 - d }}>
      <span style={{ ...note(size, color), fontWeight: weight, whiteSpace: "nowrap" }}>{children}</span>
    </Ink>
  );
};

/** Code in a line of prose: the mono face at 0.92em, never under 19px. */
export const Code: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontWeight: 500, fontVariantLigatures: "none", color, whiteSpace: "pre" }}>{children}</span>
);

// ── Boxes, chips and arrows ──────────────────────────────────────────────────

/** A box's highlight: an outline and text in one hue, never a fill. */
export type Tone = "plain" | "data" | "ok" | "bad" | "lit" | "quiet";
const TONE: Record<Tone, { line: string; ink: string }> = {
  plain: { line: INK, ink: INK },
  data: { line: BAR, ink: BLUE_INK },
  ok: { line: OK, ink: OK_INK },
  bad: { line: ACCENT, ink: ACCENT_INK },
  lit: { line: GOLD, ink: INK },
  quiet: { line: ds("gray", 400), ink: QUIET_INK },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;

/**
 * A diagram's box: no fill, a 2px outline and black text (README, "A
 * diagram's boxes are outlined, not filled"). It pops in on `at`; `tone`
 * may change over time, and `turn` crossfades to a second tone from a frame.
 * A program's chip may carry a Lucide icon at the label's size.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  tone?: Tone;
  turn?: { tone: Tone; at: number };
  size?: number;
  sub?: React.ReactNode;
  subSize?: number;
  icon?: LucideIcon;
  dim?: number;
  out?: number;
  dashed?: boolean;
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, tone = "plain", turn, size = 24, sub, subSize = 20, icon: Icon, dim, out, dashed, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.62;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  const t = turn ? ease(frame, turn.at, 12) : 0;
  const a = TONE[tone];
  const b = turn ? TONE[turn.tone] : a;
  const mix = (u: string, v: string) => (t <= 0 ? u : t >= 1 ? v : `color-mix(in srgb, ${v} ${t * 100}%, ${u})`);
  const line = mix(a.line, b.line);
  const ink = mix(a.ink, b.ink);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${line}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "0 10px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
      }}
    >
      {children ? (
        <span style={{ ...label(size, ink), fontWeight: 500, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.35em", fontSize: size }}>
          {Icon ? <Icon size={size} color={ink} strokeWidth={2} style={{ flexShrink: 0 }} /> : null}
          {children}
        </span>
      ) : null}
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap" }}>{sub}</span> : null}
    </div>
  );
};

/**
 * A token, a value or a short tag as an outlined badge (`outlineBadgeStyle`):
 * no fill, a 2px border and text in one ink. It pops in on `at`, and `turn`
 * changes its tone from a frame (an unseen word turning into "unknown").
 */
export const Chip: React.FC<{
  x: number;
  y: number;
  at: number;
  tone?: OutlineTone;
  size?: number;
  mono?: boolean;
  dim?: number;
  out?: number;
  align?: "left" | "center";
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, at, tone = "blue", size = 24, mono, dim, out, align = "left", style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 15);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${align === "center" ? "-50%" : "0"}, ${(1 - Math.min(1, p)) * 10}px)`,
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        ...style,
      }}
    >
      <span style={{ ...outlineBadgeStyle(tone, size), fontFamily: mono ? MONO : undefined, fontVariantLigatures: "none", whiteSpace: "pre" }}>
        {children}
      </span>
    </div>
  );
};

/** A token as o200k prints it: its leading space shown as a centred dot. */
export const showToken = (piece: string) => piece.replace(/^ /, "·");

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from its
 * tail on `at`, its head built by arrowHead() on the straight last stretch.
 * `head={0}` draws a plain line.
 */
export const Flow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  dash?: string;
  dim?: number;
  out?: number;
  opacity?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 14, dash, dim, out, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2 ? roundedPolyline(points, 16) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = head > 0 ? Math.max(0, (len - head + 1) / len) : 1;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) * opacity }}>
      {dash ? (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }} />
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      {head > 0 ? <path d={arrowHead(line, head, head * 0.53, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} /> : null}
    </svg>
  );
};

/** A plain line (a joining line, a rule) that draws itself on `at`. */
export const Rule: React.FC<{ x1: number; y1: number; x2: number; y2: number; at: number; color?: string; width?: number; dur?: number; dash?: string; out?: number }> = ({
  x1,
  y1,
  x2,
  y2,
  at,
  color = INK,
  width = 2,
  dur = 12,
  dash,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <line x1={x1} y1={y1} x2={lerp(x1, x2, p)} y2={lerp(y1, y2, p)} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  );
};

// ── Vectors and grids ────────────────────────────────────────────────────────

/**
 * A small vector: `values.length` bars standing on a baseline, filled, no
 * outline, each growing on `at` (staggered). Values are 0 to 1 of `h`.
 */
export const Vec: React.FC<{
  x: number;
  y: number;
  values: readonly number[];
  h: number;
  bar?: number;
  gap?: number;
  at: number;
  color?: string;
  dim?: number;
}> = ({ x, y, values, h, bar = 7, gap = 3, at, color = BAR, dim }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - d }}>
      {values.map((v, i) => {
        const p = ease(frame, at + i * 1.2, 10);
        if (p <= 0) return null;
        const bh = Math.max(3, v * h) * p;
        return <rect key={i} x={x + i * (bar + gap)} y={y - bh} width={bar} height={bh} rx={2} fill={color} />;
      })}
    </svg>
  );
};

/**
 * An n-by-n square of cells, filled with no outline: pairs of positions, or an
 * attention mask. `on(r, c)` says whether a cell is in (filled) or out (a
 * faint ground); cells fill in row by row from `at` over `dur` frames.
 */
export const Grid: React.FC<{
  x: number;
  y: number;
  n: number;
  size: number;
  gap?: number;
  at: number;
  dur?: number;
  on?: (r: number, c: number) => boolean;
  color?: string | ((r: number, c: number) => string);
  ground?: string;
  dim?: number;
  out?: number;
  radius?: number;
}> = ({ x, y, n, size, gap = 2, at, dur = 18, on = () => true, color = DATA_FILL, ground = ds("gray", 100), dim, out, radius }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (o >= 1) return null;
  const cell = (size - gap * (n - 1)) / n;
  const r = radius ?? Math.min(4, cell / 5);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - d) * (1 - o) }}>
      {Array.from({ length: n * n }, (_, k) => {
        const row = Math.floor(k / n);
        const col = k % n;
        const p = ease(frame, at + (row / Math.max(1, n - 1)) * dur * 0.7 + (col / Math.max(1, n)) * dur * 0.3, 8);
        if (p <= 0) return null;
        const lit = on(row, col);
        const fill = lit ? (typeof color === "function" ? color(row, col) : color) : ground;
        return <rect key={k} x={x + col * (cell + gap)} y={y + row * (cell + gap)} width={cell} height={cell} rx={r} fill={fill} opacity={p} />;
      })}
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each watercolor's natural size after the import's trim. At 4K an image may
 *  be drawn at most half that on the 1080p layout. */
export const SPOTS = {
  dolphin: [1430, 1000],
  scissors: [894, 1012],
  drawers: [825, 926],
  plug: [1024, 1024],
} as const satisfies Record<string, readonly [number, number]>;
export type SpotId = keyof typeof SPOTS;
export const spotH = (id: SpotId, w: number) => Math.round((w * SPOTS[id][1]) / SPOTS[id][0]);

/**
 * A watercolor from illustrations.json, `w` wide at (x, y): it pops in on
 * `at` (the scene cues an `el-pop` on the same frame), bobs gently, and fades
 * on `out`.
 */
export const Spot: React.FC<{ id: SpotId; at: number; out?: number; x: number; y: number; w: number; phase?: number }> = ({
  id,
  at,
  out,
  x,
  y,
  w,
  phase = 0,
}) => {
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
        left: x,
        top: y,
        width: w,
        height: spotH(id, w),
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame + phase, 4, 100) + (1 - p) * 24}px) scale(${0.85 + 0.15 * Math.min(1, p)})`,
      }}
    />
  );
};

/** A heading over a column, with the 1px rule the house puts under one. */
export const ColHead: React.FC<{ at: number; x: number; y: number; w: number; color?: string; size?: number; out?: number; children: React.ReactNode }> = ({
  at,
  x,
  y,
  w,
  color = INK,
  size = 28,
  out,
  children,
}) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  return (
    <>
      <Ink at={at} dur={14} out={out} style={{ left: x, top: y, whiteSpace: "nowrap" }}>
        <span style={{ ...label(size, color), fontWeight: 600 }}>{children}</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y + size * 1.3 + 12,
          width: w * ease(frame, at + 2, 16),
          height: 1,
          background: HAIRLINE,
          opacity: 1 - o,
        }}
      />
    </>
  );
};

export { INK as TEXT, headline };
