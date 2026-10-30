import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Cubic, cubicPath, lineLength, roundedPolyline, sampleCubic } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ACCENT, BAR, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import type { Pt } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { DEPT_COLOR, DEPT_INK, type Dept, ILLUSTRATIONS, type Row, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (the slow push, kicker,
 * headline, highlighter, strike, listing) comes from the Data Analyst pandas
 * video, as the Data Scientist series takes it, so the interview videos stay
 * one family; `lineOf` is ds-sql's. The row cards, their department colors
 * and the card flight are copied from the course video PandasGroupby's
 * kit.tsx, whose seven-row frame questions 1 and 12 run on; they are copied
 * rather than imported because that kit's geometry is fixed to its own
 * layout. What is new here is a cluster: machine boxes, partition blocks,
 * and a curved arrow for what crosses the network.
 */
export {
  Drift,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  pulse,
  Strike,
  Svg,
  X0,
} from "../da-pandas/parts";

/** The index of the listing line that holds `text` (ds-sql's rule: find a
 *  highlight's line by what it says, never by a number). */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/** The watercolor hero from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
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
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
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

/* ── Rows and pairs (after PandasGroupby's kit.tsx) ───────────────────────── */

const DEPT_BAR = 6;

/** A department's card paper: its color, washed into the page. */
export const tint = (dept: Dept, k = 14) => `color-mix(in srgb, ${DEPT_COLOR[dept]} ${k}%, ${PAPER})`;

/** Where a card is, how far it has lifted, and how it is turned. */
export type Pose = { x: number; top: number; lift?: number; turn?: number; opacity?: number };

const cardBox = (dept: Dept, pose: Pose, width: number, height: number): React.CSSProperties => ({
  position: "absolute",
  left: pose.x,
  top: pose.top,
  width,
  height,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  background: tint(dept),
  borderLeft: `${DEPT_BAR}px solid ${DEPT_COLOR[dept]}`,
  opacity: pose.opacity ?? 1,
  transform: pose.turn ? `rotate(${pose.turn}deg)` : undefined,
  boxShadow:
    pose.lift && pose.lift > 0
      ? `0 ${10 * pose.lift}px ${22 * pose.lift}px color-mix(in srgb, ${INK} ${22 * pose.lift}%, transparent)`
      : undefined,
});

const deptText = (dept: Dept, weight = 620): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: 23,
  fontWeight: weight,
  color: DEPT_INK[dept],
});
const numText: React.CSSProperties = { ...note(25, INK), fontWeight: 540, lineHeight: 1 };

/** One row of the frame: its index, its department and its salary. */
export const RowCard: React.FC<{ row: Row; pose: Pose; width: number; height: number }> = ({ row, pose, width, height }) => (
  <div style={cardBox(row.dept, pose, width, height)}>
    <span style={{ fontFamily: MONO, fontSize: 20, color: INK_SOFT, width: 40, textAlign: "right", paddingRight: 4, boxSizing: "border-box" }}>
      {row.index}
    </span>
    <span style={{ ...deptText(row.dept), width: 100, paddingLeft: 14, boxSizing: "border-box" }}>{row.dept}</span>
    <span style={{ ...numText, flex: 1, textAlign: "right", paddingRight: 16 }}>{row.salary}</span>
  </div>
);

/** A key and a value: what a map emits, or a reduce's answer when `strong`. */
export const PairCard: React.FC<{ dept: Dept; value: number | string; pose: Pose; width: number; height: number; strong?: boolean }> = ({
  dept,
  value,
  pose,
  width,
  height,
  strong,
}) => (
  <div style={cardBox(dept, pose, width, height)}>
    <span style={{ ...deptText(dept, strong ? 740 : 620), width: 92, paddingLeft: 14, boxSizing: "border-box" }}>{dept}</span>
    <span style={{ ...numText, flex: 1, textAlign: "right", paddingRight: 16, fontWeight: strong ? 720 : 540 }}>{value}</span>
  </div>
);

