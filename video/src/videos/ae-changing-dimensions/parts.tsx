import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { useLayout } from "../../editorial/layout";
import { Ink, OutlineBadge } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { LISTING_PAPER, MARK } from "../da-sql/parts";
import { ILLUSTRATIONS, ORDERS_42, TYPE2, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit, the interview kit
 * (editorial/interview.tsx) and the ERD kit. The result tables, highlighter,
 * strike and headings are the Data Analyst SQL videos' (da-sql/parts.tsx,
 * with the column helpers from da-advanced-sql/parts.tsx), re-exported as
 * de-modeling-history does, so the SCD figures of the two series look alike.
 *
 * What is local:
 * - the listing, de-modeling-history's, with this video's keywords and the
 *   Jinja of a dbt snapshot (`{% %}`, `{{ }}`);
 * - the outlined box and the arrow a flow is drawn with (README: a
 *   diagram's boxes are outlined in ink, a highlight colors the outline and
 *   the text together, never a fill);
 * - the recurring figure, Acme Corp's history on a timeline: the axis, a
 *   version drawn as an outlined band over its validity window, an order
 *   pinned to its date and landing in a band, and a dated mark. Every
 *   scene that draws customer 42 (the hook, Types 1, 2 and 3, the late
 *   fact) builds it from `acme()`, so the dates sit at the same x in each;
 * - the spot art, bound to this video.
 */
export {
  DataTable,
  Drift,
  Headline,
  Kicker,
  Mark,
  MARK,
  MARK_BAD,
  MARK_KEY,
  MARK_OK,
  pulse,
  Strike,
  TableName,
  X0,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { colsOf, geoOf, rowsAt } from "../da-advanced-sql/parts";
export { OK, OK_INK };

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * Code inside a line of type: the interview kit's QMono at 0.92em, so it
 * stays within the 12% a line's sizes may differ by, and never under 19px.
 */
export const QMono: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: 500, fontVariantLigatures: "none", wordSpacing: "-0.3em", color }}>
    {children}
  </span>
);

/**
 * The index of the listing line that holds `text`. A highlight finds its line
 * by what the line says, never by a number, so a reworded query fails the
 * render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

// ── The SQL listing ──────────────────────────────────────────────────────────

const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER JOIN LEFT INNER ON AND OR NOT IN IS NULL AS WITH DISTINCT " +
    "CASE WHEN THEN ELSE END DESC ASC DATE VALUES BETWEEN USING UPDATE SET INSERT INTO CREATE TABLE " +
    "COUNT SUM COALESCE TRUE FALSE MERGE MATCHED snapshot endsnapshot config source"
  ).split(" "),
);
const TABLES = new Set(["dim_customer", "fact_orders", "staged_orders", "fact_sales", "fact_sales_overwritten", "dim_customer_t3", "dim_customer_t1", "snap_customers"]);

type Token = { text: string; color: string; weight?: number };

const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(--.*$)|('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: INK_SOFT });
    else if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: inkOf.purple, weight: 500 });
    else if (word && TABLES.has(word)) out.push({ text, color: INK, weight: 500 });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  return out;
};

/** One line of SQL, colored. */
const Code: React.FC<{ line: string; size: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

const listingGeometry = (size: number) => ({ lineH: Math.round(size * 1.8), padY: Math.round(size * 0.66), padX: Math.round(size * 0.8) });

/** The full height of a listing of `lines` lines. */
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/** The width a listing needs for its longest line. */
export const listingWidth = (lines: readonly string[], size: number) =>
  Math.ceil(Math.max(...lines.map((l) => l.length)) * 0.6 * size + 2 * listingGeometry(size).padX + 8);

/** The vertical middle of a listing's line `i`, in page pixels. */
export const listingLineMid = (top: number, i: number, size: number) => {
  const g = listingGeometry(size);
  return top + g.padY + i * g.lineH + g.lineH / 2;
};

/**
 * A printed SQL listing: tinted paper between a rule above and a hairline
 * below, each line inking in on its own cue (de-modeling-history's). `marks`
 * lay a band under a line (find it with `lineOf`); `gaps` hold a line open
 * as an empty dashed slot in the accent, for a clause that is missing.
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
  /** An empty slot drawn after line `after`, dashed in the accent, from `at`. */
  gap?: { after: number; at: number; width: number };
  dim?: number;
  out?: number;
  title?: React.ReactNode;
}> = ({ lines, x, top, width, size = 22, at, lineAt, marks = [], gap, dim, out, title }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const rows = lines.length + (gap ? 1 : 0);
  const rowOf = (i: number) => (gap && i > gap.after ? i + 1 : i);
  const gp = gap ? ease(frame, gap.at, 12) : 0;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: listingHeight(rows, size), opacity: (1 - d) * (1 - o) }}>
      {title ? (
        <div style={{ position: "absolute", left: 0, bottom: "100%", paddingBottom: 10, whiteSpace: "nowrap", ...label(21, INK), opacity: p }}>{title}</div>
      ) : null}
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
        const text = lines[m.line];
        const indent = text.length - text.trimStart().length;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.padX - size * 0.2 + indent * 0.6 * size,
              top: g.padY + rowOf(m.line) * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              width: ((text.length - indent) * 0.6 + 0.4) * size * w,
              background: m.color ?? MARK,
              opacity: 1 - mo,
            }}
          />
        );
      })}
      {gap && gp > 0 ? (
        <div
          style={{
            position: "absolute",
            left: g.padX - size * 0.2 + 2 * 0.6 * size,
            top: g.padY + (gap.after + 1) * g.lineH + g.lineH * 0.1,
            height: g.lineH * 0.8,
            width: gap.width * gp,
            boxSizing: "border-box",
            border: `2px dashed ${ACCENT}`,
            borderRadius: 4,
          }}
        />
      ) : null}
      {lines.map((line, i) => (
        <Ink key={i} at={lineAt?.[i] ?? at + 4 + i * 3} dur={14} style={{ left: g.padX, top: g.padY + rowOf(i) * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
          <Code line={line} size={size} />
        </Ink>
      ))}
    </div>
  );
};

