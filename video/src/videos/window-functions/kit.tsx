import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BLUE_INK,
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
import type { Region } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a SQL listing set
 * the way a magazine prints one (after list-vs-set's Python listing), a result
 * table set the way a book prints one, the page geometry every figure shares,
 * and the two-line headline with its strike and underline.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD1_Y = 148;
export const HEAD2_Y = 236;
export const HEAD_SIZE = 84;
export const FIG_Y = 345;
/** Where the listing and the table both start. */
export const BODY_Y = 400;
export const LIST_SIZE = 26;
export const LIST_W = 760;
export const TABLE_X = 940;
export const TABLE_SIZE = 28;
/** Table heights before `h()`. */
export const HEAD_H = 46;
export const ROW_H = 52;
/** Column widths, shared so a column sits in the same place in every figure. */
export const COL_W: Record<string, number> = {
  region: 150,
  day: 200,
  amount: 130,
  total: 130,
  region_total: 210,
  pct: 110,
  running_total: 210,
};
/** Numbers are right-aligned, the way psql prints them. */
export const NUMERIC = new Set(["amount", "total", "region_total", "pct", "running_total"]);

// ── Colors: brand ramps and the editorial palette only ───────────────────────

/** North and South keep one ink each through every figure: blue, and orange
 *  (never the page's red accent, which marks what the narration points at). */
export const REGION_COLOR: Record<Region, string> = { North: ds("blue", 500), South: ds("orange", 500) };
export const REGION_INK: Record<Region, string> = { North: BLUE_INK, South: "var(--ds-orange-ink)" };
export const REGION_WASH: Record<Region, string> = {
  North: `color-mix(in srgb, ${ds("blue", 500)} 11%, transparent)`,
  South: `color-mix(in srgb, ${ds("orange", 500)} 13%, transparent)`,
};
export const MARK = HIGHLIGHT;

/** The listing's tinted paper and the SQL token inks. */
export const LISTING_PAPER = `color-mix(in srgb, ${ds("yellow", 200)} 34%, ${PAPER})`;
const TOKEN_INK = {
  keyword: ds("purple", 700),
  fn: ds("teal", 700),
  number: ds("orange", 700),
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set(["SELECT", "FROM", "GROUP", "ORDER", "BY", "PARTITION", "OVER", "AS"]);
const FUNCTIONS = new Set(["SUM", "ROUND"]);
/** The columns a query makes, set a little heavier than the ones it reads. */
const ALIASES = new Set(["total", "region_total", "pct", "running_total"]);

type Token = { text: string; color: string; weight?: number };

/** A small SQL tokenizer: enough for a few printed statements. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(\d+)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, num, word] = m;
    if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && FUNCTIONS.has(word)) out.push({ text, color: TOKEN_INK.fn, weight: 600 });
    else if (word && ALIASES.has(word)) out.push({ text, color: TOKEN_INK.name, weight: 650 });
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

/** A highlighter stroke behind part of one line: `start` and `chars` count
 *  characters, so it spans the code in any size. */
export type LineMark = { line: number; at: number; out?: number; color?: string; start?: number; chars?: number };

export type ListingGeometry = { size: number; lineH: number; padY: number; gutter: number };
export const listingGeometry = (size: number): ListingGeometry => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/**
 * A printed SQL listing: tinted paper between a rule above and a hairline
 * below, line numbers in the soft ink. `top` is a page y (through `y()`).
 * A line whose `lineAt` has not come yet is simply not printed, so a query
 * can grow line by line inside a panel already sized for all of it.
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
  out?: number;
}> = ({ lines, x, top, width, size = LIST_SIZE, at, lineAt, marks = [], out }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || gone >= 1) return null;
  const codeX = g.gutter + size * 0.42;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height: listingHeight(lines.length, size),
        opacity: 1 - gone,
      }}
    >
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
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: codeX,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              // In em of the code's own size, so it spans the characters.
              fontSize: size,
              marginLeft: `${start * 0.6}em`,
              width: `${(chars * 0.6 + 0.7) * w}em`,
              background: m.color ?? MARK,
              opacity: 1 - o,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <React.Fragment key={i}>
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
              fontSize: Math.max(20, Math.round(size * 0.76)),
              color: INK_SOFT,
              opacity: ease(frame, lineAt[i] - 4, 10),
            }}
          >
            {i + 1}
          </div>
          <Ink
            at={lineAt[i]}
            dur={14}
            style={{
              left: codeX + size * 0.35,
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

/** The top of line `i` of a listing whose panel starts at `top`. */
export const lineTop = (top: number, i: number, size = LIST_SIZE) => {
  const g = listingGeometry(size);
  return top + g.padY + i * g.lineH;
};

// ── Figure labels, inline code, and the headline ─────────────────────────────

/** "Fig. 2" and a title that may hold code: the shared FigLabel, widened. */
export const Fig: React.FC<{ n: string; at: number; y: number; x?: number; out?: number; children: React.ReactNode }> = ({
  n,
  at,
  y,
  x = X0,
  out,
  children,
}) => (
  <Ink at={at} out={out} style={{ left: x, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 12 }}>
    <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>Fig. {n}</span>
    <span style={{ ...label(24, INK), fontWeight: 560 }}>{children}</span>
  </Ink>
);

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({
  children,
  color,
  weight = 500,
}) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: weight, color, fontVariantLigatures: "none" }}>
    {children}
  </span>
);

