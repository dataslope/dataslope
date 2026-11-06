import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, type Pt, roundedPolyline } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (the slow push, kicker,
 * headline, highlighter, strike) is the Data Analyst pandas part's, as the
 * Data Engineer videos take it, so the series looks like one family. What is
 * new here is the system diagram: boxes whose positions can move while the
 * arrows between them follow (Question four rebuilds Question three's
 * diagram into two zones), a ring that marks a box, and a dot that travels a
 * request along the arrows.
 */
export { Drift, Headline, Kicker, lerp, Mark, MARK_BAD, MARK_OK, pulse, Strike, Svg, X0 } from "../da-pandas/parts";
export { OK, OK_INK };

/** The page's right margin. */
export const RIGHT = 1824;
/** The highlighter, as a band: what the narration points at. */
export const MARK = HIGHLIGHT;

/** "10,000,000": a count as it is set on screen. */
export const int = (x: number) => Math.round(x).toLocaleString("en-US");

/** A rough figure to two significant digits, as an estimate is said:
 *  115.7 → 120, 34,722 → 35,000. */
export const sig = (x: number) => {
  const p = 10 ** (Math.floor(Math.log10(Math.abs(x))) - 1);
  return Math.round(x / p) * p;
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/**
 * A watercolor from illustrations.json. It pops in on `at` with the house
 * pop (el-pop at -30, on the same frame, so the two cannot drift apart),
 * bobs gently, and fades on `out`. The box keeps the art's own aspect.
 */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  quiet?: boolean;
}> = ({ id, at, out, left, top, width, height, quiet }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!ILLUSTRATIONS) return null;
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  return (
    <>
      {quiet ? null : <Sfx name="el-pop" at={at} level={-30} />}
      {p <= 0.001 || o >= 1 ? null : (
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
            transform: `translateY(${bob(frame, 4, 110) + (1 - p) * 26}px)`,
          }}
        />
      )}
    </>
  );
};

/** Each watercolor's natural size after the import's trim, so a box can keep
 *  its aspect and stay at most half its pixels on the 1080p layout. */
export const ART = {
  crow: [1090, 1021],
  envelope: [960, 754],
  key: [1016, 1019],
  breaker: [873, 882],
} as const satisfies Record<string, readonly [number, number]>;

/** The height that keeps `id`'s aspect at `width`. */
export const artH = (id: keyof typeof ART, width: number) => Math.round((width * ART[id][1]) / ART[id][0]);

// ── Boxes, rings and arrows: the system diagram ──────────────────────────────

/**
 * A box's meaning, each one the series keeps: plain ink for a component, data
 * blue for one that holds data, green once it is the answer (or a fix), red
 * when it is the trap, yellow while the narration points at it, and quiet
 * (dashed, faded) when it stands by or is gone.
 */
export type Tone = "plain" | "data" | "ok" | "bad" | "lit" | "quiet";

const TONES: Record<Tone, { border: string; fill: string; ink: string }> = {
  plain: { border: INK, fill: PAPER, ink: INK },
  data: { border: BAR, fill: `color-mix(in srgb, ${BAR} 10%, ${PAPER})`, ink: BLUE_INK },
  ok: { border: OK, fill: `color-mix(in srgb, ${OK} 12%, ${PAPER})`, ink: OK_INK },
  bad: { border: ACCENT, fill: `color-mix(in srgb, ${ACCENT} 10%, ${PAPER})`, ink: ACCENT_INK },
  lit: { border: INK, fill: `color-mix(in srgb, ${HIGHLIGHT} 70%, ${PAPER})`, ink: INK },
  quiet: { border: INK_SOFT, fill: PAPER, ink: INK_SOFT },
};
export const toneInk = (t: Tone) => TONES[t].ink;

/** The tone at `frame`, blended over 10 frames from the one before. */
const toneAt = (frame: number, start: Tone, tones: readonly { at: number; tone: Tone }[]) => {
  let prev: Tone = start;
  let cur: Tone = start;
  let since = -Infinity;
  for (const t of tones) {
    if (frame >= t.at) {
      prev = cur;
      cur = t.tone;
      since = t.at;
    }
  }
  const p = Number.isFinite(since) ? ease(frame, since, 10) : 1;
  const mix = (k: "border" | "fill" | "ink") =>
    p >= 1 ? TONES[cur][k] : `color-mix(in srgb, ${TONES[cur][k]} ${Math.round(p * 100)}%, ${TONES[prev][k]})`;
  const quiet = (cur === "quiet" ? p : 0) + (prev === "quiet" ? 1 - p : 0);
  return { border: mix("border"), fill: mix("fill"), ink: mix("ink"), quiet };
};

