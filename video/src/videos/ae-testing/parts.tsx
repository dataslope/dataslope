import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Badge, type BadgeTone, Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { DataTable, tableGeometry, type CellMark, type Col, type RowBand, type TableGeometry, type TableRow } from "../da-sql/parts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The result tables, headings, highlighter,
 * strike and key arrows are the Data Analyst SQL videos' (da-sql/parts.tsx),
 * re-exported as the Backend and Data Engineer SQL videos do, so the series'
 * tables look like one family.
 *
 * What is local:
 * - `Listing`, after be-databases' (marks found by text, never by line
 *   number), with a tokenizer for each of the three languages a dbt project
 *   is written in here: SQL (with its `{{ ref() }}` Jinja and `--` comments),
 *   YAML and a shell command.
 * - `TestResult`, the video's recurring figure: a test is a query for the
 *   rows that break it, so every test is shown as its listing with, beside
 *   it, the rows it returned under a verdict badge ("0 rows: pass", "3 rows:
 *   fail"). The badge is green only where passing is the right outcome; a
 *   pass on data that is wrong in some other way stays neutral.
 * - `Box`, a diagram box in the owner's 2026-11-12 style: no fill, a 2px ink
 *   outline, black text; a highlight colors the outline and the text
 *   together. `Flow` is the arrow between boxes (be-databases').
 * - `Bracket`, `Spot` and the art's sizes.
 */
export {
  DataTable,
  Drift,
  Headline,
  KeyArrow,
  Kicker,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  pulse,
  Strike,
  Svg,
  TableName,
  tableGeometry,
  Tag,
  X0,
  type CellMark,
  type Col,
  type RowBand,
  type TableGeometry,
  type TableRow,
} from "../da-sql/parts";
export { OK, OK_INK };

/** The series' name, the hook's kicker. */
export const SERIES = "Analytics engineer interview questions";
/** The page's right margin. */
export const RIGHT = 1824;

/** A mark's red band: the trap or the error. */
export const MARK_RED = `color-mix(in srgb, ${ds("red", 500)} 26%, transparent)`;
/** A mark's green band: the right answer. */
export const MARK_GREEN = `color-mix(in srgb, ${OK} 24%, transparent)`;
/** A neutral gray band: a row picked out without a verdict. */
export const MARK_GRAY = `color-mix(in srgb, ${ds("gray", 400)} 26%, transparent)`;

/**
 * The index of the line that holds `text`. A highlight finds its line by
 * what the line says, never by a number, so a reworded listing fails the
 * render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no line holds ${JSON.stringify(text)}`);
  return i;
};

/** The lines of `lines` from the one holding `first` to the one holding `last`. */
export const linesFrom = (lines: readonly string[], first: string, last?: string) =>
  lines.slice(lineOf(lines, first), last === undefined ? lines.length : lineOf(lines, last) + 1);

/**
 * Code inside a line of type, at 0.92em so it stays within the 12% a line's
 * sizes may differ by, and never under 19px.
 */
export const SmallMono: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: 500, fontVariantLigatures: "none", wordSpacing: "-0.3em", color }}>
    {children}
  </span>
);

/** "350.00" → "350.00", "3569.50" → "3,569.50". */
export const money = (v: number | string) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Listings ─────────────────────────────────────────────────────────────────

export type Lang = "sql" | "yaml" | "sh";
const LISTING_PAPER = ds("gray", 50);
const TOKEN = {
  keyword: inkOf.purple,
  string: inkOf.green,
  number: inkOf.orange,
  comment: INK_SOFT,
  punct: INK_SOFT,
  name: INK,
} as const;
const SQL_KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER JOIN LEFT ON AND OR NOT IN IS NULL AS DISTINCT CASE WHEN THEN ELSE END " +
    "INTERVAL TIMESTAMP DATE VALUES CROSS WITH"
  ).split(" "),
);
const SQL_TABLES = new Set(["fct_orders", "fct_order_lines", "dim_customer", "daily_revenue", "finance_daily", "orders", "order_items", "raw_orders"]);

type Token = { text: string; color: string; weight?: number };

