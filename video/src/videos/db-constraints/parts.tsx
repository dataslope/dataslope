import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import type { EntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  HAIRLINE,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  PAPER,
  headline,
  label,
} from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { type Cell, ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit. From Unit 1's
 * parts (Kicker, Mark, Strike, Spot, Arrow) and WhyNormalization's kit (the
 * data table, Postgres's error box), copied rather than imported so neither
 * video's edits reach the other; and two of its own, built on the ERD kit
 * (editorial/erd.tsx): a constraint's tag beside an entity's row, and a mark
 * on a row's type.
 *
 * Color roles: keys in the data blue, as the ERD kit draws them; a refused
 * value, a struck row and the error in the red accent; what the narration
 * reads in the page's yellow; a rule that holds in the green ink.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
/** The schema card's top, on the left. */
export const CARD_Y = 330;
/** The data table's left edge and top, on the right. */
export const TABLE_X = 1000;
export const TABLE_Y = 330;
/** Table heights before `h()`. */
export const HEAD_H = 52;
export const ROW_H = 60;

export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
export const MARK_KEY = `color-mix(in srgb, ${BAR} 18%, transparent)`;
export const OK_INK = "var(--ds-green-ink)";
export const KEYWORD_INK = ds("purple", 700);
export const STRING_INK = ds("green", 800);
export const NUMBER_INK = ds("orange", 700);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Constraint tags: JetBrains Mono at 20px, 10px apart. */
const TAG_SIZE = 20;
const TAG_GAP = 10;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for something named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * A headline in two inks: the lead in roman, then the turn in italic in the
 * accent ink, each arriving on its own cue and leaving on `out`.
 */
export const Head: React.FC<{
  lead: string;
  at: number;
  turn?: string;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ lead, at, turn, turnAt, out, size = 76, top = HEAD_Y }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn && turnAt !== undefined ? (
        <Ink
          at={turnAt}
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

/** A highlighter stroke under the words it wraps, swept on `at`. */
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

/** A line struck through the words it wraps, drawn left to right on `at`. */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = ACCENT, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 1 }}>
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
          transform: "rotate(-2.5deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/** A straight arrow drawn from `from` to `to`, its head from arrowHead(). */
export const Arrow: React.FC<{
  from: readonly [number, number];
  to: readonly [number, number];
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
}> = ({ from, to, at, dur = 16, out, dim, color = INK, width = 2.4 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.7;
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(16, len * 0.6);
  return (
    <Svg opacity={(1 - o) * (1 - d)}>
      <line x1={from[0]} y1={from[1]} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path
        d={arrowHead([from, tip], headLen, headLen * 0.6)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/** A tick that draws itself: a rule that held. */
export const Tick: React.FC<{ x: number; y: number; at: number; size?: number; color?: string; out?: number }> = ({
  x,
  y,
  at,
  size = 22,
  color = OK_INK,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const s = size;
  return (
    <Svg opacity={1 - o}>
      <path
        d={`M${x},${y + s * 0.05} L${x + s * 0.36},${y + s * 0.4} L${x + s},${y - s * 0.42}`}
        fill="none"
        stroke={color}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </Svg>
  );
};

/** A watercolor spot: pops in on `at`, bobs gently, fades on `out`. */
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

// ── SQL, colored ─────────────────────────────────────────────────────────────

const KEYWORDS = new Set(["CHECK", "NOT", "NULL", "DEFAULT", "UNIQUE", "IN", "PRIMARY", "KEY", "REFERENCES"]);
type Token = { text: string; color: string; weight?: number };
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, str, num, word] = m;
    if (str) out.push({ text, color: STRING_INK });
    else if (num) out.push({ text, color: NUMBER_INK });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: KEYWORD_INK, weight: 700 });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  return out;
};

/** A fragment of SQL, colored, at the size of the text around it. */
export const Code: React.FC<{ children: string; size?: number }> = ({ children, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(children).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 500 }}>
        {t.text}
      </span>
    ))}
  </span>
);

/** Code set inside running text or a label. */
export const Mono: React.FC<{ children: string; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.94em", fontWeight: weight ?? 600, color }}>{children}</span>
);

/**
 * A rule written out as a small pill of SQL, on its own: what one writer has
 * to remember. It inks in on `at`, swells on `pulses`, and is struck through
 * on `strikeAt`.
 */