/** A box on the page, by its centre and size, in screen pixels. */
export type Rect = { cx: number; cy: number; w: number; h: number };

/** Where a line from `r`'s centre toward `to` leaves its border, `gap` out. */
export const boundary = (r: Rect, to: Pt, gap = 8): Pt => {
  const dx = to[0] - r.cx;
  const dy = to[1] - r.cy;
  const sx = dx === 0 ? Infinity : (r.w / 2 + gap) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (r.h / 2 + gap) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return [r.cx + dx * s, r.cy + dy * s];
};

/** The straight arrow from one box's border to another's. */
export const between = (a: Rect, b: Rect, gap = 8): Pt[] => [boundary(a, [b.cx, b.cy], gap), boundary(b, [a.cx, a.cy], gap)];

/** A point `t` of the way along a polyline, by length. */
export const along = (pts: readonly Pt[], t: number): Pt => {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let left = Math.max(0, Math.min(1, t)) * lens.reduce((s, l) => s + l, 0);
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, left / lens[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    left -= lens[i];
  }
  return pts[pts.length - 1];
};

/**
 * A component in the diagram: a rounded box centred on (`cx`, `cy`) that pops
 * in on `at` and takes each tone in `tones` from its frame. `sub` is a second,
 * smaller line under the title (a role: "standby", "replica").
 */
export const Box: React.FC<{
  r: Rect;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  tones?: readonly { at: number; tone: Tone }[];
  size?: number;
  mono?: boolean;
  out?: number;
  dim?: number;
  dashed?: boolean;
}> = ({ r, at, title, sub, tone = "plain", tones = [], size = 24, mono, out, dim, dashed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0.001 || o >= 1) return null;
  const t = toneAt(frame, tone, tones);
  return (
    <div
      style={{
        position: "absolute",
        left: r.cx - r.w / 2,
        top: r.cy - r.h / 2,
        width: r.w,
        height: r.h,
        boxSizing: "border-box",
        border: `2.4px ${dashed || t.quiet > 0.5 ? "dashed" : "solid"} ${t.border}`,
        borderRadius: 12,
        background: t.fill,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        opacity: Math.min(1, p) * (1 - o) * (1 - d) * (1 - 0.5 * t.quiet),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
      }}
    >
      <span
        style={{
          ...(mono
            ? { fontFamily: MONO, fontSize: size * 0.92, fontWeight: 600, fontVariantLigatures: "none", color: t.ink }
            : { ...note(size, t.ink), fontWeight: 650 }),
          whiteSpace: "nowrap",
          lineHeight: 1.15,
        }}
      >
        {title}
      </span>
      {sub ? <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", lineHeight: 1.15 }}>{sub}</span> : null}
    </div>
  );
};

/**
 * A rounded outline around a box, drawn on `at` and recolored by `tones`
 * (red for a single point of failure, green once it is answered). It swells
 * once as it lands.
 */
export const Ring: React.FC<{
  r: Rect;
  at: number;
  color?: string;
  tones?: readonly { at: number; color: string }[];
  pad?: number;
  out?: number;
  dash?: string;
}> = ({ r, at, color = ACCENT, tones = [], pad = 14, out, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  let c = color;
  for (const t of tones) {
    const k = ease(frame, t.at, 10);
    if (k > 0) c = k >= 1 ? t.color : `color-mix(in srgb, ${t.color} ${Math.round(k * 100)}%, ${c})`;
  }
  const swell = Math.sin(Math.min(1, Math.max(0, (frame - at) / 20)) * Math.PI) * 5;
  const w = r.w + 2 * (pad + swell);
  const h = r.h + 2 * (pad + swell);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <rect
        x={r.cx - w / 2}
        y={r.cy - h / 2}
        width={w}
        height={h}
        rx={18}
        fill="none"
        stroke={c}
        strokeWidth={3}
        strokeDasharray={dash}
        pathLength={dash ? undefined : 1}
        style={dash ? { opacity: p } : { strokeDasharray: `${p} 1` }}
      />
    </svg>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded) that draws
 * itself from its tail on `at`, its head built by arrowHead() on the straight
 * last stretch. `dash` draws it dashed and fades it in; `head={0}` leaves it
 * a plain line. Points may move from frame to frame: the arrow follows.
 */
export const Arrow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  dash?: string;
  out?: number;
  dim?: number;
  both?: boolean;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 13, dash, out, dim, both }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const straight = points.length === 2;
  const line: Pt[] = straight
    ? Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt)
    : roundedPolyline(points, 18).samples;
  const path = straight ? `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}` : roundedPolyline(points, 18).d;
  const len = lineLength(line);
  const reach = head ? Math.max(0, (len - head + 1) / len) : 1;
  const tailReach = both && head ? Math.min(1, (head - 1) / len) : 0;
  const headIn = ease(frame, at + dur - 4, 5);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {dash ? (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinejoin="round" opacity={p} />
      ) : (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="butt"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`0 ${tailReach} ${Math.max(0, p * reach - tailReach)} 1`}
        />
      )}
      {head ? <path d={arrowHead(line, head, head * 0.55, { filled: true })} fill={color} opacity={headIn} /> : null}
      {head && both ? <path d={arrowHead([...line].reverse(), head, head * 0.55, { filled: true })} fill={color} opacity={headIn} /> : null}
    </svg>
  );
};

