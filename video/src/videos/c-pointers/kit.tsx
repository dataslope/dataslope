import React from "react";
import { useCurrentFrame } from "remotion";
import { arrowHead, cubicAt, cubicPath, type Cubic, sampleCubic } from "../../components/arrow";
import { ease } from "../../components/motion";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import {
  ACCENT_INK,
  BAR,
  BLUE_INK,
  HAIRLINE,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  PAPER,
  label,
  note,
} from "../../editorial/style";
import { Ink, W, H } from "../../editorial/ui";

/**
 * Pieces this video needs beyond the shared editorial kit: a C listing set
 * the way a magazine prints one, and the parts of a memory figure (boxes,
 * the address over each, and a pointer's arrow to the box it holds the
 * address of).
 */

/** Addresses keep one color everywhere: the label over a box, a pointer's
 *  value, the arrow it draws, and the & and * that make and follow them. */
export const ADDR = BAR;
export const ADDR_INK = BLUE_INK;
/** Plain int values, in the listing's number ink. */
export const VALUE_INK = inkOf.orange;

/** The listing's grey card, and the token inks from `inkOf` (theme/brand.ts). */
export const LISTING_PAPER = ds("gray", 50);
const TOKEN_INK = {
  keyword: inkOf.purple,
  builtin: inkOf.teal,
  number: VALUE_INK,
  string: inkOf.green,
  comment: INK_SOFT,
  punct: INK_SOFT,
  name: INK,
  pointer: ADDR_INK,
} as const;
const KEYWORDS = new Set(["int", "void", "char", "double", "return", "if", "else", "for", "while", "sizeof"]);
const BUILTINS = new Set(["printf"]);

type Token = { text: string; color: string; weight?: number };

/** A small C tokenizer: enough for a few printed lines. `&` and `*` take the
 *  address ink, so the code and the figure read as one key. */
export const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\d+)|([A-Za-z_]\w*)|([&*])|(\s+)|(.)/g)) {
    const [text, comment, str, num, word, ptr] = m;
    if (comment) out.push({ text, color: TOKEN_INK.comment });
    else if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && BUILTINS.has(word)) out.push({ text, color: TOKEN_INK.builtin });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else if (ptr) out.push({ text, color: TOKEN_INK.pointer, weight: 800 });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of code, colored. */
export const Code: React.FC<{ line: string; size?: number; style?: React.CSSProperties }> = ({ line, size, style }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none", ...style }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

/** A highlighter stroke behind one listing line, wiped in from the left. By
 *  default it spans the line's code, from its first non-blank character. */
export type LineMark = { line: number; at: number; out?: number; color?: string; col?: number; chars?: number };

export type ListingGeometry = { size: number; lineH: number; padY: number; gutter: number };
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
  size: number;
  /** When the panel itself appears. */
  at: number;
  /** When each line inks in (index-aligned with `lines`). */
  lineAt: readonly number[];
  marks?: readonly LineMark[];
  children?: React.ReactNode;
}> = ({ lines, x, top, width, size, at, lineAt, marks = [], children }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const height = listingHeight(lines.length, size);
  const codeLeft = g.gutter + size * 0.42;
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
              left: `calc(${codeLeft}px + ${0.35 - pad + col * 0.6}em)`,
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
              left: codeLeft + size * 0.35,
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
      {children}
    </div>
  );
};

/** "Fig. 2" and a title that may hold code: the shared FigLabel, widened. */
export const Fig: React.FC<{ n: string; at: number; x: number; y: number; children: React.ReactNode }> = ({
  n,
  at,
  x,
  y,
  children,
}) => (
  <Ink at={at} style={{ left: x, top: y, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 12 }}>
    <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>Fig. {n}</span>
    <span style={{ ...label(24, INK), fontWeight: 560 }}>{children}</span>
  </Ink>
);

