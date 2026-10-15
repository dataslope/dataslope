import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ACCENT, ACCENT_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import type { Value } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit, adapted from the
 * SQL listing and printed table in sql-null-trap (which took the listing from
 * list-vs-set): a SQL listing that can open a gap for a new line, swap a line
 * and strike a word, and a result table whose rows can be struck, collapsed
 * or brought back, so one query's answer can turn into the next one's.
 */

/** NULL takes the amber "look here" ink everywhere: in the code, in the
 *  tables and in the notes. */
export const NULL_INK = "var(--ds-amber-ink)";
export const NULL_RING = NULL_INK;
/** What survives, and what was lost by mistake. */
export const KEPT_INK = "var(--ds-green-ink)";
export const KEPT_WASH = `color-mix(in srgb, ${ds("green", 200)} 60%, transparent)`;
export const LOST = ACCENT;
export const LOST_INK = ACCENT_INK;
export const LOST_WASH = `color-mix(in srgb, ${ds("red", 200)} 55%, transparent)`;

/** The listing's tinted paper and the token inks: brand ink steps only. */
export const LISTING_PAPER = `color-mix(in srgb, ${ds("yellow", 200)} 34%, ${PAPER})`;
const TOKEN_INK = {
  keyword: ds("purple", 700),
  number: ds("teal", 700),
  string: ds("green", 800),
  punct: INK_SOFT,
  op: INK,
  name: INK,
} as const;
const KEYWORDS = new Set(["SELECT", "FROM", "LEFT", "JOIN", "ON", "AND", "WHERE", "ORDER", "BY", "AS", "IS"]);

type Token = { text: string; color: string; weight?: number };

/** A small SQL tokenizer: enough for a few printed lines. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/('(?:[^']|'')*')|(\d+)|([A-Za-z_]\w*)|(<>|<=|>=|!=|=|<|>)|(\s+)|(.)/g)) {
    const [text, str, num, word, op] = m;
    if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word === "NULL") out.push({ text, color: NULL_INK, weight: 700 });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else if (op) out.push({ text, color: TOKEN_INK.op, weight: 600 });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of SQL, colored. */
export const Code: React.FC<{ line: string; size?: number; style?: React.CSSProperties }> = ({
  line,
  size,
  style,
}) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none", ...style }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

/** A highlighter stroke behind part of one or more listing lines, wiped in
 *  from the left: `start` and `chars` count characters, so it spans the code. */
export type LineMark = {
  line: number;
  /** How many lines it covers, from `line`. */
  lines?: number;
  at: number;
  out?: number;
  color?: string;
  start?: number;
  chars?: number;
};
/** A rule struck through part of one line, drawn from the left. */
export type LineStrike = { line: number; start: number; chars: number; at: number; out?: number; color?: string };
/** Line `line` is replaced by `text` at `at`: the old one lifts away, the new one inks in. */
export type LineSwap = { line: number; text: string; at: number };
/** Line `line` is new: the lines below start one line up and slide down to
 *  make room at `at`, and it inks in once the gap is open. */
export type LineInsert = { line: number; at: number };

export type ListingGeometry = { size: number; lineH: number; padY: number; gutter: number };
export const listingGeometry = (size: number): ListingGeometry => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});

/** How far an insert has opened, 0 to 1. */
export const insertOpen = (frame: number, insert: LineInsert | undefined) =>
  insert === undefined ? 1 : ease(frame, insert.at, 14);

/** A listing's height in px at this frame, counting a half-open insert. */
export const listingHeight = (lines: number, size: number, open = 1) => {
  const g = listingGeometry(size);
  return g.padY * 2 + (lines - (1 - open)) * g.lineH;
};

