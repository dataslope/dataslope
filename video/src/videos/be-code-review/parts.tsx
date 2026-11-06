import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, during, ease, pop } from "../../components/motion";
import { OK, OK_INK, Tick } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The page geometry, headline, kicker, highlighter,
 * strike, console and drift are DA Part 2's (da-pandas/parts.tsx), as they
 * are for DE Part 5 (de-python), so Python reads the same in every series;
 * `lineOf` is de-python's. What is new here is the one thing this video does
 * that none before it did: a **diff**. `DiffListing` is the house listing
 * (gray-50 paper between a rule and a hairline, the same token colors) with a
 * sign gutter, and a green or red tint under each added or removed line, so a
 * listing can become its own diff in place. Around it: a Python value set in
 * the listing's colors (`Py`), the kinds-of-bug cards, the debugging round's
 * five steps, the review's checklist, a grid of test results, a number line
 * for intervals, and the spot bound to this video.
 */
export { Console, consoleHeight, Drift, Headline, Kicker, lerp, LISTING_PAPER, Mark, MARK, MARK_BAD, MARK_OK, pulse, Strike, Svg, X0 } from "../da-pandas/parts";
export { FadeIn, Source } from "../ds-python-pandas/parts";
export { lineOf, Title } from "../de-python/parts";
export { OK, OK_INK, Tick };

/** The page's right margin for this video's figures. */
export const RIGHT = 1800;
/** A light green and a light red under an added and a removed line. */
export const TINT_ADD = `color-mix(in srgb, ${OK} 15%, transparent)`;
export const TINT_DEL = `color-mix(in srgb, ${ACCENT} 12%, transparent)`;
/** A ring drawn around what the narration points at: the yellow, deep enough
 *  to read as a line on white. */
export const RING = ds("yellow", 600);

// ── Python, colored as every listing in the series colors it ────────────────

