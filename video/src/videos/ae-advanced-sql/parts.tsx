import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The result tables, headings, highlighter,
 * strike and error box are the Data Analyst SQL videos' (da-sql/parts.tsx,
 * with the column and frame helpers of da-advanced-sql/parts.tsx), and the
 * arrow is be-databases', re-exported so the series' SQL videos look like
 * one family.
 *
 * What is local: the listing, copied from be-databases/parts.tsx with this
 * video's keywords and tables, its highlights found by text (`lineOf`); the
 * page's SyntaxBreakdown drawn as a line of code with its parts underlined
 * and labelled; an outlined step box; and the spot art, bound to this video.
 */
export {
  DataTable,
  Drift,
  ErrorBox,
  Headline,
  Kicker,
  Mark,
  MARK,
  MARK_BAD,
  MARK_KEY,
  MARK_OK,
  pulse,
  Strike,
  Svg,
  TableName,
  tableGeometry,
  X0,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { colsOf, geoOf, RowBracket, rowsAt, type FrameStep } from "../da-advanced-sql/parts";
export { Flow } from "../be-databases/parts";
export { OK, OK_INK };

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * Code inside a line of type, at 0.92em of the line (never under 19px), so it
 * stays within the 12% a line's sizes may differ by (README, "One line, one
 * size, one family").
 */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: "max(19px, 0.92em)",
      fontStyle: "normal",
      fontWeight: weight ?? 500,
      color,
      fontVariantLigatures: "none",
      wordSpacing: "-0.3em",
    }}
  >
    {children}
  </span>
);
/** The interview kit's name for code in a question. */
export const QMono: React.FC<{ children: React.ReactNode }> = ({ children }) => <Mono>{children}</Mono>;

/**
 * The index of the line that holds `text`. A highlight finds its line by
 * what the line says, never by a number, so a reworded query fails the
 * render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no line holds ${JSON.stringify(text)}`);
  return i;
};

/** A mark's red band: the trap or the error. */
export const MARK_RED = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
/** A mark's green band: the right answer. */
export const MARK_GREEN = `color-mix(in srgb, ${OK} 24%, transparent)`;
/** A key column's blue band. */
export const MARK_BLUE = `color-mix(in srgb, ${BAR} 20%, transparent)`;

// ── SQL ──────────────────────────────────────────────────────────────────────

const LISTING_PAPER = ds("gray", 50);
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER JOIN LEFT ON AND OR NOT IN IS NULL AS WITH DISTINCT ALL CASE WHEN " +
    "THEN ELSE END DESC ASC DATE INTERVAL OVER PARTITION ROWS RANGE BETWEEN UNBOUNDED PRECEDING FOLLOWING " +
    "CURRENT ROW RECURSIVE UNION FILTER QUALIFY CROSS LATERAL VALUES WINDOW TIMESTAMP PIVOT FOR CAST LIMIT"
  ).split(" "),
);
const TABLES = new Set([
  "sales",
  "customer_updates",
  "ranked",
  "daily",
  "payments",
  "monthly",
  "logins",
  "spine",
  "bounds",
  "daily_orders",
  "daily_summary",
  "products",
  "recent",
  "nums",
  "wide",
  "org",
  "emp",
  "kept",
]);

type Token = { text: string; color: string; weight?: number };
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, str, num, word] = m;
    if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: inkOf.purple, weight: 500 });
    else if (word && TABLES.has(word)) out.push({ text, color: INK, weight: 500 });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  return out;
};

