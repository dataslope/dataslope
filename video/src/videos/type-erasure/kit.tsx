import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ACCENT, ACCENT_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { H, Ink, type Pt, W } from "../../editorial/ui";
import { segments, type Span } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a code listing set
 * the way a magazine prints one (after list-vs-set's), with a TypeScript
 * tokenizer and the erased spans of a line struck through in place; a
 * terminal printed the same way; and a straight arrow whose head follows it.
 */

/** Red marks what is erased or what fails; green, a clean compile. */
export const OK_INK = "var(--ds-green-ink)";

/** The listing's tinted paper and the token inks: brand ink steps only. */
export const LISTING_PAPER = `color-mix(in srgb, ${ds("yellow", 200)} 34%, ${PAPER})`;
export const TERMINAL_PAPER = `color-mix(in srgb, ${INK} 6%, ${PAPER})`;
const TOKEN_INK = {
  keyword: ds("purple", 700),
  type: ds("teal", 700),
  string: ds("orange", 700),
  number: ds("blue", 700),
  comment: INK_SOFT,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set([
  "interface",
  "function",
  "return",
  "const",
  "let",
  "if",
  "else",
  "typeof",
  "instanceof",
  "in",
  "is",
  "null",
  "true",
  "false",
]);
const TYPES = new Set(["number", "string", "unknown", "any", "boolean", "User", "T"]);

type Token = { text: string; color: string; weight?: number };

/** A small TypeScript tokenizer: enough for a few printed lines. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(\/\/.*$)|('[^']*'|"[^"]*")|(\d+)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: TOKEN_INK.comment });
    else if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && TYPES.has(word)) out.push({ text, color: TOKEN_INK.type, weight: 600 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

const Tokens: React.FC<{ text: string }> = ({ text }) => (
  <>
    {tokenize(text).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </>
);

/**
 * One line of code, colored. Spans written «like this» are the ones tsc
 * erases; `erase(k)` is the frame the k-th of them is struck, and the strike
 * is laid on the span itself (`100%` of its own box), so it follows the text.
 */
export const Code: React.FC<{
  line: string;
  size?: number;
  erase?: (k: number) => number | undefined;
  style?: React.CSSProperties;
}> = ({ line, size, erase, style }) => {
  const frame = useCurrentFrame();
  let k = -1;
  return (
    <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none", ...style }}>
      {segments(line).map((s, i) => {
        if (!s.erased) return <Tokens key={i} text={s.text} />;
        k += 1;
        const at = erase?.(k);
        const p = at === undefined ? 0 : ease(frame, at, 12);
        return (
          <span key={i} style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "-0.06em",
                right: "-0.06em",
                top: "0.1em",
                bottom: "0.02em",
                background: `color-mix(in srgb, ${ACCENT} 16%, transparent)`,
                opacity: p,
              }}
            />
            <span style={{ position: "relative", opacity: 1 - 0.5 * p }}>
              <Tokens text={s.text} />
            </span>
            <span
              style={{
                position: "absolute",
                left: "-0.06em",
                top: "0.6em",
                height: "0.09em",
                width: `calc(${p} * (100% + 0.12em))`,
                background: ACCENT,
                borderRadius: "0.05em",
              }}
            />
          </span>
        );
      })}
    </span>
  );
};

export type ListingGeometry = { size: number; lineH: number; padY: number; gutter: number };
export const listingGeometry = (size: number): ListingGeometry => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});
/** A listing's height for `n` lines, in px (not stretched by `h()`: the
 *  lines keep their pitch, the page around them stretches). */
export const listingHeight = (n: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + n * g.lineH;
};
/** The top of line `i`, inside a listing whose panel starts at `top`. */
export const lineTop = (top: number, i: number, size: number) => {
  const g = listingGeometry(size);
  return top + g.padY + i * g.lineH;
};
/** Where the code's first column starts, from the listing's left edge. */
export const codeLeft = (size: number) => listingGeometry(size).gutter + size * 0.77;
/** JetBrains Mono's advance: every character is 0.6em wide. */
export const ADVANCE = 0.6;

/** A highlighter stroke behind a line, or behind `chars` characters from
 *  `col` on, wiped in from the left. */
export type LineMark = { line: number; at: number; out?: number; color?: string; col?: number; chars?: number };
/** An error squiggle under a span of a line, drawn left to right. */
export type Squiggle = Span & { at: number; color?: string };

