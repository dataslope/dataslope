import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
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
  headline,
  label,
} from "../../editorial/style";
import { Ink, type Pt } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import type { Cell } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a SQL listing set
 * the way a magazine prints one (after list-vs-set's Python listing), a
 * database table drawn as real rows and cells, Postgres's error box, and the
 * foreign-key arrow.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

/** Left edge of every figure. */
export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
export const FIG_Y = 290;
/** Where a figure's first block (a listing, or a table) starts. */
export const BODY_Y = 346;
/** Where the flat table sits in Figs. 2 to 4, under the statement. */
export const TABLE_Y = 590;
/** The column to the right of the listing and the table: replies, errors
 *  and notes. The flat table ends at 951, its bracket just after. */
export const RIGHT_X = 1004;
/** Table heights before `h()`. */
export const HEAD_H = 52;
export const ROW_H = 62;

// ── Colors: brand ink steps and the editorial palette only ───────────────────

/** A cell marked for attention: the page's yellow, or a wash of the accent. */
export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
/** The foreign key and the key it points at share the data blue. */
export const KEY = BAR;
export const KEY_INK = BLUE_INK;
export const MARK_KEY = `color-mix(in srgb, ${BAR} 18%, transparent)`;

/** The listing's tinted paper and the SQL token inks. */
export const LISTING_PAPER = `color-mix(in srgb, ${ds("yellow", 200)} 34%, ${PAPER})`;
const TOKEN_INK = {
  keyword: ds("purple", 700),
  string: ds("green", 800),
  number: ds("orange", 700),
  comment: INK_SOFT,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "UPDATE",
  "SET",
  "INSERT",
  "INTO",
  "VALUES",
  "DELETE",
  "JOIN",
  "USING",
  "ORDER",
  "BY",
  "AS",
]);
const TABLES = new Set(["orders_flat", "orders", "customers"]);

type Token = { text: string; color: string; weight?: number };

/** A small SQL tokenizer: enough for a few printed statements. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(--.*$)|('(?:[^']|'')*')|(\d+)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: TOKEN_INK.comment });
    else if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && TABLES.has(word)) out.push({ text, color: TOKEN_INK.name, weight: 600 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of SQL, colored. */
export const Code: React.FC<{ line: string; size?: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

// ── The printed listing ──────────────────────────────────────────────────────

export type LineMark = { line: number; at: number; out?: number; color?: string };

export type ListingGeometry = { size: number; lineH: number; padY: number; gutter: number };
export const listingGeometry = (size: number): ListingGeometry => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});

/** The full height of a listing of `lines` lines. */
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/**
 * A printed SQL listing: tinted paper between a rule above and a hairline
 * below, line numbers in the soft ink. `top` is a page y (through `y()`).
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  lineAt: readonly number[];
  marks?: readonly LineMark[];
}> = ({ lines, x, top, width, size = 28, at, lineAt, marks = [] }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: listingHeight(lines.length, size) }}>
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
      <div
        style={{
          position: "absolute",
          left: g.gutter,
          top: g.padY - 6,
          bottom: g.padY - 6,
          width: 1,
          background: HAIRLINE,
          opacity: p,
        }}
      />
      {marks.map((m, i) => {
        const w = ease(frame, m.at, 12);
        const o = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || o >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.gutter + size * 0.42,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              // In em of the code's own size, so it spans the characters.
              width: `${(lines[m.line].length * 0.6 + 0.7) * w}em`,
              fontSize: size,
              background: m.color ?? MARK,
              opacity: 1 - o,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                width: g.gutter - size * 0.5,
                top: g.padY + i * g.lineH,
                height: g.lineH,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                fontFamily: MONO,
                fontSize: Math.max(20, Math.round(size * 0.72)),
                color: INK_SOFT,
                opacity: ease(frame, lineAt[i] - 4, 10),
              }}
            >
              {i + 1}
            </div>
          ) : null}
          <Ink
            at={lineAt[i]}
            dur={14}
            style={{
              left: g.gutter + size * 0.77,
              top: g.padY + i * g.lineH,
              height: g.lineH,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Code line={line} size={size} />
          </Ink>
        </React.Fragment>
      ))}
    </div>
  );
};

// ── Figure labels and inline code ────────────────────────────────────────────

/** "Fig. 2" and a title that may hold code: the shared FigLabel, widened. */
export const Fig: React.FC<{ n: string; at: number; x?: number; y: number; children: React.ReactNode }> = ({
  n,
  at,
  x = X0,
  y,
  children,
}) => (
  <Ink at={at} style={{ left: x, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 12 }}>
    <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>Fig. {n}</span>
    <span style={{ ...label(24, INK), fontWeight: 560 }}>{children}</span>
  </Ink>
);

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: string; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.94em", fontWeight: weight ?? 600, color }}>{children}</span>
);