/** One line of SQL, colored. */
export const Code: React.FC<{ line: string; size: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
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

/** The vertical middle of a listing's line `i`, in page pixels. */
export const listingLineMid = (top: number, i: number, size: number) => {
  const g = geometry(size);
  return top + g.padY + i * g.lineH + g.lineH / 2;
};

/** The x of character `col` of a listing line, in page pixels (a mono
 *  character is 0.6em). */
export const listingCharX = (x: number, col: number, size: number) => x + geometry(size).padX + col * 0.6 * size;

/** The width a listing needs for its longest line. */
export const listingWidth = (lines: readonly string[], size: number) =>
  Math.ceil(Math.max(...lines.map((l) => l.length)) * 0.6 * size + 2 * geometry(size).padX + 6);

/** A highlight on one line, found by text; `text` narrows it to a span
 *  (its `nth` occurrence on the line, from 1). */
export type LineMark = { line: string; text?: string; nth?: number; at: number; out?: number; color?: string; strike?: boolean };

const indexOfNth = (line: string, text: string, nth = 1) => {
  let at = -1;
  for (let k = 0; k < nth; k++) {
    at = line.indexOf(text, at + 1);
    if (at < 0) return -1;
  }
  return at;
};

/** The band a mark draws: the whole line from its indent, or one span. */
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
  const start = mark.text === undefined ? line.length - line.trimStart().length : indexOfNth(line, mark.text, mark.nth);
  if (start < 0) throw new Error(`line ${JSON.stringify(line)} has no ${JSON.stringify(mark.text)}`);
  const marked = mark.text === undefined ? line.length - start : mark.text.length;
  const chars = mark.text === undefined && /[;,]$/.test(line) ? marked : /[;,]/.test(line[start + marked] ?? "") ? marked + 1 : marked;
  const open = (c: string | undefined) => c === undefined || c === " ";
  const padL = open(line[start - 1]) ? 0.32 : 0.04;
  const padR = open(line[start + chars]) ? 0.32 : 0.04;
  if (mark.strike) {
    // A line struck through the span, in the trap's red: what is dropped.
    return (
      <div
        style={{
          position: "absolute",
          left: padX + (start * 0.6 - 0.08) * size,
          top: padY + i * lineH + lineH / 2 - 1.5,
          height: 3,
          borderRadius: 2,
          width: (chars * 0.6 + 0.16) * size * w,
          background: mark.color ?? ACCENT,
          opacity: 1 - o,
        }}
      />
    );
  }
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
 * A printed SQL listing: tinted paper between a rule above and a hairline
 * below, each line inking in on its own cue. Marks find their line (and
 * span) by text.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width?: number;
  size?: number;
  at: number;
  lineAt?: readonly number[];
  step?: number;
  marks?: readonly LineMark[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 21, at, lineAt, step = 3, marks = [], dim, out }) => {
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
      {marks
        .filter((m) => !m.strike)
        .map((m, k) => (
          <Band key={k} lines={lines} mark={m} size={size} {...g} />
        ))}
      {lines.map((line, i) => {
        const lat = lineAt?.[i] ?? at + 4 + i * step;
        return frame >= lat - 1 ? (
          <Ink key={i} at={lat} dur={14} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
            <Code line={line} size={size} />
          </Ink>
        ) : null;
      })}
      {marks
        .filter((m) => m.strike)
        .map((m, k) => (
          <Band key={`s${k}`} lines={lines} mark={m} size={size} {...g} />
        ))}
    </div>
  );
};

// ── The page's SyntaxBreakdown ───────────────────────────────────────────────

export type SynPart = {
  text: string;
  /** What the part does, under its underline. */
  label?: React.ReactNode;
  /** When the underline and the label arrive. */
  at?: number;
  /** Which row of labels: 0 directly under, 1 a row further down, joined by
   *  a short leader, for a label wider than the room before the next one. */
  row?: 0 | 1;
  /** The underline's color while the narration is on it (yellow). */
  hot?: { at: number; out?: number };
  /** Underline and label in this ink, for good (green or red). */
  ink?: string;
};

/**
 * A line of code split into its parts, as the page's SyntaxBreakdown draws
 * it: the parts in the mono face separated by a space, each part that has a
 * label underlined, its label under it. A label that would run into the
 * next one drops to a second row with a leader from its underline.
 */
