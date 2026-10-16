import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  BLUE_INK,
  body,
  HAIRLINE,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  label,
  note,
  PAPER,
} from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The pieces this video needs beyond the editorial kit and the ERD kit: a
 * record box and the pointers between records (the navigational tree), Codd's
 * paper as a printed page, a table whose rows can be reshuffled on disk, a SQL
 * listing and Postgres's error box (after WhyNormalization's kit), and the
 * cards of the family tree.
 *
 * Color roles: ink for records and the history's plain facts; the data blue
 * for keys and the values that link rows; the red accent for what the
 * narration points at, a route a program hard-codes, and anything that
 * breaks.
 */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const KEY = BAR;
export const KEY_INK = BLUE_INK;
export const KEY_WASH = `color-mix(in srgb, ${BAR} 18%, transparent)`;
export const WARN_WASH = `color-mix(in srgb, ${ACCENT} 22%, transparent)`;
export const SOFT = `color-mix(in srgb, ${INK} 22%, transparent)`;
const BOX_FILL = `color-mix(in srgb, ${ds("yellow", 50)} 45%, ${PAPER})`;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** 1 from `at` (easing in) until `out` (easing away). */
export const shown = (frame: number, at: number, out?: number, dur = 12) =>
  ease(frame, at, dur) * (out === undefined ? 1 : 1 - ease(frame, out, dur));

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * A headline: a lead in roman, then optionally a turn in italic in the accent
 * ink, following it on the same line. Each half has its own cue, and the
 * whole line lifts away on `out`.
 */
export const Headline: React.FC<{
  at: number;
  lead: React.ReactNode;
  turn?: React.ReactNode;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ at, lead, turn, turnAt, out, size = 76, top = 150 }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink
          at={turnAt ?? at + 10}
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
export const Mark: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
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

/** A line struck through the words it wraps, drawn left to right on `at`. */
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
          top: "0.52em",
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

/**
 * A watercolor spot from illustrations.json: it pops in on `at` (sliding in
 * from `from`, in px), bobs gently, dims on `dim` and fades on `out`.
 */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  from?: readonly [number, number];
}> = ({ id, at, out, dim, left, top, width, height, from = [0, 30] }) => {
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
        transform: `translate(${(1 - p) * from[0]}px, ${bob(frame, 5, 110) + (1 - p) * from[1]}px)`,
      }}
    />
  );
};

// ── Lines between things ─────────────────────────────────────────────────────

const segLen = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** The first `len` px of a polyline. */
const partial = (points: readonly Pt[], len: number): Pt[] => {
  const out: Pt[] = [points[0]];
  let left = len;
  for (let i = 1; i < points.length; i++) {
    const s = segLen(points[i - 1], points[i]);
    if (left >= s) {
      out.push(points[i]);
      left -= s;
    } else {
      const f = s > 0 ? left / s : 0;
      out.push([lerp(points[i - 1][0], points[i][0], f), lerp(points[i - 1][1], points[i][1], f)]);
      break;
    }
  }
  return out;
};

/** Points every few px along one straight segment, for arrowHead(). */
const along = (a: Pt, b: Pt): Pt[] => {
  const n = Math.max(2, Math.ceil(segLen(a, b) / 3));
  return Array.from({ length: n + 1 }, (_, i) => [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)] as Pt);
};

/**
 * A line through `points` (keep it orthogonal) that draws itself from its
 * first point over `dur` frames, with an arrowhead on its tip. The head rides
 * the straight segment it is on and is only drawn once that segment is longer
 * than the head, so it never sits across a corner.
 */
