import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Cubic, cubicPath, lineLength, roundedPolyline, sampleCubic } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
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
  note,
} from "../../editorial/style";
import { Ink, type Pt } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx), after Part 1's (da-sql) parts.tsx: a Python
 * listing set the way a magazine prints one, a DataFrame or Series drawn as
 * real rows and cells with its index (columns that can open, rows that grow,
 * strike and collapse), pandas' error box, a console for what a block prints,
 * the arrow a match draws from one row to another, and the highlighter and
 * strike.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
export const FIG_Y = 290;
export const BODY_Y = 346;
/** The page's right margin. */
export const RIGHT = 1824;

// ── Colors: inkOf (theme/brand.ts) and the editorial palette only ────────────

export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
/** A key and the key it points at share the data blue. */
export const KEY = BAR;
export const KEY_INK = BLUE_INK;
export const MARK_KEY = `color-mix(in srgb, ${BAR} 20%, transparent)`;
export const OK = ds("green", 600);
export const OK_INK = inkOf.green;
/** A line or cell marked right: the answer that works. */
export const MARK_OK = `color-mix(in srgb, ${OK} 24%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/**
 * A slow push on a finished figure: the whole scene eases a few percent
 * larger over its life, from `from` to `to`, around `origin`.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  scale?: number;
  origin?: string;
  children: React.ReactNode;
}> = ({ from, to, scale = 0.025, origin = "50% 45%", children }) => {
  const frame = useCurrentFrame();
  const t = Math.min(1, Math.max(0, (frame - from) / Math.max(1, to - from)));
  const s = 1 + scale * (0.5 - 0.5 * Math.cos(Math.PI * t));
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>
  );
};

// ── Headings ─────────────────────────────────────────────────────────────────

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * A headline in two inks on one line: the lead in roman on `at`, the turn in
 * italic accent ink on `turnAt`, each following the other in the flow.
 */
export const Headline: React.FC<{
  lead: string;
  turn?: string;
  at: number;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ lead, turn, at, turnAt, out, size = 76, top = HEAD_Y }) => {
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

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.88em", fontStyle: "normal", fontWeight: weight ?? 600, color, fontVariantLigatures: "none" }}>
    {children}
  </span>
);

/**
 * A highlighter stroke laid under the words it wraps, swept left to right on
 * `at` and lifted on `out`: the phrase the narrator is reading, made visible.
 */
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
export const Strike: React.FC<{ at: number; color?: string; top?: string; children: React.ReactNode }> = ({
  at,
  color = ACCENT,
  top = "0.55em",
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top,
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

/** A small rounded tag ("PK", "FK", "UNIQUE", "parent"), in its own ink. */
export const Tag: React.FC<{ children: React.ReactNode; color?: string; size?: number; mono?: boolean }> = ({
  children,
  color = KEY_INK,
  size = 19,
  mono = false,
}) => (
  <span
    style={{
      display: "inline-block",
      padding: "1px 9px 2px",
      borderRadius: 999,
      border: `1.5px solid ${color}`,
      color,
      fontFamily: mono ? MONO : undefined,
      ...(mono ? { fontSize: size, fontWeight: 600 } : label(size, color)),
      lineHeight: 1.25,
      whiteSpace: "nowrap",
      background: PAPER,
    }}
  >
    {children}
  </span>
);

// ── Python ───────────────────────────────────────────────────────────────────

export const LISTING_PAPER = ds("gray", 50);
const TOKEN_INK = {
  keyword: inkOf.purple,
  string: inkOf.green,
  number: inkOf.orange,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set(
  "import from as def return lambda if else elif for in and or not is True False None global with".split(" "),
);
/** The frames and Series the video names, set a little heavier, as a SQL
 *  listing sets its tables. */
const TABLES = new Set([
  "df",
  "north",
  "mask",
  "orders",
  "jan",
  "feb",
  "customers",
  "stock",
  "prices",
  "price",
  "wide",
  "long",
  "big",
  "buf",
]);

type Token = { text: string; color: string; weight?: number };

/** A small Python tokenizer: enough for a few printed lines. */
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d[\d_]*(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: TOKEN_INK.punct });
    else if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && TABLES.has(word)) out.push({ text, color: TOKEN_INK.name, weight: 600 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of Python, colored. */
export const Code: React.FC<{ line: string; size?: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

const listingGeometry = (size: number) => ({
  lineH: Math.round(size * 1.8),
  padY: Math.round(size * 0.66),
  padX: Math.round(size * 0.8),
});

/** The full height of a listing of `lines` lines. */
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/**
 * A printed Python listing: tinted paper between a rule above and a hairline
 * below. Each line inks in on its own cue; `dim` sets the listing back.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  lineAt?: readonly number[];
  marks?: readonly { line: number; at: number; out?: number; color?: string }[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 26, at, lineAt, marks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height: listingHeight(lines.length, size),
        opacity: (1 - d) * (1 - o),
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
      {marks.map((m, i) => {
        const w = ease(frame, m.at, 12);
        const mo = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || mo >= 1) return null;
        // The band starts at the code, not at the indent before it: a mono
        // character is 0.6em, so leading spaces shift it right by that much.
        const indent = lines[m.line].length - lines[m.line].trimStart().length;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.padX - size * 0.2 + indent * 0.6 * size,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              width: `${((lines[m.line].length - indent) * 0.6 + 0.4) * w}em`,
              fontSize: size,
              background: m.color ?? MARK,
              opacity: 1 - mo,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <Ink
          key={i}
          at={lineAt?.[i] ?? at + 4 + i * 4}
          dur={14}
          style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}
        >
          <Code line={line} size={size} />
        </Ink>
      ))}
    </div>
  );
};

// ── What pandas answers ──────────────────────────────────────────────────────

/** An error or warning as Python prints it: its kind ("KeyError",
 *  "ChainedAssignmentError"), then the message. */
export const ErrorBox: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  kind: string;
  message: string;
  size?: number;
  dim?: number;
  out?: number;
  /** Highlight the message from a frame on. */
  markAt?: number;
}> = ({ x, top, width, at, kind, message, size = 22, dim, out, markAt }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  return (
    <Ink at={at} dur={16} out={out} style={{ left: x, top, width, opacity: 1 - d }}>
      <div
        style={{
          borderLeft: `4px solid ${ACCENT}`,
          background: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`,
          padding: "14px 20px 16px",
          fontFamily: MONO,
          fontSize: size,
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          color: INK,
          fontVariantLigatures: "none",
        }}
      >
        <span style={{ color: ACCENT_INK, fontWeight: 700 }}>{kind}:</span>{" "}
        {markAt === undefined ? message : <Mark at={markAt}>{message}</Mark>}
      </div>
    </Ink>
  );
};

