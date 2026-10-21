import React, { useId } from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { ACCENT_INK, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { H, Ink, W } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";

/**
 * Pieces this video needs beyond the shared editorial kit: a printed CSS
 * listing (adapted from list-vs-set's Python one), a box drawn layer by
 * layer, and dimension lines.
 */

// ── The four layers keep one color each through every figure. ──

/** Content: the blue of the data on this page. */
export const CONTENT_FILL = `color-mix(in srgb, ${ds("blue", 500)} 24%, ${PAPER})`;
export const CONTENT_INK = BLUE_INK;
/** A hairline round the content, so two boxes side by side stay two. */
const CONTENT_EDGE = `color-mix(in srgb, ${ds("blue", 500)} 60%, ${PAPER})`;
/** Padding: green, the box's own background, set apart from the content. */
export const PADDING_FILL = `color-mix(in srgb, ${ds("green", 500)} 26%, ${PAPER})`;
export const PADDING_INK = inkOf.green;
/** Border: solid ink, the one layer that is a line. */
export const BORDER_FILL = INK;
export const BORDER_INK = INK;
/** Margin: hatched space, never painted. */
export const MARGIN_INK = INK_SOFT;

// ── CSS listing ──

/** The listing's grey card, and the token inks from `inkOf` (theme/brand.ts). */
export const LISTING_PAPER = ds("gray", 50);
const TOKEN_INK = {
  selector: inkOf.purple,
  property: inkOf.teal,
  number: inkOf.orange,
  value: INK,
  comment: INK_SOFT,
  punct: INK_SOFT,
} as const;

type Token = { text: string; color: string; weight?: number; italic?: boolean };
type CssState = { inBlock: boolean; afterColon: boolean };

/** A small CSS tokenizer: enough for a few printed lines. The state carries
 *  across lines, so a declaration on its own line knows it is inside a rule. */
export const tokenizeCss = (line: string, state: CssState = { inBlock: false, afterColon: false }) => {
  const out: Token[] = [];
  let { inBlock, afterColon } = state;
  const re = /(\/\*.*?(?:\*\/|$))|([{}])|(;)|(-?\d+(?:\.\d+)?(?:px|%|em|rem)?)|([\w-]+)|([.#*:]+[\w-]*)|(\s+)|(.)/g;
  for (const m of line.matchAll(re)) {
    const [text, comment, brace, semi, num, word, sel] = m;
    if (comment) out.push({ text, color: TOKEN_INK.comment, italic: true });
    else if (brace) {
      inBlock = brace === "{";
      afterColon = false;
      out.push({ text, color: TOKEN_INK.punct });
    } else if (semi) {
      afterColon = false;
      out.push({ text, color: TOKEN_INK.punct });
    } else if (num) out.push({ text, color: inBlock ? TOKEN_INK.number : TOKEN_INK.selector });
    else if (word) {
      if (!inBlock) out.push({ text, color: TOKEN_INK.selector, weight: 600 });
      else if (!afterColon) out.push({ text, color: TOKEN_INK.property });
      else out.push({ text, color: TOKEN_INK.value });
    } else if (sel) {
      if (inBlock && sel === ":") {
        afterColon = true;
        out.push({ text, color: TOKEN_INK.punct });
      } else out.push({ text, color: TOKEN_INK.selector, weight: 600 });
    } else out.push({ text, color: TOKEN_INK.punct });
  }
  return { tokens: out, state: { inBlock, afterColon } };
};

/** Every line of a listing, tokenized with the state the lines above leave. */
const tokenizeLines = (lines: readonly string[]) => {
  let state: CssState = { inBlock: false, afterColon: false };
  return lines.map((line) => {
    const r = tokenizeCss(line, state);
    state = r.state;
    return r.tokens;
  });
};

const Tokens: React.FC<{ tokens: Token[]; size?: number }> = ({ tokens, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokens.map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400, fontStyle: t.italic ? "italic" : "normal" }}>
        {t.text}
      </span>
    ))}
  </span>
);

/** One line of CSS, colored as it would be inside a rule or outside one. */
export const Css: React.FC<{ line: string; size?: number; inBlock?: boolean }> = ({ line, size, inBlock = false }) => (
  <Tokens tokens={tokenizeCss(line, { inBlock, afterColon: false }).tokens} size={size} />
);

/** A highlighter stroke behind one listing line, wiped in from the left. */
export type LineMark = { line: number; at: number; out?: number; color?: string; from?: number; chars?: number };

export type ListingGeometry = { size: number; lineH: number; padY: number; gutter: number };
export const listingGeometry = (size: number): ListingGeometry => ({
  size,
  lineH: Math.round(size * 1.82),
  padY: Math.round(size * 0.72),
  gutter: Math.round(size * 2.1),
});

/** The left edge of the code on a listing's lines, from the panel's left. */
export const codeLeft = (size: number) => listingGeometry(size).gutter + size * 0.77;

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
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 32, at, lineAt, marks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  const faded = dim === undefined ? 0 : ease(frame, dim, 12) * 0.55;
  if (p <= 0 || gone >= 1) return null;
  const height = g.padY * 2 + lines.length * g.lineH;
  const tokens = tokenizeLines(lines);
  return (
    <div style={{ position: "absolute", left: x, top, width, height, opacity: (1 - gone) * (1 - faded) }}>
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
        const from = m.from ?? lines[m.line].length - lines[m.line].trimStart().length;
        const chars = m.chars ?? lines[m.line].length - from;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              // In em of the code's own size, so it spans the characters.
              left: `calc(${codeLeft(size)}px + ${(from * 0.6 - 0.35)}em)`,
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
            <Tokens tokens={tokens[i]} size={size} />
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

// ── Geometry ──

export type Rect = { x: number; y: number; w: number; h: number };
const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });

