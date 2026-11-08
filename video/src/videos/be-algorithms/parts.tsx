import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  BLUE_INK,
  HAIRLINE,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  PAPER,
  TABULAR,
  headline,
  label,
  note,
} from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (Drift, Kicker, Headline,
 * Mark, Strike) is da-pandas/parts.tsx's and the boxes and arrows (Node,
 * Flow, Pill) de-pipelines/parts.tsx's, copied rather than imported so this
 * video does not move when those are revised. What is local: horizontal bars
 * on a shared scale (the counts this video argues with), a row of array
 * cells, a graph's node and weighted edge, the verdict words, a cross, a
 * mono bracket glyph, and the spot art.
 */
export { OK, OK_INK };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
/** The page's right margin. */
export const RIGHT = 1824;

export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 24%, transparent)`;
export const BLUE_FILL = `color-mix(in srgb, ${BAR} 14%, ${PAPER})`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** "4,950": a count as it is set on screen. */
export const int = (x: number) => Math.round(x).toLocaleString("en-US");

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A slow push on the whole scene (da-pandas/parts.tsx): a few percent over
 *  its life, up to speed in two seconds, so a long scene never sits still. */
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

// ── Headings ─────────────────────────────────────────────────────────────────

/** A part's kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={{ ...label(22, ACCENT_INK), fontWeight: 600 }}>{children}</span>
    </Ink>
  );
};

/** A headline in two inks on one line: the lead in roman, the turn in italic
 *  accent ink, each inked on its own cue. */
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
    <div style={{ position: "absolute", left: 92, top: y(HEAD_Y), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink at={turnAt ?? at + 10} dur={18} out={out} style={{ position: "relative", ...headline(size, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/** Code inside running text, at the text's own size (QMono's spacing). */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: weight ?? 600, color, fontVariantLigatures: "none", wordSpacing: "-0.3em" }}>
    {children}
  </span>
);

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

/** A line struck through short words, drawn on `at` (da-pandas/parts.tsx,
 *  for a word or two: it tilts 2 degrees). */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = ACCENT, children }) => {
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
          transform: "rotate(-2deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

// ── Lines of text ────────────────────────────────────────────────────────────

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
  children: React.ReactNode;
}> = ({ at, x, y, size = 24, color = INK, weight = 500, out, dim, width, align = "left", children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
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
        whiteSpace: "nowrap",
        opacity: 1 - d,
      }}
    >
      <span style={{ ...note(size, color), fontWeight: weight }}>{children}</span>
    </Ink>
  );
};

/**
 * The separator between two columns set side by side: a 1px hairline the
 * height of the columns' text, centred in the gap, drawn down on `at` (the
 * column to its right inking in).
 */
export const VRule: React.FC<{ x: number; top: number; bottom: number; at: number; out?: number }> = ({ x, top, bottom, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: Math.round(x),
        top,
        width: 1,
        height: (bottom - top) * p,
        background: HAIRLINE,
        opacity: 1 - o,
      }}
    />
  );
};

// ── Boxes and arrows (de-pipelines/parts.tsx) ────────────────────────────────

export type Tone = "data" | "ok" | "bad" | "plain" | "look";
const TONE: Record<Tone, { line: string; fill: string; ink: string }> = {
  data: { line: BAR, fill: BLUE_FILL, ink: BLUE_INK },
  ok: { line: OK, fill: `color-mix(in srgb, ${OK} 12%, ${PAPER})`, ink: OK_INK },
  bad: { line: ACCENT, fill: `color-mix(in srgb, ${ACCENT} 10%, ${PAPER})`, ink: ACCENT_INK },
  plain: { line: INK, fill: "color-mix(in srgb, var(--ds-gray-400) 22%, transparent)", ink: INK },
  look: { line: HIGHLIGHT, fill: `color-mix(in srgb, ${HIGHLIGHT} 45%, ${PAPER})`, ink: INK },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;
export const toneFill = (t: Tone) => TONE[t].fill;

/** A rounded box that pops in on `at`, with a title and an optional line. */
export const Node: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  size?: number;
  subSize?: number;
  dim?: number;
  out?: number;
  lit?: number;
  dashed?: boolean;
  mono?: boolean;
}> = ({ x, y, w, h, at, title, sub, tone = "data", size = 26, subSize = 21, dim, out, lit = 0, dashed, mono }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  const t = TONE[tone];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `${2.5 + 2 * lit}px ${dashed ? "dashed" : "solid"} ${t.line}`,
        borderRadius: 12,
        background: t.fill,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
      }}
    >
      <span style={{ ...label(size, t.ink), fontWeight: 600, whiteSpace: "nowrap", ...(mono ? { fontFamily: MONO } : {}) }}>{title}</span>
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap" }}>{sub}</span> : null}
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
  opacity?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.6, head = 15, dim, out, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
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
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) * opacity }}>
      <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      <path d={arrowHead(line, head, 7, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />
    </svg>
  );
};

// ── Counts on a shared scale ─────────────────────────────────────────────────

/**
 * A count drawn as a horizontal bar: its label on a line of its own above,
 * the bar growing from `x` on `at` to `value / max` of `w`, the number at its
 * end in the same size as the label. A value too small to see still draws a
 * sliver, so a zero or a hundredth of a second reads as "almost nothing".
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
}> = ({ x, y, w, max, value, at, dur = 22, color = BAR, ink = INK, label: name, valueText, size = 23, barH = 26, out, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const full = Math.max(3, (value / max) * w);
  const bw = full * p;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, p * 2) * (1 - o) * (1 - d) }}>
      <div style={{ ...note(size, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ position: "relative", height: barH, marginTop: 12 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: bw, height: barH, background: color, borderRadius: 3 }} />
        <div
          style={{
            position: "absolute",
            left: bw + 14,
            top: barH / 2,
            transform: "translateY(-50%)",
            ...note(size, ink),
            fontWeight: 600,
            whiteSpace: "nowrap",
            opacity: ease(frame, at + dur * 0.6, 8),
          }}
        >
          {valueText}
        </div>
      </div>
    </div>
  );
};

// ── Array cells ──────────────────────────────────────────────────────────────

export const CELL = 64;

/** One cell of an array: a mono value in a box, popping in on `at`. */
export const Cell: React.FC<{
  x: number;
  y: number;
  at: number;
  value: React.ReactNode;
  tone?: Tone;
  size?: number;
  w?: number;
  h?: number;
  out?: number;
  dx?: number;
  opacity?: number;
}> = ({ x, y, at, value, tone = "data", size = 26, w = CELL, h = CELL, out, dx = 0, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const t = TONE[tone];
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        // The house badge look (owner, 2026-11-06): a tint, no border.
        borderRadius: 8,
        background: t.fill,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: size,
        fontWeight: 600,
        color: t.ink,
        opacity: p * (1 - o) * opacity,
        transform: `scale(${0.85 + 0.15 * p})`,
      }}
    >
      {value}
    </div>
  );
};

// ── A graph ──────────────────────────────────────────────────────────────────

export const NODE_R = 30;

/** A graph's node: a circle with its name, and an optional badge (a visiting
 *  order or a distance) on its upper right. */
export const GraphNode: React.FC<{
  x: number;
  y: number;
  at: number;
  name: string;
  tone?: Tone;
  badge?: React.ReactNode;
  badgeAt?: number;
  badgeTone?: Tone;
  badgeSide?: "right" | "left" | "below" | "above";
  r?: number;
  lit?: number;
}> = ({ x, y, at, name, tone = "data", badge, badgeAt, badgeTone = "plain", badgeSide = "right", r = NODE_R, lit = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  if (p <= 0.001) return null;
  const t = TONE[tone];
  const b = badgeAt === undefined ? 0 : ease(frame, badgeAt, 10);
  const bt = TONE[badgeTone];
  const off =
    badgeSide === "right"
      ? { left: x + r + 10, top: y - 17 }
      : badgeSide === "left"
        ? { left: x - r - 10, top: y - 17, transform: "translateX(-100%)" }
        : badgeSide === "below"
          ? { left: x, top: y + r + 10, transform: "translateX(-50%)" }
          : { left: x, top: y - r - 44, transform: "translateX(-50%)" };
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - r,
          top: y - r,
          width: 2 * r,
          height: 2 * r,
          boxSizing: "border-box",
          borderRadius: "50%",
          border: `${2.5 + 2 * lit}px solid ${t.line}`,
          background: t.fill,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...label(26, t.ink),
          fontWeight: 600,
          opacity: Math.min(1, p),
          transform: `scale(${0.85 + 0.15 * Math.min(1, p)})`,
        }}
      >
        {name}
      </div>
      {badge !== undefined && b > 0 ? (
        <div
          style={{
            position: "absolute",
            ...off,
            // A plain number beside its node; the one the narration points
            // at gets a highlighter band, never a box.
            ...label(24, badgeTone === "look" || badgeTone === "plain" ? INK : bt.ink),
            ...TABULAR,
            fontWeight: 750,
            whiteSpace: "nowrap",
            opacity: b,
          }}
        >
          {badgeTone === "look" ? (
            <span style={{ background: HIGHLIGHT, borderRadius: 4, padding: "1px 8px 2px" }}>{badge}</span>
          ) : (
            badge
          )}
        </div>
      ) : null}
    </>
  );
};

/** A directed edge between two node centres, stopping short of each circle,
 *  with an optional weight set beside its middle. */
export const Edge: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  color?: string;
  width?: number;
  weight?: React.ReactNode;
  weightAt?: number;
  weightInk?: string;
  /** Which side of the line the weight sits on, in px along its normal. */
  side?: number;
  r?: number;
  dim?: number;
  opacity?: number;
}> = ({ from, to, at, color = INK_SOFT, width = 2.6, weight, weightAt, weightInk = INK, side = 22, r = NODE_R, dim, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const [x1, y1] = from;
  const [x2, y2] = to;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const a: Pt = [x1 + ux * (r + 6), y1 + uy * (r + 6)];
  const b: Pt = [x2 - ux * (r + 8), y2 - uy * (r + 8)];
  const w = weightAt === undefined ? ease(frame, at + 8, 10) : ease(frame, weightAt, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  const mx = (x1 + x2) / 2 - uy * side;
  const my = (y1 + y2) / 2 + ux * side;
  return (
    <>
      <Flow points={[a, b]} at={at} color={color} width={width} head={14} dim={dim} opacity={opacity} />
      {weight !== undefined && w > 0 ? (
        <div
          style={{
            position: "absolute",
            left: mx,
            top: my,
            transform: "translate(-50%, -50%)",
            ...label(23, weightInk),
            ...TABULAR,
            fontWeight: 600,
            opacity: w * (1 - d) * opacity,
            whiteSpace: "nowrap",
          }}
        >
          {weight}
        </div>
      ) : null}
    </>
  );
};

// ── Verdicts ─────────────────────────────────────────────────────────────────

/** A cross in the trap's red, drawn on `at`. */
export const Cross: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 22, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const q = ease(frame, at + 5, 10);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M5 5 L19 19" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
      <path d="M19 5 L5 19" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} />
    </svg>
  );
};

// ── The spot art ─────────────────────────────────────────────────────────────

/** A watercolor from illustrations.json: it pops in on `at` (cue an el-pop on
 *  the same frame), bobs gently, and fades on `out`. Sized by height; the
 *  width follows the image's own aspect. */
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
        transform: `translateY(${bob(frame, 4, 120) + (1 - Math.min(1, p)) * 24}px)`,
      }}
    />
  );
};

/** Each watercolor's id and its pixel size after the import trim, so a spot
 *  is drawn at its own aspect and at most half its pixels (4K). */
export const ART = {
  pangolin: { id: "be-algorithms-pangolin", w: 915, h: 1024 },
  hourglass: { id: "be-algorithms-hourglass", w: 553, h: 1024 },
  plates: { id: "be-algorithms-plates", w: 985, h: 837 },
  map: { id: "be-algorithms-map", w: 1023, h: 776 },
  cards: { id: "be-algorithms-cards", w: 1024, h: 690 },
} as const;
export type ArtName = keyof typeof ART;

/** A spot of `name` whose box is `h` tall at its own aspect. */
export const Art: React.FC<{ name: ArtName; at: number; out?: number; left: number; top: number; h: number }> = ({ name, at, out, left, top, h }) => {
  const a = ART[name];
  return <Spot id={a.id} at={at} out={out} left={left} top={top} width={Math.round((h * a.w) / a.h)} height={h} />;
};

export { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER };
