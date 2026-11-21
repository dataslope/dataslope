import React from "react";
import { getStaticFiles, useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Badge, type BadgeTone, Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (kicker, headline,
 * highlighter, strike, result tables, the slow push) is the Data Analyst
 * pandas part's (da-pandas/parts.tsx, whose Mark takes its bleed back as
 * margin and whose Strike reads a line's length), re-exported so the
 * interview tracks read as one family.
 *
 * What is local: a listing that prints SQL, dbt's Jinja-wrapped SQL and YAML
 * in one look, its highlights, strikes, underlines and insertions all found
 * by text; the outlined diagram box (the owner's 2026-11-12 rule: no fill, a
 * 2px ink outline, black text, a highlight colors the outline and the text
 * together); the arrows that join boxes (de-pipelines' Flow); a drawn cross
 * beside the kit's tick; and the spot art, which can also show another
 * part's hero once that part's art is on disk.
 */
export {
  DataTable,
  Drift,
  Headline,
  Kicker,
  Mark,
  MARK_BAD,
  MARK_OK,
  pulse,
  RIGHT,
  Strike,
  Svg,
  tableGeometry,
  TableName,
  X0,
  type Col,
  type TableGeometry,
  type TableRow,
} from "../da-pandas/parts";
export { OK, OK_INK };

/** The series' kicker, the same on every scene that carries one. */
export const SERIES = "Analytics engineer interview questions";

/** The house badge (editorial/ui.tsx) in the label face: Badge sets no
 *  family of its own, and on the editorial page it would inherit the serif. */
export const Chip: React.FC<{ tone: BadgeTone; size?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ tone, size = 24, style, children }) => (
  <Badge tone={tone} size={size} style={{ fontFamily: SANS, ...style }}>
    {children}
  </Badge>
);

/** A plain sentence on the page. */
export const line = (size = 26, color: string = INK): React.CSSProperties => ({ ...note(size, color), whiteSpace: "nowrap" });

/** A mark's green band: the right answer. */
export const MARK_GREEN = `color-mix(in srgb, ${OK} 24%, transparent)`;

/**
 * The index of the line in `lines` that holds `text`. A highlight finds its
 * line by what the line says, never by a number, so a reworded query fails
 * the render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  // A line that is exactly the text (its indent aside) wins over one that
  // only contains it: "SUM(o.amount) FILTER (" is also the start of the line
  // above it.
  const exact = lines.findIndex((l) => l.trim() === text.trim());
  const i = exact >= 0 ? exact : lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/** Everything inside fades off the page from `at`, for a figure the scene has
 *  finished with before the next one takes its place. */
export const Clear: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, at, 14);
  if (o >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - o, transform: `translateY(${-o * 8}px)` }}>{children}</div>;
};

// ── Listings: SQL, dbt models and YAML ──────────────────────────────────────

export type Lang = "sql" | "dbt" | "yaml";

const LISTING_PAPER = ds("gray", 50);
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER JOIN LEFT ON AND OR NOT IN IS NULL AS WITH DISTINCT CASE WHEN THEN " +
    "ELSE END USING FILTER INTERVAL FALSE TRUE IF ENDIF"
  ).split(" "),
);
const TABLES = new Set(["orders", "customers", "fct_orders", "raw_orders"]);

type Token = { text: string; color: string; weight?: number };

/** SQL, upper or lower case (a dbt model is written lower), with dbt's
 *  `{{ }}` and `{% %}` set soft like punctuation. */
const sqlTokens = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(--.*$)|(\{\{|\}\}|\{%|%\})|('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, jinja, str, num, word] = m;
    if (comment) out.push({ text, color: INK_SOFT });
    else if (jinja) out.push({ text, color: INK_SOFT });
    else if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (word && KEYWORDS.has(word.toUpperCase())) out.push({ text, color: inkOf.purple, weight: 500 });
    else if (word && TABLES.has(word)) out.push({ text, color: INK, weight: 500 });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  return out;
};

/** YAML: a key in ink at weight 500, its colon and list marks soft, values
 *  in ink. A description's folded lines are values. */
