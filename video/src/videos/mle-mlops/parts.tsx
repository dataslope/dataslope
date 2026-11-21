import type { LucideIcon } from "lucide-react";
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, outlineBadgeStyle, type OutlineTone } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit. The kicker, headline, highlighter, drift and arrow are the house's
 * (be-scaling and be-ai-round's parts.tsx); what is new is drawn to the
 * owner's 2026-11-20 preferences: diagram boxes outlined, not filled (a
 * highlight colors the outline and the text together; a box lit yellow takes
 * a gold outline and ink type), filled shapes with no outline, radii of 8 on
 * boxes and 4 on small blocks. And the model's life as a small loop in the
 * corner of every deep dive (`Loop`), the stage the question is about lit.
 */
export { OK, OK_INK };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const RIGHT = 1824;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
/** A deep dive's question wraps within this, clear of the loop at the right. */
export const Q_W = 1180;
export const Q_SIZE = 54;
/** The two longest questions: a little smaller and wider, so they keep to
 *  two lines and still end clear of the loop. */
export const LONG_Q = 48;
export const LONG_W = 1270;

// ── Colors: brand tokens only ────────────────────────────────────────────────

export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 24%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 22%, transparent)`;
/** A lit box's outline: the yellow's darker step, which holds an edge. */
export const LIT_LINE = ds("yellow", 600);
export const YELLOW_INK = inkOf.yellow;
/** A filled block that has to hold its shape on white: a step deeper than a tint. */
export const BLOCK = ds("blue", 200);
export const BLOCK_SOFT = ds("gray", 300);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for something named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** Seeded uniform numbers, so a drawing of scattered dots is the same every frame. */
export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A slow push on a finished figure (drift() in components/motion.ts). */
export const Drift: React.FC<{ from: number; to: number; scale?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  scale = 0.015,
  origin = "50% 45%",
  children,
}) => {
  const frame = useCurrentFrame();
  const s = 1 + scale * drift(frame, from, to);
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>;
};

/** A stretch of a scene that comes in at `from` and leaves at `to`: the
 *  phases of a long answer, each drawn in the same space under the question. */
export const Phase: React.FC<{ from: number; to?: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 10) * (to === undefined ? 1 : 1 - ease(frame, to, 12));
  if (o <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{children}</div>;
};

// ── Headings ─────────────────────────────────────────────────────────────────

export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(26, ACCENT_INK)}>{children}</span>
    </Ink>
  );
};

/** A headline on one line: the lead, then the turn after it, in one face. */
export const Headline: React.FC<{ lead: React.ReactNode; turn?: React.ReactNode; at: number; turnAt?: number; size?: number; top?: number }> = ({
  lead,
  turn,
  at,
  turnAt,
  size = 64,
  top = HEAD_Y,
}) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink at={turnAt ?? at + 10} dur={18} style={{ position: "relative", whiteSpace: "nowrap" }}>
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/**
 * A highlighter stroke laid under the words it wraps, swept left to right on
 * `at` (da-pandas/parts.tsx). It reaches 0.14em past the words on each side
 * and takes that back as margin, so a neighbour keeps a full space.
 */
export const Mark: React.FC<{ at: number; out?: number; dur?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  dur = 12,
  color = MARK,
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

// ── Boxes, chips and arrows ──────────────────────────────────────────────────

/** What a box is: plain ink (a thing, a step), data (blue), the right answer
 *  (green), the trap (red), or what the narration points at (lit: a gold
 *  outline and ink type over the highlighter's wash). */
export type Tone = "plain" | "data" | "ok" | "bad" | "lit";
const TONE: Record<Tone, { line: string; ink: string; wash: string }> = {
  plain: { line: INK, ink: INK, wash: "transparent" },
  data: { line: BAR, ink: BLUE_INK, wash: "transparent" },
  ok: { line: OK, ink: OK_INK, wash: "transparent" },
  bad: { line: ACCENT, ink: ACCENT_INK, wash: "transparent" },
  lit: { line: LIT_LINE, ink: INK, wash: HIGHLIGHT },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;
const mix = (a: string, b: string, t: number) => (t <= 0 ? a : t >= 1 ? b : `color-mix(in srgb, ${b} ${t * 100}%, ${a})`);

/**
 * A diagram box: no fill, a 2px outline, its title in the outline's ink (or
 * black, plain), an optional line under it. It pops in on `at`. `to`/`toAt`
 * turns it into another tone; `lit`/`litOut` lights it yellow for a while.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  to?: Tone;
  toAt?: number;
  lit?: number;
  litOut?: number;
  icon?: LucideIcon;
  size?: number;
  subSize?: number;
  dim?: number;
  out?: number;
  dashed?: boolean;
  align?: "center" | "left";
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "plain", to, toAt, lit, litOut, icon: Icon, size = 24, subSize = 20, dim, out, dashed, align = "center", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  const turn = to && toAt !== undefined ? ease(frame, toAt, 12) : 0;
  const l = (lit === undefined ? 0 : ease(frame, lit, 12)) * (litOut === undefined ? 1 : 1 - ease(frame, litOut, 14));
  const a = TONE[tone];
  const b = TONE[to ?? tone];
  const line = mix(mix(a.line, b.line, turn), LIT_LINE, l);
  const ink = mix(mix(a.ink, b.ink, turn), INK, l);
  const wash = l > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${l * 100}%, transparent)` : turn > 0.5 ? b.wash : a.wash;
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
        background: wash,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: "center",
        gap: 6,
        padding: "0 16px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.92 + 0.08 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      {title ? (
        <span style={{ ...label(size, ink), fontWeight: 500, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.35em", fontSize: size }}>
          {Icon ? <Icon size={Math.round(size * 0.95)} strokeWidth={2.2} color={ink} style={{ flex: "none" }} /> : null}
          {title}
        </span>
      ) : null}
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", textAlign: align }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch. `head={0}` draws a plain line; `dash` draws it dashed.
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
  radius?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 14, dash, dim, out, opacity = 1, radius = 16 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2 ? roundedPolyline(points, radius) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = head > 0 ? Math.max(0, (len - head + 1) / len) : 1;
  const [sx, sy] = points[0];
  const [tx, ty] = points[points.length - 1];
  const across = Math.abs(tx - sx) >= Math.abs(ty - sy);
  const hide = `${(1 - p) * 100}%`;
  const clip = across
    ? tx >= sx
      ? `inset(-40px ${hide} -40px -40px)`
      : `inset(-40px -40px -40px ${hide})`
    : ty >= sy
      ? `inset(-40px -40px ${hide} -40px)`
      : `inset(${hide} -40px -40px -40px)`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) * opacity }}>
      {dash ? (
        <g style={{ clipPath: clip }}>
          <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />
        </g>
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      {head > 0 ? <path d={arrowHead(line, head, head * 0.53, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} /> : null}
    </svg>
  );
};

/** A line of text that inks in at `at`: the page's notes and list items. */
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
}> = ({ at, x, y, out, dim, size = 24, color = INK, weight = 500, align = "left", width, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  const left = align === "left" ? x : align === "right" ? x - (width ?? 0) : x - (width ?? 0) / 2;
  return (
    <Ink at={at} dur={14} out={out} style={{ left, top: y, width, textAlign: align, opacity: 1 - d }}>
      <span style={{ ...note(size, color), fontWeight: weight, whiteSpace: "nowrap" }}>{children}</span>
    </Ink>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each watercolor's natural size after the import's trim. At 4K an image may
 *  be drawn at most half that on the 1080p layout. */
export const SPOTS = {
  walrus: [1528, 1024],
  container: [1016, 754],
  coin: [948, 804],
  lever: [939, 994],
} as const satisfies Record<string, readonly [number, number]>;
export type SpotId = keyof typeof SPOTS;
export const spotH = (id: SpotId, w: number) => Math.round((w * SPOTS[id][1]) / SPOTS[id][0]);

/** A watercolor, `w` wide at (x, y): it pops in on `at` (the scene cues an
 *  `el-pop` on the same frame), bobs gently, and fades on `out`. Keep it
 *  outside a Drift, so it is never drawn past its pixels. */
export const Spot: React.FC<{ id: SpotId; at: number; out?: number; x: number; y: number; w: number; phase?: number }> = ({ id, at, out, x, y, w, phase = 0 }) => {
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

// ── The model's life, as a loop ──────────────────────────────────────────────

export type Stage = "version" | "gate" | "ship" | "watch" | "retrain";
const ROW_STAGES: Stage[] = ["version", "gate", "ship", "watch"];
/** Each chip's width in em of its own type, and the gap an arrow crosses. */
const CHIP_EM: Record<Stage, number> = { version: 5.0, gate: 3.6, ship: 3.4, watch: 4.2, retrain: 4.9 };
const GAP_EM = 1.9;
const CHIP_H_EM = 1.75;
/** The loop's width at a given type size: four chips in a row and the gaps. */
export const loopWidth = (size: number) => (ROW_STAGES.reduce((s, k) => s + CHIP_EM[k], 0) + 3 * GAP_EM) * size;
export const loopHeight = (size: number) => (CHIP_H_EM * 2 + 1.6) * size;

/**
 * A model's life after training, as one loop: version → gate → ship → watch,
 * and back through retrain. Small in the corner of every deep dive, with the
 * stage the question is about lit (`lit`: a stage, or stages each lit from a
 * frame); large in the closing scene. `inkAt` inks each stage on its own
 * frame (the plan names them); otherwise the loop draws on at `at`.
 */
export const Loop: React.FC<{
  x: number;
  y: number;
  at: number;
  size?: number;
  lit?: Stage | readonly (readonly [Stage, number, number?])[];
  inkAt?: Partial<Record<Stage, number>>;
  dim?: number;
  out?: number;
}> = ({ x, y, at, size = 20, lit, inkAt = {}, dim, out }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.55;
  if (frame < at - 2 || o >= 1) return null;
  const chipH = CHIP_H_EM * size;
  const gap = GAP_EM * size;
  const xs: Record<Stage, number> = { version: 0, gate: 0, ship: 0, watch: 0, retrain: 0 };
  let cx = 0;
  for (const k of ROW_STAGES) {
    xs[k] = cx;
    cx += CHIP_EM[k] * size + gap;
  }
  const total = cx - gap;
  const bottom = chipH + 1.6 * size + chipH / 2;
  xs.retrain = total / 2 - (CHIP_EM.retrain * size) / 2;
  const inkFrame = (k: Stage, i: number) => inkAt[k] ?? at + i * 4;
  const glow = (k: Stage) => {
    if (!lit) return 0;
    if (typeof lit === "string") return lit === k ? ease(frame, at + 6, 12) : 0;
    let v = 0;
    for (const [s, from, until] of lit) {
      if (s === k) v = Math.max(v, Math.min(ease(frame, from, 10), until === undefined ? 1 : 1 - ease(frame, until, 12)));
    }
    return v;
  };
  const chip = (k: Stage, top: number, i: number) => {
    const p = ease(frame, inkFrame(k, i), 12);
    if (p <= 0) return null;
    const g = glow(k);
    return (
      <div
        key={k}
        style={{
          position: "absolute",
          left: xs[k],
          top,
          width: CHIP_EM[k] * size,
          height: chipH,
          boxSizing: "border-box",
          border: `2px solid ${mix(INK, LIT_LINE, g)}`,
          borderRadius: Math.round(size * 0.4),
          // The page's own white, so the way back runs into the retrain
          // chip rather than through its word; it reads as no fill.
          background: g > 0 ? `color-mix(in srgb, ${ds("yellow", 300)} ${55 * g}%, ${PAPER})` : PAPER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...label(size, INK),
          fontWeight: 500,
          whiteSpace: "nowrap",
          opacity: p,
          transform: `translateY(${(1 - p) * 6}px)`,
        }}
      >
        {k}
      </div>
    );
  };
  const mid = chipH / 2;
  const head = Math.max(10, size * 0.6);
  const ox = x;
  const oy = y;
  const P = (px: number, py: number): Pt => [ox + px, oy + py];
  const retrainP = ease(frame, inkFrame("retrain", 4), 16);
  const vMid = xs.version + (CHIP_EM.version * size) / 2;
  const wMid = xs.watch + (CHIP_EM.watch * size) / 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: (1 - o) * (1 - d) }}>
      {ROW_STAGES.slice(0, -1).map((k, i) => {
        const next = ROW_STAGES[i + 1];
        const a = xs[k] + CHIP_EM[k] * size + 4;
        const b = xs[next] - 3;
        return <Flow key={k} points={[P(a, mid), P(b, mid)]} at={inkFrame(next, i + 1) - 2} dur={10} width={Math.max(2, size * 0.1)} head={head} />;
      })}
      {/* The way back: down from watch, under the row, up into version. */}
      {retrainP > 0 ? (
        <Flow
          points={[P(wMid, chipH + 3), P(wMid, bottom), P(vMid, bottom), P(vMid, chipH + 4)]}
          at={inkFrame("retrain", 4) - 2}
          dur={18}
          width={Math.max(2, size * 0.1)}
          head={head}
          radius={size * 0.6}
        />
      ) : null}
      <div style={{ position: "absolute", left: ox, top: oy }}>
        {ROW_STAGES.map((k, i) => chip(k, 0, i))}
        {/* The retrain chip sits on the way back, on a page-colored ground
            so the line runs into it rather than through its word. */}
        <div style={{ position: "absolute", left: 0, top: 0 }}>{chip("retrain", bottom - chipH / 2, 4)}</div>
      </div>
    </div>
  );
};

// ── Small figures shared by several scenes ───────────────────────────────────

/** A clock face, drawn in ink, its hand turning as `t` goes 0 → 1. */
export const ClockIcon: React.FC<{ x: number; y: number; r: number; t: number; color?: string }> = ({ x, y, r, t, color = INK_SOFT }) => {
  const a = -Math.PI / 2 + t * Math.PI * 2;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={2} />
      <line x1={x} y1={y} x2={x} y2={y - r * 0.55} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x + Math.cos(a) * r * 0.75} y2={y + Math.sin(a) * r * 0.75} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
};