/**
 * A printed code listing. `top` is already a page y (through `y()`); the lines
 * inside flow at a fixed pitch, so callers can line things up against them
 * with `listingGeometry` and `listingHeight`.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  /** When the panel itself appears. */
  at: number;
  /** When each line inks in (index-aligned with `lines`). */
  lineAt: readonly number[];
  marks?: readonly LineMark[];
  strikes?: readonly LineStrike[];
  swaps?: readonly LineSwap[];
  insert?: LineInsert;
}> = ({ lines, x, top, width, size = 28, at, lineAt, marks = [], strikes = [], swaps = [], insert }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const open = insertOpen(frame, insert);
  const lineY = (i: number) => g.padY + (insert && i > insert.line ? i - (1 - open) : i) * g.lineH;
  const codeX = g.gutter + size * 0.42;
  const textX = codeX + size * 0.35;
  /** Character offsets are in em of the code's own size: JetBrains Mono
   *  advances 0.6em a character. */
  const em = (chars: number) => `${chars * 0.6}em`;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: listingHeight(lines.length, size, open) }}>
      {/* The paper and its rules draw in first; the code inks onto them. */}
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
        const start = m.start ?? 0;
        const chars = m.chars ?? lines[m.line].length - start;
        const span = m.lines ?? 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: textX - size * 0.3,
              top: lineY(m.line) + g.lineH * 0.12,
              height: g.lineH * (span - 0.24),
              fontSize: size,
              marginLeft: em(start),
              width: `calc(${em(chars)} * ${w} + ${0.6 * w}em)`,
              background: m.color ?? HIGHLIGHT,
              opacity: 1 - o,
            }}
          />
        );
      })}
      {lines.map((line, i) => {
        const swap = swaps.find((s) => s.line === i);
        const gone = swap ? ease(frame, swap.at, 10) : 0;
        const inserted = insert?.line === i;
        if (inserted && open <= 0) return null;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: 0,
                width: g.gutter - size * 0.5,
                top: lineY(i),
                height: g.lineH,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                fontFamily: MONO,
                fontSize: Math.max(20, size * 0.72),
                color: INK_SOFT,
                opacity: ease(frame, lineAt[i] - 4, 10),
              }}
            >
              {/* A line below a half-open insert keeps its old number until the gap is mostly open. */}
              {insert && i > insert.line && open < 0.5 ? i : i + 1}
            </div>
            {gone < 1 ? (
              <Ink
                at={lineAt[i]}
                dur={14}
                style={{
                  left: textX,
                  top: lineY(i),
                  height: g.lineH,
                  display: "flex",
                  alignItems: "center",
                  opacity: 1 - gone,
                  transform: gone > 0 ? `translateY(${-gone * 12}px)` : undefined,
                }}
              >
                <Code line={line} size={size} />
              </Ink>
            ) : null}
            {swap ? (
              <Ink
                at={swap.at + 6}
                dur={14}
                style={{ left: textX, top: lineY(i), height: g.lineH, display: "flex", alignItems: "center" }}
              >
                <Code line={swap.text} size={size} />
              </Ink>
            ) : null}
          </React.Fragment>
        );
      })}
      {strikes.map((s, i) => {
        const w = ease(frame, s.at, 10);
        const o = s.out === undefined ? 0 : ease(frame, s.out, 10);
        if (w <= 0 || o >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: textX - size * 0.12,
              top: lineY(s.line) + g.lineH / 2 - 2,
              height: 4,
              borderRadius: 2,
              fontSize: size,
              marginLeft: em(s.start),
              width: `calc((${em(s.chars)} + 0.24em) * ${w})`,
              background: s.color ?? LOST,
              opacity: 1 - o,
            }}
          />
        );
      })}
    </div>
  );
};

/** "Fig. 2" and a title that may hold code: the shared FigLabel, widened. */
export const Fig: React.FC<{ n: string; at: number; x: number; y: number; children: React.ReactNode }> = ({
  n,
  at,
  x,
  y,
  children,
}) => (
  <Ink at={at} style={{ left: x, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 12 }}>
    <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>Fig. {n}</span>
    <span style={{ ...label(24, INK), fontWeight: 560 }}>{children}</span>
  </Ink>
);

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({
  children,
  color,
  weight = 400,
}) => (
  <span
    style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: weight, fontStyle: "normal", color, fontVariantLigatures: "none" }}
  >
    {children}
  </span>
);

/** A value in a result table, as Postgres returned it. NULL is set apart in
 *  its own ink, the way a client marks it; booleans print as words. */
export const SqlValue: React.FC<{ value: Value }> = ({ value }) =>
  value === null ? (
    <span style={{ color: NULL_INK, fontWeight: 700 }}>NULL</span>
  ) : typeof value === "boolean" ? (
    <span style={{ color: value ? KEPT_INK : INK_SOFT, fontWeight: value ? 600 : 400 }}>{String(value)}</span>
  ) : (
    <span style={{ color: INK }}>{value}</span>
  );

