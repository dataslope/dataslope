import React from "react";
import { useCurrentFrame } from "remotion";
import { arrowHead } from "../../components/arrow";
import { ease } from "../../components/motion";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, type Pt } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { DEPT_COLOR, DEPT_INK, type Dept, type Row } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: the frame's rows
 * as cards that can lift off the page and land somewhere else, a printed
 * line of pandas with highlighter marks, a figure label that can carry code,
 * and a straight arrow whose head follows its line.
 */

/* ── Geometry, in layout units (before `y()`), shared by every scene so the
      frame stays put across the cuts. ── */

/** The frame `df`: index, dept, salary. */
export const A_X = 120;
export const CARD_W = 300;
/** Row pitch, and the paper left between two cards. */
export const RH = 54;
export const GAP = 6;
/** Step labels sit above the header row; rows start under it. */
export const LABEL_Y = 308;
export const HEADER_Y = 356;
export const ROW0 = 396;
/** The `.transform("sum")` column, beside the frame. */
export const T_X = 444;
export const T_W = 150;
/** The share column. */
export const S_X = 640;
export const S_W = 130;
/** The `.agg("sum")` result: three rows, keyed by dept. */
export const D_X = 1420;
export const D_W = 260;
export const D_HEADER = HEADER_Y;
export const D_ROW0 = ROW0;

/** Inner widths of a frame card, after its 6px department bar. */
const BAR = 6;
const IDX_W = 46;
const DEPT_W = 118;
const KEY_W = 120;

/* ── Code ── */

const TOKEN_INK = {
  string: ds("green", 800),
  call: ds("purple", 700),
  number: ds("orange", 700),
  punct: INK_SOFT,
  name: INK,
} as const;

type Token = { text: string; color: string; weight?: number };

/** A small Python tokenizer: strings, numbers, calls and names. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/("[^"]*")|(\d+)|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, str, num, call, name] = m;
    if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (call) out.push({ text, color: TOKEN_INK.call, weight: 600 });
    else if (name) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** A run of code, with a highlighter stroke wiped in behind it on cue. */
export type Part = { text: string; mark?: { at: number; out?: number; color?: string } };

const Tokens: React.FC<{ text: string }> = ({ text }) => (
  <>
    {tokenize(text).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 450 }}>
        {t.text}
      </span>
    ))}
  </>
);

/** A line of code built from parts, set at `size` (or the text's own size). */
export const Code: React.FC<{ parts: readonly Part[]; size?: number }> = ({ parts, size }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ fontFamily: MONO, fontSize: size ?? "0.94em", whiteSpace: "pre", fontVariantLigatures: "none" }}>
      {parts.map((p, i) => {
        if (!p.mark) return <Tokens key={i} text={p.text} />;
        const w = ease(frame, p.mark.at, 12);
        const o = p.mark.out === undefined ? 0 : ease(frame, p.mark.out, 10);
        return (
          <span key={i} style={{ position: "relative", display: "inline-block" }}>
            {/* Sized to the run itself, so it covers the characters in any face. */}
            <span
              style={{
                position: "absolute",
                left: "-0.12em",
                top: "0.04em",
                bottom: "-0.04em",
                width: `calc(${w} * (100% + 0.24em))`,
                background: p.mark.color ?? HIGHLIGHT,
                opacity: 1 - o,
              }}
            />
            <span style={{ position: "relative" }}>
              <Tokens text={p.text} />
            </span>
          </span>
        );
      })}
    </span>
  );
};

/** Code inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: string }> = ({ children }) => <Code parts={[{ text: children }]} />;

/** "Fig. 2" and a title that may hold code: the shared FigLabel, widened. */
export const Fig: React.FC<{ n: string; at: number; x: number; y: number; out?: number; children: React.ReactNode }> = ({
  n,
  at,
  x,
  y,
  out,
  children,
}) => (
  <Ink at={at} out={out} style={{ left: x, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 12 }}>
    <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>Fig. {n}</span>
    <span style={{ ...label(24, INK), fontWeight: 560 }}>{children}</span>
  </Ink>
);

/* ── Rows ── */

const tint = (dept: Dept, k = 14) => `color-mix(in srgb, ${DEPT_COLOR[dept]} ${k}%, ${PAPER})`;

/** A card's paper, its department bar and, in flight, a soft shadow. */
const cardStyle = (dept: Dept, x: number, top: number, width: number, height: number, lift = 0): React.CSSProperties => ({
  position: "absolute",
  left: x,
  top,
  width,
  height,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  background: tint(dept),
  borderLeft: `${BAR}px solid ${DEPT_COLOR[dept]}`,
  boxShadow:
    lift > 0
      ? `0 ${10 * lift}px ${22 * lift}px color-mix(in srgb, ${INK} ${22 * lift}%, transparent)`
      : undefined,
});

const deptText = (dept: Dept): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: 24,
  fontWeight: 620,
  color: DEPT_INK[dept],
});
const numText: React.CSSProperties = { ...note(26, INK), fontWeight: 520, lineHeight: 1 };
const idxText: React.CSSProperties = { fontFamily: MONO, fontSize: 21, color: INK_SOFT };

/** Where a card is, how far it has lifted, and how it is turned. */
export type Pose = { x: number; top: number; lift?: number; turn?: number; opacity?: number };

