import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Cubic, cubicPath, lineLength, sampleCubic } from "../../components/arrow";
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
import { MONO, SANS } from "../../theme/fonts";
import { type Cell, ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the ERD kit
 * (editorial/erd.tsx): a part's kicker and two-ink headline, a SQL listing
 * and a database table drawn as rows and cells (after WhyNormalization's
 * kit.tsx), Postgres's error box and command tag, the foreign-key arrow,
 * the name chips the many-to-many links and the org chart are drawn
 * between, and the slow drift that keeps a finished figure moving.
 *
 * Color roles, as the ERD kit sets them: keys in the data blue, the
 * narration's pointer in the page's yellow, what Postgres refuses (or what
 * cannot work) in the red accent, what it accepts in the green ink.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const HEAD_Y = 150;
/** Table heights before `h()`. */
export const HEAD_H = 52;
export const ROW_H = 62;
/** How far above a figure's top edge (a page value) its FigLabel is set:
 *  the label's own 24px line and about 30px of air under it. Two figures
 *  side by side share one label line, set above the higher of the two. */
export const FIG_ABOVE = 62;

// ── Colors: inkOf (theme/brand.ts) and the editorial palette only ────────────

export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
export const KEY = BAR;
export const KEY_INK = BLUE_INK;
export const MARK_KEY = `color-mix(in srgb, ${BAR} 18%, transparent)`;
export const OK_INK = inkOf.green;
export const MARK_OK = `color-mix(in srgb, ${ds("green", 500)} 20%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 → 1 → 0 over `dur` frames from `at`: a brief swell on something named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

// ── Headings ─────────────────────────────────────────────────────────────────

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/** A one-line headline in two inks: the lead in roman, the turn in the
 *  accent's italic, each inked on its own cue, the second following the first. */
export const Head: React.FC<{
  lead: string;
  leadAt: number;
  turn?: string;
  turnAt?: number;
  out?: number;
  size?: number;
}> = ({ lead, leadAt, turn, turnAt, out, size = 76 }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(HEAD_Y), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={leadAt} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
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

/** A figure's caption line: Inter, sentence case, in the soft ink. */
export const Caption: React.FC<{ at: number; x: number; y: number; out?: number; dim?: number; children: React.ReactNode }> = ({
  at,
  x,
  y,
  out,
  dim,
  children,
}) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  return (
    <Ink at={at} dur={14} out={out} style={{ left: x, top: y, whiteSpace: "nowrap", opacity: 1 - d }}>
      <span style={{ ...label(23, INK), fontWeight: 600 }}>{children}</span>
    </Ink>
  );
};

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.94em", fontWeight: weight ?? 600, color }}>{children}</span>
);

// ── Motion ───────────────────────────────────────────────────────────────────

/**
 * A slow, eased push on a finished figure: it grows by `scale` and shifts by
 * `dx`, `dy` between `from` and `to`, about `origin`, so a figure being
 * talked about never sits dead still. Never a jolt: it eases in and out.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  scale?: number;
  dx?: number;
  dy?: number;
  origin?: readonly [number, number];
  children: React.ReactNode;
}> = ({ from, to, scale = 0.02, dx = 0, dy = 0, origin = [960, 600], children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${origin[0]}px ${origin[1]}px`,
        transform: `translate(${dx * p}px, ${dy * p}px) scale(${1 + scale * p})`,
      }}
    >
      {children}
    </div>
  );
};

/** A ring that swells out of a point and fades: a point being named. */
export const Pulse: React.FC<{ x: number; y: number; at: number; r?: number; color?: string; width?: number }> = ({
  x,
  y,
  at,
  r = 12,
  color = ACCENT,
  width = 2.4,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (p <= 0 || p >= 1) return null;
  return (
    <Svg>
      <circle cx={x} cy={y} r={r + 28 * Easing.out(Easing.cubic)(p)} fill="none" stroke={color} strokeWidth={width} opacity={0.85 * (1 - p)} />
    </Svg>
  );
};

/** A highlighter stroke under the words it wraps, swept on `at`, lifted on `out`. */
export const Mark: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
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

/** A note in Inter that slides up into place: an annotation on a figure. */
export const Tag: React.FC<{
  at: number;
  x: number;
  y: number;
  out?: number;
  dim?: number;
  color?: string;
  size?: number;
  italic?: boolean;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}> = ({ at, x, y, out, dim, color = INK_SOFT, size = 21, italic = false, align = "left", children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const shift = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: p * (1 - o) * (1 - d),
        transform: `translate(${shift}, ${(1 - p) * 10}px)`,
        whiteSpace: "nowrap",
        ...note(size, color),
        fontStyle: italic ? "italic" : "normal",
      }}
    >
      {children}
    </div>
  );
};

