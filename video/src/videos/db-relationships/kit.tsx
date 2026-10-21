import React from "react";
import { useCurrentFrame } from "remotion";
import { arrowHead, type Cubic, cubicPath, lineLength, sampleCubic } from "../../components/arrow";
import { ease } from "../../components/motion";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { Ink, type Pt } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import type { Cell } from "./data";

/**
 * Data tables, a SQL listing and Postgres's error box, copied from
 * WhyNormalization's kit.tsx (src/videos/why-normalization/) and trimmed to
 * what this video draws. Tables take their type size as a parameter, so the
 * shop's five-column result fits beside its diagram.
 */

// ── Colors: inkOf (theme/brand.ts) and the editorial palette only ────────────

export const MARK = HIGHLIGHT;
export const KEY = BAR;
export const KEY_INK = BLUE_INK;
export const MARK_KEY = `color-mix(in srgb, ${BAR} 18%, transparent)`;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 24%, transparent)`;

export const LISTING_PAPER = ds("gray", 50);
const TOKEN_INK = {
  keyword: inkOf.purple,
  string: inkOf.green,
  number: inkOf.orange,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set(["INSERT", "INTO", "VALUES", "FROM", "JOIN", "ON"]);
const TABLES = new Set(["badges", "customers", "orders", "order_items", "products"]);

type Token = { text: string; color: string; weight?: number };

const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/('(?:[^']|'')*')|(\d+)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
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

const Code: React.FC<{ line: string; size?: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

// ── The printed listing ──────────────────────────────────────────────────────

const listingGeometry = (size: number) => ({
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
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  lineAt: readonly number[];
  mark?: { at: number; out?: number };
}> = ({ lines, x, top, width, size = 26, at, lineAt, mark }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const w = mark ? ease(frame, mark.at, 14) : 0;
  const wo = mark?.out === undefined ? 0 : ease(frame, mark.out, 10);
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
      {/* The whole statement, swept as the narration names it. */}
      {w > 0 && wo < 1 ? (
        <div
          style={{
            position: "absolute",
            left: g.gutter + size * 0.42,
            top: g.padY + g.lineH * 0.12,
            height: lines.length * g.lineH - g.lineH * 0.24,
            width: `${(Math.max(...lines.map((l) => l.length)) * 0.6 + 0.7) * w}em`,
            fontSize: size,
            background: MARK,
            opacity: 1 - wo,
          }}
        />
      ) : null}
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
              fontSize: Math.max(20, Math.round(size * 0.72)),
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

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.94em", fontWeight: weight ?? 600, color }}>{children}</span>
);

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

// ── The database table ───────────────────────────────────────────────────────

/** Room on each side of a cell's text, in px. */
const PAD = 20;
/** JetBrains Mono's advance, in em: every glyph is this wide. */
const ADVANCE = 0.6;

const shown = (v: Cell) => (v === null ? "null" : v);

export type TableSize = { head: number; body: number };
export const TABLE = { head: 22, body: 26 } as const;

export type TableGeometry = {
  x: number;
  top: number;
  widths: number[];
  xs: number[];
  width: number;
  headH: number;
  rowH: number;
  size: TableSize;
  rowTop: (i: number) => number;
  rowMid: (i: number) => number;
};

/**
 * Where a table's columns and rows fall. Each column is as wide as its title
 * or its longest value, in the monospace advance, plus padding. `top`,
 * `headH` and `rowH` are already page values (through `y()` and `h()`).
 */
export const tableGeometry = ({
  x,
  top,
  cols,
  rows,
  headH,
  rowH,
  size = TABLE,
}: {
  x: number;
  top: number;
  cols: readonly string[];
  rows: readonly (readonly Cell[])[];
  headH: number;
  rowH: number;
  size?: TableSize;
}): TableGeometry => {
  const widths = cols.map((c, i) =>
    Math.ceil(Math.max(c.length * ADVANCE * size.head, ...rows.map((r) => shown(r[i] ?? "").length * ADVANCE * size.body)) + 2 * PAD),
  );
  const xs = widths.map((_, i) => x + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const width = widths.reduce((a, b) => a + b, 0);
  const rowTop = (i: number) => top + headH + i * rowH;
  return { x, top, widths, xs, width, headH, rowH, size, rowTop, rowMid: (i) => rowTop(i) + rowH / 2 };
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
};
/** A highlighter stroke behind one cell's text. */
export type CellMark = { row: number; col: number; at: number; out?: number; color?: string };
/** A wash behind a whole row. */
export type RowBand = { row: number; at: number; out?: number; color?: string };

const CellText: React.FC<{ value: Cell; color: string; mark?: CellMark }> = ({ value, color, mark }) => {
  const frame = useCurrentFrame();
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
      <span style={{ position: "relative", display: "inline-block", padding: "0.12em 0.1em", margin: "-0.12em -0.1em", color }}>
        {shown(value)}
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
}> = ({ g, cols, rows, at, numeric = [], colInk = {}, marks = [], bands = [] }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;

  const heights = rows.map((r) => g.rowH * (r.grow ? ease(frame, r.at - 4, 12) : 1));
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
      <div style={{ position: "absolute", left: g.x, top: g.top, width: g.width * p, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: g.x, top: g.top + g.headH - 1, width: g.width * p, height: 1, background: HAIRLINE }} />
      <div style={{ position: "absolute", left: g.x, top: bottom - 1, width: g.width * p, height: 1.5, background: INK }} />
      <Ink at={at + 2} dur={14} style={{ left: g.x, top: g.top, width: g.width, height: g.headH, display: "flex", alignItems: "center" }}>
        {cols.map((c, j) => (
          <div key={c} style={{ ...cellBox(j), fontFamily: MONO, fontSize: g.size.head, fontWeight: 600, color: INK_SOFT }}>
            {c}
          </div>
        ))}
      </Ink>

      {rows.map((r, i) => {
        const hgt = heights[i];
        if (hgt < 0.5) return null;
        const top = tops[i];
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
                      opacity: 1 - o,
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
                  opacity: shownAt,
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
                fontSize: g.size.body,
                opacity: 1 - dim,
              }}
            >
              {r.cells.map((v, j) => (
                <div key={j} style={cellBox(j)}>
                  <CellText
                    value={v}
                    color={v === null ? ACCENT_INK : (colInk[j] ?? INK)}
                    mark={marks.find((m) => m.row === i && m.col === j)}
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
                }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ── Postgres's answer ────────────────────────────────────────────────────────

/** An error as psql prints it: the ERROR line, then its DETAIL. */
export const ErrorBox: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  message: string;
  detail: string;
  pulse?: number;
}> = ({ x, top, width, at, message, detail, pulse = 0 }) => (
  <Ink at={at} dur={16} style={{ left: x, top, width }}>
    <div
      style={{
        borderLeft: `${4 + pulse * 4}px solid ${ACCENT}`,
        background: `color-mix(in srgb, ${ACCENT} ${9 + Math.round(pulse * 8)}%, ${PAPER})`,
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

/**
 * A foreign key's pointer: a curve from a row of one table to the row of the
 * other that it names, drawn from its tail, with an arrowhead on arrival.
 * `swell` (0 to 1) thickens it while the narration points at it.
 */
export const KeyArrow: React.FC<{ from: Pt; to: Pt; at: number; out?: number; color?: string; opacity?: number; swell?: number }> = ({
  from,
  to,
  at,
  out,
  color = KEY,
  opacity = 1,
  swell = 0,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const [fx, fy] = from;
  const [tx, ty] = to;
  const bend = (tx - fx) * 0.5;
  const head = 13;
  const curve: Cubic = [from, [fx + bend, fy], [tx - Math.sign(tx - fx) * head - bend, ty], to];
  const line = sampleCubic(curve);
  const reach = (lineLength(line) - head + 1) / lineLength(line);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * opacity }}>
      <circle cx={fx} cy={fy} r={4 + swell * 2} fill={color} />
      <path
        d={cubicPath(curve)}
        fill="none"
        stroke={color}
        strokeWidth={2.5 + swell * 2}
        pathLength={1}
        strokeDasharray={`${p * reach} 1`}
      />
      <path d={arrowHead(line, head, 7, { filled: true })} fill={color} opacity={ease(frame, at + 12, 5)} />
    </svg>
  );
};
