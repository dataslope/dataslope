import { File as FileGlyph, Gpu as GpuGlyph, type LucideIcon } from "lucide-react";
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, headline as headlineStyle, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { MONO, SANS } from "../../theme/fonts";
import { Ink, OutlineBadge, type OutlineTone } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The drift, headings and highlighter follow
 * be-scaling/parts.tsx (whose Mark takes its bleed back as margin, after
 * da-pandas); the boxes are outlined, never filled, as the owner asked
 * (README, "A diagram's boxes are outlined"), with a lit box in the
 * highlighter's gold outline and ink type (be-ai-round). What is local: the
 * system as a small map that rides in the corner of every deep dive
 * (`MiniMap`), the same system drawn large for the opening and the close
 * (`BigMap`), handwritten digits drawn from their 8x8 pixels (`Digit`), and
 * the spot illustrations with their natural sizes.
 */
export { OK, OK_INK };

// ── Page geometry (pass vertical positions through `y()`) ────────────────────

export const X0 = 120;
/** The page's right margin. */
export const RIGHT = 1824;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
/** A deep dive's question wraps within this, clear of the map at the right. */
export const Q_W = 1240;
export const Q_SIZE = 54;

// ── Colors: inkOf (theme/brand.ts) and the editorial palette only ────────────

