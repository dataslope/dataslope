import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
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
  label,
} from "../../editorial/style";
import { Ink } from "../../editorial/ui";

/**
 * Pieces this video needs beyond the shared editorial kit: a C++ listing set
 * the way a magazine prints one (tinted paper, a rule above and below, line
 * numbers in the soft ink), a figure label whose title can carry code, and
 * the inks the two versions of fib keep through every figure.
 *
 * Adapted from the list-vs-set video's kit, with a C++ tokenizer.
 */

/** The naive version and the memoized one keep one color each. */
export const NAIVE = ACCENT;
export const NAIVE_INK = ACCENT_INK;
export const MEMO = BAR;
export const MEMO_INK = BLUE_INK;

/** The listing's tinted paper and the token inks: brand ink steps only. */
export const LISTING_PAPER = `color-mix(in srgb, ${ds("yellow", 200)} 34%, ${PAPER})`;
const TOKEN_INK = {
  keyword: ds("purple", 700),
  type: ds("teal", 700),
  number: ds("orange", 700),
  comment: INK_SOFT,
  punct: INK_SOFT,
  name: INK,
} as const;
/** The two functions' names are printed in their series colors, so the code
 *  and the figures read as one key. */
const SERIES_NAMES: Record<string, string> = { fib: NAIVE_INK, fibMemo: MEMO_INK, memo: MEMO_INK };
const KEYWORDS = new Set(["if", "return", "for", "while", "else", "const", "auto"]);
const TYPES = new Set(["int", "long", "void", "bool", "std", "vector"]);

type Token = { text: string; color: string; weight?: number };

/** A small C++ tokenizer: enough for a few printed lines. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(\/\/.*$)|(\d+)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, num, word] = m;
    if (comment) out.push({ text, color: TOKEN_INK.comment });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && SERIES_NAMES[word]) out.push({ text, color: SERIES_NAMES[word], weight: 600 });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && TYPES.has(word)) out.push({ text, color: TOKEN_INK.type });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of code, colored. */
export const Code: React.FC<{ line: string; size?: number; style?: React.CSSProperties }> = ({
  line,
  size,
  style,
}) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none", ...style }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

/** A highlighter stroke behind part of one listing line, wiped in from the
 *  left. `from` and `chars` are in characters of the line. */
export type LineMark = { line: number; at: number; out?: number; color?: string; from?: number; chars?: number };

export type ListingGeometry = { size: number; lineH: number; padY: number; gutter: number };
export const listingGeometry = (size: number): ListingGeometry => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});

/** Where a listing's code starts, from its left edge. */
const codeLeft = (size: number) => listingGeometry(size).gutter + size * 0.42 + size * 0.35;

/**
 * A printed code listing. `top` is already a page y (through `y()`); the lines
 * inside flow at a fixed pitch, so callers can line things up against them
 * with `listingGeometry` and `lineTop`.
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
  out?: number;
}> = ({ lines, x, top, width, size = 32, at, lineAt, marks = [], out }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || gone >= 1) return null;
  const height = g.padY * 2 + lines.length * g.lineH;
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
        const from = m.from ?? 0;
        const chars = m.chars ?? lines[m.line].length - from;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              // In em of the code's own size, so it spans the characters.
              left: `calc(${codeLeft(size)}px + ${from * 0.6 - 0.35}em)`,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              width: `${(chars * 0.6 + 0.7) * w}em`,
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
                fontSize: Math.max(20, size * 0.68),
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
            style={{
              left: codeLeft(size),
              top: g.padY + i * g.lineH,
              height: g.lineH,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Code line={line} size={size} />
          </Ink>
        </React.Fragment>
      ))}
    </div>
  );
};

/** The top of line `i` of a listing whose panel starts at `top`. */
export const lineTop = (top: number, i: number, size = 32) => {
  const g = listingGeometry(size);
  return top + g.padY + i * g.lineH;
};

/** The height of a listing of `count` lines. */
export const listingHeight = (count: number, size = 32) => {
  const g = listingGeometry(size);
  return g.padY * 2 + count * g.lineH;
};

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
export const Mono: React.FC<{ children: string; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.94em", fontWeight: 500, color }}>{children}</span>
);

/** A legend key: a small node outline, filled or dashed the way the figure
 *  draws it. */
export const Key: React.FC<{ fill?: string; stroke: string; dashed?: boolean }> = ({ fill, stroke, dashed }) => (
  <svg width={30} height={18} style={{ overflow: "visible", flex: "none" }}>
    <rect
      x={1}
      y={1}
      width={28}
      height={16}
      rx={8}
      fill={fill ?? "none"}
      stroke={stroke}
      strokeWidth={2}
      strokeDasharray={dashed ? "4 3" : undefined}
    />
  </svg>
);