/**
 * A printed code listing. `top` is already a page y (through `y()`); the lines
 * inside flow at a fixed pitch, so callers can line things up against them
 * with `lineTop`.
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
  squiggles?: readonly Squiggle[];
  /** The frame the k-th erased span of line `i` is struck, if it is. */
  erase?: (i: number, k: number) => number | undefined;
  out?: number;
}> = ({ lines, x, top, width, size = 28, at, lineAt, marks = [], squiggles = [], erase, out }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || gone >= 1) return null;
  const height = listingHeight(lines.length, size);
  const left = codeLeft(size);
  return (
    <div style={{ position: "absolute", left: x, top, width, height, opacity: 1 - gone }}>
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
        const text = lines[m.line].replace(/[«»]/g, "");
        const col = m.col ?? text.length - text.trimStart().length;
        const chars = m.chars ?? text.length - col;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              // In em of the code's own size, so it spans the characters.
              left: left + (col * ADVANCE - 0.2) * size,
              top: g.padY + m.line * g.lineH + g.lineH * 0.14,
              height: g.lineH * 0.72,
              width: `${(chars * ADVANCE + 0.4) * w}em`,
              fontSize: size,
              background: m.color ?? HIGHLIGHT,
              opacity: 1 - o,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {line ? (
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
                fontSize: Math.max(19, size * 0.72),
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
            style={{ left, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}
          >
            <Code line={line} size={size} erase={erase ? (k) => erase(i, k) : undefined} />
          </Ink>
        </React.Fragment>
      ))}
      {squiggles.map((s, i) => {
        const d = ease(frame, s.at, 12);
        if (d <= 0) return null;
        const w = s.chars * ADVANCE * size;
        const amp = size * 0.09;
        const step = size * 0.22;
        let path = `M0,${amp}`;
        for (let t = 0, up = true; t < w; t += step, up = !up) path += ` L${Math.min(w, t + step)},${up ? 0 : amp * 2}`;
        return (
          <svg
            key={i}
            width={w}
            height={amp * 2 + 4}
            style={{
              position: "absolute",
              left: left + s.col * ADVANCE * size,
              top: g.padY + s.line * g.lineH + g.lineH * 0.8,
              overflow: "visible",
              clipPath: `inset(-4px ${(1 - d) * 100}% -4px -4px)`,
            }}
          >
            <path d={path} fill="none" stroke={s.color ?? ACCENT} strokeWidth={2.4} strokeLinejoin="round" />
          </svg>
        );
      })}
    </div>
  );
};

/** One row of a terminal: a command after its prompt, or what came back. */
export type TermRow = {
  kind: "cmd" | "out" | "err";
  text: string;
  at: number;
  /** A word set beside the row in Inter, such as "no output". */
  tag?: { text: string; at: number; color?: string };
};

export const terminalGeometry = (size: number) => ({ lineH: Math.round(size * 1.6), padY: Math.round(size * 0.7) });
export const terminalHeight = (rows: number, size: number) => {
  const g = terminalGeometry(size);
  return rows * g.lineH + g.padY * 2;
};

/** A terminal session printed on the page: the same rules as a listing, a
 *  grey tint instead of the yellow, and no line numbers. */
export const Terminal: React.FC<{
  rows: readonly TermRow[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  out?: number;
}> = ({ rows, x, top, width, size = 22, at, out }) => {
  const frame = useCurrentFrame();
  const g = terminalGeometry(size);
  const p = ease(frame, at, 16);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || gone >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: terminalHeight(rows.length, size), opacity: 1 - gone }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: TERMINAL_PAPER,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      />
      {rows.map((r, i) => (
        <Ink
          key={i}
          at={r.at}
          dur={12}
          style={{
            left: size * 1.1,
            top: g.padY + i * g.lineH,
            height: g.lineH,
            display: "flex",
            alignItems: "center",
            gap: "0.9em",
            whiteSpace: "pre",
            fontFamily: MONO,
            fontSize: size,
            fontVariantLigatures: "none",
          }}
        >
          <span>
            {r.kind === "cmd" ? <span style={{ color: INK_SOFT }}>$ </span> : null}
            <span
              style={{
                color: r.kind === "err" ? ACCENT_INK : INK,
                fontWeight: r.kind === "cmd" ? 600 : r.kind === "err" ? 600 : 400,
              }}
            >
              {r.text}
            </span>
          </span>
          {r.tag ? (
            <span
              style={{
                ...note(20, r.tag.color ?? INK_SOFT),
                fontWeight: 600,
                opacity: ease(frame, r.tag.at, 10),
              }}
            >
              {r.tag.text}
            </span>
          ) : null}
        </Ink>
      ))}
    </div>
  );
};

/** A file name over a listing, and what the file is, on one line. */
export const FileTab: React.FC<{ at: number; x: number; y: number; name: string; children?: React.ReactNode }> = ({
  at,
  x,
  y,
  name,
  children,
}) => (
  <Ink at={at} dur={14} style={{ left: x, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 16 }}>
    <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: INK }}>{name}</span>
    {children ? <span style={note(21, INK_SOFT)}>{children}</span> : null}
  </Ink>
);

/** "Fig. 2" and a title that may hold code: the shared FigLabel, widened. */
export const Fig: React.FC<{ n: string; at: number; x: number; y: number; out?: number; children: React.ReactNode }> = ({
  n,
  at,
  x,
  y,
  out,
  children,
}) => (
  <Ink at={at} out={out} style={{ left: x, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 12 }}>
    <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>Fig. {n}</span>
    <span style={{ ...label(24, INK), fontWeight: 560 }}>{children}</span>
  </Ink>
);

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: string; color?: string; weight?: number }> = ({ children, color, weight = 500 }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: weight, color, fontVariantLigatures: "none" }}>
    {children}
  </span>
);

/**
 * A line that draws itself through `points` and ends in an open arrowhead.
 * The head is built from the direction of the last segment, the way the line
 * arrives, so it always points along it.
 */
export const Arrow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
}> = ({ points, at, dur = 12, color = INK, width = 2.4, head = 14 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  if (p <= 0) return null;
  const path = points.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  const [ex, ey] = points[points.length - 1];
  const [sx, sy] = points[points.length - 2];
  const len = Math.hypot(ex - sx, ey - sy);
  const [ux, uy] = [(ex - sx) / len, (ey - sy) / len];
  const wing = (side: 1 | -1) => `${ex - ux * head + side * uy * head * 0.62},${ey - uy * head - side * ux * head * 0.62}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
      <path
        d={`M${wing(1)} L${ex},${ey} L${wing(-1)}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={ease(frame, at + dur - 3, 4)}
      />
    </svg>
  );
};