/** A request on its way: a dot that rides `points` from `from` to `to`. */
export const Traveller: React.FC<{ points: readonly Pt[]; from: number; to: number; color?: string; r?: number; out?: number }> = ({
  points,
  from,
  to,
  color = ACCENT,
  r = 9,
  out,
}) => {
  const frame = useCurrentFrame();
  if (frame < from - 4) return null;
  const o = out === undefined ? 0 : ease(frame, out, 8);
  if (o >= 1) return null;
  const t = Math.max(0, Math.min(1, (frame - from) / Math.max(1, to - from)));
  const s = t * t * (3 - 2 * t);
  const [x, y] = along(points, s);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, from - 4, 4) * (1 - o) }}>
      <circle cx={x} cy={y} r={r + 4} fill={PAPER} />
      <circle cx={x} cy={y} r={r} fill={color} />
    </svg>
  );
};

/** A small rounded tag on the page: a role, a benefit, a step. */
export const Pill: React.FC<{
  x: number;
  y: number;
  at: number;
  ink?: string;
  fill?: string;
  size?: number;
  out?: number;
  dim?: number;
  dashed?: boolean;
  children: React.ReactNode;
}> = ({ x, y, at, ink = INK, fill = PAPER, size = 22, out, dim, dashed, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: `${Math.round(size * 0.3)}px ${Math.round(size * 0.66)}px`,
        border: `2px ${dashed ? "dashed" : "solid"} ${ink}`,
        borderRadius: 999,
        background: fill,
        ...label(size, ink),
        whiteSpace: "nowrap",
        opacity: p * (1 - o) * (1 - d),
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** A cross, drawn stroke by stroke on `at`, in the error's red: a failure. */
export const Cross: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 22, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, at, 7);
  const b = ease(frame, at + 5, 7);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M5 5 L19 19" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} />
      <path d="M19 5 L5 19" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} />
    </svg>
  );
};

/** A line of words at one size, set on the page, that inks in from the left
 *  by fading up and sliding a little (for rows that build one by one). */
export const Line: React.FC<{
  x: number;
  y: number;
  at: number;
  out?: number;
  dim?: number;
  size?: number;
  color?: string;
  weight?: number;
  width?: number;
  align?: "left" | "center" | "right";
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, at, out, dim, size = 26, color = INK, weight = 500, width, align = "left", style, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.62;
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: align === "right" ? undefined : align === "center" && width ? x - width / 2 : x,
        right: align === "right" ? 1920 - x : undefined,
        top: y,
        width,
        textAlign: align,
        ...note(size, color),
        fontWeight: weight,
        whiteSpace: width ? undefined : "nowrap",
        opacity: p * (1 - o) * (1 - d),
        transform: `translateX(${(1 - p) * -12}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
