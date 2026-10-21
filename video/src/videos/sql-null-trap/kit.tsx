import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ACCENT_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import type { Truth } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a SQL listing set
 * the way a magazine prints one (after list-vs-set's Python listing), a
 * printed result table, and the three truth values, each with a lamp in the
 * color the site gives its meaning: green works, red fails, amber is "look
 * here", which is what an unknown asks of the reader.
 */

export const TRUTH = {
  true: { word: "true", lamp: ds("green", 500), ink: inkOf.green },
  false: { word: "false", lamp: ds("red", 500), ink: ACCENT_INK },
  unknown: {
    word: "unknown",
    lamp: ds("yellow", 500),
    ink: inkOf.yellow,
  },
} as const;
export const truthKey = (v: Truth) => (v === null ? "unknown" : v ? "true" : "false");
export const UNKNOWN_INK = TRUTH.unknown.ink;
/** A wash behind whatever is unknown: the amber lamp, thinned. */
export const UNKNOWN_WASH = `color-mix(in srgb, ${ds("yellow", 400)} 55%, transparent)`;

/** The listing's grey card, and the token inks from `inkOf` (theme/brand.ts). */
export const LISTING_PAPER = ds("gray", 50);
const TOKEN_INK = {
  keyword: inkOf.purple,
  number: inkOf.teal,
  string: inkOf.green,
  punct: INK_SOFT,
  op: INK,
  name: INK,
} as const;
const KEYWORDS = new Set(["SELECT", "FROM", "WHERE", "NOT", "IN", "EXISTS", "IS", "AND", "OR", "AS"]);

type Token = { text: string; color: string; weight?: number };

/** A small SQL tokenizer: enough for a few printed lines. NULL takes the
 *  unknown's ink, so the value the video is about reads the same in the code
 *  as in the tables and the figures. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/('(?:[^']|'')*')|(\d+)|([A-Za-z_]\w*)|(<>|<=|>=|!=|=)|(\s+)|(.)/g)) {
    const [text, str, num, word, op] = m;
    if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word === "NULL") out.push({ text, color: UNKNOWN_INK, weight: 700 });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else if (op) out.push({ text, color: TOKEN_INK.op, weight: 600 });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of SQL, colored. */
export const Code: React.FC<{
  line: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ line, size, style }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: size,
      whiteSpace: "pre",
      fontVariantLigatures: "none",
      ...style,
    }}
  >
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

/** A highlighter stroke behind part of one listing line, wiped in from the
 *  left: `start` and `chars` count characters, so it spans the code. */
export type LineMark = {
  line: number;
  at: number;
  out?: number;
  color?: string;
  start?: number;
  chars?: number;
};

export type ListingGeometry = {
  size: number;
  lineH: number;
  padY: number;
  gutter: number;
};
export const listingGeometry = (size: number): ListingGeometry => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});

/** A listing's height in px. */
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/**
 * A printed code listing. `top` is already a page y (through `y()`); the lines
 * inside flow at a fixed pitch, so callers can line things up against them
 * with `listingGeometry` and `lineTop`.
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
  out?: number;
}> = ({ lines, x, top, width, size = 32, at, lineAt, marks = [], out }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || gone >= 1) return null;
  const height = listingHeight(lines.length, size);
  const codeX = g.gutter + size * 0.42;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height,
        opacity: 1 - gone,
      }}
    >
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
              background: m.color ?? HIGHLIGHT,
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
              fontSize: Math.max(20, size * 0.68),
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
export const lineTop = (top: number, i: number, size = 32) => {
  const g = listingGeometry(size);
  return top + g.padY + i * g.lineH;
};

/** "Fig. 2" and a title that may hold code: the shared FigLabel, widened. */
export const Fig: React.FC<{
  n: string;
  at: number;
  x: number;
  y: number;
  out?: number;
  children: React.ReactNode;
}> = ({ n, at, x, y, out, children }) => (
  <Ink
    at={at}
    out={out}
    style={{
      left: x,
      top: y,
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "baseline",
      gap: 12,
    }}
  >
    <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>Fig. {n}</span>
    <span style={{ ...label(24, INK), fontWeight: 560 }}>{children}</span>
  </Ink>
);

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{
  children: React.ReactNode;
  color?: string;
  weight?: number;
}> = ({ children, color, weight = 500 }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: "0.94em",
      fontWeight: weight,
      color,
      fontVariantLigatures: "none",
    }}
  >
    {children}
  </span>
);

