import React from "react";
import { useCurrentFrame } from "remotion";
import { arrowHead, roundedPolyline } from "../../components/arrow";
import { ease } from "../../components/motion";
import { ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
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
import { Ink, W, H } from "../../editorial/ui";

/**
 * Pieces this video needs beyond the shared editorial kit: a Java listing set
 * the way a magazine prints one, and the parts of a stack and heap figure
 * (a variable's cell, an object on the heap, and the reference arrow from
 * one to the other).
 */

/** A reference keeps one color everywhere: the dot in a variable's cell and
 *  the arrow it draws to its object. */
export const REF = BAR;
/** What a comparison printed: true in the blue ink, false in the accent. */
export const TRUE_INK = BLUE_INK;
export const FALSE_INK = ACCENT_INK;
export const boolInk = (v: boolean) => (v ? TRUE_INK : FALSE_INK);
/** An object the narration says is shared, and one it says is fresh. */
export const SHARED_TINT = BAR;
export const FRESH_TINT = ACCENT;

/** The listing's tinted paper and the token inks: brand ink steps only. */
export const LISTING_PAPER = `color-mix(in srgb, ${ds("yellow", 200)} 34%, ${PAPER})`;
export const STRING_INK = ds("green", 800);
export const NUMBER_INK = ds("orange", 700);
const TOKEN_INK = {
  keyword: ds("purple", 700),
  type: ds("teal", 700),
  number: NUMBER_INK,
  string: STRING_INK,
  comment: INK_SOFT,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set(["new", "true", "false", "null", "int", "public", "static", "void", "class", "return"]);
const TYPES = new Set(["String", "Integer", "System"]);

type Token = { text: string; color: string; weight?: number };

/** A small Java tokenizer: enough for a few printed lines. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\d+)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: TOKEN_INK.comment });
    else if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && TYPES.has(word)) out.push({ text, color: TOKEN_INK.type });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of code, colored. */
export const Code: React.FC<{
  line: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ line, size, style }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: size,
      whiteSpace: "pre",
      fontVariantLigatures: "none",
      ...style,
    }}
  >
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

/** A highlighter stroke behind one listing line, wiped in from the left. By
 *  default it spans the line's code; `col` and `chars` narrow it to a span. */
export type LineMark = {
  line: number;
  at: number;
  out?: number;
  color?: string;
  col?: number;
  chars?: number;
};

export type ListingGeometry = {
  size: number;
  lineH: number;
  padY: number;
  gutter: number;
};
export const listingGeometry = (size: number): ListingGeometry => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});

/** The top of line `i` of a listing whose panel starts at `top`. */
export const lineTop = (top: number, i: number, size: number) => {
  const g = listingGeometry(size);
  return top + g.padY + i * g.lineH;
};

/** The listing's height, padding included. */
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/** Where the code of a listing starts, from the panel's left edge. */
const codeLeft = (size: number) => listingGeometry(size).gutter + size * 0.42;

/** The column (in characters) at which `needle` starts in `line`. */
export const colOf = (line: string, needle: string) => {
  const i = line.indexOf(needle);
  if (i < 0) throw new Error(`"${needle}" is not in "${line}"`);
  return i;
};