/** A card's pose part-way (`p`, 0 to 1) through a flight from `a` to `b`:
 *  it lifts, travels on a shallow arc, tilts a little, and settles. */
export const fly = (p: number, a: Pt, b: Pt, arc = 30): Pose => {
  const s = Math.sin(Math.PI * p);
  return {
    x: a[0] + (b[0] - a[0]) * p,
    top: a[1] + (b[1] - a[1]) * p - arc * s,
    lift: s,
    turn: -1.4 * s * Math.sign(b[0] - a[0] || 1),
  };
};

/* ── A cluster ────────────────────────────────────────────────────────────── */

export type Tone = "plain" | "idle" | "bad" | "ok" | "focus";

const TONE_STROKE: Record<Tone, string> = {
  plain: INK_SOFT,
  idle: ds("gray", 300),
  bad: ACCENT,
  ok: ds("green", 600),
  focus: ds("yellow", 600),
};

/**
 * A machine, an executor, a core or a stage: a rounded box with its name at
 * the top left, drawn on `at`. `tone` recolors its outline (idle grey, the
 * trap's red, the right answer's green) from `toneAt`.
 */
export const Machine: React.FC<{
  x: number;
  top: number;
  width: number;
  height: number;
  at: number;
  name?: React.ReactNode;
  tone?: Tone;
  toneAt?: number;
  dash?: boolean;
  out?: number;
  dim?: number;
  fill?: string;
  nameSize?: number;
}> = ({ x, top, width, height, at, name, tone = "plain", toneAt, dash = false, out, dim, fill, nameSize = 20 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const t = toneAt === undefined ? 1 : ease(frame, toneAt, 10);
  const stroke = t >= 1 ? TONE_STROKE[tone] : `color-mix(in srgb, ${TONE_STROKE[tone]} ${t * 100}%, ${INK_SOFT})`;
  const strong = tone === "bad" || tone === "ok" || tone === "focus";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height,
        boxSizing: "border-box",
        border: `${strong && t > 0.5 ? 2.6 : 1.6}px ${dash ? "dashed" : "solid"} ${stroke}`,
        borderRadius: 10,
        background: fill ?? (tone === "idle" && t > 0 ? `color-mix(in srgb, ${ds("gray", 100)} ${t * 70}%, ${PAPER})` : PAPER),
        opacity: p * (1 - o) * (1 - d),
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {name !== undefined ? (
        <div style={{ position: "absolute", left: 12, top: 6, ...label(nameSize, tone === "bad" && t > 0.5 ? ds("red", 500) : INK_SOFT), whiteSpace: "nowrap" }}>
          {name}
        </div>
      ) : null}
    </div>
  );
};