/** A box as it is drawn: its content rectangle in page px, and the width of
 *  each layer around it, in page px. */
export type BoxShape = { content: Rect; padding: number; border: number; margin?: number };

/** Build a shape from the top-left corner of its border box. */
export const boxAt = (
  x: number,
  y: number,
  contentW: number,
  contentH: number,
  padding: number,
  border: number,
  margin = 0,
): BoxShape => ({
  content: { x: x + padding + border, y: y + padding + border, w: contentW, h: contentH },
  padding,
  border,
  margin,
});

/** The border box of a shape, its outer visible edge. */
export const outer = (s: BoxShape): Rect => grow(s.content, s.padding + s.border);

/**
 * One box, its layers revealed from the inside out: each layer grows out of
 * the one inside it as its progress runs from 0 to 1. `ghost` draws only the
 * outline of the border box, dashed: where a box would go.
 */
export const BoxDrawing: React.FC<{
  shape: BoxShape;
  content?: number;
  padding?: number;
  border?: number;
  margin?: number;
  opacity?: number;
  ghost?: boolean;
  ghostColor?: string;
  children?: React.ReactNode;
}> = ({ shape, content = 1, padding = 1, border = 1, margin = 0, opacity = 1, ghost, ghostColor = INK_SOFT, children }) => {
  const hatch = useId().replace(/:/g, "");
  const c = shape.content;
  const pr = grow(c, shape.padding * padding);
  const br = grow(pr, shape.border * border);
  const mr = grow(br, (shape.margin ?? 0) * margin);
  if (opacity <= 0) return null;
  if (ghost) {
    const o = outer(shape);
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
        <rect x={o.x + 1} y={o.y + 1} width={o.w - 2} height={o.h - 2} fill="none" stroke={ghostColor} strokeWidth={2} strokeDasharray="10 7" />
      </svg>
    );
  }
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
        <defs>
          <pattern id={hatch} width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={14} stroke={HAIRLINE} strokeWidth={1.4} />
          </pattern>
        </defs>
        {margin > 0 ? (
          <g opacity={Math.min(1, margin * 3)}>
            <rect x={mr.x} y={mr.y} width={mr.w} height={mr.h} fill={`url(#${hatch})`} />
            <rect
              x={mr.x + 0.75}
              y={mr.y + 0.75}
              width={mr.w - 1.5}
              height={mr.h - 1.5}
              fill="none"
              stroke={MARGIN_INK}
              strokeWidth={1.5}
              strokeDasharray="8 6"
            />
            {/* The margin is space: the hatch stops at the border edge. */}
            <rect x={br.x} y={br.y} width={br.w} height={br.h} fill={PAPER} />
          </g>
        ) : null}
        {border > 0 ? <rect x={br.x} y={br.y} width={br.w} height={br.h} fill={BORDER_FILL} /> : null}
        {padding > 0 ? <rect x={pr.x} y={pr.y} width={pr.w} height={pr.h} fill={PADDING_FILL} /> : null}
        {content > 0 ? (
          <rect
            x={c.x + 0.75}
            y={c.y + 0.75}
            width={c.w - 1.5}
            height={c.h - 1.5}
            fill={CONTENT_FILL}
            stroke={CONTENT_EDGE}
            strokeWidth={1.5}
            opacity={Math.min(1, content * 1.5)}
          />
        ) : null}
      </svg>
      {children ? (
        <div
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: c.w,
            height: c.h,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: opacity * content,
          }}
        >
          {children}
        </div>
      ) : null}
    </>
  );
};

/**
 * A dimension line: a hairline between two end ticks, drawn out from its
 * middle, with its label set clear of the line above or below it.
 */
export const Dim: React.FC<{
  x0: number;
  x1: number;
  y: number;
  at: number;
  out?: number;
  side?: "above" | "below";
  color?: string;
  tick?: number;
  children: React.ReactNode;
}> = ({ x0, x1, y, at, out, side = "above", color = INK, tick = 9, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const a = mid - (mid - x0) * p;
  const b = mid + (x1 - mid) * p;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
        <line x1={a} x2={b} y1={y} y2={y} stroke={color} strokeWidth={1.6} />
        <line x1={a} x2={a} y1={y - tick} y2={y + tick} stroke={color} strokeWidth={1.6} />
        <line x1={b} x2={b} y1={y - tick} y2={y + tick} stroke={color} strokeWidth={1.6} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: mid,
          top: side === "above" ? y - tick - 6 : y + tick + 6,
          transform: `translate(-50%, ${side === "above" ? "-100%" : "0"})`,
          whiteSpace: "nowrap",
          opacity: ease(frame, at + 6, 10) * (1 - o),
        }}
      >
        {children}
      </div>
    </>
  );
};

/** A dimension's label: a number in Inter, optionally with a word after it. */
export const DimLabel: React.FC<{ value: string; unit?: string; color?: string; size?: number; children?: React.ReactNode }> = ({
  value,
  unit = "px",
  color = INK,
  size = 24,
  children,
}) => (
  <span style={{ display: "inline-flex", alignItems: "baseline", gap: "0.35em" }}>
    <span style={{ ...note(size, color), fontWeight: 650 }}>
      {value}
      {unit}
    </span>
    {children ? <span style={note(Math.max(20, size - 3), INK_SOFT)}>{children}</span> : null}
  </span>
);