/** A red stroke through (`strike`) or under (`under`) the words it wraps,
 *  drawn in from the left. Its box is the words' own (an inline-block one line
 *  high), and every offset is in em, so it follows them in any face. */
export const Stroke: React.FC<{ kind: "strike" | "under"; at: number; children: React.ReactNode }> = ({
  kind,
  at,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.05em",
          right: "-0.05em",
          top: kind === "strike" ? "0.6em" : "0.98em",
          height: "0.06em",
          borderRadius: "0.03em",
          background: ACCENT,
          transformOrigin: "0 50%",
          transform: `rotate(${kind === "strike" ? -1.2 : -0.6}deg) scaleX(${p})`,
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/**
 * The kicker and a two-line headline, the second line italic in the accent
 * ink. `mark` draws a strike or an underline through the second line.
 */
export const Headline: React.FC<{
  kicker: string;
  line1: string;
  line2: string;
  at: number;
  line2At?: number;
  mark?: { kind: "strike" | "under"; at: number };
}> = ({ kicker, line1, line2, at, line2At = at + 8, mark }) => {
  const { y } = useLayout();
  return (
    <>
      <Ink at={at - 2} dur={14} style={{ left: X0 + 4, top: y(KICKER_Y) }}>
        <span style={label(21, ACCENT_INK)}>{kicker}</span>
      </Ink>
      <Ink at={at} dur={20} style={{ left: X0, top: y(HEAD1_Y), ...headline(HEAD_SIZE), whiteSpace: "nowrap" }}>
        {line1}
      </Ink>
      <Ink
        at={line2At}
        dur={20}
        style={{ left: X0, top: y(HEAD2_Y), ...headline(HEAD_SIZE, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        {mark ? (
          <Stroke kind={mark.kind} at={mark.at}>
            {line2}
          </Stroke>
        ) : (
          line2
        )}
      </Ink>
    </>
  );
};

// ── The printed result table ─────────────────────────────────────────────────

export type TableGeometry = {
  x: number;
  top: number;
  headH: number;
  rowH: number;
  cols: readonly string[];
  /** Left edge of each column. */
  colX: readonly number[];
  width: number;
  /** Top of body row `i` (fractional rows allowed, for rows in motion). */
  rowTop: (i: number) => number;
};

/** Geometry of a table with these columns, its top rule at page y `top`. */
export const useTable = (cols: readonly string[], top: number, x = TABLE_X): TableGeometry => {
  const { h } = useLayout();
  const headH = h(HEAD_H);
  const rowH = h(ROW_H);
  const colX = cols.map((_, i) => x + cols.slice(0, i).reduce((s, c) => s + COL_W[c], 0));
  const width = cols.reduce((s, c) => s + COL_W[c], 0);
  return { x, top, headH, rowH, cols, colX, width, rowTop: (i) => top + headH + i * rowH };
};

const CELL_PAD = 14;

/** Where a cell's content goes: the column, inset, aligned the psql way. */
export const cellBox = (
  g: TableGeometry,
  col: number,
  top: number,
  height: number,
  x = g.colX[col],
): React.CSSProperties => ({
  left: x + CELL_PAD,
  width: COL_W[g.cols[col]] - CELL_PAD * 2,
  top,
  height,
  display: "flex",
  alignItems: "center",
  justifyContent: NUMERIC.has(g.cols[col]) ? "flex-end" : "flex-start",
});

/** A heavy rule above the header, a hairline under it and one at the foot.
 *  `rows` may be fractional while the body grows or shrinks. */
export const Rules: React.FC<{ g: TableGeometry; rows: number; at: number; width?: number }> = ({
  g,
  rows,
  at,
  width = g.width,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: g.x,
        top: g.top,
        width,
        height: g.headH + rows * g.rowH,
        clipPath: `inset(-2px ${(1 - p) * 100}% -2px 0)`,
        borderTop: `2px solid ${INK}`,
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, top: g.headH - 2, height: 1, background: HAIRLINE }} />
    </div>
  );
};

/** A column name, as the client prints it over the column. */
export const HeadText: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = INK_SOFT }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: Math.round(TABLE_SIZE * 0.8),
      fontWeight: 500,
      color,
      whiteSpace: "nowrap",
      fontVariantLigatures: "none",
    }}
  >
    {children}
  </span>
);