/** A partition of data: a filled block, washed in `color`, growing in from the left on `at`. */
export const Block: React.FC<{
  x: number;
  top: number;
  width: number;
  height: number;
  at: number;
  color?: string;
  k?: number;
  out?: number;
  dim?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, top, width, height, at, color = BAR, k = 34, out, dim, children, style }) => {
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
        top,
        width: width * p,
        height,
        boxSizing: "border-box",
        background: `color-mix(in srgb, ${color} ${k}%, ${PAPER})`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 3,
        overflow: "hidden",
        opacity: (1 - o) * (1 - d),
        display: "flex",
        alignItems: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * A curved arrow from `from` to `to` that draws itself on `at`. Its last
 * control point sits well back along the arrival direction (horizontal), so
 * the line has stopped turning before the head starts (components/arrow.ts).
 */
export const Curve: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
  head?: number;
  dash?: string;
  opacity?: number;
}> = ({ from, to, at, dur = 16, out, dim, color = INK_SOFT, width = 2, head = 12, dash, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const [fx, fy] = from;
  const [tx, ty] = to;
  const dir = Math.sign(tx - fx) || 1;
  const run = Math.min(26, Math.abs(tx - fx) * 0.2);
  const ex = tx - run * dir;
  const bend = Math.max(24, Math.abs(ex - fx) * 0.45) * dir;
  const curve: Cubic = [from, [fx + bend, fy], [ex - bend, ty], [ex, ty]];
  const line = [...sampleCubic(curve), to];
  const len = lineLength(line);
  const reach = head ? (len - head + 1) / len : 1;
  const path = `${cubicPath(curve)} L${tx},${ty}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: opacity * (1 - o) * (1 - d) }}>
      {dash ? (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} style={{ clipPath: `inset(0 ${dir > 0 ? (1 - p) * 100 : 0}% 0 ${dir < 0 ? (1 - p) * 100 : 0}%)` }} />
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      {head ? <path d={arrowHead(line, head, 6.5, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} /> : null}
    </svg>
  );
};

/** A straight arrow from `from` to `to`, drawn on `at`. */
export const Arrow: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
  head?: number;
}> = ({ from, to, at, dur = 12, out, dim, color = INK_SOFT, width = 2, head = 12 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const line: Pt[] = [from, to];
  const len = lineLength(line);
  const reach = (len - head + 1) / len;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <path d={`M${from[0]},${from[1]} L${to[0]},${to[1]}`} fill="none" stroke={color} strokeWidth={width} pathLength={1} strokeDasharray={`${p * reach} 1`} />
      <path d={arrowHead(line, head, 6.5, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />
    </svg>
  );
};

/** A disk: a small cylinder, in grey ink, with a word under it. */
export const Disk: React.FC<{ x: number; top: number; at: number; w?: number; h?: number; color?: string; out?: number; dash?: boolean }> = ({
  x,
  top,
  at,
  w = 56,
  h = 46,
  color = INK_SOFT,
  out,
  dash,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const rx = w / 2;
  const ry = 8;
  const fill = `color-mix(in srgb, ${color} 14%, ${PAPER})`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p * (1 - o) }}>
      <g transform={`translate(${x + rx}, ${top + ry}) scale(${0.7 + 0.3 * p})`} strokeDasharray={dash ? "4 4" : undefined}>
        <path d={`M${-rx},0 L${-rx},${h - 2 * ry} A${rx},${ry} 0 0 0 ${rx},${h - 2 * ry} L${rx},0`} fill={fill} stroke={color} strokeWidth={1.8} />
        <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={fill} stroke={color} strokeWidth={1.8} />
      </g>
    </svg>
  );
};

/** Short, faint text set inside a block or a box. */
export const small = (size = 20, color: string = INK_SOFT): React.CSSProperties => ({ ...label(size, color), whiteSpace: "nowrap" });

/** A hairline rule across a span, drawn left to right on `at`. */
export const Rule: React.FC<{ x: number; y: number; width: number; at: number; color?: string; out?: number }> = ({ x, y, width, at, color = HAIRLINE, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top: y, width: width * p, height: 1.5, background: color, opacity: 1 - o }} />;
};

/** An arrow along a polyline with rounded corners, drawn on `at`; its last
 *  leg is straight, so the head sits on a straight end. */
export const Elbow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
  head?: number;
  radius?: number;
}> = ({ points, at, dur = 18, out, dim, color = INK_SOFT, width = 2, head = 12, radius = 18 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } = roundedPolyline(points, radius);
  const len = lineLength(samples);
  const reach = (len - head + 1) / len;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      <path d={arrowHead(samples, head, 6.5, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />
    </svg>
  );
};

/** A small rounded tag: a word set in its own ink on a wash of it. */
export const Chip: React.FC<{ children: React.ReactNode; color?: string; ink?: string; size?: number; mono?: boolean }> = ({
  children,
  color = BAR,
  ink = INK,
  size = 22,
  mono = false,
}) => (
  <span
    style={{
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: 6,
      background: `color-mix(in srgb, ${color} 14%, ${PAPER})`,
      border: `1.5px solid color-mix(in srgb, ${color} 60%, ${PAPER})`,
      ...(mono ? { fontFamily: MONO, fontSize: size * 0.92, fontWeight: 600, color: ink, fontVariantLigatures: "none" } : { ...label(size, ink), fontWeight: 600 }),
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);