/**
 * A printed code listing. `top` is already a page y (through `y()`); the lines
 * inside flow at a fixed pitch, so callers can line things up against them
 * with `lineTop`. Blank lines get no number.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size: number;
  /** When the panel itself appears. */
  at: number;
  /** When each line inks in (index-aligned with `lines`). */
  lineAt: readonly number[];
  marks?: readonly LineMark[];
}> = ({ lines, x, top, width, size, at, lineAt, marks = [] }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const height = listingHeight(lines.length, size);
  const left = codeLeft(size);
  return (
    <div style={{ position: "absolute", left: x, top, width, height }}>
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
        const text = lines[m.line];
        const col = m.col ?? text.length - text.trimStart().length;
        const chars = m.chars ?? text.trimEnd().length - col;
        // A whole line gets a generous margin; a mark on a few characters
        // inside one hugs them, so it never spills onto their neighbours.
        const pad = m.col === undefined ? 0.35 : 0.12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              // In em of the code's own size, so it spans the characters.
              fontSize: size,
              left: `calc(${left}px + ${0.35 - pad + col * 0.6}em)`,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              width: `${(chars * 0.6 + 2 * pad) * w}em`,
              background: m.color ?? HIGHLIGHT,
              opacity: 1 - o,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {/* Every line is numbered, blank ones too, as an editor shows them. */}
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
          {line ? (
            <Ink
              at={lineAt[i]}
              dur={14}
              style={{
                left: left + size * 0.35,
                top: g.padY + i * g.lineH,
                height: g.lineH,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Code line={line} size={size} />
            </Ink>
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
};

/** "Fig. 2" and a title that may hold code: the shared FigLabel, widened. */
export const Fig: React.FC<{
  n: string;
  at: number;
  x: number;
  y: number;
  children: React.ReactNode;
}> = ({ n, at, x, y, children }) => (
  <Ink
    at={at}
    style={{
      left: x,
      top: y,
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "baseline",
      gap: 12,
    }}
  >
    <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>Fig. {n}</span>
    <span style={{ ...label(24, INK), fontWeight: 560 }}>{children}</span>
  </Ink>
);

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{
  children: string;
  color?: string;
  weight?: number;
}> = ({ children, color, weight }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: "0.94em",
      fontWeight: weight ?? 500,
      color,
      fontVariantLigatures: "none",
    }}
  >
    {children}
  </span>
);

/** A highlighter stroke behind inline text, `p` of the way across. */
export const Marked: React.FC<{
  p: number;
  color?: string;
  children: React.ReactNode;
}> = ({ p, color = HIGHLIGHT, children }) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    {p > 0 ? (
      <span
        style={{
          position: "absolute",
          left: "-0.2em",
          top: "0.02em",
          bottom: "-0.06em",
          width: `calc(${p} * (100% + 0.4em))`,
          background: color,
          borderRadius: 2,
        }}
      />
    ) : null}
    <span style={{ position: "relative" }}>{children}</span>
  </span>
);

/** Punctuation that follows a Marked span. It is positioned so it paints
 *  above the highlight's overhang instead of under it. */
export const After: React.FC<{ children: string }> = ({ children }) => (
  <span style={{ position: "relative" }}>{children}</span>
);

/** How strongly a highlight shows: in at `at`, gone again by `out`. */
export const markP = (frame: number, at: number, out?: number) =>
  ease(frame, at, 12) * (out === undefined ? 1 : 1 - ease(frame, out, 10));

/** A printed `true` or `false`, in its ink. */
export const Out: React.FC<{ value: boolean; size: number }> = ({ value, size }) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: size,
      fontWeight: 700,
      color: boolInk(value),
      fontVariantLigatures: "none",
      whiteSpace: "pre",
    }}
  >
    {value ? "true" : "false"}
  </span>
);

/** A comparison and what it printed, on one line: `a == c  true`. */
export const Verdict: React.FC<{
  expr: string;
  value: boolean;
  size: number;
  outAt?: number;
}> = ({ expr, value, size, outAt }) => {
  const frame = useCurrentFrame();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.7em",
        whiteSpace: "nowrap",
        fontSize: size,
      }}
    >
      <Code line={expr} size={size} />
      <span style={{ opacity: outAt === undefined ? 1 : ease(frame, outAt, 8) }}>
        <Out value={value} size={size} />
      </span>
    </span>
  );
};

export type Pt = readonly [number, number];

/** Length of the arrowhead along its line, and its half-width. */
const HEAD_LEN = 15;
const HEAD_HALF = 9;

/**
 * A reference: a dot in the variable's cell and a line that draws itself to
 * the object, with an arrowhead there. The line is a polyline with rounded
 * corners; the head follows its last 15 px (components/arrow.ts), which is
 * the last segment unless that is shorter than the head plus its corner.
 */