/** A value, as Postgres printed it. Region names take their region's ink. */
export const CellText: React.FC<{ col: string; value: string; weight?: number; color?: string }> = ({
  col,
  value,
  weight,
  color,
}) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: TABLE_SIZE,
      whiteSpace: "nowrap",
      fontVariantLigatures: "none",
      fontVariantNumeric: "tabular-nums",
      fontWeight: weight ?? (col === "region" ? 600 : 400),
      color: color ?? (col === "region" ? REGION_INK[value as Region] : INK),
    }}
  >
    {value}
  </span>
);

/** "(6 rows)", the way psql closes a result. */
export const RowCount: React.FC<{ n: number }> = ({ n }) => (
  <span style={{ fontFamily: MONO, fontSize: 22, color: INK_SOFT, whiteSpace: "nowrap" }}>
    ({n} rows)
  </span>
);

/** A wash over a block of cells: whole rows, or one column of them. */
export const Wash: React.FC<{
  g: TableGeometry;
  from: number;
  to: number;
  col?: number;
  cols?: number;
  color: string;
  at: number;
  out?: number;
  dur?: number;
  /** For a whole-row wash: how far it reaches, when the table is still
   *  growing new columns (defaults to the full table). */
  rowWidth?: number;
}> = ({ g, from, to, col, cols = 1, color, at, out, dur = 12, rowWidth = g.width }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const left = col === undefined ? g.x : g.colX[col];
  const width =
    col === undefined ? rowWidth : g.cols.slice(col, col + cols).reduce((s, c) => s + COL_W[c], 0);
  const top = g.rowTop(from) + 3;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: width * p,
        height: g.rowTop(to + 1) - top - 3,
        background: color,
        opacity: 1 - o,
      }}
    />
  );
};

/** A thin ring around a block of cells, drawn in as it scales down onto them. */
export const Ring: React.FC<{
  g: TableGeometry;
  from: number;
  to: number;
  col: number;
  at: number;
  out?: number;
  color?: string;
}> = ({ g, from, to, col, at, out, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: g.colX[col] + 4,
        top: g.rowTop(from) + 4,
        width: COL_W[g.cols[col]] - 8,
        height: g.rowTop(to + 1) - g.rowTop(from) - 8,
        border: `3px solid ${color}`,
        borderRadius: 8,
        opacity: p * (1 - o),
        transform: `scale(${1.1 - 0.1 * p})`,
      }}
    />
  );
};

/** A partition marker: a short bar in the region's color beside its rows. */
export const PartitionBar: React.FC<{ g: TableGeometry; from: number; to: number; region: Region; at: number }> = ({
  g,
  from,
  to,
  region,
  at,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const top = g.rowTop(from) + 8;
  const full = g.rowTop(to + 1) - 8 - top;
  return (
    <div
      style={{
        position: "absolute",
        left: g.x - 20,
        top,
        width: 5,
        height: full * p,
        borderRadius: 3,
        background: REGION_COLOR[region],
      }}
    />
  );
};