/** One row of the frame: its index, its dept and its salary. */
export const RowCard: React.FC<{ row: Row; pose: Pose; height: number }> = ({ row, pose, height }) => (
  <div
    style={{
      ...cardStyle(row.dept, pose.x, pose.top, CARD_W, height, pose.lift),
      opacity: pose.opacity ?? 1,
      transform: pose.turn ? `rotate(${pose.turn}deg)` : undefined,
    }}
  >
    <span style={{ ...idxText, width: IDX_W, textAlign: "right", paddingRight: 4, boxSizing: "border-box" }}>
      {row.index}
    </span>
    <span style={{ ...deptText(row.dept), width: DEPT_W, paddingLeft: 16, boxSizing: "border-box" }}>{row.dept}</span>
    <span style={{ ...numText, flex: 1, textAlign: "right", paddingRight: 18 }}>{row.salary}</span>
  </div>
);

/** One row of a grouped result: the key, bold, and its value. */
export const KeyCard: React.FC<{ dept: Dept; value: number; pose: Pose; height: number }> = ({
  dept,
  value,
  pose,
  height,
}) => (
  <div
    style={{
      ...cardStyle(dept, pose.x, pose.top, D_W, height, pose.lift),
      opacity: pose.opacity ?? 1,
      transform: pose.turn ? `rotate(${pose.turn}deg)` : undefined,
    }}
  >
    <span style={{ ...deptText(dept), fontWeight: 720, width: KEY_W, paddingLeft: 14, boxSizing: "border-box" }}>
      {dept}
    </span>
    <span style={{ ...numText, flex: 1, textAlign: "right", paddingRight: 18 }}>{value}</span>
  </div>
);

/** A value cell beside the frame: the row's index, optionally, and a value. */
export const ValueCell: React.FC<{
  dept: Dept;
  index?: number;
  showIndex?: number;
  text: string;
  pose: Pose;
  width: number;
  height: number;
  strong?: boolean;
}> = ({ dept, index, showIndex = 0, text, pose, width, height, strong }) => (
  <div
    style={{
      ...cardStyle(dept, pose.x, pose.top, width, height, pose.lift),
      opacity: pose.opacity ?? 1,
      transform: pose.turn ? `rotate(${pose.turn}deg)` : undefined,
    }}
  >
    {index === undefined ? null : (
      <span style={{ ...idxText, width: 40, textAlign: "right", paddingRight: 4, boxSizing: "border-box", opacity: showIndex }}>
        {index}
      </span>
    )}
    <span style={{ ...numText, flex: 1, textAlign: "right", paddingRight: 18, fontWeight: strong ? 680 : 520 }}>{text}</span>
  </div>
);

/** Column names over a set of cards, with an ink rule under them. */
export const Header: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  /** Each name, and where it sits: [left padding, or right padding]. */
  cols: readonly { text: string; left?: number; right?: number; code?: boolean }[];
  out?: number;
}> = ({ x, top, width, at, cols, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: 34, opacity: 1 - o }}>
      {cols.map((c, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: c.left,
            right: c.right,
            top: 0,
            opacity: p,
            whiteSpace: "nowrap",
            ...(c.code ? { fontFamily: MONO, fontSize: 21, color: INK_SOFT } : label(20, INK_SOFT)),
          }}
        >
          {c.text}
        </span>
      ))}
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 2, width: `${p * 100}%`, background: INK }} />
    </div>
  );
};

/** The frame's header: `dept` over the keys, `salary` over the values. */
export const FRAME_COLS = [
  { text: "dept", left: BAR + IDX_W + 16, code: true },
  { text: "salary", right: 18, code: true },
] as const;
/** A grouped result's header: the key, then the value. */
export const KEY_COLS = [
  { text: "dept", left: BAR + 14, code: true },
  { text: "salary", right: 18, code: true },
] as const;

/* ── Motion ── */

/** A card's pose part-way (`p`, 0 to 1) through a flight from `a` to `b`:
 *  it lifts, travels on a shallow arc, tilts a little, and settles. */
export const fly = (p: number, a: Pt, b: Pt, arc = 34): Pose => {
  const s = Math.sin(Math.PI * p);
  return {
    x: a[0] + (b[0] - a[0]) * p,
    top: a[1] + (b[1] - a[1]) * p - arc * s,
    lift: s,
    turn: -1.6 * s * Math.sign(b[0] - a[0] || 1),
  };
};

/** A straight arrow that draws itself from `from` to `to`. The head is built
 *  from the line's own direction where it ends, so it always points along it. */
export const Arrow: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  opacity?: number;
}> = ({ from, to, at, dur = 12, color = INK, width = 2, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  if (p <= 0) return null;
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const tip: Pt = [from[0] + dx * p, from[1] + dy * p];
  const back = 13;
  const half = 7;

  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
      <path d={`M${from[0]},${from[1]} L${tip[0]},${tip[1]}`} stroke={color} strokeWidth={width} fill="none" />
      <path
        d={arrowHead([from, tip], back, half)}
        stroke={color}
        strokeWidth={width}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={ease(frame, at + dur * 0.5, dur * 0.5)}
      />
    </svg>
  );
};
