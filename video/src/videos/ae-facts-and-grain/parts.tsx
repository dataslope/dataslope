import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ART, ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit, the interview kit
 * (editorial/interview.tsx) and the ERD kit (editorial/erd.tsx). The result
 * tables, headings, highlighter, strike and key arrows are the Data Analyst
 * SQL videos' (da-sql/parts.tsx), and the one-line verdict, `Mono` and
 * `lineOf` are Data Engineer Part 3's (de-dimensional-modeling/parts.tsx),
 * whose tables this video re-runs, so the two series' modeling figures are
 * one family. The arrows and the labelled bar are Backend Part 4's
 * (be-databases/parts.tsx).
 *
 * What is local: the listing, copied from be-databases with this video's
 * keywords (OVER, VIEW, MD5's casts) and its highlights found by text; a
 * diagram box outlined in ink (README: no fill, black text, a 2px outline,
 * a highlight colors outline and text together); a red cross; and the spot
 * art, bound to this video.
 */
export {
  DataTable,
  Drift,
  ElbowArrow,
  Headline,
  KEY,
  KEY_INK,
  KeyArrow,
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
  type CellMark,
  type CellSwap,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { colsOf, geoOf, rowsAt } from "../da-advanced-sql/parts";
export { geoWith, Mono, Verdict } from "../de-dimensional-modeling/parts";
export { Bar, Flow } from "../be-databases/parts";
export { OK, OK_INK };

/** The series' name, the kicker every part of it carries. */
export const SERIES = "Analytics engineer interview questions";

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * The index of the line that holds `text`. A highlight finds its line by
 * what the line says, never by a number, so a reworded query fails the
 * render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/** "4,900.00" from "4900.0000". */
export const money = (v: string) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── SQL ──────────────────────────────────────────────────────────────────────

const LISTING_PAPER = ds("gray", 50);
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER JOIN LEFT FULL OUTER ON AND OR NOT IN IS NULL AS WITH DISTINCT ALL CASE " +
    "WHEN THEN ELSE END DESC ASC DATE CREATE VIEW USING INSERT INTO VALUES TABLE BETWEEN LIMIT OVER PARTITION TEXT"
  ).split(" "),
);

type Token = { text: string; color: string; weight?: number };
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(--.*$)|('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: INK_SOFT });
    else if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: inkOf.purple, weight: 500 });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  return out;
};

const Code: React.FC<{ line: string; size: number }> = ({ line, size }) => (
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

/** The width a listing needs for its longest line. */
export const listingWidth = (lines: readonly string[], size: number) => {
  const g = geometry(size);
  return Math.ceil(Math.max(...lines.map((l) => l.length)) * 0.6 * size + 2 * g.padX + 4);
};

/** The vertical middle of a listing's line `i`, in page pixels. */
export const listingLineMid = (top: number, i: number, size: number) => {
  const g = geometry(size);
  return top + g.padY + i * g.lineH + g.lineH / 2;
};

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
  marks?: readonly LineMark[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 21, at, lineAt, marks = [], dim, out }) => {
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
        frame >= (lineAt?.[i] ?? at + 4 + i * 3) - 1 ? (
          <Ink
            key={i}
            at={lineAt?.[i] ?? at + 4 + i * 3}
            dur={14}
            style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}
          >
            <Code line={line} size={size} />
          </Ink>
        ) : null,
      )}
    </div>
  );
};

// ── Diagram boxes ────────────────────────────────────────────────────────────

/** What a box is: plain ink, data (blue), the right answer (green), the trap
 *  (red), or what the narration points at (yellow, its outline only). */
export type Tone = "plain" | "data" | "ok" | "bad" | "look";
const TONE: Record<Tone, string> = {
  plain: INK,
  data: BLUE_INK,
  ok: OK_INK,
  bad: ACCENT_INK,
  look: inkOf.yellow,
};
export const toneInk = (t: Tone) => (t === "look" ? INK : TONE[t]);

/**
 * A diagram's box: no fill, its text in ink, a 2px outline (README, "a
 * diagram's boxes are outlined, not filled"). A tone colors the outline and
 * the text together; `lit` moves it to a tone from a frame on.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  tone?: Tone;
  lit?: { at: number; tone: Tone };
  size?: number;
  mono?: boolean;
  out?: number;
  dim?: number;
  children: React.ReactNode;
}> = ({ x, y, w, h, at, tone = "plain", lit, size = 23, mono, out, dim, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (frame < at || p <= 0.001 || o >= 1) return null;
  const l = lit === undefined ? 0 : ease(frame, lit.at, 10);
  const now = l > 0.5 && lit ? lit.tone : tone;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px solid ${TONE[now]}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 14px",
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `scale(${0.92 + 0.08 * Math.min(1, p)})`,
      }}
    >
      <span
        style={{
          ...(mono ? { fontFamily: MONO, fontSize: size, fontWeight: 500, fontVariantLigatures: "none" } : label(size, INK)),
          color: toneInk(now),
          fontWeight: 500,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {children}
      </span>
    </div>
  );
};

/** A red cross, drawn on `at`, for a column that fails the grain. */
export const Cross: React.FC<{ at: number; size?: number }> = ({ at, size = 24 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (frame < at) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M5 5 L19 19 M19 5 L5 19" fill="none" stroke={ACCENT} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
    </svg>
  );
};

/** A line of notes, in the annotation face, that inks in on `at`. */
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
}> = ({ at, x, y, size = 24, color = INK, weight, out, dim, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  return (
    <Ink at={at} dur={14} out={out} style={{ left: x, top: y, whiteSpace: "nowrap", opacity: 1 - d }}>
      <span style={{ ...note(size, color), fontWeight: weight }}>{children}</span>
    </Ink>
  );
};

/** A small label over a figure, in the label face. */
export const Caption: React.FC<{ at: number; x: number; y: number; out?: number; color?: string; size?: number; children: React.ReactNode }> = ({
  at,
  x,
  y,
  out,
  color = INK_SOFT,
  size = 21,
  children,
}) => (
  <Ink at={at} dur={12} out={out} style={{ left: x, top: y, whiteSpace: "nowrap" }}>
    <span style={{ ...label(size, color), fontWeight: 500 }}>{children}</span>
  </Ink>
);

/** The data blue as a bar's fill, and the trap's red. */
export const BAR_BLUE = BAR;
export const BAR_RED = ACCENT;
export const BAR_GREEN = OK;

// ── Spot illustrations ───────────────────────────────────────────────────────

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
  left: number;
  top: number;
  width: number;
}> = ({ art, at, out, left, top, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = ART[art];
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
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
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame, 4, 110) + (1 - p) * 24}px)`,
      }}
    />
  );
};