export const Wire: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
  dash?: string;
  head?: boolean;
  opacity?: number;
}> = ({ points, at, dur = 14, out, dim, color = INK, width = 2.2, dash, head = true, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const total = points.slice(1).reduce((s, q, i) => s + segLen(points[i], q), 0);
  const drawn = partial(points, total * p);
  const tip = drawn[drawn.length - 1];
  const base = drawn[drawn.length - 2] ?? drawn[0];
  const HEAD = 13;
  const showHead = head && segLen(base, tip) >= HEAD + 3;
  const path = drawn.map(([x, v], i) => `${i ? "L" : "M"}${x.toFixed(1)},${v.toFixed(1)}`).join(" ");
  return (
    <Svg opacity={(1 - o) * (1 - d) * opacity}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash}
      />
      {showHead ? (
        <path
          d={arrowHead(along(base, tip), HEAD, 7)}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
};

/** A tick drawn as one stroke, centered on (x, y). */
export const Tick: React.FC<{ x: number; y: number; at: number; size?: number; color?: string; out?: number }> = ({
  x,
  y,
  at,
  size = 30,
  color = KEY,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const s = size / 30;
  return (
    <Svg opacity={1 - o}>
      <path
        d={`M${x - 13 * s},${y + 1 * s} L${x - 3 * s},${y + 11 * s} L${x + 15 * s},${y - 11 * s}`}
        fill="none"
        stroke={color}
        strokeWidth={4.4 * s}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </Svg>
  );
};

/** A cross drawn as two strokes, centered on (x, y): a route that fails. */
export const Cross: React.FC<{ x: number; y: number; at: number; size?: number; color?: string }> = ({
  x,
  y,
  at,
  size = 26,
  color = ACCENT,
}) => {
  const frame = useCurrentFrame();
  const a = ease(frame, at, 8);
  const b = ease(frame, at + 5, 8);
  if (a <= 0) return null;
  const r = size / 2;
  return (
    <Svg>
      <path d={`M${x - r},${y - r} L${x + r},${y + r}`} stroke={color} strokeWidth={4.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} />
      <path d={`M${x + r},${y - r} L${x - r},${y + r}`} stroke={color} strokeWidth={4.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} opacity={b > 0 ? 1 : 0} />
    </Svg>
  );
};

// ── A record in the tree ─────────────────────────────────────────────────────

/**
 * One record of the navigational tree, centered on (x, y): a box with its
 * value in the monospace face. `wash` lays a tone over it from a frame on;
 * `dx`/`dy` move it (a reorganized file), in px.
 */
export const RecordNode: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  at: number;
  out?: number;
  dim?: number;
  wash?: { at: number; color: string; out?: number };
  swell?: number;
  dx?: number;
  dy?: number;
  size?: number;
  color?: string;
}> = ({ x, y, w, h, text, at, out, dim, wash, swell = 0, dx = 0, dy = 0, size = 23, color = INK }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 15));
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0.001 || o >= 1) return null;
  const tone = wash ? shown(frame, wash.at, wash.out) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2 + dx,
        top: y - h / 2 + dy,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px solid ${INK}`,
        borderRadius: 8,
        background: BOX_FILL,
        opacity: p * (1 - o) * (1 - d),
        transform: `scale(${(0.85 + 0.15 * p) * (1 + swell * 0.08)})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {tone > 0 ? <div style={{ position: "absolute", inset: 0, background: wash!.color, opacity: tone }} /> : null}
      <span style={{ position: "relative", fontFamily: MONO, fontSize: size, color, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
};

// ── Codd's paper ─────────────────────────────────────────────────────────────

/**
 * The 1970 paper as a printed page: the journal's running head, the title,
 * the author and his laboratory, then lines of text that set themselves one
 * after another from `textAt`. `title`, `author` and `date` each take a cue,
 * so the page is assembled as the narration names its parts.
 */
export const PaperPage: React.FC<{
  x: number;
  top: number;
  width: number;
  height: number;
  at: number;
  titleAt: number;
  authorAt: number;
  dateAt: number;
  textAt: number;
  out?: number;
  dim?: number;
  authorMark?: number;
  dx?: number;
}> = ({ x, top, width, height, at, titleAt, authorAt, dateAt, textAt, out, dim, authorMark, dx = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 16) * 0.55;
  if (p <= 0 || o >= 1) return null;
  const pad = 30;
  const lines = 9;
  const lineTop = 228;
  const room = height - lineTop - pad;
  const gap = room / lines;
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top,
        width,
        height,
        opacity: p * (1 - o) * (1 - d),
        transform: `translate(${(1 - p) * 40 - o * 30}px, 0) rotate(${(1 - p) * 1.5 - 0.6}deg)`,
        transformOrigin: "50% 50%",
        background: `color-mix(in srgb, ${ds("yellow", 50)} 70%, ${PAPER})`,
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 3,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: pad,
          right: pad,
          top: 22,
          display: "flex",
          justifyContent: "space-between",
          ...note(19, INK_SOFT),
          whiteSpace: "nowrap",
        }}
      >
        <span>Communications of the ACM</span>
        <span style={{ opacity: ease(frame, dateAt - 2, 10), color: ACCENT_INK, fontWeight: 650 }}>June 1970</span>
      </div>
      <div style={{ position: "absolute", left: pad, right: pad, top: 54, height: 1.5, background: INK }} />
      <Ink at={titleAt} dur={20} style={{ left: pad, top: 70, width: width - 2 * pad }}>
        <div style={{ ...headline(30), lineHeight: 1.12 }}>A Relational Model of Data for Large Shared Data Banks</div>
      </Ink>
      <Ink at={authorAt} dur={14} style={{ left: pad, top: 156, whiteSpace: "nowrap" }}>
        <div style={{ ...label(21, INK) }}>
          {authorMark !== undefined ? <Mark at={authorMark}>E. F. Codd</Mark> : "E. F. Codd"}
        </div>
        <div style={{ ...body(20, true), marginTop: 4 }}>IBM Research Laboratory, San Jose, California</div>
      </Ink>
      {Array.from({ length: lines }, (_, i) => {
        const w = ease(frame, textAt + i * 7, 12);
        const full = i === lines - 1 ? 0.55 : 0.9 + ((i * 37) % 10) / 100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pad,
              top: lineTop + i * gap,
              width: (width - 2 * pad) * full * w,
              height: 6,
              borderRadius: 3,
              background: SOFT,
            }}
          />
        );
      })}
    </div>
  );
};