const tokenize = (line: string, lang: Lang): Token[] => {
  const out: Token[] = [];
  if (lang === "sql") {
    for (const m of line.matchAll(/(--.*$)|(\{\{|\}\})|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
      const [text, comment, jinja, str, num, word] = m;
      if (comment) out.push({ text, color: TOKEN.comment });
      else if (jinja) out.push({ text, color: TOKEN.punct });
      else if (str) out.push({ text, color: TOKEN.string });
      else if (num) out.push({ text, color: TOKEN.number });
      else if (word && SQL_KEYWORDS.has(word)) out.push({ text, color: TOKEN.keyword, weight: 500 });
      else if (word && SQL_TABLES.has(word)) out.push({ text, color: TOKEN.name, weight: 500 });
      else if (word) out.push({ text, color: TOKEN.name });
      else out.push({ text, color: TOKEN.punct });
    }
    return out;
  }
  if (lang === "yaml") {
    // A word followed by a colon is a key; a quoted word is a string.
    for (const m of line.matchAll(/(#.*$)|('(?:[^']|'')*')|(\b\d+\b)|([A-Za-z_][\w.]*)(?=:)|([A-Za-z_][\w.]*)|(\s+)|(.)/g)) {
      const [text, comment, str, num, key, word] = m;
      if (comment) out.push({ text, color: TOKEN.comment });
      else if (str) out.push({ text, color: TOKEN.string });
      else if (num) out.push({ text, color: TOKEN.number });
      else if (key) out.push({ text, color: TOKEN.keyword, weight: 500 });
      else if (word) out.push({ text, color: TOKEN.name });
      else out.push({ text, color: TOKEN.punct });
    }
    return out;
  }
  for (const m of line.matchAll(/(#.*$)|(--[\w-]+)|(\S+)|(\s+)/g)) {
    const [text, comment, flag, word] = m;
    if (comment) out.push({ text, color: TOKEN.comment });
    else if (flag) out.push({ text, color: TOKEN.keyword, weight: 500 });
    else if (word) out.push({ text, color: TOKEN.name, weight: text === "dbt" ? 500 : 400 });
    else out.push({ text, color: TOKEN.punct });
  }
  return out;
};

const Code: React.FC<{ line: string; size: number; lang: Lang }> = ({ line, size, lang }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line, lang).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

const geometry = (size: number) => ({ lineH: Math.round(size * 1.8), padY: Math.round(size * 0.66), padX: Math.round(size * 0.8) });

/** The full height of a listing of `lines` lines. */
export const listingHeight = (lines: number, size: number) => {
  const g = geometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/** A listing's width: its longest line in the mono advance, plus padding. */
export const listingWidth = (lines: readonly string[], size: number) =>
  Math.ceil(Math.max(...lines.map((l) => l.length)) * 0.6 * size + 2 * geometry(size).padX + 8);

/** The vertical middle of a listing's line `i`, in page pixels. */
export const listingLineMid = (top: number, i: number, size: number) => {
  const g = geometry(size);
  return top + g.padY + i * g.lineH + g.lineH / 2;
};

/** The x of character `col` of a listing line, in page pixels. */
export const listingCharX = (x: number, col: number, size: number) => x + geometry(size).padX + col * 0.6 * size;

/** A highlight on one line, found by text; `text` narrows it to a span. */
export type LineMark = { line: string; text?: string; at: number; out?: number; color?: string };

const Band: React.FC<{ lines: readonly string[]; mark: LineMark; size: number; padX: number; padY: number; lineH: number }> = ({
  lines,
  mark,
  size,
  padX,
  padY,
  lineH,
}) => {
  const frame = useCurrentFrame();
  const w = ease(frame, mark.at, 12);
  const o = mark.out === undefined ? 0 : ease(frame, mark.out, 10);
  if (w <= 0 || o >= 1) return null;
  const i = lineOf(lines, mark.line);
  const line = lines[i];
  const start = mark.text === undefined ? line.length - line.trimStart().length : line.indexOf(mark.text);
  if (start < 0) throw new Error(`line ${JSON.stringify(line)} has no ${JSON.stringify(mark.text)}`);
  const marked = mark.text === undefined ? line.length - start : mark.text.length;
  const chars = /[;,]/.test(line[start + marked] ?? "") ? marked + 1 : marked;
  const open = (c: string | undefined) => c === undefined || c === " ";
  const padL = open(line[start - 1]) ? 0.32 : 0.04;
  const padR = open(line[start + chars]) ? 0.32 : 0.04;
  return (
    <div
      style={{
        position: "absolute",
        left: padX + (start * 0.6 - padL) * size,
        top: padY + i * lineH + lineH * 0.12,
        height: lineH * 0.76,
        width: (chars * 0.6 + padL + padR) * size * w,
        background: mark.color ?? HIGHLIGHT,
        opacity: 1 - o,
      }}
    />
  );
};

/**
 * A printed listing: tinted paper between a rule above and a hairline below,
 * each line inking in on its own cue. Marks find their line (and span) by
 * text. `width` defaults to the longest line.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  lang?: Lang;
  x: number;
  top: number;
  width?: number;
  size?: number;
  at: number;
  step?: number;
  marks?: readonly LineMark[];
  dim?: number;
  out?: number;
}> = ({ lines, lang = "sql", x, top, width, size = 22, at, step = 3, marks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const g = geometry(size);
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const w = width ?? listingWidth(lines, size);
  return (
    <div style={{ position: "absolute", left: x, top, width: w, height: listingHeight(lines.length, size), opacity: (1 - d) * (1 - o) }}>
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
      {marks.map((m, k) => (
        <Band key={k} lines={lines} mark={m} size={size} {...g} />
      ))}
      {lines.map((line, i) =>
        frame >= at + 3 + i * step ? (
          <Ink key={i} at={at + 4 + i * step} dur={14} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
            <Code line={line} size={size} lang={lang} />
          </Ink>
        ) : null,
      )}
    </div>
  );
};

/** A listing's title over its top rule, in the label face (a file name, or
 *  what the listing is). */
export const ListingTitle: React.FC<{ x: number; top: number; at: number; out?: number; dim?: number; children: React.ReactNode }> = ({
  x,
  top,
  at,
  out,
  dim,
  children,
}) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  return (
    <Ink at={at} dur={12} out={out} style={{ left: x, top: top - 40, whiteSpace: "nowrap", opacity: 1 - d }}>
      <span style={{ ...label(21, INK), fontWeight: 500 }}>{children}</span>
    </Ink>
  );
};

// ── A test's verdict, and the rows it returned ───────────────────────────────

/** What a verdict says about the outcome: the right answer (green), the
 *  trap or an error (red), a warning (yellow), or no judgement (gray). */
export type VerdictTone = "ok" | "bad" | "warn" | "neutral";
const BADGE: Record<VerdictTone, BadgeTone> = { ok: "green", bad: "red", warn: "yellow", neutral: "gray" };

export type VerdictState = { at: number; tone: VerdictTone; text: React.ReactNode };

/**
 * A badge that changes as the run does ("0 rows: pass" becoming "3 rows:
 * fail"): each state cross-fades in on its own cue.
 */
export const Verdict: React.FC<{ x: number; y: number; states: readonly VerdictState[]; size?: number; out?: number; dim?: number }> = ({
  x,
  y,
  states,
  size = 22,
  out,
  dim,
}) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (frame < states[0].at || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: (1 - o) * (1 - d), fontSize: size, fontFamily: SANS }}>
      {states.map((s, i) => {
        const next = states[i + 1]?.at;
        const shown = ease(frame, s.at, 10) * (next === undefined ? 1 : 1 - ease(frame, next, 8));
        if (shown <= 0) return null;
        return (
          <div key={i} style={{ position: i === 0 ? "relative" : "absolute", left: 0, top: 0, opacity: shown, transform: `scale(${0.92 + 0.08 * shown})`, transformOrigin: "0 50%" }}>
            <Badge tone={BADGE[s.tone]} size={size}>
              {s.text}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};

/** A house badge in Inter (the page's root face is the serif). */
export const Chip: React.FC<{ tone: BadgeTone; size?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ tone, size = 22, style, children }) => (
  <span style={{ fontFamily: SANS, fontSize: size }}>
    <Badge tone={tone} size={size} style={style}>
      {children}
    </Badge>
  </span>
);

/** The height a verdict badge takes, and the gap under it. */
export const VERDICT_H = 46;

/** A result table's geometry at the video's result sizes. */
export const resultGeometry = (x: number, top: number, cols: readonly string[], rows: readonly (readonly string[])[], h: (v: number) => number, size = 21) =>
  tableGeometry({
    x,
    top,
    cols: cols.map((name) => ({ name })),
    rows,
    headH: h(38),
    rowH: h(38),
    headSize: size - 1,
    bodySize: size,
    pad: 16,
  });

/**
 * The rows a test returned, as a SQL client prints them, under a verdict
 * badge: the video's recurring figure. An empty result keeps one row's
 * height of blank body, so "0 rows" reads as a result rather than a gap.
 * `rowsAt` inks the rows in on their own cue (a result that fills).
 */
export const TestResult: React.FC<{
  g: TableGeometry;
  cols: readonly Col[];
  rows: readonly (readonly string[])[];
  at: number;
  rowsAt?: number;
  verdict: readonly VerdictState[];
  marks?: readonly CellMark[];
  bands?: readonly RowBand[];
  dim?: number;
  out?: number;
  verdictSize?: number;
}> = ({ g, cols, rows, at, rowsAt, verdict, marks, bands, dim, out, verdictSize = 22 }) => {
  const fill = rowsAt ?? at + 6;
  const filling = rowsAt !== undefined;
  // The empty body: one row of blank between the header and the bottom rule.
  // In a result that fills, it closes as the first real row opens.
  const blank: TableRow[] =
    rows.length === 0 || filling ? [{ cells: cols.map(() => ""), at, collapseAt: rows.length > 0 ? fill - 6 : undefined }] : [];
  const shown: TableRow[] = rows.map((cells, i) => ({ cells, at: fill + i * 3, grow: filling }));
  return (
    <>
      <Verdict x={g.x} y={g.top - VERDICT_H - 4} states={verdict} size={verdictSize} out={out} dim={dim} />
      <DataTable g={g} cols={cols} rows={[...blank, ...shown]} at={at} marks={marks?.map((m) => ({ ...m, row: m.row + blank.length }))} bands={bands?.map((b) => ({ ...b, row: b.row + blank.length }))} dim={dim} out={out} />
    </>
  );
};

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/** A box's highlight: none (ink), what the narration points at (yellow), the
 *  error (red), the right answer (green), or set aside (gray, dashed). */
export type Tone = "plain" | "look" | "bad" | "ok" | "off";
const TONE: Record<Tone, { line: string; ink: string }> = {
  plain: { line: INK, ink: INK },
  look: { line: inkOf.yellow, ink: INK },
  bad: { line: ACCENT, ink: ACCENT_INK },
  ok: { line: OK, ink: OK_INK },
  off: { line: ds("gray", 400), ink: INK_SOFT },
};
export const toneLine = (t: Tone) => TONE[t].line;
export const toneInk = (t: Tone) => TONE[t].ink;

/**
 * A diagram box (a model, a source, a dashboard), outlined in ink with no
 * fill, popping in on `at`. Its tone changes on cue: each `tones` entry
 * recolors the outline and the text together from its frame on.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tones?: readonly { at: number; tone: Tone }[];
  mono?: boolean;
  size?: number;
  subSize?: number;
  dashed?: boolean;
  glow?: number;
  dim?: number;
  out?: number;
  align?: "center" | "left";
  /** Drawn under the title, in its own style (a tile's value). */
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tones = [], mono, size = 22, subSize = 20, dashed, glow = 0, dim, out, align = "center", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || p <= 0.001 || o >= 1) return null;
  const current = [...tones].reverse().find((t) => frame >= t.at);
  const tone = current?.tone ?? "plain";
  const t = TONE[tone];
  const isDashed = dashed ?? tone === "off";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `${2 + 1.5 * glow}px ${isDashed ? "dashed" : "solid"} ${t.line}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: "center",
        gap: 6,
        padding: "0 16px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      <span
        style={{
          ...(mono ? { fontFamily: MONO, fontSize: size, fontVariantLigatures: "none" } : label(size, t.ink)),
          color: t.ink,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      {sub ? <span style={{ ...note(subSize, tone === "plain" ? INK_SOFT : t.ink), whiteSpace: "nowrap" }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch. `dash` draws it dashed, revealed by a clip that follows the tip.
 */
export const Flow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  dash?: string;
  dim?: number;
  out?: number;
  noHead?: boolean;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 14, dash, dim, out, noHead }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2 ? roundedPolyline(points, 16) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = noHead ? 1 : Math.max(0, (len - head + 1) / len);
  const [sx, sy] = points[0];
  const [tx, ty] = points[points.length - 1];
  const across = Math.abs(tx - sx) >= Math.abs(ty - sy);
  const hide = `${(1 - p) * 100}%`;
  const clip = across
    ? tx >= sx
      ? `inset(-40px ${hide} -40px -40px)`
      : `inset(-40px -40px -40px ${hide})`
    : ty >= sy
      ? `inset(-40px -40px ${hide} -40px)`
      : `inset(${hide} -40px -40px -40px)`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {dash ? (
        <g style={{ clipPath: clip }}>
          <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />
        </g>
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      {noHead ? null : <path d={arrowHead(line, head, 7.5, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />}
    </svg>
  );
};

/** A short bar across an arrow where it stops: a test that halted the run. */
export const StopBar: React.FC<{ x: number; y: number; at: number; vertical?: boolean; color?: string; out?: number }> = ({ x, y, at, vertical, color = ACCENT, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const len = 34 * p;
  return (
    <div
      style={{
        position: "absolute",
        left: vertical ? x - 2.5 : x - len / 2,
        top: vertical ? y - len / 2 : y - 2.5,
        width: vertical ? 5 : len,
        height: vertical ? len : 5,
        borderRadius: 3,
        background: color,
        opacity: 1 - o,
      }}
    />
  );
};

/**
 * A square bracket down the right of a group (two panes that belong
 * together), drawn on `at`, with its label beside its middle.
 */
export const Bracket: React.FC<{ x: number; top: number; bottom: number; at: number; color?: string; children?: React.ReactNode; out?: number }> = ({
  x,
  top,
  bottom,
  at,
  color = OK,
  children,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const h = (bottom - top) * p;
  const mid = (top + bottom) / 2;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
        <path
          d={`M${x},${mid - h / 2} h14 V${mid + h / 2} h-14`}
          fill="none"
          stroke={color}
          strokeWidth={2.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {children ? (
        <Ink at={at + 8} dur={12} out={out} style={{ left: x + 34, top: mid - 16, whiteSpace: "nowrap" }}>
          {children}
        </Ink>
      ) : null}
    </>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each illustration's trimmed size in pixels (public/images/ae-testing/), so
 *  a spot is drawn at its own aspect and at most half its pixels across on
 *  the 1080p layout (a 4K render doubles it). */
export const ART = {
  woodpecker: { id: "ae-testing-woodpecker", w: 590, h: 1024 },
  clock: { id: "ae-testing-clock", w: 808, h: 937 },
  ledger: { id: "ae-testing-ledger", w: 1024, h: 657 },
  pager: { id: "ae-testing-pager", w: 939, h: 862 },
} as const;
export type ArtName = keyof typeof ART;

/** The height a spot `width` wide takes. */
export const spotH = (art: ArtName, width: number) => (width * ART[art].h) / ART[art].w;

/**
 * A watercolor from illustrations.json, `width` wide at its own aspect: it
 * pops in on `at` (with `<Sfx name="el-pop">` on the same frame, placed by
 * the scene), bobs gently, and fades on `out`.
 */
export const Spot: React.FC<{
  art: ArtName;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
}> = ({ art, at, out, dim, left, top, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = ART[art];
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || frame < at || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={a.id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: spotH(art, width),
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 4, 110) + (1 - p) * 24}px)`,
      }}
    />
  );
};

export type { Pt };