export const Pill: React.FC<{
  x: number;
  y: number;
  at: number;
  children: string;
  pulses?: readonly number[];
  strikeAt?: number;
  out?: number;
  dim?: number;
}> = ({ x, y, at, children, pulses = [], strikeAt, out, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const swell = Math.max(0, ...pulses.map((t) => pulse(frame, t, 22)));
  const pill = (
    <div
      style={{
        padding: "5px 12px 6px",
        borderRadius: 8,
        border: `1.5px solid ${HAIRLINE}`,
        background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(swell * 100)}%, ${PAPER})`,
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      <Code size={TAG_SIZE}>{children}</Code>
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${(1 - p) * -10}px, -50%) scale(${1 + swell * 0.08})`,
        transformOrigin: "0 50%",
        opacity: p * (1 - o) * (1 - d),
      }}
    >
      {pill}
      {strikeAt !== undefined && frame >= strikeAt ? (
        <div
          style={{
            position: "absolute",
            left: -6,
            top: "50%",
            width: `calc((100% + 12px) * ${ease(frame, strikeAt, 12)})`,
            height: 3,
            borderRadius: 2,
            background: ACCENT,
            transform: "rotate(-4deg)",
            transformOrigin: "0 50%",
          }}
        />
      ) : null}
    </div>
  );
};

// ── Constraints, on the ERD kit's entity ────────────────────────────────────

export type Chip = {
  /** The constraint, as SQL: "NOT NULL", "CHECK (price >= 0)". */
  code: string;
  at: number;
  /** Swell again on these frames (the narration names it once more). */
  pulses?: readonly number[];
  out?: number;
};


/**
 * A constraint's tags beside an entity's row: small pills of SQL that ink in
 * on their cues, one after another to the right of the box, level with the
 * row they guard. With `span`, the tags sit at the middle of two rows, and a
 * bracket from the box's edge joins them: a rule over two columns.
 */