export const RefArrow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  radius?: number;
  dim?: number;
  /** When the dot at the start shows; the cell holds it before the arrow draws. */
  dotAt?: number;
}> = ({ points, at, dur = 16, color = REF, width = 3, radius = 22, dim, dotAt }) => {
  const frame = useCurrentFrame();
  const dot = ease(frame, dotAt ?? at - 4, 8);
  const p = ease(frame, at, dur);
  if (dot <= 0 && p <= 0) return null;
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  const { d: path, samples } = roundedPolyline(points, radius);
  const head = arrowHead(samples, HEAD_LEN, HEAD_HALF);
  return (
    <svg
      width={W}
      height={H}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        opacity: 1 - d,
      }}
    >
      <circle cx={points[0][0]} cy={points[0][1]} r={7} fill={color} opacity={dot} />
      {p > 0 ? (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${p} 1`}
        />
      ) : null}
      <path
        d={head}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={ease(frame, at + dur - 4, 5)}
      />
    </svg>
  );
};

/** A variable's cell on the stack: its name, and room on the right for the
 *  dot a RefArrow starts from (see `cellDot`). */
export const VarCell: React.FC<{
  x: number;
  top: number;
  width: number;
  height: number;
  name: string;
  at: number;
}> = ({ x, top, width, height, name, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, height }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          border: `2px solid ${INK}`,
          borderRadius: 4,
          background: `color-mix(in srgb, ${INK} 3%, ${PAPER})`,
          clipPath: `inset(-2px ${(1 - p) * 100}% -2px -2px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: width * 0.48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRight: `1.5px solid ${HAIRLINE}`,
          opacity: ease(frame, at + 4, 10),
          fontFamily: MONO,
          fontSize: 32,
          fontWeight: 700,
          color: INK,
        }}
      >
        {name}
      </div>
    </div>
  );
};

/** Where a cell's reference dot sits: the middle of its right-hand half. */
export const cellDot = (x: number, top: number, width: number, height: number): Pt => [
  x + width * 0.74,
  top + height / 2,
];

/** An object on the heap: its class in small Inter, its value in code. */
export const HeapObj: React.FC<{
  x: number;
  top: number;
  width: number;
  height: number;
  type: string;
  value: string;
  valueInk: string;
  at: number;
  tint?: number;
  tintColor?: string;
  dashed?: boolean;
  /** A highlight behind the value, 0 to 1 (see `markP`). */
  mark?: number;
}> = ({ x, top, width, height, type, value, valueInk, at, tint = 0, tintColor = SHARED_TINT, dashed, mark = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          border: dashed ? `2px dashed ${INK_SOFT}` : `2px solid ${INK}`,
          borderRadius: 10,
          background:
            tint > 0
              ? `color-mix(in srgb, ${tintColor} ${Math.round(tint * 100)}%, ${PAPER})`
              : `color-mix(in srgb, ${INK} 3%, ${PAPER})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: SANS,
            fontSize: 20,
            fontWeight: 600,
            color: INK_SOFT,
            lineHeight: 1.1,
          }}
        >
          {type}
        </span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 32,
            fontWeight: 600,
            color: valueInk,
            lineHeight: 1.2,
            fontVariantLigatures: "none",
            whiteSpace: "pre",
          }}
        >
          <Marked p={mark}>{value}</Marked>
        </span>
      </div>
    </div>
  );
};

/**
 * An Ink reveal that holds its place in a flowing line before it shows, so
 * its neighbours never move when it inks in, whatever order they arrive in.
 */
export const InkSlot: React.FC<{
  at: number;
  dur?: number;
  children: React.ReactNode;
}> = ({ at, dur = 14, children }) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    <span style={{ visibility: "hidden", display: "inline-block" }}>{children}</span>
    <Ink at={at} dur={dur} style={{ left: 0, top: 0 }}>
      {children}
    </Ink>
  </span>
);