/**
 * The house's outlined badge (README, "Or outlined"): no fill, a 2px border
 * and the text in one ink, here near-black, matching the video's outlined
 * boxes. Set in Inter: the badge sets no face of its own, so inside a note
 * it took the page's serif.
 */
export const Pill: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 22, children }) => (
  <OutlineBadge tone="ink" size={size} style={{ fontFamily: SANS }}>
    {children}
  </OutlineBadge>
);

// ── Tones: one meaning per color ─────────────────────────────────────────────

/** What a drawn thing is: plain ink, what the narration points at (yellow),
 *  the right answer (green), the trap (red), data (blue), or set aside. */
export type Tone = "plain" | "look" | "ok" | "bad" | "data" | "off";
const LINE: Record<Tone, string> = {
  plain: INK,
  look: inkOf.yellow,
  ok: OK,
  bad: ACCENT,
  data: BAR,
  off: ds("gray", 400),
};
const TEXT: Record<Tone, string> = {
  plain: INK,
  look: INK,
  ok: OK_INK,
  bad: ACCENT_INK,
  data: BLUE_INK,
  off: INK_SOFT,
};
export const toneLine = (t: Tone) => LINE[t];
export const toneInk = (t: Tone) => TEXT[t];

/** A tone that changes on cues: the base, then each step as it is reached. */
export type ToneStep = { at: number; tone: Tone };

/** The color a toned thing has on this frame, each change mixed in over 10
 *  frames. `pick` is the line or the text palette. */