/** Code set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: string; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span
    style={{ fontFamily: MONO, fontSize: "0.94em", fontWeight: weight ?? 500, color, fontVariantLigatures: "none" }}
  >
    {children}
  </span>
);

/** A highlighter stroke behind inline text, `p` of the way across. */
export const Marked: React.FC<{ p: number; color?: string; children: React.ReactNode }> = ({
  p,
  color = HIGHLIGHT,
  children,
}) => (
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

/** How strongly a highlight shows: in at `at`, gone again by `out`. */
export const markP = (frame: number, at: number, out?: number) =>
  ease(frame, at, 12) * (out === undefined ? 1 : 1 - ease(frame, out, 10));

/**
 * One variable's box. It draws itself left to right, like the listing's
 * paper. `bytes` and `ticks` mark the bytes it spans along its top and
 * bottom edges; `tint` washes it in `tintColor`.
 */
export const MemBox: React.FC<{
  x: number;
  top: number;
  width: number;
  height: number;
  at: number;
  bytes?: number;
  ticks?: number;
  tint?: number;
  tintColor?: string;
  children?: React.ReactNode;
}> = ({ x, top, width, height, at, bytes = 0, ticks = 0, tint = 0, tintColor = ADDR, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const fill =
    tint > 0
      ? `color-mix(in srgb, ${tintColor} ${Math.round(tint * 100)}%, ${PAPER})`
      : `color-mix(in srgb, ${INK} 3%, ${PAPER})`;
  const tick = Math.round(height * 0.14) * ticks;
  return (
    <div style={{ position: "absolute", left: x, top, width, height }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          border: `2px solid ${INK}`,
          borderRadius: 4,
          background: fill,
          clipPath: `inset(-2px ${(1 - p) * 100}% -2px -2px)`,
        }}
      />
      {tick > 0
        ? Array.from({ length: bytes - 1 }, (_, i) => {
            const left = ((i + 1) * width) / bytes - 0.75;
            const tickStyle: React.CSSProperties = {
              position: "absolute",
              left,
              width: 1.5,
              height: tick,
              background: `color-mix(in srgb, ${INK} 70%, transparent)`,
            };
            return (
              <React.Fragment key={i}>
                <div style={{ ...tickStyle, top: 0 }} />
                <div style={{ ...tickStyle, bottom: 0 }} />
              </React.Fragment>
            );
          })
        : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: ease(frame, at + 6, 10),
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** A value inside a box: an int in the number ink, an address in the address ink. */
export const Val: React.FC<{ children: string; kind?: "int" | "addr"; size?: number }> = ({
  children,
  kind = "int",
  size,
}) => (
  <span
    style={{
      fontFamily: MONO,
      fontSize: size ?? (kind === "int" ? 40 : 24),
      fontWeight: kind === "int" ? 600 : 500,
      color: kind === "int" ? VALUE_INK : ADDR_INK,
      fontVariantLigatures: "none",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/**
 * A variable's name and its address, on one line over (or under) its box.
 * The address can carry a highlight, and a tag such as `&n` set over it,
 * which is laid out against the address itself rather than at an offset.
 */
export const AddrLabel: React.FC<{
  x: number;
  y: number;
  name: string;
  addr: string;
  at: number;
  nameAt?: number;
  mark?: number;
  tag?: { text: string; at: number; out?: number };
}> = ({ x, y, name, addr, at, nameAt = at, mark = 0, tag }) => {
  const frame = useCurrentFrame();
  const tagP = tag ? markP(frame, tag.at, tag.out) : 0;
  const nameStyle: React.CSSProperties = { fontFamily: MONO, fontSize: 28, fontWeight: 700, color: INK };
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "baseline",
        gap: 12,
        whiteSpace: "nowrap",
      }}
    >
      {/* The name holds its place in the line before it inks, so the
          address beside it never moves. */}
      <span style={{ position: "relative" }}>
        <span style={{ ...nameStyle, visibility: "hidden" }}>{name}</span>
        <Ink at={nameAt} dur={12} style={{ left: 0, top: 0 }}>
          <span style={nameStyle}>{name}</span>
        </Ink>
      </span>
      <Ink at={at} dur={14} style={{ position: "relative" }}>
        <span style={{ position: "relative", display: "inline-block" }}>
          <span style={{ ...note(20, ADDR_INK), fontWeight: 600 }}>
            <Marked p={mark}>{addr}</Marked>
          </span>
          {tagP > 0 ? (
            <span
              style={{
                position: "absolute",
                left: "50%",
                bottom: "100%",
                marginBottom: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: tagP,
                transform: `translate(-50%, ${(1 - tagP) * 8}px)`,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: ADDR_INK, lineHeight: 1.1 }}>
                {tag?.text}
              </span>
              <span style={{ width: 2, height: 10, marginTop: 3, background: ADDR }} />
            </span>
          ) : null}
        </span>
      </Ink>
    </div>
  );
};

export type { Pt } from "../../components/arrow";
/** A cubic Bézier: start, two controls, end. */
export type Curve = Cubic;

/** The head's length along its line, and its half-width. */
const HEAD_LEN = 15;
const HEAD_HALF = 9;

/** Frames a pulse takes to run the length of an arrow. */
const PULSE = 20;

/**
 * A pointer: a dot on the box that holds the address, a line that draws
 * itself to the box at that address, and an arrowhead there. Each frame in
 * `pulses` sends a bead along it, which is what `*p` does.
 */
export const PointerArrow: React.FC<{
  curve: Curve;
  at: number;
  dur?: number;
  pulses?: readonly number[];
  color?: string;
  width?: number;
  dim?: number;
}> = ({ curve, at, dur = 16, pulses = [], color = ADDR, width = 3, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  if (p <= 0) return null;
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  const [s] = curve;
  const head = arrowHead(sampleCubic(curve), HEAD_LEN, HEAD_HALF);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - d }}>
      <circle cx={s[0]} cy={s[1]} r={6.5} fill={color} opacity={ease(frame, at - 2, 6)} />
      <path
        d={cubicPath(curve)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
      <path
        d={head}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={ease(frame, at + dur - 5, 6)}
      />
      {pulses.map((cue, i) => {
        const t = ease(frame, cue, PULSE);
        if (t <= 0 || t >= 1) return null;
        const [px, py] = cubicAt(curve, t);
        const glow = Math.sin(t * Math.PI);
        return (
          <g key={i}>
            <circle cx={px} cy={py} r={18} fill={color} opacity={0.18 * glow} />
            <circle cx={px} cy={py} r={9} fill={color} />
          </g>
        );
      })}
    </svg>
  );
};

/** A plain downward arrow between two boxes, for a copy. */
export const CopyArrow: React.FC<{ x: number; y0: number; y1: number; at: number; color?: string }> = ({
  x,
  y0,
  y1,
  at,
  color = INK_SOFT,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const end = y0 + (y1 - y0) * p;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <line x1={x} x2={x} y1={y0} y2={end} stroke={color} strokeWidth={2.5} strokeDasharray="7 6" />
      <path
        d={arrowHead([[x, y0], [x, end]], 13, 9)}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={ease(frame, at + 8, 5)}
      />
    </svg>
  );
};

/** The accent for what went wrong, so the two runs read as a pair. */
export const WRONG_INK = ACCENT_INK;