/** A watercolor spot from illustrations.json: it pops in, bobs, and fades. */
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

// ── Chips and lines: instances, before they are tables ───────────────────────

export const CHIP_H = 58;

/**
 * A name in a rounded box: a student, a course, an employee. `sub` is a
 * second line in the mono face (an id, a manager id). The box arrives on
 * `at` with a small rise; `tone` washes it; `dim` sets it back.
 */
export const Chip: React.FC<{
  x: number;
  y: number;
  width: number;
  at: number;
  name: string;
  sub?: React.ReactNode;
  tone?: { at: number; color: string; out?: number };
  dim?: number;
  out?: number;
  border?: string;
  dashed?: boolean;
  /** Where (x) the chip slides in from, for one that travels into place. */
  fromX?: number;
  travel?: number;
}> = ({ x, y, width, at, name, sub, tone, dim, out, border = INK, dashed, fromX, travel = 18 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const t = tone ? ease(frame, tone.at, 10) * (1 - (tone.out === undefined ? 0 : ease(frame, tone.out, 10))) : 0;
  const moved = fromX === undefined ? x : lerp(fromX, x, ease(frame, at, travel));
  const height = sub ? CHIP_H + 26 : CHIP_H;
  return (
    <div
      style={{
        position: "absolute",
        left: moved,
        top: y - height / 2,
        width,
        height,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${border}`,
        borderRadius: 10,
        background: t > 0 ? `color-mix(in srgb, ${tone!.color} ${Math.round(t * 100)}%, ${PAPER})` : PAPER,
        opacity: p * (1 - o) * (1 - d),
        transform: fromX === undefined ? `translateY(${(1 - p) * 10}px)` : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <span style={{ fontFamily: SANS, fontWeight: 650, fontSize: 24, color: INK, whiteSpace: "nowrap" }}>{name}</span>
      {sub ? <span style={{ fontFamily: MONO, fontSize: 19, color: INK_SOFT, whiteSpace: "nowrap" }}>{sub}</span> : null}
    </div>
  );
};

/** A straight line drawn from `a` to `b` on `at`: a link between two chips. */
export const Link: React.FC<{
  a: Pt;
  b: Pt;
  at: number;
  dur?: number;
  dim?: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ a, b, at, dur = 14, dim, out, color = INK, width = 2.4 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  if (p <= 0 || o >= 1) return null;
  return (
    <Svg opacity={(1 - o) * (1 - d)}>
      <line x1={a[0]} y1={a[1]} x2={lerp(a[0], b[0], p)} y2={lerp(a[1], b[1], p)} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <circle cx={a[0]} cy={a[1]} r={4} fill={color} />
      {p >= 1 ? <circle cx={b[0]} cy={b[1]} r={4} fill={color} /> : null}
    </Svg>
  );
};

/** A tree edge: down from a parent's bottom, across, and down into a child's top. */
export const Edge: React.FC<{ from: Pt; to: Pt; at: number; dur?: number; dim?: number; color?: string }> = ({
  from,
  to,
  at,
  dur = 14,
  dim,
  color = INK,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  if (p <= 0) return null;
  const midY = (from[1] + to[1]) / 2;
  const pts = `${from[0]},${from[1]} ${from[0]},${midY} ${to[0]},${midY} ${to[0]},${to[1]}`;
  return (
    <Svg opacity={1 - d}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
    </Svg>
  );
};

// ── SQL ──────────────────────────────────────────────────────────────────────

export const LISTING_PAPER = ds("gray", 50);
const TOKEN_INK = {
  keyword: inkOf.purple,
  string: inkOf.green,
  number: inkOf.orange,
  comment: INK_SOFT,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set(["SELECT", "FROM", "WHERE", "UPDATE", "SET", "INSERT", "INTO", "VALUES", "DATE", "JOIN", "LEFT", "ON", "AS"]);
const TABLES = new Set(["enrollments", "user_profiles", "employees", "orders", "customers"]);

type Token = { text: string; color: string; weight?: number };

const tokenize = (line: string): Token[] => {
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

/** One line of SQL in the mono face, colored as the listings color it. */
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

const listingGeometry = (size: number) => ({
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});

export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/** A printed SQL listing: tinted paper between a rule and a hairline,
 *  line numbers in the soft ink. `top` is a page y (through `y()`). */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  lineAt: readonly number[];
  marks?: readonly LineMark[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 24, at, lineAt, marks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: listingHeight(lines.length, size), opacity: (1 - d) * (1 - o) }}>
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
      <div style={{ position: "absolute", left: g.gutter, top: g.padY - 6, bottom: g.padY - 6, width: 1, background: HAIRLINE, opacity: p }} />
      {marks.map((m, i) => {
        const w = ease(frame, m.at, 12);
        const mo = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || mo >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.gutter + size * 0.42,
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
              fontSize: Math.max(19, Math.round(size * 0.8)),
              color: INK_SOFT,
              opacity: ease(frame, lineAt[i] - 4, 10),
            }}
          >
            {i + 1}
          </div>
          <Ink
            at={lineAt[i]}
            dur={14}
            style={{ left: g.gutter + size * 0.77, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}
          >
            <Code line={line} size={size} />
          </Ink>
        </React.Fragment>
      ))}
    </div>
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
  detailMark?: number;
  out?: number;
}> = ({ x, top, width, at, message, detail, detailMark, out }) => (
  <Ink at={at} dur={16} out={out} style={{ left: x, top, width }}>
    <div
      style={{
        borderLeft: `4px solid ${ACCENT}`,
        background: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`,
        padding: "14px 22px 16px",
        fontFamily: MONO,
        fontSize: 20,
        lineHeight: 1.5,
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
        {message}
      </div>
      <div style={{ color: INK_SOFT }}>
        <span style={{ fontWeight: 600 }}>DETAIL:</span>
        {"  "}
        {detailMark === undefined ? detail : <Mark at={detailMark}>{detail}</Mark>}
      </div>
    </div>
  </Ink>
);

/** The command tag Postgres answers a statement with ("UPDATE 1"), set as
 *  psql prints it, with a few words of what it means beside it. */
export const Reply: React.FC<{ x: number; y: number; at: number; text: string; color?: string; out?: number; children?: React.ReactNode }> = ({
  x,
  y,
  at,
  text,
  color = OK_INK,
  out,
  children,
}) => (
  <Ink at={at} dur={14} out={out} style={{ left: x, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 18 }}>
    <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color }}>{text}</span>
    {children ? <span style={{ ...note(22, INK_SOFT) }}>{children}</span> : null}
  </Ink>
);

// ── The database table ───────────────────────────────────────────────────────

export const HEAD_SIZE = 22;
export const BODY_SIZE = 26;
const PAD = 20;
/** JetBrains Mono's advance, in em: every glyph is this wide. */
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

/**
 * Where a table's columns and rows fall. Each column is as wide as its title
 * or its longest value (counting `extra` values a cell will change to), in
 * the monospace advance, plus padding. `top`, `headH` and `rowH` are page
 * values (through `y()` and `h()`).
 */
export const tableGeometry = ({
  x,
  top,
  cols,
  rows,
  extra = [],
  headH,
  rowH,
  minWidths = [],
}: {
  x: number;
  top: number;
  cols: readonly string[];
  rows: readonly (readonly Cell[])[];
  extra?: readonly (readonly Cell[])[];
  headH: number;
  rowH: number;
  /** Floors on column widths, so two tables can share their columns' edges. */
  minWidths?: readonly number[];
}): TableGeometry => {
  const all = [...rows, ...extra];
  const widths = cols.map((c, i) =>
    Math.max(
      minWidths[i] ?? 0,
      Math.ceil(
        Math.max(c.length * ADVANCE * HEAD_SIZE, ...all.map((r) => shown(r[i] ?? "").length * ADVANCE * BODY_SIZE)) + 2 * PAD,
      ),
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
  /** When a row turns into a refused one. */
  ghostAt?: number;
  /** The row opens up as it inks in, pushing the bottom rule down. */
  grow?: boolean;
  strikeAt?: number;
  dimAt?: number;
  /** The row fades and closes up, and the rows under it move up. */
  collapseAt?: number;
  /** Rows left out of the picture: the row holds this note, in Inter's
   *  italic soft ink, instead of cells ("… 44 more rows"). */
  note?: string;
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

const CellText: React.FC<{ value: Cell; color: string; marks: readonly CellMark[]; swap?: CellSwap }> = ({ value, color, marks, swap }) => {
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
  /** Washes behind column titles. */
  headMarks?: readonly { col: number; at: number; out?: number; color?: string }[];
  dim?: number;
  out?: number;
}> = ({ g, cols, rows, at, numeric = [], colInk = {}, marks = [], bands = [], swaps = [], headMarks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const dimmed = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const gone = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || gone >= 1) return null;

  const heights = rows.map(
    (r) =>
      g.rowH * (r.grow ? ease(frame, r.at - 4, 12) : 1) * (r.collapseAt === undefined ? 1 : 1 - ease(frame, r.collapseAt + 4, 12)),
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
    <div style={{ position: "absolute", inset: 0, opacity: (1 - dimmed) * (1 - gone) }}>
      <div style={{ position: "absolute", left: g.x, top: g.top, width: g.width * p, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: g.x, top: g.top + g.headH - 1, width: g.width * p, height: 1, background: HAIRLINE }} />
      <div style={{ position: "absolute", left: g.x, top: bottom - 1, width: g.width * p, height: 1.5, background: INK }} />
      {headMarks.map((m, k) => {
        const w = ease(frame, m.at, 12);
        const o = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || o >= 1) return null;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: g.xs[m.col] + 6,
              top: g.top + 6,
              width: (g.widths[m.col] - 12) * w,
              height: g.headH - 12,
              background: m.color ?? MARK,
              opacity: 1 - o,
            }}
          />
        );
      })}
      <Ink at={at + 2} dur={14} style={{ left: g.x, top: g.top, width: g.width, height: g.headH, display: "flex", alignItems: "center" }}>
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
        const ghost = r.ghost ? 1 : r.ghostAt === undefined ? 0 : ease(frame, r.ghostAt, 10);
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
            {ghost > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: g.x + 2,
                  top: top + 5,
                  width: g.width - 4,
                  height: Math.max(0, hgt - 10),
                  boxSizing: "border-box",
                  border: `2px dashed ${ACCENT}`,
                  opacity: shownAt * ghost * (1 - dim) * (1 - collapse),
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
              {r.note !== undefined ? (
                <div style={{ padding: `0 ${PAD}px`, ...note(21, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap" }}>{r.note}</div>
              ) : (
                r.cells.map((v, j) => (
                  <div key={j} style={cellBox(j)}>
                    <CellText
                      value={v}
                      color={v === null ? ACCENT_INK : (colInk[j] ?? INK)}
                      marks={marks.filter((m) => m.row === i && m.col === j)}
                      swap={swaps.find((s) => s.row === i && s.col === j)}
                    />
                  </div>
                ))
              )}
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
    </div>
  );
};

/** A small tag set above a column title: "PK", "FK", "unique". */
export const ColTag: React.FC<{ g: TableGeometry; col: number; at: number; color?: string; out?: number; children: React.ReactNode }> = ({
  g,
  col,
  at,
  color = KEY_INK,
  out,
  children,
}) => (
  <Ink at={at} dur={12} out={out} style={{ left: g.xs[col] + PAD, top: g.top - 36, whiteSpace: "nowrap" }}>
    <span style={{ ...label(20, color), fontWeight: 700 }}>{children}</span>
  </Ink>
);

// ── Marks drawn on the page ──────────────────────────────────────────────────

/**
 * A foreign key's pointer: a curve from a row of one table to the row of the
 * other that it names, drawn from its tail, with an arrowhead on arrival.
 * It leaves and arrives horizontally, so its last stretch is straight under
 * the head.
 */
export const KeyArrow: React.FC<{ from: Pt; to: Pt; at: number; out?: number; dim?: number; color?: string }> = ({
  from,
  to,
  at,
  out,
  dim,
  color = KEY,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const [fx, fy] = from;
  const [tx, ty] = to;
  const dir = Math.sign(tx - fx) || 1;
  const head = 13;
  const bend = Math.max(40, Math.abs(tx - fx) * 0.5) * dir;
  const curve: Cubic = [from, [fx + bend, fy], [tx - head * dir - bend, ty], to];
  const line = sampleCubic(curve);
  const reach = (lineLength(line) - head + 1) / lineLength(line);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <circle cx={fx} cy={fy} r={4} fill={color} />
      <path d={cubicPath(curve)} fill="none" stroke={color} strokeWidth={2.5} pathLength={1} strokeDasharray={`${p * reach} 1`} />
      <path d={arrowHead(line, head, 7, { filled: true })} fill={color} opacity={ease(frame, at + 12, 5)} />
    </svg>
  );
};

/** A square bracket beside some rows, opening toward them. */
export const RowBracket: React.FC<{ x: number; y0: number; y1: number; at: number; side?: "left" | "right"; color?: string; out?: number }> = ({
  x,
  y0,
  y1,
  at,
  side = "right",
  color = ACCENT,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const k = side === "right" ? 12 : -12;
  return (
    <Svg opacity={1 - o}>
      <path
        d={`M${x},${y0} H${x + k} V${y1} H${x}`}
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