/** The loop at its corner size, top right of a deep dive, beside its question. */
export const CORNER_SIZE = 19;
export const CornerLoop: React.FC<{ at: number; lit?: React.ComponentProps<typeof Loop>["lit"]; out?: number }> = ({ at, lit, out }) => {
  const { y } = useLayout();
  return <Loop x={RIGHT - 16 - loopWidth(CORNER_SIZE)} y={y(KICKER_Y) - 2} at={at} size={CORNER_SIZE} lit={lit} out={out} />;
};

/** A row of outlined badges, each inking in on its own frame. */
export const BadgeRow: React.FC<{
  x: number;
  y: number;
  items: readonly { text: React.ReactNode; at: number; tone?: OutlineTone; lit?: number; litOut?: number }[];
  size?: number;
  gap?: number;
  out?: number;
  dim?: number;
}> = ({ x, y, items, size = 24, gap = 16, out, dim }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", gap, alignItems: "center", fontSize: size, opacity: (1 - o) * (1 - d) }}>
      {items.map((it, i) => {
        const p = ease(frame, it.at, 12);
        const l = (it.lit === undefined ? 0 : ease(frame, it.lit, 12)) * (it.litOut === undefined ? 1 : 1 - ease(frame, it.litOut, 12));
        return (
          <span
            key={i}
            style={{
              ...outlineBadgeStyle(it.tone ?? "ink", size),
              fontFamily: SANS,
              background: l > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${l * 100}%, transparent)` : "transparent",
              opacity: p,
              transform: `translateY(${(1 - p) * 8}px)`,
            }}
          >
            {it.text}
          </span>
        );
      })}
    </div>
  );
};