export const RuleTags: React.FC<{
  layout: EntityLayout;
  row: string;
  span?: string;
  chips: readonly Chip[];
  dim?: number;
  out?: number;
}> = ({ layout, row, span, chips, dim, out }) => {
  const frame = useCurrentFrame();
  const i0 = layout.columns.findIndex((c) => c.name === row);
  const i1 = span ? layout.columns.findIndex((c) => c.name === span) : i0;
  if (i0 < 0 || i1 < 0) throw new Error(`No row ${row}${span ? ` or ${span}` : ""} in ${layout.name}`);
  const mid = (layout.rows[i0].mid + layout.rows[i1].mid) / 2;
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  const dimmed = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const first = Math.min(...chips.map((c) => c.at));
  if (frame < first || gone >= 1) return null;
  const bracket = span !== undefined;
  const bx = layout.right + 8;
  const bp = ease(frame, first, 12);
  return (
    <div style={{ opacity: (1 - gone) * (1 - dimmed) }}>
      {bracket ? (
        <Svg>
          <path
            d={`M${bx},${layout.rows[i0].mid} H${bx + 12} V${layout.rows[i1].mid} H${bx}`}
            fill="none"
            stroke={INK_SOFT}
            strokeWidth={2}
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${bp} 1`}
          />
        </Svg>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: layout.right + (bracket ? 30 : 14),
          top: mid,
          transform: "translateY(-50%)",
          display: "flex",
          gap: TAG_GAP,
          alignItems: "center",
        }}
      >
        {chips.map((c, k) => {
          const p = ease(frame, c.at, 12);
          const o = c.out === undefined ? 0 : ease(frame, c.out, 10);
          if (p <= 0 || o >= 1) return null;
          const swell = Math.max(0, ...(c.pulses ?? []).map((t) => pulse(frame, t, 22)));
          return (
            <div
              key={k}
              style={{
                position: "relative",
                opacity: p * (1 - o),
                transform: `translateX(${(1 - p) * -10}px) scale(${1 + swell * 0.08})`,
                transformOrigin: "0 50%",
                padding: "5px 12px 6px",
                borderRadius: 8,
                border: `1.5px solid ${HAIRLINE}`,
                background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(swell * 100)}%, ${PAPER})`,
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              <Code size={TAG_SIZE}>{c.code}</Code>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * A highlighter laid over an entity row's type (`integer`, `numeric`), the
 * column's first rule. Multiplied over the box, so the type stays legible.
 */
export const TypeMark: React.FC<{ layout: EntityLayout; row: string; at: number; out?: number; color?: string }> = ({
  layout,
  row,
  at,
  out,
  color = HIGHLIGHT,
}) => {
  const frame = useCurrentFrame();
  const i = layout.columns.findIndex((c) => c.name === row);
  const type = layout.columns[i]?.type;
  if (!type) throw new Error(`No typed row ${row} in ${layout.name}`);
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  // The type is set flush right in JetBrains Mono at 19px, 0.6em a glyph,
  // inside the box's 18px padding and 2px border.
  const w = type.length * 19 * 0.6 + 14;
  const right = layout.right - 2 - 18 + 7;
  return (
    <div
      style={{
        position: "absolute",
        left: right - w,
        top: layout.rows[i].mid - 15,
        width: w * p,
        height: 30,
        borderRadius: 5,
        background: color,
        mixBlendMode: "multiply",
        opacity: 1 - o,
      }}
    />
  );
};

// ── The data table (after WhyNormalization's kit) ────────────────────────────

export const HEAD_SIZE = 22;
export const BODY_SIZE = 26;
const PAD = 20;
const ADVANCE = 0.6;
const shown = (v: Cell) => (v === null ? "null" : v);

export type TableGeometry = {
  x: number;
  top: number;
  widths: number[];
  xs: number[];
  width: number;
  headH: number;
  rowH: number;
  rowTop: (i: number) => number;
  rowMid: (i: number) => number;
};

/** Where a table's columns and rows fall: each column as wide as its title
 *  or its longest value, in the monospace advance, plus padding. */
export const tableGeometry = ({
  x,
  top,
  cols,
  rows,
  headH,
  rowH,
}: {
  x: number;
  top: number;
  cols: readonly string[];
  rows: readonly (readonly Cell[])[];
  headH: number;
  rowH: number;
}): TableGeometry => {
  const widths = cols.map((c, i) =>
    Math.ceil(
      Math.max(c.length * ADVANCE * HEAD_SIZE, ...rows.map((r) => shown(r[i] ?? "").length * ADVANCE * BODY_SIZE)) + 2 * PAD,
    ),
  );
  const xs = widths.map((_, i) => x + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const width = widths.reduce((a, b) => a + b, 0);
  const rowTop = (i: number) => top + headH + i * rowH;
  return { x, top, widths, xs, width, headH, rowH, rowTop, rowMid: (i) => rowTop(i) + rowH / 2 };
};

export type TableRow = {
  cells: readonly Cell[];
  at: number;
  /** A row Postgres refused: drawn inside a dashed outline. */
  ghost?: boolean;
  /** The dashed outline arrives later, on this frame: a stored row that a
   *  stricter rule would have refused. */
  ghostAt?: number;
  /** The row opens up as it inks in. */
  grow?: boolean;
  strikeAt?: number;
  dimAt?: number;
  /** The row fades and closes up (only ever the last rows). */
  collapseAt?: number;
};
export type CellMark = { row: number; col: number; at: number; out?: number; color?: string };
export type RowBand = { row: number; at: number; out?: number; color?: string };
export type CellSwap = { row: number; col: number; at: number; value: string; color?: string };

const wipe = (p: number): React.CSSProperties => {
  if (p >= 1) return {};
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, ${INK} ${edge - 18}%, transparent ${edge + 4}%)`;
  return { WebkitMaskImage: mask, maskImage: mask, filter: `blur(${(1 - p) * 1.4}px)` };
};

const CellText: React.FC<{ value: Cell; color: string; marks: readonly CellMark[]; swap?: CellSwap }> = ({
  value,
  color,
  marks,
  swap,
}) => {
  const frame = useCurrentFrame();
  const swapped = swap !== undefined && frame >= swap.at;
  const text = swapped ? swap.value : shown(value);
  const fade = swap !== undefined && !swapped ? 1 - ease(frame, swap.at - 6, 6) : 1;
  // The latest mark that has started wins.
  const live = marks.filter((m) => frame >= m.at).sort((a, b) => a.at - b.at);
  const mark = live[live.length - 1];
  const w = mark ? ease(frame, mark.at, 12) : 0;
  const gone = mark?.out === undefined ? 0 : ease(frame, mark.out, 10);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {mark && w > 0 && gone < 1 ? (
        <span
          style={{
            position: "absolute",
            inset: "0.02em -0.28em",
            background: mark.color ?? MARK,
            clipPath: `inset(0 ${(1 - w) * 100}% 0 0)`,
            opacity: 1 - gone,
          }}
        />
      ) : null}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          padding: "0.12em 0.1em",
          margin: "-0.12em -0.1em",
          color: swapped ? (swap?.color ?? color) : color,
          opacity: fade,
          ...(swapped ? wipe(ease(frame, swap.at, 14)) : {}),
        }}
      >
        {text}
      </span>
    </span>
  );
};

/**
 * A database table as a SQL client prints it, drawn as real rows and cells:
 * a rule above, the column titles, a hairline, the rows, a rule below.
 */
export const DbTable: React.FC<{
  g: TableGeometry;
  cols: readonly string[];
  rows: readonly TableRow[];
  at: number;
  numeric?: readonly number[];
  colInk?: Readonly<Record<number, string>>;
  marks?: readonly CellMark[];
  bands?: readonly RowBand[];
  swaps?: readonly CellSwap[];
  dim?: number;
  out?: number;
}> = ({ g, cols, rows, at, numeric = [], colInk = {}, marks = [], bands = [], swaps = [], dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const gone = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || gone >= 1) return null;
  const dimmed = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;

  const heights = rows.map(
    (r) =>
      g.rowH *
      (r.grow ? ease(frame, r.at - 4, 12) : 1) *
      (r.collapseAt === undefined ? 1 : 1 - ease(frame, r.collapseAt + 4, 12)),
  );
  // A row marked `grow` opens as it arrives, pushing the bottom rule down.
  const tops = heights.map((_, i) => g.top + g.headH + heights.slice(0, i).reduce((a, b) => a + b, 0));
  const bottom = g.top + g.headH + heights.reduce((a, b) => a + b, 0);
  const align = (j: number) => (numeric.includes(j) ? "right" : "left");
  const cellBox = (j: number): React.CSSProperties => ({
    width: g.widths[j],
    flex: "none",
    padding: `0 ${PAD}px`,
    boxSizing: "border-box",
    textAlign: align(j),
    whiteSpace: "pre",
  });

  return (
    <div style={{ opacity: (1 - gone) * (1 - dimmed) }}>
      <div style={{ position: "absolute", left: g.x, top: g.top, width: g.width * p, height: 2, background: INK }} />
      <div
        style={{ position: "absolute", left: g.x, top: g.top + g.headH - 1, width: g.width * p, height: 1, background: HAIRLINE }}
      />
      <div style={{ position: "absolute", left: g.x, top: bottom - 1, width: g.width * p, height: 1.5, background: INK }} />
      <Ink
        at={at + 2}
        dur={14}
        style={{ left: g.x, top: g.top, width: g.width, height: g.headH, display: "flex", alignItems: "center" }}
      >
        {cols.map((c, j) => (
          <div key={c} style={{ ...cellBox(j), fontFamily: MONO, fontSize: HEAD_SIZE, fontWeight: 600, color: INK_SOFT }}>
            {c}
          </div>
        ))}
      </Ink>

      {rows.map((r, i) => {
        const hgt = heights[i];
        if (hgt < 0.5) return null;
        const top = tops[i];
        const collapse = r.collapseAt === undefined ? 0 : ease(frame, r.collapseAt, 6);
        const dim = r.dimAt === undefined ? 0 : ease(frame, r.dimAt, 12) * 0.5;
        const strike = r.strikeAt === undefined ? 0 : ease(frame, r.strikeAt, 12);
        const shownAt = ease(frame, r.at - 2, 10);
        return (
          <React.Fragment key={i}>
            {bands
              .filter((b) => b.row === i)
              .map((b, k) => {
                const w = ease(frame, b.at, 14);
                const o = b.out === undefined ? 0 : ease(frame, b.out, 10);
                if (w <= 0 || o >= 1) return null;
                return (
                  <div
                    key={k}
                    style={{
                      position: "absolute",
                      left: g.x,
                      top: top + 4,
                      width: g.width * w,
                      height: Math.max(0, hgt - 8),
                      background: b.color ?? MARK,
                      opacity: (1 - o) * (1 - collapse),
                    }}
                  />
                );
              })}
            {i > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: g.x,
                  top,
                  width: g.width,
                  height: 1,
                  background: `color-mix(in srgb, ${INK} 16%, transparent)`,
                  opacity: shownAt * (1 - collapse),
                }}
              />
            ) : null}
            {r.ghost || r.ghostAt !== undefined ? (
              <div
                style={{
                  position: "absolute",
                  left: g.x + 2,
                  top: top + 5,
                  width: g.width - 4,
                  height: Math.max(0, hgt - 10),
                  boxSizing: "border-box",
                  border: `2px dashed ${ACCENT}`,
                  opacity:
                    (r.ghostAt === undefined ? shownAt : ease(frame, r.ghostAt, 10)) * (1 - dim) * (1 - collapse),
                }}
              />
            ) : null}
            <Ink
              at={r.at}
              dur={14}
              style={{
                left: g.x,
                top,
                width: g.width,
                height: hgt,
                display: "flex",
                alignItems: "center",
                fontFamily: MONO,
                fontSize: BODY_SIZE,
                opacity: (1 - collapse) * (1 - dim),
              }}
            >
              {r.cells.map((v, j) => (
                <div key={j} style={cellBox(j)}>
                  <CellText
                    value={v}
                    color={v === null ? ACCENT_INK : (colInk[j] ?? INK)}
                    marks={marks.filter((m) => m.row === i && m.col === j)}
                    swap={swaps.find((s) => s.row === i && s.col === j)}
                  />
                </div>
              ))}
            </Ink>
            {strike > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: g.x + PAD / 2,
                  top: top + hgt / 2 - 1.5,
                  width: (g.width - PAD) * strike,
                  height: 3,
                  borderRadius: 2,
                  background: ACCENT,
                  opacity: (1 - collapse) * (1 - dim),
                }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Postgres's answer ────────────────────────────────────────────────────────

/**
 * An error as psql prints it: the ERROR line, then its DETAIL if there is
 * one. `name` (the constraint the message names) is swept with the
 * highlighter on `nameAt`, as the narration says which rule broke.
 */
export const ErrorBox: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  message: string;
  detail?: string | null;
  name?: string | null;
  nameAt?: number;
  detailAt?: number;
  dim?: number;
  out?: number;
}> = ({ x, top, width, at, message, detail, name, nameAt, detailAt, dim, out }) => {
  const frame = useCurrentFrame();
  const dimmed = dim === undefined ? 0 : ease(frame, dim, 14) * 0.5;
  const quoted = name ? `"${name}"` : null;
  const k = quoted ? message.indexOf(quoted) : -1;
  const msg =
    k >= 0 && nameAt !== undefined ? (
      <>
        {message.slice(0, k)}
        <Mark at={nameAt}>{quoted}</Mark>
        {message.slice(k + quoted!.length)}
      </>
    ) : (
      message
    );
  return (
    <Ink at={at} dur={16} out={out} style={{ left: x, top, width, opacity: 1 - dimmed }}>
      <div
        style={{
          borderLeft: `4px solid ${ACCENT}`,
          background: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`,
          padding: "14px 22px 16px",
          fontFamily: MONO,
          fontSize: 21,
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          color: INK,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div>
          <span style={{ color: ACCENT_INK, fontWeight: 700 }}>ERROR:</span>
          {"  "}
          {msg}
        </div>
        {detail ? (
          <div style={{ color: INK_SOFT, opacity: detailAt === undefined ? 1 : ease(frame, detailAt, 12) }}>
            <span style={{ fontWeight: 600 }}>DETAIL:</span>
            {"  "}
            {detail}
          </div>
        ) : null}
      </div>
    </Ink>
  );
};

/** "UPDATE 1", "INSERT 0 1": a command tag, as psql answers a write. */
export const Tag: React.FC<{ x: number; top: number; at: number; children: string; color?: string; out?: number }> = ({
  x,
  top,
  at,
  children,
  color = OK_INK,
  out,
}) => (
  <Ink at={at} dur={12} out={out} style={{ left: x, top, whiteSpace: "nowrap" }}>
    <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color }}>{children}</span>
  </Ink>
);