const yamlTokens = (line: string): Token[] => {
  const key = line.match(/^(\s*)(- )?([A-Za-z_]+)(:)(.*)$/);
  const rest = (s: string): Token[] => {
    const out: Token[] = [];
    for (const m of s.matchAll(/([A-Za-z_][\w.]*)|(\s+)|(.)/g)) {
      const [text, word] = m;
      out.push({ text, color: word ? INK : INK_SOFT });
    }
    return out;
  };
  if (!key) return rest(line);
  const [, indent, dash, name, colon, tail] = key;
  return [
    { text: indent, color: INK_SOFT },
    ...(dash ? [{ text: dash, color: INK_SOFT }] : []),
    { text: name, color: INK, weight: 500 },
    { text: colon, color: INK_SOFT },
    ...rest(tail),
  ];
};

/** One printed line, colored for its language. */
export const Code: React.FC<{ line: string; size: number; lang?: Lang; color?: string }> = ({ line, size, lang = "sql", color }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {(lang === "yaml" ? yamlTokens(line) : sqlTokens(line)).map((t, i) => (
      <span key={i} style={{ color: color ?? t.color, fontWeight: t.weight ?? 400 }}>
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
  Math.ceil(Math.max(...lines.map((l) => l.length)) * 0.6 * size + 2 * geometry(size).padX);

/**
 * Something drawn on one line, found by text; `text` narrows it to a span.
 * A band is the highlighter (or `color`); a strike runs through the span; an
 * underline sits under it.
 */
export type LineMark = { line: string; text?: string; at: number; out?: number; color?: string; kind?: "band" | "strike" | "under" };

/** Text written into a line after `after` (found by text), opening on `at`:
 *  the rest of the line moves over to make room, and the new text is green. */
export type LineInsert = { line: string; after: string; text: string; at: number; color?: string };

const Mark1: React.FC<{ lines: readonly string[]; mark: LineMark; size: number; padX: number; padY: number; lineH: number }> = ({
  lines,
  mark,
  size,
  padX,
  padY,
  lineH,
}) => {
  const frame = useCurrentFrame();
  const w = ease(frame, mark.at, mark.kind === "band" || !mark.kind ? 12 : 10);
  const o = mark.out === undefined ? 0 : ease(frame, mark.out, 10);
  if (w <= 0 || o >= 1) return null;
  const i = lineOf(lines, mark.line);
  const line = lines[i];
  const start = mark.text === undefined ? line.length - line.trimStart().length : line.indexOf(mark.text);
  if (start < 0) throw new Error(`line ${JSON.stringify(line)} has no ${JSON.stringify(mark.text)}`);
  const chars = mark.text === undefined ? line.length - start : mark.text.length;
  const kind = mark.kind ?? "band";
  if (kind !== "band") {
    const color = mark.color ?? ACCENT;
    return (
      <div
        style={{
          position: "absolute",
          left: padX + start * 0.6 * size - 2,
          top: padY + i * lineH + (kind === "strike" ? lineH / 2 - 1.5 : lineH * 0.8),
          width: (chars * 0.6 * size + 4) * w,
          height: 3,
          borderRadius: 2,
          background: color,
          opacity: 1 - o,
        }}
      />
    );
  }
  // A third of an em either side, but only into a space or past the line's
  // end; where another character touches, the band stops at the cell edge.
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

/** A line with an insertion opening in it: the text before, the new text
 *  growing from nothing in its own color, then the rest. */
const InsertedLine: React.FC<{ line: string; ins: LineInsert; size: number; lang: Lang }> = ({ line, ins, size, lang }) => {
  const frame = useCurrentFrame();
  const k = line.indexOf(ins.after);
  if (k < 0) throw new Error(`line ${JSON.stringify(line)} has no ${JSON.stringify(ins.after)}`);
  const cut = k + ins.after.length;
  const p = ease(frame, ins.at, 16);
  const ch = 0.6 * size;
  return (
    <span style={{ display: "inline-flex", whiteSpace: "pre", fontSize: size }}>
      <Code line={line.slice(0, cut)} size={size} lang={lang} />
      <span style={{ display: "inline-block", overflow: "hidden", width: ins.text.length * ch * p, verticalAlign: "bottom" }}>
        <Code line={ins.text} size={size} lang={lang} color={ins.color ?? OK_INK} />
      </span>
      <Code line={line.slice(cut)} size={size} lang={lang} />
    </span>
  );
};

/**
 * A printed listing: tinted paper between a rule above and a hairline below,
 * each line inking in on its own cue. Marks and insertions find their line
 * (and span) by text.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  lang?: Lang;
  at: number;
  lineAt?: readonly number[];
  step?: number;
  marks?: readonly LineMark[];
  inserts?: readonly LineInsert[];
  dim?: number;
  out?: number;
  /** A line that fades back, by text, from a frame (the rows a reading
   *  ignores). */
  fades?: readonly { line: string; at: number; out?: number }[];
}> = ({ lines, x, top, width, size = 20, lang = "sql", at, lineAt, step = 3, marks = [], inserts = [], dim, out, fades = [] }) => {
  const frame = useCurrentFrame();
  const g = geometry(size);
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
      {marks
        .filter((m) => (m.kind ?? "band") === "band")
        .map((m, k) => (
          <Mark1 key={k} lines={lines} mark={m} size={size} {...g} />
        ))}
      {lines.map((l, i) => {
        const cue = lineAt?.[i] ?? at + 4 + i * step;
        if (frame < cue - 1 || !l) return null;
        const ins = inserts.find((s) => lineOf(lines, s.line) === i);
        const fade = fades.find((f) => lineOf(lines, f.line) === i);
        const faded = fade ? ease(frame, fade.at, 12) * (fade.out === undefined ? 1 : 1 - ease(frame, fade.out, 12)) : 0;
        return (
          <Ink key={i} at={cue} dur={14} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center", opacity: 1 - 0.6 * faded }}>
            {ins && frame >= ins.at ? <InsertedLine line={l} ins={ins} size={size} lang={lang} /> : <Code line={l} size={size} lang={lang} />}
          </Ink>
        );
      })}
      {marks
        .filter((m) => (m.kind ?? "band") !== "band")
        .map((m, k) => (
          <Mark1 key={`s${k}`} lines={lines} mark={m} size={size} {...g} />
        ))}
    </div>
  );
};

/** Where a span of a listing line sits, in page pixels: its left and right
 *  ends and its line's middle, for a note or an arrow placed against it. */
export const spanAt = (lines: readonly string[], line: string, text: string, x: number, top: number, size: number) => {
  const i = lineOf(lines, line);
  const start = lines[i].indexOf(text);
  if (start < 0) throw new Error(`line ${JSON.stringify(lines[i])} has no ${JSON.stringify(text)}`);
  return { x0: listingCharX(x, start, size), x1: listingCharX(x, start + text.length, size), mid: listingLineMid(top, i, size), line: i };
};

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/** What a box is: plain ink, data (blue), the right answer (green), the trap
 *  (red), what the narration points at (yellow), or set back (grey). The
 *  color is the outline's and the title's together, never a fill. */
export type Tone = "plain" | "data" | "ok" | "bad" | "lit" | "soft";
const TONE: Record<Tone, { line: string; ink: string }> = {
  plain: { line: INK, ink: INK },
  data: { line: BAR, ink: BLUE_INK },
  ok: { line: OK, ink: OK_INK },
  bad: { line: ACCENT, ink: ACCENT_INK },
  lit: { line: inkOf.yellow, ink: INK },
  soft: { line: ds("gray", 400), ink: INK_SOFT },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;

/**
 * A diagram's box: a rounded 2px outline, no fill, its title in the outline's
 * color, popping in on `at`. `toTone` recolors outline and title together
 * from `toAt`, for a box the narration lights or settles.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  toTone?: Tone;
  toAt?: number;
  size?: number;
  subSize?: number;
  mono?: boolean;
  dashed?: boolean;
  dim?: number;
  out?: number;
  align?: "center" | "top";
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "plain", toTone, toAt, size = 24, subSize = 21, mono, dashed, dim, out, align = "center", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || p <= 0.001 || o >= 1) return null;
  const k = toTone && toAt !== undefined ? ease(frame, toAt, 12) : 0;
  const a = TONE[tone];
  const b = TONE[toTone ?? tone];
  const mix = (u: string, v: string) => (k <= 0 ? u : k >= 1 ? v : `color-mix(in srgb, ${v} ${k * 100}%, ${u})`);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${mix(a.line, b.line)}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: 4,
        padding: align === "center" ? "0 14px" : "14px 18px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.92 + 0.08 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      <span
        style={{
          ...label(size, mix(a.ink, b.ink)),
          fontWeight: 500,
          whiteSpace: "nowrap",
          textAlign: "center",
          ...(mono ? { fontFamily: MONO, fontVariantLigatures: "none" } : {}),
        }}
      >
        {title}
      </span>
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", textAlign: "center" }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from its
 * tail on `at`, its head built by arrowHead() on the straight last stretch.
 * `dash` draws it dashed, revealed by a clip that follows the tip.
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
  /** Stops the line this far along (0 to 1), with no head: a path refused. */
  cut?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 14, dash, dim, out, cut }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur) * (cut ?? 1);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2 ? roundedPolyline(points, 18) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = cut === undefined ? Math.max(0, (len - head + 1) / len) : 1;
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
      {cut === undefined ? <path d={arrowHead(line, head, 7, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} /> : null}
    </svg>
  );
};

/** A cross, drawn on `at`, in the trap's red: the kit's Tick's opposite. */
export const Cross: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 22, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, at, 7);
  const b = ease(frame, at + 5, 7);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M6 6 L18 18" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} />
      <path d="M18 6 L6 18" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} />
    </svg>
  );
};