export const SyntaxBreak: React.FC<{
  parts: readonly SynPart[];
  x: number;
  top: number;
  at: number;
  size?: number;
  labelSize?: number;
  /** The vertical room for each row of labels, a page length. */
  pitch?: number;
  dim?: number;
  out?: number;
}> = ({ parts, x, top, at, size = 28, labelSize = 22, pitch = 44, dim, out }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at - 1 || o >= 1) return null;
  const adv = 0.6 * size;
  const starts: number[] = [];
  let col = 0;
  for (const p of parts) {
    starts.push(col);
    col += p.text.length + 1;
  }
  const lineY = top + size * 1.3;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: (1 - d) * (1 - o) }}>
      {parts.map((p, i) => (
        <Ink key={`c${i}`} at={at + i * 3} dur={14} style={{ left: x + starts[i] * adv, top, whiteSpace: "pre" }}>
          <Code line={p.text} size={size} />
        </Ink>
      ))}
      {parts.map((p, i) => {
        if (p.at === undefined) return null;
        const u = ease(frame, p.at, 12);
        if (u <= 0) return null;
        const hot = p.hot ? ease(frame, p.hot.at, 10) * (p.hot.out === undefined ? 1 : 1 - ease(frame, p.hot.out, 10)) : 0;
        const base = p.ink ?? INK;
        const color = hot > 0 ? `color-mix(in srgb, ${inkOf.yellow} ${Math.round(hot * 100)}%, ${base})` : base;
        const left = x + starts[i] * adv;
        const width = p.text.length * adv;
        const row = p.row ?? 0;
        const labelTop = lineY + 16 + row * pitch;
        return (
          <React.Fragment key={`u${i}`}>
            <div style={{ position: "absolute", left, top: lineY, width: width * u, height: 3, borderRadius: 2, background: color }} />
            {row > 0 && p.label !== undefined ? (
              <div style={{ position: "absolute", left: left + 10, top: lineY + 3, width: 1.5, height: (labelTop - lineY - 6) * ease(frame, p.at + 4, 10), background: HAIRLINE }} />
            ) : null}
            {p.label === undefined ? null : (
              <Ink at={p.at + 6} dur={12} style={{ left: row > 0 ? left + 22 : left, top: labelTop, whiteSpace: "nowrap" }}>
                <span style={{ ...note(labelSize, p.ink ?? INK_SOFT) }}>{p.label}</span>
              </Ink>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Where part `i` of a SyntaxBreak starts and ends, in page x. */
export const synSpan = (parts: readonly SynPart[], x: number, i: number, size = 28) => {
  const start = parts.slice(0, i).reduce((s, p) => s + p.text.length + 1, 0);
  return { left: x + start * 0.6 * size, right: x + (start + parts[i].text.length) * 0.6 * size };
};

// ── Outlined boxes ───────────────────────────────────────────────────────────

/**
 * A diagram's box (README, "A diagram's boxes are outlined, not filled"): no
 * fill, a 2px ink outline, black text; `ink` colors the outline and the
 * text together for a highlight.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  ink?: string;
  dim?: number;
  out?: number;
  dashed?: boolean;
  children: React.ReactNode;
}> = ({ x, y, w, h, at, ink = INK, dim, out, dashed, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${ink}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: ink,
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
      }}
    >
      {children}
    </div>
  );
};

/** The red X that marks a refused path, drawn on `at`. */
export const Cross: React.FC<{ x: number; y: number; at: number; size?: number; out?: number }> = ({ x, y, at, size = 26, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const s = size / 2;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <path d={`M${x - s},${y - s} L${x + s},${y + s}`} stroke={ACCENT} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${Math.min(1, p * 2)} 1`} />
      <path d={`M${x + s},${y - s} L${x - s},${y + s}`} stroke={ACCENT} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${Math.max(0, p * 2 - 1)} 1`} />
    </svg>
  );
};

/** Text in a hue, for a note set in the right answer's or the trap's ink. */
export const tone = { ok: OK_INK, bad: ACCENT_INK, data: inkOf.blue, look: inkOf.yellow } as const;

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each illustration's trimmed size in pixels (public/images/ae-advanced-sql/),
 *  so a spot is drawn at its own aspect and at most half its pixels across
 *  on the 1080p layout (a 4K render doubles it). */
export const ART = {
  giraffe: { id: "ae-advanced-sql-giraffe", w: 1316, h: 1024 },
  books: { id: "ae-advanced-sql-books", w: 974, h: 872 },
  calendar: { id: "ae-advanced-sql-calendar", w: 1000, h: 929 },
  keys: { id: "ae-advanced-sql-keys", w: 1024, h: 1020 },
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
  // The hero is always there; a spot waits for its file.
  if ((art !== "giraffe" && !ILLUSTRATIONS) || frame < at || p <= 0.001 || o >= 1) return null;
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

/** Fades its children in from `from` and, if given, out from `to`. */
export const Stage: React.FC<{ from: number; to?: number; dur?: number; children: React.ReactNode }> = ({ from, to, dur = 10, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, dur) * (to === undefined ? 1 : 1 - ease(frame, to, dur));
  if (o <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{children}</div>;
};

/** A line of note text, placed and inked in on `at`. */
export const Line: React.FC<{
  at: number;
  x: number;
  y: number;
  size?: number;
  color?: string;
  weight?: number;
  out?: number;
  dim?: number;
  children: React.ReactNode;
}> = ({ at, x, y, size = 24, color = INK, weight = 500, out, dim, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  return (
    <Ink at={at} dur={14} out={out} style={{ left: x, top: y, whiteSpace: "nowrap", opacity: 1 - d }}>
      <span style={{ ...note(size, color), fontWeight: weight }}>{children}</span>
    </Ink>
  );
};

/** A red line struck through something drawn elsewhere (a column title, a
 *  cell): `x`, `y` its left end and middle, `w` its length. */
export const StrikeBar: React.FC<{ x: number; y: number; w: number; at: number; out?: number }> = ({ x, y, w, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top: y - 1.5, width: w * p, height: 3, borderRadius: 2, background: ACCENT, opacity: 1 - o }} />;
};
