import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, svgText } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The page furniture (Drift, Kicker, Headline,
 * Mark, Strike) and the Python listing are da-pandas/parts.tsx's, as DE
 * Part 5 and BE Part 7 use them, copied rather than imported so this video
 * does not move when those are revised. What is local, after the owner's
 * 2026-11-20 badge review: diagram cells outlined in near-black with black
 * text (a highlight colors outline and text together), filled shapes (bars,
 * blocks) with no outline, small corner radii, and a straight arrow whose
 * head comes from arrow.ts.
 */
export { OK, OK_INK };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
/** The page's right margin for figures. */
export const RIGHT = 1800;

// ── Colors: brand tokens only ───────────────────────────────────────────────

export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 24%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 22%, transparent)`;
/** A filled block that must hold its shape on white: a step deeper than a tint. */
export const BLUE_FILL = ds("blue", 200);
export const RED_FILL = ds("red", 200);
export const GREEN_FILL = ds("green", 200);
export const GRAY_FILL = ds("gray", 200);
export { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER };

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** "4,950": a count as it is set on screen. */
export const int = (x: number) => Math.round(x).toLocaleString("en-US");

/** A seeded generator (mulberry32), for drawings whose layout is only a
 *  picture of a count the narration gives. */
export const seeded = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A slow push on the whole scene (da-pandas/parts.tsx): a few percent over
 *  its life, up to speed in two seconds, so a long scene never sits still. */
export const Drift: React.FC<{ from: number; to: number; scale?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  scale = 0.022,
  origin = "50% 45%",
  children,
}) => {
  const frame = useCurrentFrame();
  const s = 1 + scale * drift(frame, from, to);
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>;
};

// ── Headings ─────────────────────────────────────────────────────────────────

/** A part's kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={{ ...label(26, ACCENT_INK), fontWeight: 500 }}>{children}</span>
    </Ink>
  );
};

/** A headline on one line: the lead on `at`, the turn following it in the
 *  flow on `turnAt`, both in the ink (titles are one color). */
export const Headline: React.FC<{ lead: string; turn?: string; at: number; turnAt?: number; out?: number; size?: number }> = ({
  lead,
  turn,
  at,
  turnAt,
  out,
  size = 64,
}) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink at={turnAt ?? at + 10} dur={18} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

// ── Words ────────────────────────────────────────────────────────────────────

/** Code inside a line of type, at 0.92em of the line and never under 19px
 *  (de-python/mono.tsx). */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: weight ?? 500, color, fontVariantLigatures: "none", wordSpacing: "-0.3em" }}>
    {children}
  </span>
);

/**
 * A highlighter stroke under the words it wraps, swept on `at`, lifted on
 * `out`. It reaches 0.14em past the words on each side and takes that back as
 * margin, so a neighbour keeps a full space (da-pandas/parts.tsx).
 */
export const Mark: React.FC<{ at: number; out?: number; dur?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  dur = 12,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 14);
  return (
    <span style={{ position: "relative", display: "inline-block", margin: "0 0.14em" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.14em",
          top: "0.04em",
          bottom: "-0.06em",
          width: `calc((100% + 0.28em) * ${p})`,
          background: color,
          borderRadius: "0.14em",
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A line struck through a word or two, drawn on `at`. */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = ACCENT, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.08em",
          top: "0.56em",
          width: `calc((100% + 0.16em) * ${p})`,
          height: "0.08em",
          minHeight: 3,
          background: color,
          borderRadius: 2,
          transform: "rotate(-4deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/** Words that fade up on `at` inside a line already on the page. */
export const Fade: React.FC<{ at: number; out?: number; dur?: number; children: React.ReactNode }> = ({ at, out, dur = 10, children }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  return <span style={{ opacity: ease(frame, at, dur) * (1 - o) }}>{children}</span>;
};

/** One line of Inter at one size that inks in on `at`: the scene's notes. */
export const Line: React.FC<{
  at: number;
  x: number;
  y: number;
  size?: number;
  color?: string;
  weight?: number;
  out?: number;
  dim?: number;
  width?: number;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}> = ({ at, x, y, size = 24, color = INK, weight = 500, out, dim, width, align = "left", children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  return (
    <Ink
      at={at}
      dur={14}
      out={out}
      style={{
        left: align === "left" ? x : align === "center" ? x - (width ?? 0) / 2 : x - (width ?? 0),
        top: y,
        width,
        textAlign: align,
        whiteSpace: "nowrap",
        opacity: 1 - d,
      }}
    >
      <span style={{ ...note(size, color), fontWeight: weight }}>{children}</span>
    </Ink>
  );
};

/**
 * The separator between two columns set side by side: a 1px hairline the
 * height of the columns' text, centred in the gap, drawn down on `at` (the
 * column to its right inking in).
 */
export const VRule: React.FC<{ x: number; top: number; bottom: number; at: number; out?: number }> = ({ x, top, bottom, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: Math.round(x), top, width: 1, height: (bottom - top) * p, background: HAIRLINE, opacity: 1 - o }} />;
};

// ── Python, colored as every listing in the series colors it ────────────────

export const LISTING_PAPER = ds("gray", 50);
const TOKEN_INK = {
  keyword: inkOf.purple,
  string: inkOf.green,
  number: inkOf.orange,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set("import from as def return lambda if else elif for in and or not is True False None".split(" "));

type Token = { text: string; color: string; weight?: number };

/** A small Python tokenizer: enough for a few printed lines. */
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d[\d_]*(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: TOKEN_INK.punct });
    else if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 600 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of Python, colored. */
export const Code: React.FC<{ line: string; size?: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

const listingGeometry = (size: number) => ({
  lineH: Math.round(size * 1.8),
  padY: Math.round(size * 0.66),
  padX: Math.round(size * 0.8),
});

/** The full height of a listing of `lines` lines. */
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/** The width a listing needs for its longest line (a mono glyph is 0.6em). */
export const listingWidth = (lines: readonly string[], size: number) =>
  Math.ceil(Math.max(...lines.map((l) => l.length)) * 0.6 * size + 2 * listingGeometry(size).padX);

/**
 * A printed Python listing, the house look: gray-50 paper between a rule
 * above and a hairline below. Each line inks in on its own cue; a mark is a
 * band behind one line, found by what the line says (`lineOf`).
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width?: number;
  size?: number;
  at: number;
  lineAt?: readonly number[];
  marks?: readonly { line: number; at: number; out?: number; color?: string }[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 26, at, lineAt, marks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
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
      {marks.map((m, i) => {
        const mw = ease(frame, m.at, 12);
        const mo = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (mw <= 0 || mo >= 1) return null;
        const indent = lines[m.line].length - lines[m.line].trimStart().length;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.padX - size * 0.2 + indent * 0.6 * size,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              width: `${((lines[m.line].length - indent) * 0.6 + 0.4) * mw}em`,
              fontSize: size,
              background: m.color ?? MARK,
              opacity: 1 - mo,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <Ink
          key={i}
          at={lineAt?.[i] ?? at + 4 + i * 4}
          dur={14}
          style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}
        >
          <Code line={line} size={size} />
        </Ink>
      ))}
    </div>
  );
};

/** The index of the listing line that holds `text`: a highlight finds its
 *  line by what the line says (de-python/parts.tsx). */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

// ── Diagram pieces ───────────────────────────────────────────────────────────

export type Tone = "ink" | "data" | "ok" | "bad" | "soft";
const TONE_INK: Record<Tone, string> = { ink: INK, data: BLUE_INK, ok: OK_INK, bad: ACCENT_INK, soft: INK_SOFT };
const TONE_LINE: Record<Tone, string> = { ink: INK, data: BAR, ok: OK, bad: ACCENT, soft: ds("gray", 400) };
export const toneInk = (t: Tone) => TONE_INK[t];
export const toneLine = (t: Tone) => TONE_LINE[t];

/**
 * A cell of a diagram: no fill, a 2px near-black outline, black text (the
 * owner, 2026-11-12 and 2026-11-20). A highlight colors outline and text
 * together (`tone`); `band` lays the narration's yellow under the text only.
 * Positioned by its top-left corner, in page pixels.
 */
export const Cell: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  children?: React.ReactNode;
  tone?: Tone;
  size?: number;
  mono?: boolean;
  radius?: number;
  opacity?: number;
  dashed?: boolean;
  band?: number;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, children, tone = "ink", size = 24, mono, radius = 8, opacity = 1, dashed, band = 0, style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      boxSizing: "border-box",
      border: `2px ${dashed ? "dashed" : "solid"} ${TONE_LINE[tone]}`,
      borderRadius: radius,
      background: band > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(band * 100)}%, transparent)` : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity,
      ...style,
    }}
  >
    <span style={{ ...note(size, TONE_INK[tone]), fontWeight: 500, whiteSpace: "nowrap", ...(mono ? { fontFamily: MONO, fontVariantLigatures: "none" } : {}) }}>
      {children}
    </span>
  </div>
);