export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 24%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 22%, transparent)`;
/** A lit box's outline: the yellow's darker step, which holds an edge. */
export const LIT_LINE = ds("yellow", 600);
/** Filled shapes (bit cells, bars, grid squares) a step deeper than a tint,
 *  so they hold their shape on white without an outline. */
export const CELL = ds("blue", 300);
export const CELL_SOFT = ds("blue", 100);
export const GREY_CELL = ds("gray", 300);
const HAIRLINE_SOFT = HAIRLINE;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a thing named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** Lit from `at` (eased in) until `until` (eased out). */
export const litFor = (frame: number, at: number, until?: number) =>
  Math.min(ease(frame, at, 10), until === undefined || !Number.isFinite(until) ? 1 : 1 - ease(frame, until, 12));

export const commas = (v: number) => Math.round(v).toLocaleString("en-US");
export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

/** A deterministic stream of numbers in [0, 1), for dots that look random. */
export const seeded = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
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

/** Fades a group out (or dims it) from a frame. */
export const Fade: React.FC<{ out?: number; dim?: number; at?: number; dur?: number; children: React.ReactNode }> = ({ out, dim, at, dur = 10, children }) => {
  const frame = useCurrentFrame();
  const i = at === undefined ? 1 : ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, dur);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  if (i <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: i * (1 - o) * (1 - d) }}>{children}</div>;
};

// ── Headings ─────────────────────────────────────────────────────────────────

/** A part's kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(26, ACCENT_INK)}>{children}</span>
    </Ink>
  );
};

/** A headline that inks in, optionally in two parts that follow each other
 *  in the flow, the second on its own cue. */
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
    <div style={{ position: "absolute", left: 92, top: y(HEAD_Y), display: "flex", gap: "0.26em", fontSize: size }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap", ...headlineStyle(size) }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink at={turnAt ?? at + 10} dur={18} out={out} style={{ position: "relative", whiteSpace: "nowrap", ...headlineStyle(size) }}>
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/**
 * A highlighter stroke laid under the words it wraps, swept left to right on
 * `at`. It reaches 0.14em past the words on each side and takes that back as
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

/** A line of text that inks in at `at`: the page's notes. */
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
}> = ({ at, x, y, out, dim, size = 22, color = INK, weight = 500, align = "left", width, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  const left = align === "left" ? x : align === "right" ? x - (width ?? 0) : x - (width ?? 0) / 2;
  return (
    <Ink at={at} dur={14} out={out} style={{ left, top: y, width, textAlign: align, opacity: 1 - d }}>
      <span style={{ ...note(size, color), fontWeight: weight, whiteSpace: "nowrap", fontSize: size }}>{children}</span>
    </Ink>
  );
};

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/** What a box is: plain ink (a process, a machine, a stage), data (blue),
 *  the right answer (green), the trap (red), or quiet (not yet, or set aside). */
export type Tone = "plain" | "data" | "ok" | "bad" | "quiet";
const TONE: Record<Tone, { line: string; ink: string }> = {
  plain: { line: INK, ink: INK },
  data: { line: BAR, ink: BLUE_INK },
  ok: { line: OK, ink: OK_INK },
  bad: { line: ACCENT, ink: ACCENT_INK },
  quiet: { line: INK_SOFT, ink: INK_SOFT },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;

/**
 * A box: a rounded outline (no fill) that pops in on `at`, a title in Title
 * Case (with an optional lucide icon at its size, in its ink) and an
 * optional line under it. `lit` (a frame) gives it the highlighter's gold
 * outline, ink type and a light wash from then on; `litOut` lifts it again.
 */
export const Node: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  size?: number;
  subSize?: number;
  dim?: number;
  out?: number;
  lit?: number;
  litOut?: number;
  dashed?: boolean;
  align?: "center" | "left";
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, icon: Icon, tone = "plain", size = 24, subSize = 20, dim, out, lit, litOut, dashed, align = "center", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.62;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const l = lit === undefined ? 0 : litFor(frame, lit, litOut);
  if (p <= 0.001 || o >= 1) return null;
  const t = TONE[tone];
  const ink = `color-mix(in srgb, ${INK} ${l * 100}%, ${t.ink})`;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `${2 + 1.5 * l}px ${dashed ? "dashed" : "solid"} color-mix(in srgb, ${LIT_LINE} ${l * 100}%, ${t.line})`,
        borderRadius: 8,
        background: `color-mix(in srgb, ${HIGHLIGHT} ${l * 100}%, transparent)`,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: "center",
        gap: 4,
        padding: "0 16px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      {title ? (
        <span style={{ ...label(size, ink), fontWeight: 500, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.4em", fontSize: size }}>
          {Icon ? <Icon size={size} color="currentColor" strokeWidth={2} style={{ flex: "none" }} /> : null}
          {title}
        </span>
      ) : null}
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", textAlign: align }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/** A straight or bent line, sampled densely enough for arrowHead(). */
const sampled = (points: readonly Pt[]) => {
  const { d, samples } =
    points.length > 2 ? roundedPolyline(points, 16) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  return { d, line };
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch. `head={0}` draws a plain line; `both` puts a head at each end.
 * `lit` swells a highlighter band under it.
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
  lit?: number;
  litOut?: number;
  both?: boolean;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 14, dash, dim, out, opacity = 1, lit, litOut, both }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  const l = lit === undefined ? 0 : litFor(frame, lit, litOut);
  if (p <= 0 || o >= 1) return null;
  const { d: path, line } = sampled(points);
  const len = lineLength(line);
  const reach = head > 0 ? Math.max(0, (len - head + 1) / len) : 1;
  const start = both && head > 0 ? (head - 1) / len : 0;
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
  const headO = ease(frame, at + dur - 4, 5);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) * opacity }}>
      {l > 0 ? <path d={path} fill="none" stroke={HIGHLIGHT} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" opacity={l} /> : null}
      {dash ? (
        <g style={{ clipPath: clip }}>
          <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />
        </g>
      ) : (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="butt"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`0 ${start} ${Math.max(0, p * reach - start)} 1`}
        />
      )}
      {head > 0 ? <path d={arrowHead(line, head, head * 0.5, { filled: true })} fill={color} opacity={headO} /> : null}
      {both && head > 0 ? <path d={arrowHead([...line].reverse(), head, head * 0.5, { filled: true })} fill={color} opacity={headO} /> : null}
    </svg>
  );
};

/** The outlined badge in Inter (it otherwise takes the page's serif from
 *  whatever it sits in): a tag that labels a thing. */
export const Tag: React.FC<{ tone?: OutlineTone; size?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ tone = "ink", size = 22, style, children }) => (
  <OutlineBadge tone={tone} size={size} style={{ fontFamily: SANS, ...style }}>
    {children}
  </OutlineBadge>
);

/** A small cross, drawn stroke by stroke on `at`. */
export const Cross: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 24, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, at, 7);
  const b = ease(frame, at + 5, 7);
  // A zero-length dash with a round cap still paints a dot: draw nothing
  // until the stroke starts.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible", opacity: a > 0 ? 1 : 0 }}>
      <path d="M6 6 L18 18" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} />
      <path d="M18 6 L6 18" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} opacity={b > 0 ? 1 : 0} />
    </svg>
  );
};

// ── Handwritten digits ───────────────────────────────────────────────────────

/** A digit from scikit-learn's set, drawn from its 8x8 pixels (0 to 16) as
 *  filled squares in ink, the way the network reads it. */
export const Digit: React.FC<{ image: readonly number[]; px: number; x: number; y: number; at: number; color?: string; out?: number }> = ({
  image,
  px,
  x,
  y,
  at,
  color = INK,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={px * 8} height={px * 8} style={{ position: "absolute", left: x, top: y, overflow: "visible", opacity: p * (1 - o) }}>
      <rect x={0} y={0} width={px * 8} height={px * 8} fill={CELL_SOFT} rx={4} />
      {image.map((v, i) =>
        v > 0 ? <rect key={i} x={(i % 8) * px} y={Math.floor(i / 8) * px} width={px} height={px} fill={color} opacity={(v / 16) * Math.min(1, p * 1.4)} /> : null,
      )}
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each watercolor's natural size in pixels, after the import's trim. At 4K
 *  an image may be drawn at most half that on the 1080p layout. */
export const SPOTS = {
  giraffe: [547, 1023],
  notebook: [942, 1009],
  cart: [994, 983],
  card: [1013, 763],
  funnel: [896, 948],
} as const satisfies Record<string, readonly [number, number]>;
export type SpotId = keyof typeof SPOTS;

/** A spot's drawn height at width `w`, from its natural aspect. */
export const spotH = (id: SpotId, w: number) => Math.round((w * SPOTS[id][1]) / SPOTS[id][0]);

/**
 * A watercolor from illustrations.json, `w` wide at (x, y): it pops in on
 * `at` (the scene cues an `el-pop` on the same frame), bobs gently, and
 * fades on `out`.
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

// ── The system, as a small map in the corner of every deep dive ─────────────

export type MapPart = "features" | "model" | "prediction" | "labels" | "training";
const MAP_BOX: Record<MapPart, { x: number; y: number; t: string }> = {
  features: { x: 0, y: 0, t: "features" },
  model: { x: 158, y: 0, t: "model" },
  prediction: { x: 316, y: 0, t: "prediction" },
  training: { x: 158, y: 84, t: "training" },
  labels: { x: 316, y: 84, t: "labels" },
};
const MB = { w: 124, h: 40 };
export const MAP = { x: 1384, w: 440, h: 124 };

/** A small arrow for the map: a straight line and a filled head. */
const MiniArrow: React.FC<{ from: Pt; to: Pt; color?: string }> = ({ from, to, color = INK_SOFT }) => {
  const line: Pt[] = Array.from({ length: 21 }, (_, i) => [from[0] + ((to[0] - from[0]) * i) / 20, from[1] + ((to[1] - from[1]) * i) / 20] as Pt);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const k = (len - 7) / len;
  const end: Pt = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={end[0]} y2={end[1]} stroke={color} strokeWidth={1.6} />
      <path d={arrowHead(line, 8, 4.5, { filled: true })} fill={color} />
    </g>
  );
};

/**
 * The system the round designs, drawn small in the top right of every deep
 * dive: features into the model, a prediction out, labels back to training,
 * and training back into the model. The part the question is about is lit
 * (a list of parts, each lit from its frame), and a store grows under the
 * features once question 3 adds it (`store`: a frame, or true once in).
 */
export const MiniMap: React.FC<{
  at: number;
  lit: readonly (readonly [MapPart | null, number])[];
  store?: number | boolean;
  out?: number;
}> = ({ at, lit, store, out }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const glow = (part: MapPart) => {
    let v = 0;
    lit.forEach(([q, from], i) => {
      const until = lit[i + 1]?.[1] ?? 1e9;
      if (q === part) v = Math.max(v, Math.min(ease(frame, from, 10), 1 - ease(frame, until, 10)));
    });
    return v;
  };
  const storeIn = store === true ? 1 : typeof store === "number" ? ease(frame, store, 16) : 0;
  const box = (part: MapPart) => {
    const b = MAP_BOX[part];
    const g = glow(part);
    return (
      <g key={part}>
        <rect
          x={b.x}
          y={b.y}
          width={MB.w}
          height={MB.h}
          rx={6}
          fill={`color-mix(in srgb, ${HIGHLIGHT} ${g * 100}%, transparent)`}
          stroke={`color-mix(in srgb, ${LIT_LINE} ${g * 100}%, ${INK})`}
          strokeWidth={1.8 + g * 1.2}
        />
        <text x={b.x + MB.w / 2} y={b.y + 27} textAnchor="middle" style={{ ...label(19, INK), fill: INK, fontWeight: 500 }}>
          {b.t}
        </text>
      </g>
    );
  };
  const midY = MB.h / 2;
  const lowY = 84 + MB.h / 2;
  return (
    <div style={{ position: "absolute", left: MAP.x, top: y(KICKER_Y) - 6, width: MAP.w, height: MAP.h, opacity: p * (1 - o) }}>
      <svg width={MAP.w} height={MAP.h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <MiniArrow from={[MB.w + 4, midY]} to={[158 - 4, midY]} />
        <MiniArrow from={[158 + MB.w + 4, midY]} to={[316 - 4, midY]} />
        <MiniArrow from={[316 + MB.w / 2, MB.h + 4]} to={[316 + MB.w / 2, 84 - 4]} />
        <MiniArrow from={[316 - 4, lowY]} to={[158 + MB.w + 4, lowY]} />
        <MiniArrow from={[158 + MB.w / 2, 84 - 4]} to={[158 + MB.w / 2, MB.h + 4]} />
        {storeIn > 0 ? (
          <g opacity={storeIn}>
            <MiniArrow from={[MB.w / 2, 84 - 4]} to={[MB.w / 2, MB.h + 4]} />
            <rect x={0} y={84} width={MB.w} height={MB.h} rx={6} fill="none" stroke={INK} strokeWidth={1.8} />
            <text x={MB.w / 2} y={84 + 27} textAnchor="middle" style={{ ...label(19, INK), fill: INK, fontWeight: 500 }}>
              store
            </text>
          </g>
        ) : null}
        {(["features", "model", "prediction", "training", "labels"] as const).map(box)}
      </svg>
    </div>
  );
};

// ── The same system, drawn large for the opening and the close ──────────────

/** Where the large map sits, in the layout's coordinates. */
export const BIG = {
  row: 500,
  features: { x: X0, w: 300 },
  model: { cx: 640, chipW: 190 },
  answer: { x: 860, w: 320 },
  back: 668,
  bh: 88,
};

/**
 * The opening's map, and the close's: features at request time into the
 * model (the notebook, a file under it), an answer inside a latency budget
 * out, and labels back underneath. `lit` lights each part from a frame
 * (and `litOut` lifts them all), for the close's "in, out, back".
 */
export const BigMap: React.FC<{
  notebookAt: number;
  modelAt: number;
  featuresAt: number;
  answerAt: number;
  backAt: number;
  lit?: { features?: number; answer?: number; back?: number; until?: number };
  dim?: number;
}> = ({ notebookAt, modelAt, featuresAt, answerAt, backAt, lit = {}, dim }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const row = y(BIG.row);
  const top = row - BIG.bh / 2;
  const chipTop = row - 23;
  const chipL = BIG.model.cx - BIG.model.chipW / 2;
  const chipR = BIG.model.cx + BIG.model.chipW / 2;
  const nbW = 176;
  const back = y(BIG.back);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.5;
  const backLit = lit.back === undefined ? 0 : litFor(frame, lit.back, lit.until);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - d }}>
      <Spot id="notebook" at={notebookAt} x={BIG.model.cx - nbW / 2} y={chipTop - 34 - spotH("notebook", nbW)} w={nbW} />
      <Ink at={modelAt} dur={14} style={{ left: chipL, top: chipTop, width: BIG.model.chipW, display: "flex", justifyContent: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 8,
            border: `2px solid ${INK}`,
            ...label(22, INK),
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          <FileIcon />
          <span style={{ fontFamily: MONO, fontSize: 21 }}>model.pkl</span>
        </span>
      </Ink>
      <Node
        x={BIG.features.x}
        y={top}
        w={BIG.features.w}
        h={BIG.bh}
        at={featuresAt}
        title="Features"
        sub="at request time"
        lit={lit.features}
        litOut={lit.until}
      />
      <Flow points={[[BIG.features.x + BIG.features.w + 3, row], [chipL - 3, row]]} at={featuresAt + 6} color={BAR} />
      <Node x={BIG.answer.x} y={top} w={BIG.answer.w} h={BIG.bh} at={answerAt} title="Answer" sub="inside a latency budget" lit={lit.answer} litOut={lit.until} />
      <Flow points={[[chipR + 3, row], [BIG.answer.x - 3, row]]} at={answerAt + 4} color={BAR} />
      <Flow
        points={[
          [BIG.answer.x + BIG.answer.w / 2, top + BIG.bh + 3],
          [BIG.answer.x + BIG.answer.w / 2, back],
          [BIG.model.cx, back],
          [BIG.model.cx, row + 23 + 3],
        ]}
        at={backAt}
        dur={22}
        color={INK}
        lit={lit.back}
        litOut={lit.until}
      />
      <Ink at={backAt + 10} dur={14} style={{ left: BIG.model.cx + 44, top: back - 92, whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, INK), fontWeight: 500, position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "-0.14em",
              right: "-0.14em",
              top: "0.04em",
              bottom: "-0.06em",
              background: HIGHLIGHT,
              borderRadius: "0.14em",
              opacity: backLit,
            }}
          />
          <span style={{ position: "relative" }}>Labels back</span>
        </span>
      </Ink>
      <Ink at={backAt + 16} dur={14} style={{ left: BIG.model.cx + 44, top: back - 54, whiteSpace: "nowrap" }}>
        <span style={{ ...note(20, INK_SOFT) }}>to say whether it was right</span>
      </Ink>
    </div>
  );
};

/** lucide's File, at the chip's size, in its ink. */
const FileIcon: React.FC = () => <FileGlyph size={22} color={INK} strokeWidth={2} style={{ flex: "none" }} />;

/** Paper behind a label that sits on a line. */
export const PAPER_BG = PAPER;

// ── A queue in front of a GPU, simulated frame by frame ─────────────────────

/** Arrival frames of a random stream, `gap` frames apart on average. */
const arrivalsOf = (seed: number, gap: number, count: number) => {
  const u = seeded(seed);
  const out: number[] = [];
  let t = 0;
  for (let i = 0; i < count; i++) {
    t += -Math.log(1 - Math.min(0.999, u())) * gap;
    out.push(t);
  }
  return out;
};

/**
 * When each request starts its pass: one at a time, or batched (whatever
 * has queued when the GPU frees, up to `maxBatch`). A pass of b requests
 * takes (b + 9) / 2 frames: the page's cost model, (b + 9) / 3200 s, at a
 * request every 1.6 frames standing for 1,000 a second.
 */
const passStarts = (arrivals: readonly number[], maxBatch: number) => {
  const starts: number[] = [];
  const ends: number[] = [];
  let free = 0;
  let i = 0;
  while (i < arrivals.length) {
    const start = Math.max(free, arrivals[i]);
    let b = 0;
    while (i + b < arrivals.length && b < maxBatch && arrivals[i + b] <= start) b++;
    b = Math.max(1, b);
    const end = start + (b + 9) / 2;
    for (let k = 0; k < b; k++) {
      starts.push(start);
      ends.push(end);
    }
    i += b;
    free = end;
  }
  return { starts, ends };
};

/**
 * Requests arriving at random into a queue, drawn as dots, in front of a GPU
 * box at `right`. `maxBatch` 1 serves them one at a time, and the queue
 * grows off the lane; 32 takes whatever has queued, and dots leave in clumps.
 */
export const QueueLane: React.FC<{
  x: number;
  right: number;
  mid: number;
  start: number;
  at: number;
  maxBatch: number;
  seed?: number;
  gap?: number;
  out?: number;
  gpuW?: number;
  label?: string;
}> = ({ x, right, mid, start, at, maxBatch, seed = 11, gap = 1.6, out, gpuW = 150, label: title = "GPU" }) => {
  const frame = useCurrentFrame();
  const arrivals = React.useMemo(() => arrivalsOf(seed, gap, 900), [seed, gap]);
  const { starts } = React.useMemo(() => passStarts(arrivals, maxBatch), [arrivals, maxBatch]);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const shown = ease(frame, at, 12);
  if (shown <= 0 || o >= 1) return null;
  const t = frame - start;
  const STEP = 15;
  // Each waiting dot's place in the queue at a few recent frames, averaged,
  // so the line shuffles forward rather than jumps.
  const slots = [0, 1, 2, 3].map((d) => {
    const tt = t - d;
    const m = new Map<number, number>();
    let k = 0;
    for (let j = 0; j < arrivals.length && arrivals[j] <= tt; j++) if (starts[j] > tt) m.set(j, k++);
    return m;
  });
  const slotOf = (j: number) => {
    const now = slots[0].get(j) ?? 0;
    return slots.reduce((acc, m) => acc + (m.get(j) ?? now), 0) / slots.length;
  };
  const dots: React.ReactNode[] = [];
  for (let j = 0; j < arrivals.length; j++) {
    const a = arrivals[j];
    if (a > t) break;
    const s = starts[j];
    if (t > s + 5) continue;
    let px: number;
    let op = 1;
    if (t >= s) {
      const p = clamp01((t - s) / 4);
      px = right - 16 + p * 14;
      op = 1 - p;
    } else {
      px = right - 16 - slotOf(j) * STEP;
      const fresh = clamp01((t - a) / 6);
      px -= (1 - fresh) * 24;
      op = fresh;
      if (px < x + 30) op *= clamp01((px - x) / 30);
    }
    if (op <= 0.01) continue;
    dots.push(<circle key={j} cx={px} cy={mid} r={6} fill={BAR} opacity={op} />);
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: shown * (1 - o) }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={x} x2={right - 4} y1={mid + 14} y2={mid + 14} stroke={HAIRLINE_SOFT} strokeWidth={1} />
        {dots}
      </svg>
      <Node x={right} y={mid - 42} w={gpuW} h={84} at={at} icon={GpuGlyph} title={title} />
    </div>
  );
};

/** A positioned box for absolutely placed children inside an `Ink`, whose
 *  own box carries the ink mask's bleed as padding: placed in this instead,
 *  a child's `left` is measured from where the Ink was put. */
export const Rel: React.FC<{ w: number; h: number; children: React.ReactNode }> = ({ w, h, children }) => (
  <div style={{ position: "relative", width: w, height: h }}>{children}</div>
);