export type Column = { title: React.ReactNode; width: number; align?: "left" | "right" };
/** A wash behind a row (no `col`) or one cell, or a ring around a cell. */
export type CellMark = { row: number; col?: number; at: number; out?: number; color?: string; ring?: boolean };
/** A rule struck through a whole row, after which the row dims to `dim`. */
export type RowStrike = { row: number; at: number; color?: string; weight?: number; dim?: number };

export type TableGeometry = { rowH: number; headH: number };
export const tableGeometry = (size: number): TableGeometry => ({
  rowH: Math.round(size * 1.78),
  headH: Math.round(size * 1.6),
});

/** Where each body row starts and where the foot rule sits, given each row's
 *  current height factor (1 shown, 0 collapsed). */
export const tableRows = (top: number, size: number, scales: readonly number[]) => {
  const g = tableGeometry(size);
  const tops: number[] = [];
  let y = top + g.headH;
  for (const s of scales) {
    tops.push(y);
    y += g.rowH * s;
  }
  return { tops, bottom: y };
};

/**
 * A printed table the way a book sets one: a heavy rule above the header, a
 * hairline under it and at the foot, and no other lines. `rowScale` and
 * `colScale` (0 to 1, this frame) let rows collapse or come back and a column
 * open or close, and the rules follow. `footer` is printed under the foot
 * rule, the way psql prints "(2 rows)".
 */
export const Table: React.FC<{
  x: number;
  /** The top rule, a page y. */
  top: number;
  cols: readonly Column[];
  rows: readonly (readonly Value[])[];
  size?: number;
  at: number;
  /** When each row inks in; defaults to just after the header. */
  rowAt?: readonly number[];
  /** When one cell inks in, overriding `rowAt` for it. */
  cellAt?: (row: number, col: number) => number | undefined;
  /** When each column's header inks in; defaults to with the table. */
  colAt?: readonly (number | undefined)[];
  rowScale?: readonly number[];
  colScale?: readonly number[];
  marks?: readonly CellMark[];
  strikes?: readonly RowStrike[];
  footer?: { text: React.ReactNode; at: number };
}> = ({
  x,
  top,
  cols,
  rows,
  size = 28,
  at,
  rowAt,
  cellAt,
  colAt,
  rowScale,
  colScale,
  marks = [],
  strikes = [],
  footer,
}) => {
  const frame = useCurrentFrame();
  const g = tableGeometry(size);
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const rs = rows.map((_, i) => rowScale?.[i] ?? 1);
  const cs = cols.map((_, i) => colScale?.[i] ?? 1);
  const widths = cols.map((c, i) => c.width * cs[i]);
  const width = widths.reduce((s, w) => s + w, 0);
  const lefts = widths.map((_, i) => widths.slice(0, i).reduce((s, w) => s + w, 0));
  const { tops, bottom } = tableRows(top, size, rs);
  const pad = 14;
  /** Type is gone before its row or column is half closed, so a closing row
   *  never prints over its neighbours. */
  const vis = (k: number) => Math.max(0, (k - 0.5) / 0.5);
  const cell = (i: number): React.CSSProperties => ({
    left: x + lefts[i] + pad,
    width: cols[i].width - pad * 2,
    display: "flex",
    alignItems: "center",
    justifyContent: cols[i].align === "right" ? "flex-end" : "flex-start",
  });
  const dimOf = (ri: number) => {
    const s = strikes.find((k) => k.row === ri);
    return s ? 1 - (1 - (s.dim ?? 0.35)) * ease(frame, s.at + 4, 12) : 1;
  };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {marks.map((m, i) => {
        const w = ease(frame, m.at, 12);
        const o = m.out === undefined ? 0 : ease(frame, m.out, 10);
        const s = rs[m.row] * (m.col === undefined ? 1 : cs[m.col]);
        if (w <= 0 || o >= 1 || s <= 0) return null;
        const left = m.col === undefined ? x : x + lefts[m.col];
        const wFull = m.col === undefined ? width : widths[m.col];
        const t = tops[m.row];
        const hRow = g.rowH * rs[m.row];
        return m.ring ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + 5,
              top: t + 5,
              width: wFull - 10,
              height: hRow - 10,
              border: `3px solid ${m.color ?? NULL_RING}`,
              borderRadius: 8,
              opacity: w * (1 - o) * s,
              transform: `scale(${1.12 - 0.12 * w})`,
            }}
          />
        ) : (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top: t + 3,
              width: wFull * w,
              height: Math.max(0, hRow - 6),
              background: m.color ?? HIGHLIGHT,
              opacity: (1 - o) * s,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: x,
          top,
          width,
          height: bottom - top,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: g.headH - 1, height: 1, background: HAIRLINE }} />
      </div>
      {cols.map((c, i) =>
        cs[i] > 0 ? (
          <Ink
            key={i}
            at={colAt?.[i] ?? at + 4}
            dur={12}
            style={{ ...cell(i), top: top + 2, height: g.headH - 2, opacity: vis(cs[i]) }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: Math.max(20, Math.round(size * 0.78)),
                color: INK_SOFT,
                whiteSpace: "nowrap",
                fontVariantLigatures: "none",
              }}
            >
              {c.title}
            </span>
          </Ink>
        ) : null,
      )}
      {rows.map((r, ri) =>
        rs[ri] > 0
          ? r.map((v, ci) =>
              cs[ci] > 0 ? (
                <Ink
                  key={`${ri}-${ci}`}
                  at={cellAt?.(ri, ci) ?? rowAt?.[ri] ?? at + 8 + ri * 3}
                  dur={12}
                  style={{
                    ...cell(ci),
                    top: tops[ri],
                    height: g.rowH * rs[ri],
                    opacity: vis(rs[ri]) * vis(cs[ci]) * dimOf(ri),
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "nowrap", fontVariantLigatures: "none" }}>
                    <SqlValue value={v} />
                  </span>
                </Ink>
              ) : null,
            )
          : null,
      )}
      {strikes.map((s, i) => {
        const w = ease(frame, s.at, 12);
        if (w <= 0 || rs[s.row] <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + 6,
              top: tops[s.row] + (g.rowH * rs[s.row]) / 2 - (s.weight ?? 3) / 2,
              width: (width - 12) * w,
              height: s.weight ?? 3,
              borderRadius: 2,
              background: s.color ?? LOST,
              opacity: vis(rs[s.row]),
            }}
          />
        );
      })}
      {footer ? (
        <Ink at={footer.at} dur={14} style={{ left: x + pad, top: bottom + 10 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: Math.max(20, Math.round(size * 0.8)),
              color: INK_SOFT,
              whiteSpace: "nowrap",
            }}
          >
            {footer.text}
          </span>
        </Ink>
      ) : null}
    </div>
  );
};