const toneMix = (frame: number, base: Tone, steps: readonly ToneStep[], pick: (t: Tone) => string) =>
  [...steps]
    .sort((a, b) => a.at - b.at)
    .reduce((color, s) => {
      const p = ease(frame, s.at, 10);
      if (p <= 0) return color;
      if (p >= 1) return pick(s.tone);
      return `color-mix(in srgb, ${pick(s.tone)} ${Math.round(p * 100)}%, ${color})`;
    }, pick(base));

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/**
 * An outlined box (2px ink, no fill, ink text), popping in on `at`. A tone
 * colors the outline and the text together; `dashed` for something that
 * is not there yet or was never kept.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  tone?: Tone;
  tones?: readonly ToneStep[];
  dashed?: boolean;
  size?: number;
  out?: number;
  dim?: number;
  align?: "center" | "left";
  /** Side padding inside the outline, in px. */
  padding?: number;
  children: React.ReactNode;
}> = ({ x, y, w, h, at, tone = "plain", tones = [], dashed, size = 23, out, dim, align = "center", padding = 18, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${toneMix(frame, tone, tones, toneLine)}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: "center",
        gap: 8,
        padding: `0 ${padding}px`,
        ...note(size, toneMix(frame, tone, tones, toneInk)),
        whiteSpace: "nowrap",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.92 + 0.08 * Math.min(1, p)})`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch (be-databases' Flow). `dash` draws it dashed, revealed by a clip.
 */
export const Arrow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  dash?: string;
  dim?: number;
  out?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 14, dash, dim, out }) => {
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
  const reach = Math.max(0, (len - head + 1) / len);
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
      <path d={arrowHead(line, head, 7.5, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />
    </svg>
  );
};

// ── The recurring figure: Acme Corp's history on a timeline ──────────────────

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** A time axis from `from` to `to` (ISO dates) across x0..x1. */
export const timeline = (x0: number, x1: number, from = "2020-01-01", to = "2025-01-01") => {
  const t0 = day(from);
  const t1 = day(to);
  const tx = (iso: string) => x0 + ((day(iso) - t0) / (t1 - t0)) * (x1 - x0);
  return { x0, x1, tx };
};
export type Timeline = ReturnType<typeof timeline>;

/** "2022-05-10" as "2022-05-10"; a date one day on. */
export const nextDay = (iso: string) => new Date(day(iso) + 86_400_000).toISOString().slice(0, 10);

/**
 * Customer 42 on a timeline from x0 to x1: where each of its two versions
 * starts and ends, and where its two orders fall. Read from the page's own
 * rows (TYPE2.rows42, ORDERS_42), so every scene draws the same history.
 * The open version runs to the axis's end: its 9999-12-31 is off the page.
 */
export const acme = (x0: number, x1: number) => {
  const tl = timeline(x0, x1);
  const R = TYPE2.rows42;
  const c = (row: number, col: string) => R.rows[row][R.cols.indexOf(col)];
  const versions = [0, 1].map((row) => ({
    key: c(row, "customer_sk"),
    region: c(row, "region"),
    from: c(row, "valid_from"),
    to: c(row, "valid_to"),
    current: c(row, "is_current") === "true",
    x0: tl.tx(c(row, "valid_from")),
    // A closed version ends at the end of its last day; the open one runs off
    // the axis.
    x1: c(row, "valid_to").startsWith("9999") ? x1 : tl.tx(nextDay(c(row, "valid_to"))),
  }));
  const O = ORDERS_42;
  const orders = O.rows.map((r) => ({
    id: r[O.cols.indexOf("order_id")],
    date: r[O.cols.indexOf("order_date")],
    amount: r[O.cols.indexOf("amount")],
    x: tl.tx(r[O.cols.indexOf("order_date")]),
  }));
  return { ...tl, versions, orders, moveX: versions[1].x0 };
};

/**
 * Where the recurring figure sits in a question's scene, in layout units:
 * under the question card, the full width of the page. The pins' labels at
 * `label`, the bands at `band`, the axis under them; the scene's own figures
 * start at `LOW`.
 */
const FIG = { x0: 120, x1: 1800, label: 262, band: 350, bandH: 52 } as const;
export const LOW = 540;

/** The recurring figure's geometry on this page (through `y()` and `h()`). */
export const useAcme = () => {
  const { y, h } = useLayout();
  const A = acme(FIG.x0, FIG.x1);
  const bandTop = y(FIG.band);
  const bandH = h(FIG.bandH);
  return { ...A, labelTop: y(FIG.label), bandTop, bandH, bandBottom: bandTop + bandH, axisTop: bandTop + bandH + h(12) };
};

/** The years the content scenes' axis marks. */
export const YEARS = ["2020", "2021", "2022", "2023", "2024"] as const;

/**
 * The axis under the bands: a hairline with a tick and a year at each 1
 * January from `years`. `top` is the hairline's page y.
 */
export const Axis: React.FC<{ tl: Timeline; top: number; at: number; years: readonly string[]; out?: number; dim?: number }> = ({ tl, top, at, years, out, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <line x1={tl.x0} x2={tl.x0 + (tl.x1 - tl.x0) * p} y1={top} y2={top} stroke={HAIRLINE} strokeWidth={1.4} />
      {years.map((yr, i) => {
        const x = tl.tx(`${yr}-01-01`);
        const q = ease(frame, at + 4 + i * 2, 10);
        return (
          <g key={yr} opacity={q}>
            <line x1={x} x2={x} y1={top} y2={top + 9} stroke={INK_SOFT} strokeWidth={1.4} />
            <text x={x} y={top + 34} textAnchor="middle" style={svgText({ fontFamily: SANS, fontSize: 21, fontWeight: 500, color: INK_SOFT })}>
              {yr}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/**
 * One version of a row, drawn as an outlined band over its validity window,
 * from x0 to x1 at `top`. It grows rightward from `at`. `ends` move its
 * right edge on cues (a version closed, or reopened); `open` dashes its
 * right edge, for a window that runs on past the page. The label sits
 * inside on the left; `swapTo` re-inks it on `swapAt`.
 */
export const Band: React.FC<{
  x0: number;
  x1: number;
  top: number;
  h: number;
  at: number;
  label: React.ReactNode;
  swapTo?: React.ReactNode;
  swapAt?: number;
  tone?: Tone;
  tones?: readonly ToneStep[];
  ends?: readonly { at: number; x1: number }[];
  open?: boolean;
  dashed?: boolean;
  size?: number;
  out?: number;
  dim?: number;
}> = ({ x0, x1, top, h, at, label: text, swapTo, swapAt, tone = "plain", tones = [], ends = [], open, dashed, size = 22, out, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const right = ends.reduce((r, e) => r + (e.x1 - r) * ease(frame, e.at, 16), x1);
  const w = (right - x0) * p;
  const line = toneMix(frame, tone, tones, toneLine);
  const ink = toneMix(frame, tone, tones, toneInk);
  const swap = swapAt === undefined ? 0 : ease(frame, swapAt, 12);
  const style = dashed ? "dashed" : "solid";
  return (
    <div style={{ position: "absolute", left: x0, top, width: w, height: h, opacity: (1 - o) * (1 - d) }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          borderTop: `2px ${style} ${line}`,
          borderBottom: `2px ${style} ${line}`,
          borderLeft: `2px ${style} ${line}`,
          borderRight: `2px ${open ? "dashed" : style} ${line}`,
          borderRadius: open ? "6px 0 0 6px" : 6,
        }}
      />
      <div style={{ position: "absolute", left: 16, top: 0, height: h, display: "flex", alignItems: "center", whiteSpace: "nowrap", ...note(size, ink), opacity: ease(frame, at + 8, 10) * (1 - swap) }}>
        {text}
      </div>
      {swapTo ? (
        <div style={{ position: "absolute", left: 16, top: 0, height: h, display: "flex", alignItems: "center", whiteSpace: "nowrap", ...note(size, ink), opacity: swap }}>
          {swapTo}
        </div>
      ) : null}
    </div>
  );
};

/**
 * An order pinned to its date: its id over its date, centred on x, and a
 * line from under them down to `bottom` (a band's top), ending in a dot.
 * A tone colors the line, the dot and the id together.
 */
export const Pin: React.FC<{
  x: number;
  top: number;
  bottom: number;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  tones?: readonly ToneStep[];
  out?: number;
  dim?: number;
  /** The label's height, in page pixels, where the line starts. */
  labelH?: number;
}> = ({ x, top, bottom, at, title, sub, tone = "plain", tones = [], out, dim, labelH }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const line = toneMix(frame, tone, tones, toneLine);
  const ink = toneMix(frame, tone, tones, toneInk);
  const lh = labelH ?? (sub ? 62 : 34);
  const drop = ease(frame, at + 6, 12);
  const y0 = top + lh + 6;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: (1 - o) * (1 - d) }}>
      <div style={{ position: "absolute", left: x - 160, width: 320, top, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * -8}px)` }}>
        <div style={{ ...note(24, ink), whiteSpace: "nowrap" }}>{title}</div>
        {sub ? <div style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap", marginTop: 2 }}>{sub}</div> : null}
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={x} x2={x} y1={y0} y2={y0 + (bottom - y0) * drop} stroke={line} strokeWidth={2} />
        <circle cx={x} cy={bottom} r={6} fill={line} opacity={ease(frame, at + 14, 6)} />
      </svg>
    </div>
  );
};