// ── A table of rows that can move on disk ────────────────────────────────────

export const CELL_SIZE = 25;
export const HEAD_SIZE = 21;
/** JetBrains Mono's advance, in em. */
const ADVANCE = 0.6;
const PAD = 18;

export type Column = { title: string; numeric?: boolean; ink?: string };

/** Column widths: each as wide as its title or its longest value, plus padding. */
export const columnWidths = (cols: readonly Column[], rows: readonly (readonly string[])[]) =>
  cols.map((c, j) =>
    Math.ceil(Math.max(c.title.length * ADVANCE * HEAD_SIZE, ...rows.map((r) => (r[j] ?? "").length * ADVANCE * CELL_SIZE)) + 2 * PAD),
  );

export type MovingRow = {
  cells: readonly string[];
  at: number;
  /** Where the row sits, as a slot index, before and after `moveAt`. */
  slot: number;
  to?: number;
  /** Cells whose value changes when the row lands (by column index). */
  after?: Readonly<Record<number, string>>;
  bands?: readonly { at: number; out?: number; color?: string }[];
};

/**
 * A database table as a SQL client prints it: a rule above, the column
 * titles, a hairline, the rows, a rule below. Rows can move from one slot to
 * another on `moveAt` (the file reorganized), each a few frames after the
 * last, and any cells listed in `after` change as the row lands. A column
 * can be held back (`colAt`) and ink in later, and cells can be marked.
 */