/** A hand-drawn underline sized in em to the words it sits under, so it
 *  follows them in any face. Drawn from the left at `at`. */
export const Underline: React.FC<{ at: number; color: string; children: React.ReactNode }> = ({
  at,
  color,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ position: "relative" }}>
      {children}
      <svg
        viewBox="0 0 400 30"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: -4,
          top: "0.98em",
          width: "calc(100% + 8px)",
          height: "0.3em",
          overflow: "visible",
        }}
      >
        <path
          d="M4,16 C90,8 220,6 394,13"
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray={`${ease(frame, at, 14)} 1`}
          opacity={frame >= at ? 1 : 0}
        />
      </svg>
    </span>
  );
};

/** A note set in Inter: soft ink, with any code in it in mono. */
export const noteText = (size = 24, color: string = INK_SOFT): React.CSSProperties => ({
  ...label(size, color),
  fontWeight: 450,
  lineHeight: 1.35,
  whiteSpace: "nowrap",
});

/** "(7 rows)", the way psql counts a result. */
export const rowCount = (n: number) => `(${n} row${n === 1 ? "" : "s"})`;

/** Figs. 2 to 4 share one layout, so each cut reads as an edit to the same
 *  query: the listing on the left, its result on the right. */
export const STAGE = {
  listX: 120,
  listW: 860,
  /** The listing's and the table's top rule, before `y()`. */
  top: 262,
  codeSize: 30,
  tableX: 1040,
  tableSize: 30,
} as const;
/** name, order_id and amount, then the WHERE test when it is shown. */
export const JOIN_WIDTHS = [170, 190, 170, 220] as const;
export const joinCols = (fields: readonly string[]): Column[] =>
  fields.map((f, i) => ({ title: f, width: JOIN_WIDTHS[i], align: i === 0 || i === 3 ? "left" : "right" }));