// ── The headline ─────────────────────────────────────────────────────────────

/**
 * A kicker over a two-ink headline: the lead in roman, the turn in italic with
 * an accent underline that draws when the narration reaches it. The underline
 * is sized in em and to the words, so it fits them in any face.
 */
export const Headline: React.FC<{
  kicker: string;
  lead: string;
  turn: string;
  at: number;
  underlineAt: number;
  size?: number;
}> = ({ kicker, lead, turn, at, underlineAt, size = 84 }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  return (
    <>
      <Ink at={at} dur={14} style={{ left: X0 + 2, top: y(KICKER_Y) }}>
        <span style={label(22, ACCENT_INK)}>{kicker}</span>
      </Ink>
      <Ink
        at={at + 2}
        dur={22}
        style={{ left: X0 - 4, top: y(HEAD_Y), ...headline(size), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}
      >
        <span>{lead}</span>
        <span style={{ position: "relative", ...headline(size, true) }}>
          {turn}
          <svg
            viewBox="0 0 400 30"
            style={{
              position: "absolute",
              left: -4,
              top: "1.0em",
              width: "calc(100% + 8px)",
              height: "auto",
              overflow: "visible",
            }}
          >
            <path
              d="M4,16 C90,8 220,6 394,13"
              fill="none"
              stroke={ACCENT}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${ease(frame, underlineAt - 2, 14)} 1`}
              opacity={frame >= underlineAt - 2 ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>
    </>
  );
};

// ── The database table ───────────────────────────────────────────────────────

/** Column titles and values: JetBrains Mono, as a SQL client sets them. */
export const HEAD_SIZE = 22;
export const BODY_SIZE = 26;
/** Room on each side of a cell's text, in px. */
const PAD = 20;
/** JetBrains Mono's advance, in em: every glyph is this wide. */
const ADVANCE = 0.6;

const shown = (v: Cell) => (v === null ? "null" : v);

export type TableGeometry = {
  x: number;
  top: number;
  widths: number[];
  /** Left edge of each column. */
  xs: number[];
  width: number;
  headH: number;
  rowH: number;
  rowTop: (i: number) => number;
  rowMid: (i: number) => number;
  /** Where the bottom rule sits with `rows` full rows. */
  bottom: (rows: number) => number;
};

/**
 * Where a table's columns and rows fall. Each column is as wide as its title
 * or its longest value (counting `extra` values a cell will change to), in
 * the monospace advance, plus padding. `top`, `headH` and `rowH` are already
 * page values (through `y()` and `h()`).
 */
export const tableGeometry = ({
  x,
  top,
  cols,
  rows,
  extra = [],
  headH,
  rowH,
}: {
  x: number;
  top: number;
  cols: readonly string[];
  rows: readonly (readonly Cell[])[];
  extra?: readonly (readonly Cell[])[];
  headH: number;
  rowH: number;
}): TableGeometry => {
  const all = [...rows, ...extra];
  const widths = cols.map((c, i) =>
    Math.ceil(
      Math.max(c.length * ADVANCE * HEAD_SIZE, ...all.map((r) => shown(r[i] ?? "").length * ADVANCE * BODY_SIZE)) +
        2 * PAD,
    ),
  );
  const xs = widths.map((_, i) => x + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const width = widths.reduce((a, b) => a + b, 0);
  const rowTop = (i: number) => top + headH + i * rowH;
  return {
    x,
    top,
    widths,
    xs,
    width,
    headH,
    rowH,
    rowTop,
    rowMid: (i) => rowTop(i) + rowH / 2,
    bottom: (n) => rowTop(n),
  };
};

export type TableRow = {
  cells: readonly Cell[];
  /** When the row inks in. */
  at: number;
  /** A row Postgres refused: drawn inside a dashed outline. */
  ghost?: boolean;
  /** The row opens up as it inks in, pushing the bottom rule down. */
  grow?: boolean;
  strikeAt?: number;
  dimAt?: number;
  /** The row fades and closes up (only ever the last rows). */
  collapseAt?: number;
};
/** A highlighter stroke behind one cell's text. */
export type CellMark = { row: number; col: number; at: number; out?: number; color?: string };
/** A wash behind a whole row. */
export type RowBand = { row: number; at: number; out?: number; color?: string };
/** A cell whose value changes: the old one fades and the new one inks in. */
export type CellSwap = { row: number; col: number; at: number; value: string; color?: string };

/** A soft left-to-right wipe for inline text, the Ink reveal's mask. */
const wipe = (p: number): React.CSSProperties => {
  if (p >= 1) return {};
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, ${INK} ${edge - 18}%, transparent ${edge + 4}%)`;
  return { WebkitMaskImage: mask, maskImage: mask, filter: `blur(${(1 - p) * 1.4}px)` };
};

const CellText: React.FC<{
  value: Cell;
  color: string;
  mark?: CellMark;
  swap?: CellSwap;
}> = ({ value, color, mark, swap }) => {
  const frame = useCurrentFrame();
  const swapped = swap !== undefined && frame >= swap.at;
  const text = swapped ? swap.value : shown(value);
  const fade = swap !== undefined && !swapped ? 1 - ease(frame, swap.at - 6, 6) : 1;
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
          // Room for descenders under the wipe's mask.
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
  /** Columns of integers, set flush right. */
  numeric?: readonly number[];
  /** A column's values in their own ink (the keys, in the data blue). */
  colInk?: Readonly<Record<number, string>>;
  marks?: readonly CellMark[];
  bands?: readonly RowBand[];
  swaps?: readonly CellSwap[];
}> = ({ g, cols, rows, at, numeric = [], colInk = {}, marks = [], bands = [], swaps = [] }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;

  const heights = rows.map(
    (r) =>
      g.rowH *
      (r.grow ? ease(frame, r.at - 4, 12) : 1) *
      // The text fades first (below), then the row closes, so nothing spills
      // past the rule while it shrinks.
      (r.collapseAt === undefined ? 1 : 1 - ease(frame, r.collapseAt + 4, 12)),
  );
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
    <>
      {/* Rules: a full one above, a hairline under the titles, one below. */}
      <div style={{ position: "absolute", left: g.x, top: g.top, width: g.width * p, height: 2, background: INK }} />
      <div
        style={{
          position: "absolute",
          left: g.x,
          top: g.top + g.headH - 1,
          width: g.width * p,
          height: 1,
          background: HAIRLINE,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: g.x,
          top: bottom - 1,
          width: g.width * p,
          height: 1.5,
          background: INK,
        }}
      />
      <Ink
        at={at + 2}
        dur={14}
        style={{ left: g.x, top: g.top, width: g.width, height: g.headH, display: "flex", alignItems: "center" }}
      >
        {cols.map((c, j) => (
          <div
            key={c}
            style={{ ...cellBox(j), fontFamily: MONO, fontSize: HEAD_SIZE, fontWeight: 600, color: INK_SOFT }}
          >
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
            {r.ghost ? (
              <div
                style={{
                  position: "absolute",
                  left: g.x + 2,
                  top: top + 5,
                  width: g.width - 4,
                  height: Math.max(0, hgt - 10),
                  boxSizing: "border-box",
                  border: `2px dashed ${ACCENT}`,
                  opacity: shownAt * (1 - dim),
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
                    mark={marks.find((m) => m.row === i && m.col === j)}
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
                  opacity: 1 - collapse,
                }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ── Postgres's answers ───────────────────────────────────────────────────────

/** An error as psql prints it: the ERROR line, then its DETAIL. */
export const ErrorBox: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  message: string;
  detail: string;
}> = ({ x, top, width, at, message, detail }) => (
  <Ink at={at} dur={16} style={{ left: x, top, width }}>
    <div
      style={{
        borderLeft: `4px solid ${ACCENT}`,
        background: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`,
        padding: "16px 22px 18px",
        fontFamily: MONO,
        fontSize: 21,
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        color: INK,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div>
        <span style={{ color: ACCENT_INK, fontWeight: 700 }}>ERROR:</span>
        {"  "}
        {message}
      </div>
      <div style={{ color: INK_SOFT }}>
        <span style={{ fontWeight: 600 }}>DETAIL:</span>
        {"  "}
        {detail}
      </div>
    </div>
  </Ink>
);

// ── Marks drawn on the page ──────────────────────────────────────────────────

/** A square bracket on the right of some rows, opening toward them. */
export const Bracket: React.FC<{ x: number; y0: number; y1: number; at: number; color?: string }> = ({
  x,
  y0,
  y1,
  at,
  color = ACCENT,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path
        d={`M${x},${y0} H${x + 12} V${y1} H${x}`}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </svg>
  );
};

/**
 * A foreign key's pointer: a curve from a row of one table to the row of the
 * other that it names, drawn from its tail, with an arrowhead on arrival.
 */
export const KeyArrow: React.FC<{ from: Pt; to: Pt; at: number; out?: number; color?: string }> = ({
  from,
  to,
  at,
  out,
  color = KEY,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const [fx, fy] = from;
  const [tx, ty] = to;
  const bend = (tx - fx) * 0.5;
  const head = 13;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <circle cx={fx} cy={fy} r={4} fill={color} />
      <path
        d={`M${fx},${fy} C${fx + bend},${fy} ${tx - head - bend},${ty} ${tx - head + 1},${ty}`}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
      <path
        d={`M${tx},${ty} L${tx - head},${ty - 7} L${tx - head},${ty + 7} Z`}
        fill={color}
        opacity={ease(frame, at + 12, 5)}
      />
    </svg>
  );
};