export const MovingTable: React.FC<{
  x: number;
  top: number;
  cols: readonly Column[];
  widths: readonly number[];
  rows: readonly MovingRow[];
  at: number;
  headH: number;
  rowH: number;
  moveAt?: number;
  colAt?: Readonly<Record<number, number>>;
  colDim?: Readonly<Record<number, number>>;
  marks?: readonly { row: number; col: number; at: number; out?: number; color?: string }[];
  dim?: number;
  out?: number;
}> = ({ x, top, cols, widths, rows, at, headH, rowH, moveAt, colAt = {}, colDim = {}, marks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const width = widths.reduce((a, b) => a + b, 0);
  const xs = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
  const nRows = rows.length;
  const colOp = (j: number) =>
    (colAt[j] === undefined ? 1 : ease(frame, colAt[j], 12)) * (colDim[j] === undefined ? 1 : 1 - ease(frame, colDim[j], 14) * 0.6);
  const cellBox = (j: number): React.CSSProperties => ({
    position: "absolute",
    left: xs[j],
    width: widths[j],
    padding: `0 ${PAD}px`,
    boxSizing: "border-box",
    textAlign: cols[j].numeric ? "right" : "left",
    whiteSpace: "pre",
  });
  return (
    <div style={{ position: "absolute", left: x, top, width, opacity: (1 - o) * (1 - d) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: width * p, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: 0, top: headH - 1, width: width * p, height: 1, background: HAIRLINE }} />
      <div
        style={{ position: "absolute", left: 0, top: headH + nRows * rowH - 1, width: width * p, height: 1.5, background: INK }}
      />
      <Ink at={at + 2} dur={14} style={{ left: 0, top: 0, width, height: headH }}>
        {/* Ink pads its box, so the titles are placed inside a box of their own. */}
        <div style={{ position: "relative", width, height: headH }}>
        {cols.map((c, j) => (
          <div
            key={c.title}
            style={{
              ...cellBox(j),
              top: 0,
              height: headH,
              lineHeight: `${headH}px`,
              fontFamily: MONO,
              fontSize: HEAD_SIZE,
              fontWeight: 600,
              color: INK_SOFT,
              opacity: colOp(j),
            }}
          >
            {c.title}
          </div>
        ))}
        </div>
      </Ink>
      {rows.map((r, i) => {
        const inP = ease(frame, r.at, 12);
        if (inP <= 0) return null;
        // Each row starts moving a few frames after the one before it.
        const m = moveAt === undefined || r.to === undefined ? 0 : ease(frame, moveAt + i * 3, 20);
        const slot = r.to === undefined ? r.slot : lerp(r.slot, r.to, m);
        const rowTop = headH + slot * rowH;
        const landed = m >= 0.7;
        const washes = (r.bands ?? []).map((b) => ({ o: shown(frame, b.at, b.out), color: b.color ?? HIGHLIGHT }));
        // A row in flight lifts off the page and steps aside, each by its
        // own amount, so rows that pass each other do not print over each
        // other.
        const lift = Math.sin(m * Math.PI);
        const aside = lift * (40 + 70 * (i % 3));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: rowTop,
              width,
              height: rowH,
              opacity: inP * (1 - lift * 0.35),
              transform: `translateX(${(1 - inP) * -12 + aside}px)`,
              zIndex: lift > 0.01 ? 2 : 1,
            }}
          >
            {i > 0 || slot > 0.01 ? (
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, background: `color-mix(in srgb, ${INK} 14%, transparent)` }} />
            ) : null}
            {washes.map((b, k) =>
              b.o > 0 ? (
                <div key={k} style={{ position: "absolute", left: 0, right: 0, top: 4, bottom: 4, background: b.color, opacity: b.o }} />
              ) : null,
            )}
            {lift > 0.01 ? (
              <div style={{ position: "absolute", left: 0, right: 0, top: 3, bottom: 3, background: `color-mix(in srgb, ${INK} 6%, transparent)`, opacity: lift }} />
            ) : null}
            {r.cells.map((v, j) => {
              const mk = marks.find((q) => q.row === i && q.col === j);
              const w = mk ? ease(frame, mk.at, 12) * (mk.out === undefined ? 1 : 1 - ease(frame, mk.out, 10)) : 0;
              const text = landed && r.after?.[j] !== undefined ? r.after[j] : v;
              // A value that changes as its row lands fades across.
              const swap = r.after?.[j] !== undefined && moveAt !== undefined ? pulse(frame, moveAt + i * 3 + 10, 10) : 0;
              return (
                <div
                  key={j}
                  style={{
                    ...cellBox(j),
                    top: 0,
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: cols[j].numeric ? "flex-end" : "flex-start",
                    fontFamily: MONO,
                    fontSize: CELL_SIZE,
                    color: cols[j].ink ?? INK,
                    opacity: colOp(j) * (1 - swap * 0.8),
                  }}
                >
                  <span style={{ position: "relative", display: "inline-block" }}>
                    {w > 0 ? (
                      <span
                        style={{
                          position: "absolute",
                          inset: "-0.06em -0.3em",
                          background: mk!.color ?? HIGHLIGHT,
                          borderRadius: 4,
                          clipPath: `inset(0 ${(1 - Math.min(1, w)) * 100}% 0 0)`,
                          opacity: Math.min(1, w),
                        }}
                      />
                    ) : null}
                    <span style={{ position: "relative" }}>{text}</span>
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/** Where a cell of a MovingTable sits, for a line drawn to it: its center. */
export const cellCenter = (x: number, top: number, widths: readonly number[], headH: number, rowH: number, slot: number, col: number): Pt => {
  const left = widths.slice(0, col).reduce((a, b) => a + b, 0);
  return [x + left + widths[col] / 2, top + headH + slot * rowH + rowH / 2];
};

// ── SQL ──────────────────────────────────────────────────────────────────────

export const LISTING_PAPER = `color-mix(in srgb, ${ds("yellow", 200)} 34%, ${PAPER})`;
const TOKEN_INK = {
  keyword: ds("purple", 700),
  string: ds("green", 800),
  number: ds("orange", 700),
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set(["SELECT", "FROM", "WHERE", "JOIN", "ON", "AS", "INSERT", "INTO", "VALUES"]);
const TABLES = new Set(["orders", "customers"]);

type Token = { text: string; color: string; weight?: number };

/** A small SQL tokenizer: enough for the few statements on screen. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, str, num, word] = m;
    if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && TABLES.has(word)) out.push({ text, color: TOKEN_INK.name, weight: 600 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

export const Code: React.FC<{ line: string; size?: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

export const listingHeight = (lines: number, size: number) => Math.round(size * 0.72) * 2 + lines * Math.round(size * 1.8);

/**
 * A printed SQL listing: tinted paper between a rule above and a hairline
 * below, each line inking in on its own cue. `marks` lay a highlighter
 * stroke along a line.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  lineAt: readonly number[];
  marks?: readonly { line: number; at: number; out?: number; color?: string }[];
  out?: number;
  dim?: number;
}> = ({ lines, x, top, width, size = 22, at, lineAt, marks = [], out, dim }) => {
  const frame = useCurrentFrame();
  const lineH = Math.round(size * 1.8);
  const padY = Math.round(size * 0.72);
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: listingHeight(lines.length, size), opacity: (1 - o) * (1 - d) }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: LISTING_PAPER,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      />
      {marks.map((m, i) => {
        const w = ease(frame, m.at, 12);
        const mo = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || mo >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: size * 0.6,
              top: padY + m.line * lineH + lineH * 0.12,
              height: lineH * 0.76,
              width: `${(lines[m.line].length * 0.6 + 0.7) * w}em`,
              fontSize: size,
              background: m.color ?? HIGHLIGHT,
              opacity: 1 - mo,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <Ink
          key={i}
          at={lineAt[i]}
          dur={14}
          style={{ left: size * 0.95, top: padY + i * lineH, height: lineH, display: "flex", alignItems: "center" }}
        >
          <Code line={line} size={size} />
        </Ink>
      ))}
    </div>
  );
};

/** An error as psql prints it: the ERROR line, then its DETAIL. */
export const ErrorBox: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  detailAt?: number;
  message: string;
  detail: string;
  out?: number;
  dim?: number;
}> = ({ x, top, width, at, detailAt, message, detail, out, dim }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.5;
  return (
    <Ink at={at} dur={16} out={out} style={{ left: x, top, width, opacity: 1 - d }}>
      <div
        style={{
          borderLeft: `4px solid ${ACCENT}`,
          background: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`,
          padding: "14px 22px 16px",
          fontFamily: MONO,
          fontSize: 20,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          color: INK,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div>
          <span style={{ color: ACCENT_INK, fontWeight: 700 }}>ERROR:</span> {message}
        </div>
        <div style={{ color: INK_SOFT, opacity: detailAt === undefined ? 1 : ease(frame, detailAt, 12) }}>
          <span style={{ fontWeight: 600 }}>DETAIL:</span> {detail}
        </div>
      </div>
    </Ink>
  );
};

// ── The family tree ──────────────────────────────────────────────────────────

export type CardLine = { at: number; children: React.ReactNode };

/**
 * A system in the family tree: a hairline card with its name set large and
 * a few lines under it, each inking in on its own cue. The frame arrives on
 * `at`, the name on `titleAt`.
 */
export const Card: React.FC<{
  x: number;
  top: number;
  width: number;
  height: number;
  at: number;
  title: React.ReactNode;
  titleAt?: number;
  lines?: readonly CardLine[];
  out?: number;
  dim?: number;
  swell?: number;
  accent?: boolean;
  titleSize?: number;
}> = ({ x, top, width, height, at, title, titleAt, lines = [], out, dim, swell = 0, accent = false, titleSize = 44 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 16));
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height,
        boxSizing: "border-box",
        border: `2px solid ${accent ? ACCENT : INK}`,
        borderRadius: 10,
        background: BOX_FILL,
        opacity: p * (1 - o) * (1 - d),
        transform: `translateY(${(1 - p) * 16}px) scale(${1 + swell * 0.04})`,
      }}
    >
      <Ink at={titleAt ?? at + 4} dur={18} style={{ left: 26, top: 18, whiteSpace: "nowrap" }}>
        <div style={{ ...headline(titleSize), color: INK }}>{title}</div>
      </Ink>
      {lines.map((l, i) => (
        <Ink key={i} at={l.at} dur={14} style={{ left: 28, top: 30 + titleSize * 1.15 + i * 36, whiteSpace: "nowrap" }}>
          <div style={{ ...note(21, INK_SOFT) }}>{l.children}</div>
        </Ink>
      ))}
    </div>
  );
};

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.94em", fontWeight: weight ?? 600, color }}>{children}</span>
);

/** A small label in Inter, for the tree and the charts. */
export const Tag: React.FC<{
  x: number;
  y: number;
  at: number;
  out?: number;
  dim?: number;
  align?: "left" | "center" | "right";
  size?: number;
  color?: string;
  weight?: number;
  children: React.ReactNode;
}> = ({ x, y, at, out, dim, align = "left", size = 21, color = INK_SOFT, weight = 500, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const shift = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${shift}, ${(1 - p) * 8}px)`,
        opacity: p * (1 - o) * (1 - d),
        whiteSpace: "nowrap",
        fontFamily: SANS,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.3,
      }}
    >
      {children}
    </div>
  );
};