/** A straight arrow, or one along `points` (corners rounded), drawn from its
 *  tail on `at`, its head from arrowHead() on the straight last stretch. */
export const Arrow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  out?: number;
  dim?: number;
  dash?: string;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 14, out, dim, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2
      ? roundedPolyline(points, 18)
      : {
          d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`,
          samples: Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt),
        };
  const len = lineLength(samples);
  const reach = Math.max(0, (len - head + 1) / len);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {dash ? (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }} />
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      <path d={arrowHead(samples, head, head * 0.48, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />
    </svg>
  );
};

export type Bar = {
  /** What the bar measures, in the label face, right-aligned before it. */
  name: React.ReactNode;
  value: number;
  /** What is printed at the bar's end, if anything. */
  end?: React.ReactNode;
  endAt?: number;
  color: string;
  at: number;
  /** A yellow band behind the name, from this frame. */
  litAt?: number;
  dur?: number;
};

/**
 * Horizontal bars on one scale, the longest `width` px: each grows from the
 * left on its cue. Filled, no outline. A bar too short to see still gets a
 * sliver, so "about nothing" reads as a mark, not a gap.
 */
export const Bars: React.FC<{
  bars: readonly Bar[];
  x: number;
  top: number;
  width: number;
  rowH: number;
  nameW?: number;
  size?: number;
  max?: number;
  thick?: number;
  out?: number;
  /** Print every bar's end in one column this far past the bars' start,
   *  rather than at each bar's own end (a reference line crosses the bars). */
  endCol?: number;
}> = ({ bars, x, top, width, rowH, nameW = 260, size = 23, max, thick, out, endCol }) => {
  const frame = useCurrentFrame();
  const top1 = max ?? Math.max(...bars.map((b) => b.value));
  const gone = out === undefined ? 0 : ease(frame, out, 12);
  if (gone >= 1) return null;
  const t = thick ?? Math.round(rowH * 0.46);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - gone }}>
      {bars.map((b, i) => {
        const p = ease(frame, b.at, b.dur ?? 22);
        const shown = ease(frame, b.at - 4, 10);
        if (shown <= 0) return null;
        const full = Math.max(5, (b.value / top1) * width);
        const w = full * p;
        const mid = top + i * rowH + rowH / 2;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: mid - size * 0.68,
                width: nameW - 24,
                textAlign: "right",
                opacity: shown,
                whiteSpace: "nowrap",
                fontSize: size,
              }}
            >
              {b.litAt !== undefined ? (
                <Mark at={b.litAt}>
                  <span style={{ ...label(size, INK) }}>{b.name}</span>
                </Mark>
              ) : (
                <span style={{ ...label(size, INK) }}>{b.name}</span>
              )}
            </div>
            <div style={{ position: "absolute", left: x + nameW, top: mid - t / 2, width: w, height: t, background: b.color, borderRadius: 3 }} />
            {b.end ? (
              <div
                style={{
                  position: "absolute",
                  left: x + nameW + (endCol ?? full + 18),
                  top: mid - size * 0.68,
                  whiteSpace: "nowrap",
                  fontSize: size,
                  opacity: ease(frame, b.endAt ?? b.at + 14, 10),
                }}
              >
                {b.end}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** A watercolor from illustrations.json: it pops in on `at`, bobs gently and
 *  fades on `out`. The scene puts an `el-pop` on the same frame. */
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

/** The art as trimmed (public/images/mle-coding), so a box keeps its aspect
 *  and stays within half the natural size at 4K. */
export const ART = {
  frog: { id: "mle-coding-tree-frog", w: 1478, h: 1024 },
  stopwatch: { id: "mle-coding-stopwatch", w: 836, h: 983 },
  cards: { id: "mle-coding-cards", w: 1024, h: 623 },
  barrel: { id: "mle-coding-barrel", w: 688, h: 1024 },
} as const;
/** A box `w` wide for an image, at its own aspect. */
export const artBox = (a: { w: number; h: number }, w: number) => ({ width: w, height: Math.round((w * a.h) / a.w) });

/** A small caption, in the soft ink. */
export const Aside: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 22, color = INK_SOFT }) => (
  <span style={{ ...note(size, color), whiteSpace: "nowrap" }}>{children}</span>
);

/** SVG text in the annotation face, colored through `fill`. */
export const svgNote = (size: number, color: string = INK): React.CSSProperties => svgText({ ...note(size, color), fontWeight: 500 });