/**
 * What a block printed: a console strip in the listing's mono, on a pale
 * ground with a soft rule at its left. Each line inks in on its own cue.
 */
export const Console: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  at: number;
  lineAt?: readonly number[];
  size?: number;
  dim?: number;
  out?: number;
  /** Lines to highlight, each from a frame on. */
  marks?: readonly { line: number; at: number; color?: string }[];
}> = ({ lines, x, top, width, at, lineAt, size = 22, dim, out, marks = [] }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const lineH = Math.round(size * 1.6);
  return (
    <Ink at={at} dur={14} out={out} style={{ left: x, top, width, opacity: 1 - d }}>
      <div
        style={{
          position: "relative",
          borderLeft: `4px solid ${HAIRLINE}`,
          background: LISTING_PAPER,
          padding: `${Math.round(size * 0.5)}px ${Math.round(size * 0.8)}px`,
          height: lines.length * lineH,
          fontFamily: MONO,
          fontSize: size,
          color: INK,
          fontVariantLigatures: "none",
        }}
      >
        {lines.map((line, i) => {
          const m = marks.find((k) => k.line === i);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: Math.round(size * 0.5) + i * lineH,
                height: lineH,
                display: "flex",
                alignItems: "center",
                whiteSpace: "pre",
                opacity: lineAt?.[i] === undefined ? 1 : ease(frame, lineAt[i], 10),
              }}
            >
              {m ? (
                <Mark at={m.at} color={m.color}>
                  {line}
                </Mark>
              ) : (
                line
              )}
            </div>
          );
        })}
      </div>
    </Ink>
  );
};

