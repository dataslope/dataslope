import React from "react";
import { HAND } from "./fonts";
import { BP } from "./theme";

/**
 * Drafting primitives. Every line draws itself on: a solid path through
 * `pathLength` and `stroke-dashoffset`, a dashed one (phantom and center
 * lines, motion paths) by trimming its geometry, since a dash pattern and a
 * draw-on offset cannot share one `stroke-dasharray`.
 */

export type Pt = readonly [number, number];
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const clamp01 = (p: number) => Math.max(0, Math.min(1, p));

/** Drafting line types, as stroke-dasharray values. */
export const DASH = {
  hidden: "10 7",
  center: "22 6 4 6",
  phantom: "26 6 4 6 4 6",
} as const;

/** A solid stroke that draws on from 0 to 1. */
export const Ink: React.FC<{
  d: string;
  p: number;
  color?: string;
  width?: number;
  fill?: string;
  opacity?: number;
}> = ({ d, p, color = BP.line, width = 2.5, fill = "none", opacity = 1 }) =>
  p <= 0 ? null : (
    <path
      d={d}
      pathLength={1}
      fill={fill}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1 1"
      strokeDashoffset={1 - clamp01(p)}
      opacity={opacity}
    />
  );

/** A straight segment drawn on from `a` toward `b`; takes a dash pattern. */
export const Seg: React.FC<{
  a: Pt;
  b: Pt;
  p?: number;
  color?: string;
  width?: number;
  dash?: string;
  opacity?: number;
}> = ({ a, b, p = 1, color = BP.line2, width = 2, dash, opacity = 1 }) => {
  if (p <= 0) return null;
  const e = lerpPt(a, b, clamp01(p));
  return (
    <line
      x1={a[0]}
      y1={a[1]}
      x2={e[0]}
      y2={e[1]}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash}
      strokeLinecap={dash ? "butt" : "round"}
      opacity={opacity}
    />
  );
};

/** Point on a quadratic Bézier. */
export const quadAt = (p0: Pt, c: Pt, p2: Pt, t: number): Pt => lerpPt(lerpPt(p0, c, t), lerpPt(c, p2, t), t);

/** The first `t` of a quadratic Bézier as a path (de Casteljau split). */
export const quadPart = (p0: Pt, c: Pt, p2: Pt, t: number) => {
  const c1 = lerpPt(p0, c, t);
  const e = quadAt(p0, c, p2, t);
  return `M ${p0[0]} ${p0[1]} Q ${c1[0]} ${c1[1]} ${e[0]} ${e[1]}`;
};

/** A curved, dashed path (a part's path of motion) drawn on to `p`. */
export const MotionPath: React.FC<{
  p0: Pt;
  c: Pt;
  p2: Pt;
  p: number;
  opacity?: number;
  color?: string;
}> = ({ p0, c, p2, p, opacity = 1, color = BP.cyan }) =>
  p <= 0 || opacity <= 0 ? null : (
    <path
      d={quadPart(p0, c, p2, clamp01(p))}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeDasharray={DASH.phantom}
      opacity={opacity * 0.8}
    />
  );

/** A narrow filled drafting arrowhead with its tip at `tip`, pointing along `angle` (radians). */
export const ArrowHead: React.FC<{ tip: Pt; angle: number; size?: number; color?: string; opacity?: number }> = ({
  tip,
  angle,
  size = 16,
  color = BP.line,
  opacity = 1,
}) => {
  const back = (s: number) => [tip[0] - Math.cos(angle) * size + Math.cos(angle + Math.PI / 2) * s, tip[1] - Math.sin(angle) * size + Math.sin(angle + Math.PI / 2) * s];
  const [l, r] = [back(size * 0.28), back(-size * 0.28)];
  return <path d={`M ${tip[0]} ${tip[1]} L ${l[0]} ${l[1]} L ${r[0]} ${r[1]} Z`} fill={color} opacity={opacity} />;
};

/** Rounded rectangle as a path, starting at the top-left corner. */
export const rrect = (x: number, y: number, w: number, h: number, r = 0) =>
  r <= 0
    ? `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`
    : `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;

/** Circle as a path, starting at 12 o'clock, clockwise. */
export const circle = (cx: number, cy: number, r: number) =>
  `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;

