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
 * Pieces this video needs beyond the shared editorial kit: a code listing set
 * the way a magazine prints one (tinted paper, a rule above and below, line
 * numbers in the soft ink), and a figure label whose title can carry code.
 */

/** The list and the set keep one color each through every figure. */
export const LIST = ACCENT;
export const LIST_INK = ACCENT_INK;
export const SET = BAR;
export const SET_INK = BLUE_INK;

/** The listing's tinted paper and the token inks: brand ink steps only. */
export const LISTING_PAPER = `color-mix(in srgb, ${ds("yellow", 200)} 34%, ${PAPER})`;
const TOKEN_INK = {
  keyword: ds("purple", 700),
  builtin: ds("teal", 700),
  number: ds("orange", 700),
  comment: INK_SOFT,
  punct: INK_SOFT,
  name: INK,
} as const;
/** The two collections' names are printed in their series colors, so the
 *  code and the charts read as one key. */
const SERIES_NAMES: Record<string, string> = { big_list: LIST_INK, big_set: SET_INK };
const KEYWORDS = new Set(["in", "for", "if", "not", "is", "True", "False", "None"]);
const BUILTINS = new Set(["list", "range", "set", "hash", "len", "print"]);

type Token = { text: string; color: string; weight?: number; italic?: boolean };

/** A small Python tokenizer: enough for a few printed lines. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(#.*$)|(\d[\d_]*)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, num, word] = m;
    if (comment) out.push({ text, color: TOKEN_INK.comment });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && SERIES_NAMES[word]) out.push({ text, color: SERIES_NAMES[word], weight: 600 });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && BUILTINS.has(word)) out.push({ text, color: TOKEN_INK.builtin });
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
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400, fontStyle: t.italic ? "italic" : "normal" }}>
        {t.text}
      </span>
    ))}
  </span>
);

/** A highlighter stroke behind one listing line, wiped in from the left. */
export type LineMark = { line: number; at: number; out?: number; color?: string; chars?: number };

export type ListingGeometry = { size: number; lineH: number; padY: number; gutter: number };
export const listingGeometry = (size: number): ListingGeometry => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});

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
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height,
        opacity: 1 - gone,
      }}
    >
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
        const chars = m.chars ?? lines[m.line].length;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.gutter + size * 0.42,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              // In em of the code's own size, so it spans the characters.
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
              left: g.gutter + size * 0.42 + size * 0.35,
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

/** "1,000,000" */
export const commas = (v: number) => Math.round(v).toLocaleString("en-US");
