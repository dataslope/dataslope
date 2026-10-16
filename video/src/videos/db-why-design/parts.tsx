import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the ERD kit
 * (editorial/erd.tsx): a part's kicker, a two-ink headline that can be
 * replaced by the next, highlighter marks, a slow push on a finished figure,
 * the watercolor spots, and, after WhyNormalization's kit.tsx, a SQL listing,
 * a database table drawn as rows and cells, and Postgres's error box.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
export const FIG_Y = 300;

// ── Colors: brand tokens and the editorial palette only ──────────────────────

export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
export const MARK_KEY = `color-mix(in srgb, ${BAR} 18%, transparent)`;
export const KEY = BAR;
export const KEY_INK = BLUE_INK;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a brief swell for something named
 *  again once it is already on the page. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

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
 * One headline line in two inks: the lead in roman on `at`, the turn in
 * italic accent on `turnAt`, the second laid out after the first. `out` takes
 * the whole line away, so the next headline can take its place.
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
          at={turnAt ?? at + 12}
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

/** A highlighter stroke laid under the words it wraps, swept on `at` and
 *  lifted on `out`. Sized in em and to the words. */
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
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top: "0.55em",
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
 * A slow, eased push on a figure: its children scale up by `amount` from
 * `from` to `to` about `origin`, so a figure being talked about is never
 * quite frozen. Keep illustrations outside it: they are drawn at their
 * pixels' size.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  amount?: number;
  origin?: string;
  children: React.ReactNode;
}> = ({ from, to, amount = 0.02, origin = "50% 55%", children }) => {
  const frame = useCurrentFrame();
  const t = clamp01((frame - from) / Math.max(1, to - from));
  const e = t * t * (3 - 2 * t);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + amount * e})`, transformOrigin: origin }}>
      {children}
    </div>
  );
};

/** A straight arrow drawn from `from` to `to`, its head built by arrowHead()
 *  on the drawn line. */
export const Arrow: React.FC<{
  from: readonly [number, number];
  to: readonly [number, number];
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ from, to, at, dur = 16, out, color = INK, width = 2.4 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(16, len * 0.6);
  return (
    <Svg opacity={1 - o}>
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

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs, and
 * fades on `out`. `drift` slides it slowly sideways over its life (px), for
 * a spot that carries a scene on its own. Nothing is drawn while the art is
 * not in.
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
  drift?: number;
  driftDur?: number;
}> = ({ id, at, out, dim, left, top, width, height, drift = 0, driftDur = 300 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.7;
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  const t = clamp01((frame - at) / driftDur);
  const dx = drift * (1 - (1 - t) * (1 - t));
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
        transform: `translate(${dx}px, ${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** A program that writes to the database: a small rounded chip. */
export const Chip: React.FC<{
  at: number;
  x: number;
  y: number;
  out?: number;
  dim?: number;
  glow?: number;
  width?: number;
  children: React.ReactNode;
}> = ({ at, x, y, out, dim, glow = 0, width, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        boxSizing: "border-box",
        padding: "10px 18px",
        borderRadius: 10,
        border: `2px solid ${glow > 0 ? `color-mix(in srgb, ${ACCENT} ${Math.round(glow * 100)}%, ${INK})` : INK}`,
        background: `color-mix(in srgb, ${ds("yellow", 50)} 55%, ${PAPER})`,
        opacity: p * (1 - o) * (1 - d),
        transform: `translate(${(1 - p) * 16 + o * 16}px, ${0}px) scale(${1 + glow * 0.04})`,
        transformOrigin: "50% 50%",
        ...label(22, INK),
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

// ── SQL, after WhyNormalization's kit ────────────────────────────────────────

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
  "JOIN",
  "ON",
  "DATE",
  "DISTINCT",
  "CREATE",
  "TABLE",
  "PRIMARY",
  "KEY",
  "REFERENCES",
  "NOT",
  "NULL",
  "UNIQUE",
  "CHECK",
]);
const TABLES = new Set(["order_spreadsheet", "orders", "customers", "order_items", "products"]);

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

export type LineMark = { line: number; at: number; out?: number; color?: string };
export const listingGeometry = (size: number) => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/** A printed SQL listing: tinted paper between a rule above and a hairline
 *  below, line numbers in the soft ink. `top` is a page y. */
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
  numbers?: boolean;
}> = ({ lines, x, top, width, size = 24, at, lineAt, marks = [], out, numbers = true }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  const textLeft = numbers ? g.gutter + size * 0.77 : size * 0.8;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: listingHeight(lines.length, size), opacity: 1 - o }}>
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
      {numbers ? (
        <div
          style={{ position: "absolute", left: g.gutter, top: g.padY - 6, bottom: g.padY - 6, width: 1, background: HAIRLINE, opacity: p }}
        />
      ) : null}
      {marks.map((m, i) => {
        const w = ease(frame, m.at, 12);
        const mo = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || mo >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: textLeft - size * 0.35,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              width: `${(lines[m.line].length * 0.6 + 0.7) * w}em`,
              fontSize: size,
              background: m.color ?? MARK,
              opacity: 1 - mo,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {numbers && line ? (
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
                fontSize: Math.max(19, Math.round(size * 0.72)),
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
            style={{ left: textLeft, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}
          >
            <Code line={line} size={size} />
          </Ink>
        </React.Fragment>
      ))}
    </div>
  );
};

// ── The database table, after WhyNormalization's kit ─────────────────────────

export type TCell = string | null;
export const HEAD_SIZE = 21;
export const BODY_SIZE = 24;
const PAD = 18;
/** JetBrains Mono's advance, in em. */
const ADVANCE = 0.6;
const shown = (v: TCell) => (v === null ? "null" : v);

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

/** Where a table's columns and rows fall: each column as wide as its title or
 *  its longest value (counting `extra` values a cell will change to). */
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
  rows: readonly (readonly TCell[])[];
  extra?: readonly (readonly TCell[])[];
  headH: number;
  rowH: number;
}): TableGeometry => {
  const all = [...rows, ...extra];
  const widths = cols.map((c, i) =>
    Math.ceil(Math.max(c.length * ADVANCE * HEAD_SIZE, ...all.map((r) => shown(r[i] ?? "").length * ADVANCE * BODY_SIZE)) + 2 * PAD),
  );
  const xs = widths.map((_, i) => x + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const width = widths.reduce((a, b) => a + b, 0);
  const rowTop = (i: number) => top + headH + i * rowH;
  return { x, top, widths, xs, width, headH, rowH, rowTop, rowMid: (i) => rowTop(i) + rowH / 2 };
};

export type TableRow = { cells: readonly TCell[]; at: number; dimAt?: number };
export type CellMark = { row: number; col: number; at: number; out?: number; color?: string };
export type CellSwap = { row: number; col: number; at: number; value: string; color?: string };

/** A soft left-to-right wipe for inline text, the Ink reveal's mask. */
const wipe = (p: number): React.CSSProperties => {
  if (p >= 1) return {};
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, ${INK} ${edge - 18}%, transparent ${edge + 4}%)`;
  return { WebkitMaskImage: mask, maskImage: mask, filter: `blur(${(1 - p) * 1.4}px)` };
};

const CellText: React.FC<{ value: TCell; color: string; marks: readonly CellMark[]; swap?: CellSwap }> = ({
  value,
  color,
  marks,
  swap,
}) => {
  const frame = useCurrentFrame();
  const swapped = swap !== undefined && frame >= swap.at;
  const text = swapped ? swap.value : shown(value);
  const fade = swap !== undefined && !swapped ? 1 - ease(frame, swap.at - 6, 6) : 1;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {marks.map((mark, k) => {
        const w = ease(frame, mark.at, 12);
        const gone = mark.out === undefined ? 0 : ease(frame, mark.out, 10);
        if (w <= 0 || gone >= 1) return null;
        return (
          <span
            key={k}
            style={{
              position: "absolute",
              inset: "0.02em -0.28em",
              background: mark.color ?? MARK,
              clipPath: `inset(0 ${(1 - w) * 100}% 0 0)`,
              opacity: 1 - gone,
            }}
          />
        );
      })}
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

/** A database table as a SQL client prints it, drawn as rows and cells: a
 *  rule above, the column titles, a hairline, the rows, a rule below. */
export const DbTable: React.FC<{
  g: TableGeometry;
  cols: readonly string[];
  rows: readonly TableRow[];
  at: number;
  out?: number;
  dim?: number;
  numeric?: readonly number[];
  colInk?: Readonly<Record<number, string>>;
  marks?: readonly CellMark[];
  swaps?: readonly CellSwap[];
}> = ({ g, cols, rows, at, out, dim, numeric = [], colInk = {}, marks = [], swaps = [] }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  // The bottom rule follows the last row that has started to arrive.
  const shownRows = rows.reduce((n, r, i) => (frame >= r.at - 4 ? i + 1 : n), 0);
  const grow = shownRows === 0 ? 0 : shownRows - 1 + ease(frame, rows[shownRows - 1].at - 4, 10);
  const bottom = g.top + g.headH + grow * g.rowH;
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
    <div style={{ position: "absolute", inset: 0, opacity: (1 - o) * (1 - d) }}>
      <div style={{ position: "absolute", left: g.x, top: g.top, width: g.width * p, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: g.x, top: g.top + g.headH - 1, width: g.width * p, height: 1, background: HAIRLINE }} />
      <div style={{ position: "absolute", left: g.x, top: bottom - 1, width: g.width * p, height: 1.5, background: INK }} />
      <Ink at={at + 2} dur={14} style={{ left: g.x, top: g.top, width: g.width, height: g.headH, display: "flex", alignItems: "center" }}>
        {cols.map((c, j) => (
          <div key={c} style={{ ...cellBox(j), fontFamily: MONO, fontSize: HEAD_SIZE, fontWeight: 600, color: INK_SOFT }}>
            {c}
          </div>
        ))}
      </Ink>
      {rows.map((r, i) => {
        const top = g.rowTop(i);
        const rd = r.dimAt === undefined ? 0 : ease(frame, r.dimAt, 12) * 0.55;
        return (
          <React.Fragment key={i}>
            {i > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: g.x,
                  top,
                  width: g.width,
                  height: 1,
                  background: `color-mix(in srgb, ${INK} 16%, transparent)`,
                  opacity: ease(frame, r.at - 2, 10),
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
                height: g.rowH,
                display: "flex",
                alignItems: "center",
                fontFamily: MONO,
                fontSize: BODY_SIZE,
                opacity: 1 - rd,
              }}
            >
              {r.cells.map((v, j) => (
                <div key={j} style={cellBox(j)}>
                  <CellText
                    value={v}
                    color={colInk[j] ?? INK}
                    marks={marks.filter((m) => m.row === i && m.col === j)}
                    swap={swaps.find((s) => s.row === i && s.col === j)}
                  />
                </div>
              ))}
            </Ink>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Postgres's answers ───────────────────────────────────────────────────────

/** An error as psql prints it: the ERROR line, then its DETAIL. The
 *  constraint's name, where it has one, takes a highlight on `nameAt`. */
export const ErrorBox: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  message: string;
  detail: string | null;
  constraint?: string | null;
  nameAt?: number;
  size?: number;
}> = ({ x, top, width, at, message, detail, constraint, nameAt, size = 20 }) => {
  const parts = constraint ? message.split(`"${constraint}"`) : [message];
  return (
    <Ink at={at} dur={16} style={{ left: x, top, width }}>
      <div
        style={{
          borderLeft: `4px solid ${ACCENT}`,
          background: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`,
          padding: "12px 20px 14px",
          fontFamily: MONO,
          fontSize: size,
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          color: INK,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div>
          <span style={{ color: ACCENT_INK, fontWeight: 700 }}>ERROR:</span>
          {"  "}
          {parts.length === 2 && nameAt !== undefined ? (
            <>
              {parts[0]}
              <Mark at={nameAt}>
                <span style={{ fontWeight: 700 }}>&quot;{constraint}&quot;</span>
              </Mark>
              {parts[1]}
            </>
          ) : (
            message
          )}
        </div>
        {detail ? (
          <div style={{ color: INK_SOFT }}>
            <span style={{ fontWeight: 600 }}>DETAIL:</span>
            {"  "}
            {detail}
          </div>
        ) : null}
      </div>
    </Ink>
  );
};

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: weight ?? 600, color }}>{children}</span>
);

/** A square bracket on the right of some rows, opening toward them. */
export const RowBracket: React.FC<{ x: number; y0: number; y1: number; at: number; color?: string }> = ({
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
    <Svg>
      <path
        d={`M${x},${y0} H${x + 12} V${y1} H${x}`}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </Svg>
  );
};