/** A drafted box: the outline draws on, then four corner ticks overshoot it. */
export const DraftBox: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  p: number;
  color?: string;
  fill?: string;
  width?: number;
}> = ({ x, y, w, h, p, color = BP.line2, fill, width = 2 }) => {
  if (p <= 0) return null;
  const t = Math.max(0, (p - 0.6) / 0.4);
  const o = 12 * t;
  const ticks = [
    [x - o, y, x, y],
    [x, y - o, x, y],
    [x + w, y, x + w + o, y],
    [x + w, y - o, x + w, y],
    [x - o, y + h, x, y + h],
    [x, y + h, x, y + h + o],
    [x + w, y + h, x + w + o, y + h],
    [x + w, y + h, x + w, y + h + o],
  ];
  return (
    <g>
      {fill ? <rect x={x} y={y} width={w} height={h} fill={fill} opacity={clamp01(p * 2)} /> : null}
      <Ink d={rrect(x, y, w, h)} p={p / 0.7} color={color} width={width} />
      {t > 0
        ? ticks.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={BP.faint} strokeWidth={1.5} />
          ))
        : null}
    </g>
  );
};

/** View-box crop marks: four L-shaped corners, as on a detail view. */
export const CropMarks: React.FC<{ x: number; y: number; w: number; h: number; p: number; len?: number; color?: string }> = ({
  x,
  y,
  w,
  h,
  p,
  len = 34,
  color = BP.line2,
}) => {
  if (p <= 0) return null;
  const l = len * clamp01(p);
  const d = [
    `M ${x} ${y + l} V ${y} H ${x + l}`,
    `M ${x + w - l} ${y} H ${x + w} V ${y + l}`,
    `M ${x + w} ${y + h - l} V ${y + h} H ${x + w - l}`,
    `M ${x + l} ${y + h} H ${x} V ${y + h - l}`,
  ].join(" ");
  return <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="square" />;
};

/** An item balloon: a circled reference number, the way parts are called out. */
export const Balloon: React.FC<{ c: Pt; n: number | string; p: number; r?: number; color?: string; fill?: string }> = ({
  c,
  n,
  p,
  r = 22,
  color = BP.line,
  fill = BP.paper,
}) => {
  if (p <= 0) return null;
  const s = 0.7 + 0.3 * clamp01(p);
  return (
    <g transform={`translate(${c[0]} ${c[1]}) scale(${s})`}>
      <circle r={r} fill={fill} opacity={clamp01(p * 2)} />
      <Ink d={circle(0, 0, r)} p={p * 1.4} color={color} width={2.5} />
      <text
        y={r * 0.36}
        textAnchor="middle"
        fontFamily={HAND}
        fontSize={r * 1.15}
        fill={color}
        opacity={clamp01((p - 0.4) / 0.4)}
      >
        {n}
      </text>
    </g>
  );
};

/**
 * A leader: an arrowhead on the part, a line to an elbow, and a short
 * horizontal shoulder that the note sits on.
 */
export const Leader: React.FC<{ from: Pt; elbow: Pt; to: Pt; p: number; color?: string; head?: boolean }> = ({
  from,
  elbow,
  to,
  p,
  color = BP.line2,
  head = true,
}) => {
  if (p <= 0) return null;
  const a = Math.atan2(from[1] - elbow[1], from[0] - elbow[0]);
  return (
    <g>
      <Ink d={`M ${to[0]} ${to[1]} L ${elbow[0]} ${elbow[1]} L ${from[0]} ${from[1]}`} p={p} color={color} width={2} />
      {head && p > 0.85 ? <ArrowHead tip={from} angle={a} size={14} color={color} /> : null}
    </g>
  );
};

/**
 * An axis-aligned dimension: extension lines from the two measured points,
 * the dimension line between them with arrowheads, and the figure in a gap
 * in the line. `offset` moves the dimension line off the part (perpendicular).
 */