/** A truth value: its lamp, then its word, sized in em so it sits in any line. */
export const TruthWord: React.FC<{
  value: Truth;
  size?: number;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ value, size = 24, weight = 650, style }) => {
  const t = TRUTH[truthKey(value)];
  return (
    <span
      style={{
        ...label(size, t.ink),
        fontWeight: weight,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.38em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span
        style={{
          width: "0.62em",
          height: "0.62em",
          borderRadius: "50%",
          background: t.lamp,
          flex: "none",
        }}
      />
      {t.word}
    </span>
  );
};

/** A value in a result table, as Postgres returned it. NULL is set apart in
 *  the unknown's ink, the way a client marks it. */
export const SqlValue: React.FC<{ value: string | number | null }> = ({ value }) =>
  value === null ? (
    <span style={{ color: UNKNOWN_INK, fontWeight: 700 }}>NULL</span>
  ) : (
    <span style={{ color: INK }}>{value}</span>
  );

export type Column = {
  title: React.ReactNode;
  width: number;
  align?: "left" | "right";
};
/** A wash behind a row (no `col`) or one cell, or a ring around a cell. */
export type CellMark = {
  row: number;
  col?: number;
  at: number;
  out?: number;
  color?: string;
  ring?: boolean;
};

export type TableGeometry = { rowH: number; headH: number };
export const tableGeometry = (size: number): TableGeometry => ({
  rowH: Math.round(size * 1.78),
  headH: Math.round(size * 1.6),
});
/** The top of body row `i` of a table whose top rule is at `top`. */
export const rowTop = (top: number, i: number, size: number) => {
  const g = tableGeometry(size);
  return top + g.headH + i * g.rowH;
};

/**
 * A printed table the way a book sets one: a heavy rule above the header, a
 * hairline under it and at the foot, and no other lines. Body cells are
 * whatever the caller passes (code values, truth words). `footer` is printed
 * under the foot rule, the way psql prints "(2 rows)".
 */
export const Table: React.FC<{
  x: number;
  /** The top rule, a page y. */
  top: number;
  cols: readonly Column[];
  rows: readonly (readonly React.ReactNode[])[];
  size?: number;
  at: number;
  /** When each row inks in; defaults to just after the header. */
  rowAt?: readonly number[];
  /** When one cell inks in, overriding `rowAt` for it. */
  cellAt?: (row: number, col: number) => number | undefined;
  marks?: readonly CellMark[];
  footer?: { text: React.ReactNode; at: number; color?: string };
  /** A name over the table, set in code, at a page y of its own. */
  title?: { text: string; top: number };
  out?: number;
}> = ({ x, top, cols, rows, size = 28, at, rowAt, cellAt, marks = [], footer, title, out }) => {
  const frame = useCurrentFrame();
  const g = tableGeometry(size);
  const p = ease(frame, at, 16);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || gone >= 1) return null;
  const width = cols.reduce((s, c) => s + c.width, 0);
  const lefts = cols.map((_, i) => cols.slice(0, i).reduce((s, c) => s + c.width, 0));
  const bodyH = rows.length * g.rowH;
  const pad = 14;
  const cell = (i: number, align: Column["align"]): React.CSSProperties => ({
    left: x + lefts[i] + pad,
    width: cols[i].width - pad * 2,
    display: "flex",
    alignItems: "center",
    justifyContent: align === "right" ? "flex-end" : "flex-start",
  });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - gone }}>
      {title ? (
        <Ink at={at} dur={14} style={{ left: x + pad, top: title.top }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 24,
              fontWeight: 600,
              color: INK,
            }}
          >
            {title.text}
          </span>
        </Ink>
      ) : null}
      {marks.map((m, i) => {
        const w = ease(frame, m.at, 12);
        const o = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || o >= 1) return null;
        const left = m.col === undefined ? x : x + lefts[m.col];
        const wFull = m.col === undefined ? width : cols[m.col].width;
        const t = rowTop(top, m.row, size);
        return m.ring ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + 4,
              top: t + 4,
              width: wFull - 8,
              height: g.rowH - 8,
              border: `3px solid ${m.color ?? UNKNOWN_INK}`,
              borderRadius: 6,
              opacity: w * (1 - o),
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
              height: g.rowH - 6,
              background: m.color ?? HIGHLIGHT,
              opacity: 1 - o,
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
          height: g.headH + bodyH,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: g.headH - 1,
            height: 1,
            background: HAIRLINE,
          }}
        />
      </div>
      {cols.map((c, i) => (
        <Ink key={i} at={at + 4} dur={12} style={{ ...cell(i, c.align), top: top + 2, height: g.headH - 2 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: Math.max(20, Math.round(size * 0.78)),
              fontWeight: 500,
              color: INK_SOFT,
              whiteSpace: "nowrap",
              fontVariantLigatures: "none",
            }}
          >
            {c.title}
          </span>
        </Ink>
      ))}
      {rows.map((r, ri) =>
        r.map((v, ci) => (
          <Ink
            key={`${ri}-${ci}`}
            at={cellAt?.(ri, ci) ?? rowAt?.[ri] ?? at + 8 + ri * 3}
            dur={12}
            style={{
              ...cell(ci, cols[ci].align),
              top: rowTop(top, ri, size),
              height: g.rowH,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: size,
                whiteSpace: "nowrap",
                fontVariantLigatures: "none",
              }}
            >
              {v}
            </span>
          </Ink>
        )),
      )}
      {footer ? (
        <Ink at={footer.at} dur={14} style={{ left: x + pad, top: top + g.headH + bodyH + 10 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: Math.max(20, Math.round(size * 0.82)),
              color: footer.color ?? INK_SOFT,
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
export const Underline: React.FC<{
  at: number;
  color: string;
  children: React.ReactNode;
}> = ({ at, color, children }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ position: "relative" }}>
      {children}
      <svg
        viewBox="0 0 400 30"
        style={{
          position: "absolute",
          left: -4,
          top: "0.96em",
          width: "calc(100% + 8px)",
          height: "auto",
          overflow: "visible",
        }}
      >
        <path
          d="M4,16 C90,8 220,6 394,13"
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${ease(frame, at, 14)} 1`}
          opacity={frame >= at ? 1 : 0}
        />
      </svg>
    </span>
  );
};