/** How tall a Console of `lines` lines is. */
export const consoleHeight = (lines: number, size = 22) => lines * Math.round(size * 1.6) + 2 * Math.round(size * 0.5);

// ── The frame ────────────────────────────────────────────────────────────────

/** JetBrains Mono's advance, in em: every glyph is this wide. */
const ADVANCE = 0.6;
/** A header tag ("PK", "UNIQUE"): the 19px floor, the smallest type on screen. */
const TAG_SIZE = 19;

export type Col = {
  name: string;
  /** The column opens (grows from nothing) on this frame. */
  at?: number;
  /** A tag after the title ("PK", "FK", "UNIQUE"), from a frame on. */
  tag?: { text: string; at: number; color?: string };
  /** Integers, set flush right. */
  numeric?: boolean;
  /** The column's values in their own ink (keys in the data blue). */
  ink?: string;
};

export type TableSpec = {
  x: number;
  top: number;
  cols: readonly Col[];
  rows: readonly (readonly string[])[];
  /** Values a cell will change to, so its column is wide enough. */
  extra?: readonly (readonly string[])[];
  headH: number;
  rowH: number;
  headSize?: number;
  bodySize?: number;
  pad?: number;
};

export type TableGeometry = ReturnType<typeof tableGeometry>;

/**
 * Where a table's columns and rows fall, once every column is open. Each
 * column is as wide as its title (and tag) or its longest value, in the
 * monospace advance, plus padding. `top`, `headH` and `rowH` are page values
 * (through `y()` and `h()`).
 */