export const Dimension: React.FC<{
  a: Pt;
  b: Pt;
  orient: "h" | "v";
  offset: number;
  label: string;
  p: number;
  color?: string;
  fontSize?: number;
  /** Keep a vertical dimension's figure upright (a single digit reads better). */
  upright?: boolean;
}> = ({ a, b, orient, offset, label, p, color = BP.line2, fontSize = 22, upright = false }) => {
  if (p <= 0) return null;
  const pl = clamp01(p / 0.6);
  const pt = clamp01((p - 0.5) / 0.5);
  const [A, B]: [Pt, Pt] =
    orient === "h"
      ? [
          [a[0], a[1] + offset],
          [b[0], a[1] + offset],
        ]
      : [
          [a[0] + offset, a[1]],
          [a[0] + offset, b[1]],
        ];
  const ext = Math.sign(offset) * 10;
  const mid = lerpPt(A, B, 0.5);
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  // An upright figure on a vertical dimension sits beside the line, not in a
  // gap: a lone "1" in this face is one stroke and would read as more line.
  const beside = orient === "v" && upright;
  const gap = beside ? 0 : Math.min(len - 30, label.length * fontSize * 0.62 + 18);
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const g1 = lerpPt(A, B, Math.max(0, 0.5 - gap / 2 / Math.max(len, 1)));
  const g2 = lerpPt(A, B, Math.min(1, 0.5 + gap / 2 / Math.max(len, 1)));
  return (
    <g opacity={clamp01(p * 3)}>
      <Seg a={a} b={orient === "h" ? [a[0], A[1] + ext] : [A[0] + ext, a[1]]} p={pl} color={BP.faint} width={1.5} />
      <Seg a={b} b={orient === "h" ? [b[0], B[1] + ext] : [B[0] + ext, b[1]]} p={pl} color={BP.faint} width={1.5} />
      {len > 4 ? (
        <>
          <Seg a={A} b={g1} p={pl} color={color} width={1.8} />
          <Seg a={B} b={g2} p={pl} color={color} width={1.8} />
          <ArrowHead tip={A} angle={ang + Math.PI} size={14} color={color} opacity={pl} />
          <ArrowHead tip={B} angle={ang} size={14} color={color} opacity={pl} />
        </>
      ) : null}
      <text
        x={beside ? mid[0] - Math.sign(-offset || 1) * 12 : mid[0]}
        y={mid[1]}
        dy={fontSize * 0.35}
        textAnchor={beside ? (offset < 0 ? "end" : "start") : "middle"}
        fontFamily={HAND}
        fontSize={fontSize}
        letterSpacing="0.06em"
        fill={color}
        opacity={pt}
        transform={orient === "v" && !upright ? `rotate(-90 ${mid[0]} ${mid[1]})` : undefined}
      >
        {label}
      </text>
    </g>
  );
};

/** A revision cloud around a box: the checker's scalloped "look here". */
export const cloudPath = (x: number, y: number, w: number, h: number, bump = 26) => {
  const pts: Pt[] = [];
  const side = (a: Pt, b: Pt) => {
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / bump));
    for (let i = 0; i < n; i++) pts.push(lerpPt(a, b, i / n));
  };
  side([x, y], [x + w, y]);
  side([x + w, y], [x + w, y + h]);
  side([x + w, y + h], [x, y + h]);
  side([x, y + h], [x, y]);
  pts.push([x, y]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const r = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * 0.56;
    d += ` A ${r} ${r} 0 0 1 ${pts[i][0]} ${pts[i][1]}`;
  }
  return d;
};

/**
 * Hand lettering: uppercase Architects Daughter, revealed left to right as if
 * written. `x`/`y` is the top-left (or top-center with `align="center"`).
 */
export const Letter: React.FC<{
  x: number;
  y: number;
  p: number;
  size?: number;
  color?: string;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
  style?: React.CSSProperties;
  spacing?: string;
}> = ({ x, y, p, size = 28, color = BP.line, align = "left", children, style, spacing = "0.06em" }) => {
  if (p <= 0) return null;
  const q = clamp01(p);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: align === "center" ? "translateX(-50%)" : align === "right" ? "translateX(-100%)" : undefined,
        fontFamily: HAND,
        fontSize: size,
        lineHeight: 1.15,
        letterSpacing: spacing,
        textTransform: "uppercase",
        color,
        whiteSpace: "nowrap",
        clipPath:
          align === "center"
            ? `inset(-20% ${(1 - q) * 50}% -20% ${(1 - q) * 50}%)`
            : align === "right"
              ? `inset(-20% 0 -20% ${(1 - q) * 100}%)`
              : `inset(-20% ${(1 - q) * 100}% -20% 0)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** A full-frame SVG layer in sheet coordinates. */
export const Layer: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
    style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}
  >
    {children}
  </svg>
);

/** 0 → 1 → 0: a pulse `len` frames long starting at `at`. */
export const pulse = (frame: number, at: number, len = 24) => {
  const t = frame - at;
  return t < 0 || t > len ? 0 : Math.sin((t / len) * Math.PI);
};
