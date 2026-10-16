import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Pt } from "../../components/arrow";
import { type Cardinality, endSegment, MARKER, markerLength, relationEnd } from "../../components/crowsfoot";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, halo, headline, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared kits. The one ERD primitive here,
 * <Link>, is <Relation> (editorial/erd.tsx) with its two ends on cues of their
 * own: the same line, the same stroke, and each end built by crowsfoot.ts's
 * relationEnd(), so it reads exactly as every other diagram does. It exists
 * because this unit teaches the notation itself: a line arrives bare
 * ("related, but how many?") and each end is drawn on the word that reads it.
 */

export const W = 1920;
export const H = 1080;
export const X0 = 96;

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: X0, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * A headline in one or two inks: the lead in roman, then (optionally) a turn
 * in italic red, each inking on its own cue, both lifting away on `out`.
 */
export const Headline: React.FC<{
  lead: string;
  at: number;
  turn?: string;
  turnAt?: number;
  out?: number;
  size?: number;
}> = ({ lead, at, turn, turnAt, out, size = 76 }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: X0 - 4, top: y(150), display: "flex", gap: "0.26em", ...headline(size) }}>
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

/**
 * A highlighter stroke laid under the words it wraps, swept left to right on
 * `at` and lifted on `out`. Sized in em and to the words.
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
 * A slow, eased push on a finished figure: it grows by `scale` and shifts by
 * `dx`, `dy` between `from` and `to`, about `origin`, so a figure being
 * talked about never sits dead still. Never a jolt: it eases in and out.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  scale?: number;
  dx?: number;
  dy?: number;
  origin?: readonly [number, number];
  children: React.ReactNode;
}> = ({ from, to, scale = 0.02, dx = 0, dy = 0, origin = [960, 600], children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${origin[0]}px ${origin[1]}px`,
        transform: `translate(${dx * p}px, ${dy * p}px) scale(${1 + scale * p})`,
      }}
    >
      {children}
    </div>
  );
};

/** A watercolor spot from illustrations.json: pops in, bobs gently, fades. */
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

// ── Relationship lines with ends on their own cues ──────────────────────────

const pointsAttr = (pts: readonly Pt[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export type LinkEnd = { kind: Cardinality; at: number };

/**
 * A relationship line, as <Relation> draws it, whose ends arrive on their own
 * cues: `from` at the first point, `to` at the last. Leave an end out and the
 * line stays bare there ("related", with no count yet). `swell` (0 to 1)
 * thickens the line and its ends while the narration points at them; `color`
 * changes the ink, as Relation's does, for a line traced on top of another.
 */
export const Link: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  from?: LinkEnd;
  to?: LinkEnd;
  color?: string;
  width?: number;
  size?: number;
  label?: string;
  labelAt?: number;
  labelPos?: Pt;
  name?: string;
  dim?: number;
  out?: number;
  swell?: number;
}> = ({ points, at, dur = 18, from, to, color = INK, width = 2.4, size = MARKER, label, labelAt, labelPos, name, dim, out, swell = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || gone >= 1 || points.length < 2) return null;

  for (const [end, e] of [["start", from], ["end", to]] as const) {
    if (!e) continue;
    const have = endSegment(points, end);
    const need = markerLength(e.kind, size) + 6;
    if (have < need) {
      console.log(
        `[relation] ${name ?? label ?? "link"} ${end === "start" ? "from" : "to"} end (${e.kind}) sits on ${have.toFixed(0)}px of straight line; it needs ${need.toFixed(0)}px`,
      );
    }
  }

  const dimmed = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const stroke = width * (1 + swell * 0.8);
  const marker = (tip: Pt, back: Pt, e: LinkEnd | undefined) => {
    if (!e) return null;
    const o = ease(frame, e.at, 8);
    if (o <= 0) return null;
    const m = relationEnd(tip, back, e.kind, size);
    return (
      <g opacity={o}>
        {m.lines.map(([a, b], i) => (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        ))}
        {m.rings.map((r, i) => (
          <circle key={i} cx={r.c[0]} cy={r.c[1]} r={r.r} fill={PAPER} stroke={color} strokeWidth={stroke} />
        ))}
      </g>
    );
  };
  const mid = Math.floor((points.length - 1) / 2);
  const [a, b] = [points[mid], points[mid + 1]];
  const at2: Pt = labelPos ?? [(a[0] + b[0]) / 2 + 12, (a[1] + b[1]) / 2 - 34];
  const labelIn = label ? ease(frame, labelAt ?? at + dur * 0.6, 12) : 0;

  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: (1 - gone) * (1 - dimmed) }}>
        <polyline
          points={pointsAttr(points)}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
        />
        {marker(points[0], points[1], from)}
        {marker(points[points.length - 1], points[points.length - 2], to)}
      </svg>
      {labelIn > 0 ? (
        <div
          style={{
            position: "absolute",
            left: at2[0],
            top: at2[1],
            opacity: labelIn * (1 - gone) * (1 - dimmed),
            whiteSpace: "nowrap",
            ...note(21, INK_SOFT),
            fontStyle: "italic",
            ...halo,
          }}
        >
          {label}
        </div>
      ) : null}
    </>
  );
};

/**
 * Where an end's two symbols sit, from crowsfoot.ts's own geometry: the one
 * nearer the entity (the maximum: a bar, or the foot) and the one farther
 * out (the minimum: a bar, or a circle). For washing a symbol as it is read.
 */
export function endSymbols(tip: Pt, back: Pt, kind: Cardinality, size = MARKER) {
  const m = relationEnd(tip, back, kind, size);
  const midOf = ([p, q]: [Pt, Pt]): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const hasFoot = kind === "one-or-many" || kind === "zero-or-many" || kind === "many";
  const foot = hasFoot ? m.lines.slice(0, 3) : [];
  const bars = m.lines.slice(foot.length).map(midOf);
  const footC: Pt | undefined = foot.length ? [(foot[0][0][0] + tip[0]) / 2, (foot[0][0][1] + tip[1]) / 2] : undefined;
  const near = footC ?? bars[0];
  const far = m.rings[0]?.c ?? (hasFoot ? bars[0] : bars[1]);
  return { near, far };
}

/** A soft wash behind one symbol of an end, swept in on `at`, lifted on `out`. */
export const Glow: React.FC<{ c: Pt; r: number; at: number; out?: number; color?: string }> = ({ c, r, at, out, color = HIGHLIGHT }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  return (
    <Svg>
      <circle cx={c[0]} cy={c[1]} r={r * (0.6 + 0.4 * p)} fill={color} opacity={p * (1 - o)} />
    </Svg>
  );
};

/** A question mark set at the end of a bare line, in the accent. */
export const Query: React.FC<{ x: number; y: number; at: number; out?: number }> = ({ x, y, at, out }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * Math.min(1.2, p)})`,
        opacity: Math.min(1, p) * (1 - o),
        ...headline(46, true),
        color: ACCENT_INK,
        ...halo,
      }}
    >
      ?
    </div>
  );
};