/** A dated vertical mark (a move, today, a run), from `top` to `bottom`,
 *  dashed unless `solid`. */
export const VMark: React.FC<{ x: number; top: number; bottom: number; at: number; color?: string; solid?: boolean; width?: number; out?: number; dim?: number }> = ({
  x,
  top,
  bottom,
  at,
  color = INK,
  solid,
  width = 2,
  out,
  dim,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <line x1={x} x2={x} y1={top} y2={top + (bottom - top) * p} stroke={color} strokeWidth={width} strokeDasharray={solid ? undefined : "6 5"} />
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each illustration's trimmed size in pixels (public/images/<video>/), so a
 *  spot is drawn at its own aspect and at most half its pixels across on
 *  the 1080p layout (a 4K render doubles it). */
export const ART = {
  crab: { id: "ae-changing-dimensions-hermit-crab", w: 1536, h: 691 },
  camera: { id: "ae-changing-dimensions-camera", w: 1004, h: 861 },
} as const;
export type ArtName = keyof typeof ART;

/** The height a spot `width` wide takes. */
export const spotH = (art: ArtName, width: number) => Math.round((width * ART[art].h) / ART[art].w);

/**
 * A watercolor from illustrations.json, `width` wide at its own aspect: it
 * pops in on `at` (the scene puts `<Sfx name="el-pop">` on the same frame),
 * bobs gently, and fades on `out`.
 */
export const Spot: React.FC<{ art: ArtName; at: number; out?: number; dim?: number; left: number; top: number; width: number }> = ({
  art,
  at,
  out,
  dim,
  left,
  top,
  width,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || frame < at || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={ART[art].id}
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