/** A thin bracket under (or over) a span of the page, from x0 to x1 at y, its
 *  ends turned `lip` toward the thing it groups, drawn from the middle out. */
export const Bracket: React.FC<{ x0: number; x1: number; y: number; at: number; lip?: number; color?: string; out?: number }> = ({
  x0,
  x1,
  y,
  at,
  lip = -12,
  color = INK,
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const half = ((x1 - x0) / 2) * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <path d={`M${mid - half},${y + lip} V${y} H${mid + half} V${y + lip}`} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
};

/** A highlighter swell on a page element that is not text: the yellow wash as
 *  a band behind a rectangle. */
export const Wash: React.FC<{ x: number; y: number; w: number; h: number; at: number; out?: number; color?: string }> = ({ x, y, w, h, at, out, color = HIGHLIGHT }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top: y, width: w * p, height: h, background: color, borderRadius: 4, opacity: 1 - o }} />;
};

// ── Spot illustrations ──────────────────────────────────────────────────────

/** Whether a file is in public/: another part's hero may not be generated
 *  yet while the series is built, and an <Img> that 404s fails the render. */
const ON_DISK = (() => {
  try {
    return new Set(getStaticFiles().map((f) => f.name));
  } catch {
    return null;
  }
})();
export const hasArt = (video: string, id: string) => (ON_DISK ? ON_DISK.has(`images/${video}/${id}.webp`) : video === VIDEO);

