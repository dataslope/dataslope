import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { SERIF } from "../../editorial/fonts";
import { INK, INK_SOFT, PAPER, TABULAR, label } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The page furniture and the plotting pieces come
 * from the Data Analyst statistics part (Axes, Dots, VLine, Bracket), so the
 * two series stay one family; what is new is probability's own vocabulary:
 * notation set as math, a die face, a dealt card, and a door.
 */
export {
  at,
  Axes,
  Bracket,
  chartLabel,
  Dots,
  Drift,
  ElbowArrow,
  Headline,
  Kicker,
  lerp,
  Mark,
  MARK_BAD,
  MARK_OK,
  mulberry32,
  OK,
  OK_INK,
  pulse,
  type Scale,
  Strike,
  Svg,
  VLine,
  X0,
} from "../da-statistics-communication/parts";

/** Data blue, a lighter blue for the rest of a whole, and their inks. */
export const DATA = ds("blue", 500);
export const DATA_LIGHT = ds("blue", 200);

// ── Notation ─────────────────────────────────────────────────────────────────

/** Notation in the page's serif, upright: P, E, Var, brackets, numbers. */
export const math = (size: number, color: string = INK): React.CSSProperties => ({
  fontFamily: SERIF,
  fontSize: size,
  fontWeight: 450,
  color,
  whiteSpace: "nowrap",
  lineHeight: 1.1,
  fontVariantNumeric: "lining-nums",
});

/** A variable, in italic: the A and B of an event, an X. */
export const V: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontStyle: "italic", padding: "0 0.04em" }}>{children}</span>
);

/** The "given" bar, with air either side of it. */
export const Given: React.FC = () => <span style={{ padding: "0 0.18em", fontStyle: "normal" }}>|</span>;

/** A piece of a formula with a word written over or under it, in `color`:
 *  "likelihood" over P(B | A). The word inks in on `at`. */
export const Labeled: React.FC<{
  word: React.ReactNode;
  at: number;
  below?: boolean;
  color?: string;
  size?: number;
  children: React.ReactNode;
}> = ({ word, at: from, below = false, color = INK_SOFT, size = 22, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "50%",
          [below ? "top" : "bottom"]: "100%",
          transform: `translate(-50%, ${(1 - p) * (below ? -8 : 8)}px)`,
          ...label(size, color),
          fontStyle: "normal",
          whiteSpace: "nowrap",
          opacity: p,
          paddingTop: below ? 6 : 0,
          paddingBottom: below ? 0 : 6,
        }}
      >
        {word}
      </span>
    </span>
  );
};

/** A fraction set as one: numerator over a rule over denominator. */
export const Frac: React.FC<{ top: React.ReactNode; bottom: React.ReactNode; gap?: number }> = ({ top, bottom, gap = 6 }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 0.2em" }}>
    <span style={{ paddingBottom: gap }}>{top}</span>
    <span style={{ alignSelf: "stretch", height: 2, background: "currentColor", borderRadius: 1 }} />
    <span style={{ paddingTop: gap }}>{bottom}</span>
  </span>
);

/** Everything inside fades off the page from `at`: a bridge clearing a
 *  finished figure on its last words, so the cut lands on an empty page. */
export const Clear: React.FC<{ at: number; children: React.ReactNode }> = ({ at: from, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 14);
  if (o >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - o, transform: `translateY(${-o * 8}px)` }}>{children}</div>;
};

// ── A die face ───────────────────────────────────────────────────────────────

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};

/**
 * One face of a die at (x, y), `size` square, popping in on `at`. `ink` sets
 * its outline and pips; `fill` its face (paper unless a step colors it).
 */
export const DieFace: React.FC<{
  value: number;
  x: number;
  y: number;
  size: number;
  at: number;
  ink?: string;
  fill?: string;
  opacity?: number;
  scale?: number;
}> = ({ value, x, y, size, at: from, ink = INK, fill = PAPER, opacity = 1, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  if (p <= 0.001) return null;
  const s = size * Math.min(1.08, p) * scale;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      style={{ position: "absolute", left: x + (size - s) / 2, top: y + (size - s) / 2, overflow: "visible", opacity: Math.min(1, p) * opacity }}
    >
      <rect x={3} y={3} width={94} height={94} rx={16} fill={fill} stroke={ink} strokeWidth={3.4} />
      {PIPS[value].map(([px, py], i) => (
        <circle key={i} cx={px * 100} cy={py * 100} r={8.5} fill={ink} />
      ))}
    </svg>
  );
};

// ── A card, dealt and turned ─────────────────────────────────────────────────

/**
 * A question as a playing card. It lands face down on `at` (sliding in from
 * `fromX`), turns face up on `turnAt` to show its number, and can slide to
 * `toX` on `moveAt`. `lit` washes it in the highlighter; `dim` fades it back.
 */
export const Card: React.FC<{
  n: number;
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  fromX?: number;
  turnAt: number;
  toX?: number;
  moveAt?: number;
  tilt?: number;
  lit?: number;
  dim?: number;
  out?: number;
  ink?: string;
}> = ({ n, x, y, w, h, at: from, fromX, turnAt, toX, moveAt, tilt = 0, lit = 0, dim = 0, out, ink = INK }) => {
  const frame = useCurrentFrame();
  const land = ease(frame, from, 14);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (land <= 0 || o >= 1) return null;
  const turn = ease(frame, turnAt, 12);
  const face = turn >= 0.5;
  const squash = Math.abs(Math.cos(turn * Math.PI));
  const move = toX === undefined || moveAt === undefined ? 0 : ease(frame, moveAt, 16);
  const left = (fromX ?? x) + (x - (fromX ?? x)) * land + ((toX ?? x) - x) * move;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: y + (1 - land) * 30,
        width: w,
        height: h,
        boxSizing: "border-box",
        borderRadius: 10,
        border: `2.5px solid ${face ? ink : DATA}`,
        background: face ? `color-mix(in srgb, ${ds("yellow", 400)} ${lit * 80}%, ${PAPER})` : `color-mix(in srgb, ${DATA} 16%, ${PAPER})`,
        opacity: land * (1 - o) * (1 - dim * 0.6),
        transform: `scaleX(${Math.max(0.02, squash)}) rotate(${tilt * move}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {face ? (
        <span style={{ ...label(Math.round(w * 0.36), ink), ...TABULAR, fontWeight: 700 }}>{n}</span>
      ) : (
        <div
          style={{
            width: w - 22,
            height: h - 22,
            borderRadius: 6,
            border: `1.5px solid color-mix(in srgb, ${DATA} 55%, transparent)`,
            background: `repeating-linear-gradient(45deg, transparent 0 7px, color-mix(in srgb, ${DATA} 18%, transparent) 7px 9px)`,
          }}
        />
      )}
    </div>
  );
};

// ── A person, drawn as a token ───────────────────────────────────────────────

/** A head and shoulders in one ink, `size` tall, for a crowd or a room. */
export const Person: React.FC<{ x: number; y: number; size: number; color: string; opacity?: number }> = ({
  x,
  y,
  size,
  color,
  opacity = 1,
}) => (
  <g transform={`translate(${x},${y}) scale(${size / 40})`} opacity={opacity}>
    <circle cx={0} cy={-12} r={8.5} fill={color} />
    <path d="M -14 16 Q -14 -1 0 -1 Q 14 -1 14 16 Z" fill={color} />
  </g>
);

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
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
}> = ({ id, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
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