const TOKEN_INK = {
  keyword: inkOf.purple,
  string: inkOf.green,
  number: inkOf.orange,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set(
  "import from as def return lambda if else elif for in and or not is True False None with assert try except pass raise".split(" "),
);

type Token = { text: string; color: string; weight?: number };

/** A small Python tokenizer: enough for a few printed lines. */
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(#.*$)|(f?"(?:[^"\\]|\\.)*"|f?'(?:[^'\\]|\\.)*')|(\d[\d_]*(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: TOKEN_INK.punct });
    else if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of Python, colored. */
export const Code: React.FC<{ line: string; size?: number; weight?: number }> = ({ line, size, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

/**
 * A Python value as it prints (`[[8, 6]]`): brackets and commas in the soft
 * ink, the numbers in `ink` when the value is being judged (red wrong, green
 * right), otherwise in the listing's number orange.
 */
export const Py: React.FC<{ text: string; size?: number; ink?: string; weight?: number }> = ({ text, size = 22, ink, weight = 600 }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none", fontWeight: weight }}>
    {[...text.matchAll(/(\d+)|([^\d]+)/g)].map(([t, num], i) => (
      <span key={i} style={{ color: num ? ink ?? TOKEN_INK.number : INK_SOFT }}>
        {t}
      </span>
    ))}
  </span>
);

// ── A listing that can show its own diff ────────────────────────────────────

/** The sign column, in characters: the sign and a space. */
const GUTTER = 2;

export const geo = (size: number) => ({
  lineH: Math.round(size * 1.8),
  padY: Math.round(size * 0.66),
  padX: Math.round(size * 0.8),
  /** JetBrains Mono's advance: every glyph is 0.6em wide. */
  ch: size * 0.6,
});

/** The full height of a listing of `lines` lines. */
export const diffHeight = (lines: number, size: number) => {
  const g = geo(size);
  return g.padY * 2 + lines * g.lineH;
};

/** The top of line `i` inside a listing. */
export const lineTop = (i: number, size: number) => {
  const g = geo(size);
  return g.padY + i * g.lineH;
};

/** The width a listing needs for its longest line, the gutter included. */
export const diffWidth = (lines: readonly string[], size: number, diff = true) => {
  const g = geo(size);
  const n = Math.max(...lines.map((l) => (diff ? l.length - 1 : l.length)));
  return Math.ceil(2 * g.padX + (n + GUTTER) * g.ch + size * 0.4);
};

export type DiffMark = {
  line: number;
  at: number;
  out?: number;
  color?: string;
  /** Only this span of the line, found by its text; the whole line if not. */
  text?: string;
};

/**
 * A printed Python listing, or a diff of one. Each line carries difflib's
 * sign as its first character (" ", "+" or "-"); `diff={false}` takes plain
 * lines. The signs and the line tints show from `signsAt`, so a listing can
 * arrive plain and then turn into the diff it is. `wipe={false}` fades it in
 * rather than wiping, for a version that replaces another in the same place.
 */
export const DiffListing: React.FC<{
  lines: readonly string[];
  diff?: boolean;
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  wipe?: boolean;
  signsAt?: number;
  lineAt?: readonly number[];
  marks?: readonly DiffMark[];
  dim?: number;
  out?: number;
  style?: React.CSSProperties;
}> = ({ lines, diff = true, x, top, width, size = 20, at, wipe = true, signsAt, lineAt, marks = [], dim, out, style }) => {
  const frame = useCurrentFrame();
  const g = geo(size);
  const p = ease(frame, at, wipe ? 16 : 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const signs = ease(frame, signsAt ?? at, 12);
  const rows = lines.map((l) => (diff ? { sign: l[0], code: l.slice(1) } : { sign: " ", code: l }));
  const codeX = g.padX + GUTTER * g.ch;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height: diffHeight(lines.length, size),
        opacity: (wipe ? 1 : p) * (1 - d) * (1 - o),
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: ds("gray", 50),
          clipPath: wipe ? `inset(0 ${(1 - p) * 100}% 0 0)` : undefined,
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      />
      {rows.map((r, i) =>
        r.sign === "+" || r.sign === "-" ? (
          <div
            key={`t${i}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: g.padY + i * g.lineH,
              height: g.lineH,
              background: r.sign === "+" ? TINT_ADD : TINT_DEL,
              opacity: signs * (wipe ? ease(frame, lineAt?.[i] ?? at + 4 + i * 3, 12) : 1),
            }}
          />
        ) : null,
      )}
      {marks.map((m, k) => {
        const w = ease(frame, m.at, 12);
        const mo = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || mo >= 1) return null;
        const code = rows[m.line].code;
        const indent = code.length - code.trimStart().length;
        const col = m.text === undefined ? indent : code.indexOf(m.text);
        if (col < 0) throw new Error(`line ${m.line} does not hold ${JSON.stringify(m.text)}`);
        const len = m.text === undefined ? code.length - indent : m.text.length;
        return (
          <div
            key={`m${k}`}
            style={{
              position: "absolute",
              left: codeX + col * g.ch - size * 0.15,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              width: (len * g.ch + size * 0.3) * w,
              background: m.color ?? HIGHLIGHT,
              borderRadius: 3,
              opacity: 1 - mo,
            }}
          />
        );
      })}
      {rows.map((r, i) => (
        <Ink
          key={i}
          at={wipe ? lineAt?.[i] ?? at + 4 + i * 3 : at}
          dur={wipe ? 14 : 1}
          style={{ left: 0, top: g.padY + i * g.lineH, height: g.lineH, width, display: "flex", alignItems: "center" }}
        >
          <span
            style={{
              position: "absolute",
              left: g.padX,
              fontFamily: MONO,
              fontSize: size,
              fontWeight: 700,
              color: r.sign === "+" ? OK_INK : ACCENT_INK,
              opacity: r.sign === "+" || r.sign === "-" ? signs : 0,
            }}
          >
            {r.sign === "-" ? "−" : r.sign}
          </span>
          <span style={{ position: "absolute", left: codeX, opacity: r.sign === "-" ? 1 - 0.4 * signs : 1 }}>
            <Code line={r.code} size={size} />
          </span>
        </Ink>
      ))}
    </div>
  );
};

/** A file's name over its listing, and what the diff does to it. */
export const FileTab: React.FC<{ x: number; top: number; at: number; out?: number; dim?: number; name: string; children?: React.ReactNode; size?: number }> = ({
  x,
  top,
  at,
  out,
  dim,
  name,
  children,
  size = 21,
}) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  return (
    <Ink at={at} dur={14} out={out} style={{ left: x, top, whiteSpace: "nowrap", opacity: 1 - d, display: "flex", alignItems: "baseline", gap: 16, fontSize: size }}>
      <span style={{ fontFamily: MONO, fontSize: size, fontWeight: 600, color: INK, fontVariantLigatures: "none" }}>{name}</span>
      {children ? <span style={{ ...note(size, INK_SOFT), fontWeight: 600 }}>{children}</span> : null}
    </Ink>
  );
};

// ── Marks ───────────────────────────────────────────────────────────────────

/** A cross, drawn on `at`, in the error's red. */
export const Cross: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 22, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, at, 7);
  const b = ease(frame, at + 5, 7);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M6 6 L18 18" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} fill="none" />
      <path d="M18 6 L6 18" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} fill="none" />
    </svg>
  );
};

/** A pass or a fail, drawn on `at`, centred in a box of `size`. */
export const Verdict: React.FC<{ ok: boolean; at: number; size?: number; gray?: boolean }> = ({ ok, at, size = 24, gray }) =>
  ok ? <Tick at={at} size={size} color={gray ? INK_SOFT : OK} /> : <Cross at={at} size={size} color={gray ? INK_SOFT : ACCENT} />;

// ── The kinds of bug ────────────────────────────────────────────────────────

/**
 * One kind of bug as a card: its name, then a few tokens of code or a note.
 * It inks in on `at`; `dim` grays it and `undim` brings it back; `alarm`
 * turns its rule red (the one kind that makes a noise); `to` slides it to a
 * new place from a frame on, lifted a little on the way.
 */
export const Card: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: React.ReactNode;
  dim?: number;
  undim?: number;
  out?: number;
  alarm?: number;
  to?: { x: number; y: number; at: number };
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, dim, undim, out, alarm, to, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  const d = (dim === undefined ? 0 : ease(frame, dim, 16)) * (undim === undefined ? 1 : 1 - ease(frame, undim, 14));
  const m = to ? ease(frame, to.at, 24) : 0;
  const lift = to ? Math.sin(Math.min(1, m) * Math.PI) : 0;
  const red = alarm === undefined ? 0 : ease(frame, alarm, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: to ? lerpN(x, to.x, m) : x,
        top: (to ? lerpN(y, to.y, m) : y) - lift * 14,
        width: w,
        height: h,
        boxSizing: "border-box",
        padding: "16px 20px",
        background: PAPER,
        border: `${1.5 + red * 1.5}px solid ${red > 0.5 ? ACCENT : `color-mix(in srgb, ${INK} 26%, transparent)`}`,
        borderRadius: 10,
        boxShadow: lift > 0.01 ? `0 ${10 * lift}px ${24 * lift}px color-mix(in srgb, ${INK} ${14 * lift}%, transparent)` : undefined,
        opacity: p * (1 - o) * (1 - 0.6 * d),
        filter: d > 0.01 ? `grayscale(${d})` : undefined,
        transform: `translateY(${(1 - p) * 12}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ ...label(24, INK), whiteSpace: "nowrap" }}>{title}</div>
      {children}
    </div>
  );
};

const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;

// ── The debugging round's steps ─────────────────────────────────────────────

/**
 * The method as a numbered column: every row inks in from `at`, each is
 * current (a highlight band) from its own cue to the next one's, then ticked.
 * `ring` circles one row from a frame on (the step an assistant cannot do).
 */
export const Steps: React.FC<{
  items: readonly { label: string; at: number }[];
  x: number;
  top: number;
  rowH: number;
  width: number;
  at: number;
  end: number;
  ring?: { row: number; at: number; out?: number };
  out?: number;
}> = ({ items, x, top, rowH, width, at, end, ring, out }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {items.map((item, i) => {
        const next = items[i + 1]?.at ?? end;
        const current = during(frame, item.at - 2, next, 8);
        const done = ease(frame, next - 2, 10);
        return (
          <Ink key={i} at={at + i * 3} dur={12} out={out} style={{ left: x, top: top + i * rowH, width, height: rowH }}>
            <div style={{ position: "relative", width, height: rowH, display: "flex", alignItems: "center", gap: 14, fontSize: 23 }}>
              <div
                style={{
                  position: "absolute",
                  left: -12,
                  right: 0,
                  top: 6,
                  bottom: 6,
                  background: HIGHLIGHT,
                  borderRadius: 4,
                  opacity: current * 0.55,
                }}
              />
              <span style={{ position: "relative", width: 26, height: 26, display: "flex", alignItems: "center" }}>
                {done > 0 && frame >= next - 2 ? <Tick at={next - 2} size={24} /> : null}
              </span>
              <span style={{ position: "relative", ...label(23, current > 0.5 ? ACCENT_INK : INK_SOFT), width: 22, textAlign: "right" }}>{i + 1}</span>
              <span
                style={{
                  position: "relative",
                  ...note(23, INK),
                  fontWeight: current > 0.5 ? 650 : 500,
                  whiteSpace: "nowrap",
                  opacity: 0.5 + 0.5 * Math.max(current, done),
                }}
              >
                {item.label}
              </span>
            </div>
          </Ink>
        );
      })}
      {ring ? <Ring x={x - 22} y={top + ring.row * rowH + 2} w={width + 30} h={rowH - 4} at={ring.at} out={ring.out} /> : null}
    </>
  );
};

/** A rounded ring drawn around a box, in the pointing yellow. */
export const Ring: React.FC<{ x: number; y: number; w: number; h: number; at: number; out?: number; color?: string }> = ({
  x,
  y,
  w,
  h,
  at,
  out,
  color = RING,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="none" stroke={color} strokeWidth={3} pathLength={1} strokeDasharray={`${p} 1`} />
    </svg>
  );
};

// ── The review's checklist ──────────────────────────────────────────────────

export type Check = {
  label: React.ReactNode;
  /** When the row inks in. */
  at: number;
  /** When it is ticked, or flagged. */
  okAt?: number;
  badAt?: number;
};

/** The five checks, a box beside each: ticked in green, or flagged in red. */
export const Checklist: React.FC<{ items: readonly Check[]; x: number; top: number; rowH: number; out?: number; dim?: number }> = ({
  items,
  x,
  top,
  rowH,
  out,
  dim,
}) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  return (
    <>
      {items.map((item, i) => {
        const bad = item.badAt === undefined ? 0 : ease(frame, item.badAt, 8);
        return (
          <Ink key={i} at={item.at} dur={14} out={out} style={{ left: x, top: top + i * rowH, height: rowH, opacity: 1 - d }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, height: rowH, fontSize: 23 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  flex: "none",
                  boxSizing: "border-box",
                  border: `2px solid ${bad > 0.5 ? ACCENT : INK_SOFT}`,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: PAPER,
                }}
              >
                {item.okAt !== undefined && frame >= item.okAt ? <Tick at={item.okAt} size={22} /> : null}
                {item.badAt !== undefined && frame >= item.badAt ? <Cross at={item.badAt} size={20} /> : null}
              </span>
              <span style={{ ...note(23, bad > 0.5 ? ACCENT_INK : INK), whiteSpace: "nowrap" }}>{item.label}</span>
            </div>
          </Ink>
        );
      })}
    </>
  );
};

// ── Test results ────────────────────────────────────────────────────────────

export type GridRow = {
  name: React.ReactNode;
  at: number;
  cells: readonly ({ ok: boolean; at: number; gray?: number } | null)[];
  /** A band behind the row from a frame on (what the narration names). */
  markAt?: number;
  markColor?: string;
  out?: number;
};

/**
 * Tests down the side, versions of the code across the top, a tick or a
 * cross where each ran. Columns are centred on `cols[i].x`, a page position.
 */
export const TestGrid: React.FC<{
  x: number;
  top: number;
  rowH: number;
  width: number;
  headAt: number;
  cols: readonly { title: React.ReactNode; x: number; at?: number }[];
  rows: readonly GridRow[];
  out?: number;
  size?: number;
}> = ({ x, top, rowH, width, headAt, cols, rows, out, size = 20 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {cols.map((c, j) => (
        <Ink key={`c${j}`} at={c.at ?? headAt} dur={12} out={out} style={{ left: c.x - 150, width: 300, top, height: rowH, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>{c.title}</span>
        </Ink>
      ))}
      <div
        style={{
          position: "absolute",
          left: x,
          top: top + rowH,
          width: width * ease(frame, headAt, 14),
          height: 1,
          background: HAIRLINE,
          opacity: out === undefined ? 1 : 1 - ease(frame, out, 10),
        }}
      />
      {rows.map((r, i) => {
        const rowTop = top + (i + 1) * rowH;
        const band = r.markAt === undefined ? 0 : ease(frame, r.markAt, 12);
        return (
          <React.Fragment key={i}>
            <Ink at={r.at} dur={12} out={r.out ?? out} style={{ left: x, top: rowTop, height: rowH, width, display: "flex", alignItems: "center" }}>
              <div
                style={{
                  position: "absolute",
                  left: -10,
                  top: 4,
                  bottom: 4,
                  width: (width + 20) * band,
                  background: r.markColor ?? HIGHLIGHT,
                  borderRadius: 4,
                  opacity: 0.6,
                }}
              />
              <span style={{ position: "relative", fontSize: size }}>{r.name}</span>
            </Ink>
            {r.cells.map((c, j) =>
              c ? (
                <Ink
                  key={j}
                  at={c.at}
                  dur={6}
                  out={r.out ?? out}
                  style={{ left: cols[j].x - 14, top: rowTop + rowH / 2 - 14, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <span style={{ opacity: c.gray !== undefined ? 1 - 0.55 * ease(frame, c.gray, 12) : 1 }}>
                    <Verdict ok={c.ok} at={c.at} size={26} />
                  </span>
                </Ink>
              ) : null,
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ── A number line for intervals ─────────────────────────────────────────────

export type Seg = {
  s: number;
  e: number;
  /** Height above the axis, px. */
  dy: number;
  color: string;
  at: number;
  out?: number;
  dashed?: boolean;
  /** Each end's dot: filled (closed, the default) or hollow (open). */
  open?: readonly [boolean, boolean];
};

/**
 * A horizontal axis with integer ticks labelled under it, and intervals drawn
 * as thick bars above it, each with a dot at both ends: filled where the end
 * belongs to the interval, hollow where it does not. `points` puts a soft
 * yellow disc behind a value the narration names.
 */
export const NumberLine: React.FC<{
  x: number;
  y: number;
  width: number;
  from: number;
  to: number;
  ticks: readonly number[];
  at: number;
  out?: number;
  segs: readonly Seg[];
  points?: readonly { v: number; dy: number; at: number; out?: number; r?: number }[];
}> = ({ x, y, width, from, to, ticks, at, out, segs, points = [] }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const sx = (v: number) => x + ((v - from) / (to - from)) * width;
  const thick = 8;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      {points.map((pt, i) => {
        const q = ease(frame, pt.at, 12) * (pt.out === undefined ? 1 : 1 - ease(frame, pt.out, 10));
        return q > 0 ? <circle key={`p${i}`} cx={sx(pt.v)} cy={y - pt.dy} r={(pt.r ?? 22) * q} fill={HIGHLIGHT} /> : null;
      })}
      <line x1={x - 10} x2={x - 10 + (width + 20) * p} y1={y} y2={y} stroke={INK_SOFT} strokeWidth={1.6} />
      {ticks.map((t) => (
        <g key={t} opacity={ease(frame, at + 6, 10)}>
          <line x1={sx(t)} x2={sx(t)} y1={y - 5} y2={y + 5} stroke={INK_SOFT} strokeWidth={1.6} />
          <text x={sx(t)} y={y + 30} textAnchor="middle" style={svgText(label(20, INK_SOFT))}>
            {t}
          </text>
        </g>
      ))}
      {segs.map((s, i) => {
        const q = ease(frame, s.at, 14);
        const so = s.out === undefined ? 0 : ease(frame, s.out, 10);
        if (q <= 0 || so >= 1) return null;
        const x1 = sx(s.s);
        const x2 = x1 + (sx(s.e) - x1) * q;
        const cy = y - s.dy;
        const [o1, o2] = s.open ?? [false, false];
        const dot = (cx: number, open: boolean, k: string) => (
          <circle key={k} cx={cx} cy={cy} r={7} fill={open ? PAPER : s.color} stroke={s.color} strokeWidth={open ? 2.6 : 0} />
        );
        return (
          <g key={i} opacity={1 - so}>
            <line
              x1={x1}
              x2={x2}
              y1={cy}
              y2={cy}
              stroke={s.color}
              strokeWidth={thick}
              strokeLinecap="butt"
              strokeDasharray={s.dashed ? "10 7" : undefined}
            />
            {dot(x1, o1, "a")}
            {q > 0.98 ? dot(x2, o2, "b") : null}
          </g>
        );
      })}
    </svg>
  );
};

// ── Arrows ──────────────────────────────────────────────────────────────────

/** A straight arrow that draws itself from `from` to `to`. */
export const Arrow: React.FC<{ from: Pt; to: Pt; at: number; out?: number; color?: string; dur?: number }> = ({
  from,
  to,
  at,
  out,
  color = INK_SOFT,
  dur = 14,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const end: Pt = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const line: Pt[] = Array.from({ length: 41 }, (_, i) => [from[0] + ((end[0] - from[0]) * i) / 40, from[1] + ((end[1] - from[1]) * i) / 40]);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <path d={`M${from[0]},${from[1]} L${end[0]},${end[1]}`} stroke={color} strokeWidth={2.2} fill="none" />
      {p > 0.6 ? <path d={arrowHead(line, 14, 7, { filled: true })} fill={color} opacity={ease(frame, at + dur * 0.6, 5)} /> : null}
    </svg>
  );
};

// ── Art ─────────────────────────────────────────────────────────────────────

/** A watercolor from illustrations.json: it pops in on `at`, bobs gently and
 *  fades on `out`. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at, out, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
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
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** The hero, trimmed to 1190x1024, so at 4K it is drawn at most 595x512. */
export const HERO = { id: "be-code-review-lynx", w: 1190, h: 1024 };