/**
 * A watercolor from illustrations.json (or another part's hero, by `video`):
 * it pops in on `at` (an el-pop placed beside it on the same frame), bobs
 * gently, dims from `dim` and fades on `out`. `phase` staggers the bob.
 */
export const Spot: React.FC<{
  id: string;
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  phase?: number;
  amp?: number;
}> = ({ id, video = VIDEO, at, out, dim, left, top, width, height, phase = 0, amp = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || !hasArt(video, id) || frame < at || p <= 0.001 || o >= 1) return null;
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
        transform: `translateY(${bob(frame + phase, amp, 110) + (1 - p) * 24}px)`,
      }}
    />
  );
};

/** Each image's own pixels (public/images/<video>/), so a box keeps its shape
 *  and stays under half of them (a 4K render doubles the 1080p layout). */
export const ART: Record<string, readonly [number, number]> = {
  "ae-ai-semantic-layer-dolphin": [1104, 1024],
  "ae-ai-semantic-layer-padlock": [774, 1024],
  "ae-ai-semantic-layer-golden": [998, 904],
  "ae-ai-semantic-layer-magnifier": [1024, 994],
  "ae-interview-platypus": [1516, 1000],
  "ae-facts-and-grain-sparrow": [1449, 1024],
  "ae-changing-dimensions-hermit-crab": [1536, 691],
  "ae-dbt-weaver-bird": [1059, 1014],
  "ae-incremental-snail": [1485, 864],
  "ae-advanced-sql-giraffe": [1316, 1024],
  "ae-warehousing-camel": [1138, 1024],
  "ae-testing-woodpecker": [590, 1024],
  "ae-metrics-pelican": [852, 1013],
};

/** A box `width` wide for an image, at its own aspect ratio. */
export const artBox = (id: string, width: number) => {
  const a = ART[id];
  if (!a) throw new Error(`no size recorded for ${id}`);
  return { width, height: Math.round((width * a[1]) / a[0]) };
};

/** The largest box for an image that fits in `w` x `h`, at its aspect. */
export const artFit = (id: string, w: number, h: number) => {
  const a = ART[id];
  if (!a) throw new Error(`no size recorded for ${id}`);
  const s = Math.min(w / a[0], h / a[1]);
  return { width: Math.round(a[0] * s), height: Math.round(a[1] * s) };
};