export const tableGeometry = ({ x, top, cols, rows, extra = [], headH, rowH, headSize = 22, bodySize = 28, pad = 20 }: TableSpec) => {
  const all = [...rows, ...extra];
  const widths = cols.map((c, i) =>
    Math.ceil(
      Math.max(
        c.name.length * ADVANCE * headSize + (c.tag ? c.tag.text.length * TAG_SIZE * 0.66 + 36 : 0),
        ...all.map((r) => (r[i] ?? "").length * ADVANCE * bodySize),
      ) +
        2 * pad,
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
    right: x + width,
    headH,
    rowH,
    headSize,
    bodySize,
    pad,
    rowTop,
    rowMid: (i: number) => rowTop(i) + rowH / 2,
    /** A cell's horizontal middle. */
    colMid: (j: number) => xs[j] + widths[j] / 2,
  };
};

export type TableRow = {
  cells: readonly string[];
  /** When the row inks in. */
  at: number;
  /** A row that was tried and refused: drawn inside a dashed outline. */
  ghost?: boolean;
  /** The row opens up as it inks in, pushing the bottom rule down. */
  grow?: boolean;
  strikeAt?: number;
  /** The strike's ink: the accent (a refusal, the trap) unless given. */
  strikeColor?: string;
  dimAt?: number;
  /** The row fades and closes up. */
  collapseAt?: number;
  /** A dashed accent outline around the row, from `at` to `out`: a delete
   *  attempted on it. */
  outline?: { at: number; out?: number };
};
export type CellMark = { row: number; col: number; at: number; out?: number; color?: string };
export type RowBand = { row: number; at: number; out?: number; color?: string };
export type CellSwap = { row: number; col: number; at: number; value: string; color?: string };

/** A soft left-to-right wipe for inline text, the Ink reveal's mask. */
const wipe = (p: number): React.CSSProperties => {
  if (p >= 1) return {};
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, ${INK} ${edge - 18}%, transparent ${edge + 4}%)`;
  return { WebkitMaskImage: mask, maskImage: mask, filter: `blur(${(1 - p) * 1.4}px)` };
};

const CellText: React.FC<{ value: string; color: string; mark?: CellMark; swap?: CellSwap }> = ({
  value,
  color,
  mark,
  swap,
}) => {
  const frame = useCurrentFrame();
  const swapped = swap !== undefined && frame >= swap.at;
  const text = swapped ? swap.value : value;
  const fade = swap !== undefined && !swapped ? 1 - ease(frame, swap.at - 6, 6) : 1;
  const w = mark ? ease(frame, mark.at, 12) : 0;
  const gone = mark?.out === undefined ? 0 : ease(frame, mark.out, 10);
  const ink = swapped ? (swap?.color ?? color) : text === "NaN" ? ACCENT_INK : color;
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
          color: ink,
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
 * A DataFrame as pandas displays it, drawn as real rows and cells:
 * a rule above, the column titles, a hairline, the rows, a rule below. A
 * column with `at` opens on that frame, pushing the ones after it right.
 */
export const DataTable: React.FC<{
  g: TableGeometry;
  cols: readonly Col[];
  rows: readonly TableRow[];
  at: number;
  marks?: readonly CellMark[];
  bands?: readonly RowBand[];
  swaps?: readonly CellSwap[];
  dim?: number;
  out?: number;
}> = ({ g, cols, rows, at, marks = [], bands = [], swaps = [], dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const tableDim = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || gone >= 1) return null;

  // Columns open from nothing on their cue.
  const open = cols.map((c) => (c.at === undefined ? 1 : ease(frame, c.at, 16)));
  const widths = g.widths.map((w, j) => w * open[j]);
  const xs = widths.map((_, j) => g.x + widths.slice(0, j).reduce((a, b) => a + b, 0));
  const width = widths.reduce((a, b) => a + b, 0);

  const heights = rows.map(
    (r) =>
      g.rowH *
      (r.grow ? ease(frame, r.at - 4, 12) : 1) *
      (r.collapseAt === undefined ? 1 : 1 - ease(frame, r.collapseAt + 4, 12)),
  );
  const tops = heights.map((_, i) => g.top + g.headH + heights.slice(0, i).reduce((a, b) => a + b, 0));
  const bottom = g.top + g.headH + heights.reduce((a, b) => a + b, 0);
  const cellBox = (j: number): React.CSSProperties => ({
    position: "absolute",
    left: xs[j] - g.x,
    width: widths[j],
    padding: `0 ${g.pad}px`,
    boxSizing: "border-box",
    textAlign: cols[j].numeric ? "right" : "left",
    whiteSpace: "pre",
    overflow: "hidden",
    opacity: open[j] < 1 ? ease(frame, (cols[j].at ?? 0) + 6, 10) : 1,
  });
  const ruleW = width * p;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: (1 - tableDim) * (1 - gone) }}>
      <div style={{ position: "absolute", left: g.x, top: g.top, width: ruleW, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: g.x, top: g.top + g.headH - 1, width: ruleW, height: 1, background: HAIRLINE }} />
      <div style={{ position: "absolute", left: g.x, top: bottom - 1, width: ruleW, height: 1.5, background: INK }} />
      <Ink at={at + 2} dur={14} style={{ left: g.x, top: g.top, width, height: g.headH }}>
        {/* Ink pads its box to leave room for the wipe's bleed, which would
            move absolutely placed cells up and left by that much; this box
            puts their origin back on the table's own corner. */}
        <div style={{ position: "relative", width, height: g.headH }}>
        {cols.map((c, j) => (
          <div
            key={c.name}
            style={{
              ...cellBox(j),
              top: 0,
              height: g.headH,
              display: "flex",
              alignItems: "center",
              justifyContent: c.numeric ? "flex-end" : "flex-start",
              gap: 8,
              fontFamily: MONO,
              fontSize: g.headSize,
              fontWeight: 600,
              color: INK_SOFT,
            }}
          >
            {c.name}
            {c.tag ? (
              <span style={{ opacity: ease(frame, c.tag.at, 10), transform: `scale(${0.8 + 0.2 * ease(frame, c.tag.at, 10)})` }}>
                <Tag color={c.tag.color ?? KEY_INK} size={TAG_SIZE}>
                  {c.tag.text}
                </Tag>
              </span>
            ) : null}
          </div>
        ))}
        </div>
      </Ink>

      {rows.map((r, i) => {
        const hgt = heights[i];
        if (hgt < 0.5) return null;
        const top = tops[i];
        const collapse = r.collapseAt === undefined ? 0 : ease(frame, r.collapseAt, 6);
        const dimmed = r.dimAt === undefined ? 0 : ease(frame, r.dimAt, 12) * 0.5;
        const strike = r.strikeAt === undefined ? 0 : ease(frame, r.strikeAt, 12);
        const shownAt = ease(frame, r.at - 2, 10);
        const outline = r.outline ? ease(frame, r.outline.at, 10) * (1 - (r.outline.out === undefined ? 0 : ease(frame, r.outline.out, 10))) : 0;
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
                      width: width * w,
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
                  width,
                  height: 1,
                  background: `color-mix(in srgb, ${INK} 16%, transparent)`,
                  opacity: shownAt * (1 - collapse),
                }}
              />
            ) : null}
            {r.ghost || outline > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: g.x + 2,
                  top: top + 7,
                  width: width - 4,
                  height: Math.max(0, hgt - 16),
                  boxSizing: "border-box",
                  border: `2px dashed ${ACCENT}`,
                  opacity: (r.ghost ? shownAt : outline) * (1 - dimmed) * (1 - collapse),
                }}
              />
            ) : null}
            <Ink
              at={r.at}
              dur={14}
              style={{
                left: g.x,
                top,
                width,
                height: hgt,
                fontFamily: MONO,
                fontSize: g.bodySize,
                opacity: (1 - collapse) * (1 - dimmed),
                fontVariantLigatures: "none",
              }}
            >
              <div style={{ position: "relative", width, height: hgt }}>
                {r.cells.map((v, j) => (
                  <div
                    key={j}
                    style={{
                      ...cellBox(j),
                      top: 0,
                      height: hgt,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: cols[j].numeric ? "flex-end" : "flex-start",
                    }}
                  >
                    <CellText
                      value={v}
                      color={cols[j].ink ?? INK}
                      mark={marks.find((m) => m.row === i && m.col === j)}
                      swap={swaps.find((s) => s.row === i && s.col === j)}
                    />
                  </div>
                ))}
              </div>
            </Ink>
            {strike > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: g.x + g.pad / 2,
                  top: top + hgt / 2 - 1.5,
                  width: (width - g.pad) * strike,
                  height: 3,
                  borderRadius: 2,
                  background: r.strikeColor ?? ACCENT,
                  opacity: 1 - collapse,
                }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** A table's name over its top rule, in the label face. */
export const TableName: React.FC<{ g: TableGeometry; at: number; children: React.ReactNode; dim?: number; out?: number }> = ({
  g,
  at,
  children,
  dim,
  out,
}) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  return (
    <Ink at={at} dur={12} out={out} style={{ left: g.x, top: g.top - 38, whiteSpace: "nowrap", opacity: 1 - d }}>
      <span style={{ ...label(21, INK), fontWeight: 650 }}>{children}</span>
    </Ink>
  );
};

// ── Arrows ───────────────────────────────────────────────────────────────────

/**
 * A key's pointer: a curve from one row to the row it names, drawn from its
 * tail, with an arrowhead on arrival. Left to right, or right to left.
 */
export const KeyArrow: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  out?: number;
  dim?: number;
  color?: string;
  dash?: boolean;
  width?: number;
}> = ({ from, to, at, out, dim, color = KEY, dash = false, width = 2.6 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const dimmed = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const [fx, fy] = from;
  const [tx, ty] = to;
  const head = 14;
  const dir = Math.sign(tx - fx) || 1;
  // The curve ends a straight run short of the tip, so however steeply it
  // climbs between two rows, it has stopped turning before the head starts.
  const run = Math.min(30, Math.abs(tx - fx) * 0.2);
  const ex = tx - run * dir;
  const bend = Math.max(30, Math.abs(ex - fx) * 0.45) * dir;
  const curve: Cubic = [from, [fx + bend, fy], [ex - bend, ty], [ex, ty]];
  const line = [...sampleCubic(curve), to];
  const len = lineLength(line);
  const reach = (len - head + 1) / len;
  const d = `${cubicPath(curve)} L${tx},${ty}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - dimmed) }}>
      <circle cx={fx} cy={fy} r={4.5} fill={color} />
      {dash ? (
        // Dashes can't share the draw-on trick (it needs pathLength 1), so a
        // dashed arrow is revealed by a clip that follows its tip.
        <g style={{ clipPath: `inset(-40px ${dir > 0 ? (1 - p) * 100 : 0}% -40px ${dir < 0 ? (1 - p) * 100 : 0}%)` }}>
          <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray="8 7" />
        </g>
      ) : (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${p * reach} 1`}
        />
      )}
      <path d={arrowHead(line, head, 7.5, { filled: true })} fill={color} opacity={ease(frame, at + 12, 5)} />
    </svg>
  );
};

/**
 * An elbow arrow from one row to another along `points` (orthogonal, its
 * corners rounded), drawn from its tail: for a child table stacked under
 * its parent, looping out to the side and back in.
 */
export const ElbowArrow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
  head?: number;
}> = ({ points, at, dur = 16, out, dim, color = KEY, width = 2.6, head = 14 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } = roundedPolyline(points, 16);
  const len = lineLength(samples);
  const reach = (len - head + 1) / len;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <circle cx={points[0][0]} cy={points[0][1]} r={4.5} fill={color} />
      <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      <path d={arrowHead(samples, head, 7.5, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  /** Another video's folder, for art the series shares (Part 1's mousetrap
   *  and stopwatch mark the traps and the rapid round in every part). */
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, video = VIDEO, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={video}
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

/** A note in the annotation face, sized for the page. */
export const noteStyle = (size = 22, color: string = INK): React.CSSProperties => ({ ...note(size, color), whiteSpace: "nowrap" });

// ── pandas output, as tables ────────────────────────────────────────────────

const NUMBER = /^-?\d[\d,_]*(\.\d+)?$|^NaN$/;

/**
 * Columns for a table from data.ts: the first column (a frame's index, or a
 * Series' index) in the soft ink, the way pandas sets its index apart, and
 * every column whose cells are all numbers set flush right. `extra` adds to
 * a column by name (the index's name is "").
 */
export const colsOf = (
  t: { cols: readonly string[]; rows: readonly (readonly string[])[] },
  extra: Record<string, Partial<Col>> = {},
): Col[] =>
  t.cols.map((name, j) => ({
    name,
    ink: j === 0 ? INK_SOFT : undefined,
    numeric: j > 0 && t.rows.length > 0 && t.rows.every((r) => NUMBER.test(r[j] ?? "")),
    ...extra[name],
  }));

/** A table's geometry at (x, top), in the video's row heights; `top` is a
 *  page position (through `y()`), the heights through `h()`. */
export const geoOf = (
  t: { cols: readonly string[]; rows: readonly (readonly string[])[] },
  x: number,
  top: number,
  h: (v: number) => number,
  opts: { headH?: number; rowH?: number; bodySize?: number; headSize?: number; extra?: readonly (readonly string[])[] } = {},
) =>
  tableGeometry({
    x,
    top,
    cols: t.cols.map((name) => ({ name })),
    rows: t.rows,
    extra: opts.extra,
    headH: h(opts.headH ?? 48),
    rowH: h(opts.rowH ?? 54),
    bodySize: opts.bodySize ?? 26,
    headSize: opts.headSize ?? 22,
  });
