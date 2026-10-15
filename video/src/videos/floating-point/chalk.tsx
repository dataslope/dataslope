// The chalkboard's whole visual vocabulary: the slate, the chalk grain, and
// the four ways anything gets onto the board (handwriting, digits, drawn
// strokes, pinned-up drawings). Everything is revealed at a narration cue and
// drawn the way a hand would put it there, left to right.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { colors, ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { HAND } from "./fonts";
import { line, type Stroke } from "./rough";

export const VIDEO = "floating-point";
export const W = 1920;
export const H = 1080;
/** The board ends here; below is the ledge and the caption strip. */
export const BOARD_BOTTOM = 928;

/** Chalk colors. White does the writing; the tints are the colored sticks,
 *  and keep their site meaning: yellow looks here, red is wrong, green works. */
export const INK = {
  white: `color-mix(in srgb, ${colors.page} 94%, ${ds("yellow", 100)})`,
  dim: `color-mix(in srgb, ${colors.page} 52%, ${ds("gray", 500)})`,
  yellow: ds("yellow", 300),
  red: ds("red", 400),
  blue: ds("blue", 300),
  green: ds("green", 300),
  teal: ds("teal", 300),
  purple: ds("purple", 300),
  orange: ds("orange", 300),
} as const;

/** A deep green slate, made from the brand's darkest green and gray. */
const SLATE = `color-mix(in srgb, ${ds("gray", 800)} 70%, ${ds("green", 900)})`;
const SLATE_LIGHT = `color-mix(in srgb, ${ds("gray", 700)} 62%, ${ds("green", 800)})`;
const SLATE_DEEP = `color-mix(in srgb, ${ds("gray", 900)} 82%, ${ds("green", 900)})`;
const STRIP = `color-mix(in srgb, ${ds("gray", 900)} 88%, ${ds("green", 900)})`;

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lin = (frame: number, at: number, dur: number) =>
  interpolate(frame, [at, at + Math.max(1, dur)], [0, 1], CLAMP);

/** The SVG filters the board's marks share. Rendered once, at the root. */
export const ChalkDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {/* Dry chalk on writing: grain bites holes in the stroke, a light
          displacement roughens its edge, and a faint halo is the dust. */}
      <filter id="fp-chalk" x="-6%" y="-20%" width="112%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves={2} seed={4} result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 -3.4 0 0 2.35"
          result="grain"
        />
        <feComposite in="SourceGraphic" in2="grain" operator="in" result="dry" />
        <feDisplacementMap in="dry" in2="noise" scale={2.4} xChannelSelector="R" yChannelSelector="B" result="rough" />
        <feGaussianBlur in="SourceGraphic" stdDeviation={2.2} result="blur" />
        <feComponentTransfer in="blur" result="halo">
          <feFuncA type="linear" slope={0.2} />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="halo" />
          <feMergeNode in="rough" />
        </feMerge>
      </filter>
      {/* Drawn lines: a coarser grain, the side of the stick. */}
      <filter id="fp-chalk-line" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={9} result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 -3.6 0 0 2.3"
          result="grain"
        />
        <feComposite in="SourceGraphic" in2="grain" operator="in" result="dry" />
        <feDisplacementMap in="dry" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="B" result="rough" />
        <feGaussianBlur in="SourceGraphic" stdDeviation={2.6} result="blur" />
        <feComponentTransfer in="blur" result="halo">
          <feFuncA type="linear" slope={0.16} />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="halo" />
          <feMergeNode in="rough" />
        </feMerge>
      </filter>
      {/* The haze an eraser leaves: soft, streaky, mostly air. */}
      <filter id="fp-smear" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.18" numOctaves={3} seed={21} result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 -2.6 0 0 1.7"
          result="streaks"
        />
        <feGaussianBlur in="SourceGraphic" stdDeviation={34} result="soft" />
        <feComposite in="soft" in2="streaks" operator="in" />
      </filter>
      {/* The slate's own texture: years of dust ground into it. */}
      <filter id="fp-clouds" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.0028 0.0045" numOctaves={4} seed={5} />
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.4 0 0 0 -1.05" />
      </filter>
      <filter id="fp-speck" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={1} seed={13} />
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 7 0 -4.1" />
      </filter>
    </defs>
  </svg>
);

/** Old lessons, wiped but never quite gone. Fixed, so it never flickers. */
const GHOSTS: Stroke[] = [
  line(160, 250, 1180, 210, 301, { wobble: 30, bow: 50 }),
  line(980, 690, 1820, 760, 302, { wobble: 40, bow: -60 }),
  line(260, 560, 860, 640, 303, { wobble: 25, bow: 30 }),
  line(1250, 140, 1760, 330, 304, { wobble: 30, bow: 20 }),
];

/** The board: slate, texture, ghosts of old lessons, the ledge, the strip
 *  the captions are chalked on, and a few sticks of colored chalk. */
export const Slate: React.FC = () => (
  <AbsoluteFill style={{ background: SLATE }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 60% at 48% 42%, ${SLATE_LIGHT}, transparent 75%)`,
        opacity: 0.55,
      }}
    />
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <rect x={0} y={0} width={W} height={BOARD_BOTTOM} filter="url(#fp-clouds)" opacity={0.085} />
      <rect x={0} y={0} width={W} height={BOARD_BOTTOM} filter="url(#fp-speck)" opacity={0.07} />
      <g filter="url(#fp-smear)" opacity={0.35}>
        {GHOSTS.map((g, i) => (
          <path key={i} d={g.d} stroke={INK.white} strokeWidth={90} strokeLinecap="round" fill="none" opacity={0.18} />
        ))}
      </g>
    </svg>
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 85% 80% at 50% 45%, transparent 58%, ${SLATE_DEEP})`,
        opacity: 0.9,
      }}
    />
    {/* Ledge: a rail of dark wood, then the strip below it. */}
    <div
      style={{
        position: "absolute",
        left: 0,
        top: BOARD_BOTTOM,
        width: W,
        height: 18,
        background: `linear-gradient(180deg, color-mix(in srgb, ${ds("orange", 700)} 55%, ${ds("gray", 900)}), color-mix(in srgb, ${ds("orange", 900)} 45%, ${ds("gray", 900)}))`,
        boxShadow: `0 -3px 0 color-mix(in srgb, ${ds("orange", 500)} 35%, transparent) inset, 0 6px 14px color-mix(in srgb, ${ds("gray", 900)} 70%, transparent)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        top: BOARD_BOTTOM + 18,
        width: W,
        height: H - BOARD_BOTTOM - 18,
        background: STRIP,
      }}
    />
    <ChalkSticks />
  </AbsoluteFill>
);

/** Three sticks of chalk resting on the ledge, bottom right. */
const ChalkSticks: React.FC = () => {
  const sticks = [
    { x: 1640, w: 92, c: INK.white, r: -3 },
    { x: 1748, w: 64, c: ds("yellow", 300), r: 4 },
    { x: 1822, w: 54, c: ds("blue", 300), r: -2 },
  ];
  return (
    <>
      {sticks.map((s) => (
        <div
          key={s.x}
          style={{
            position: "absolute",
            left: s.x,
            top: BOARD_BOTTOM - 15,
            width: s.w,
            height: 17,
            borderRadius: 8,
            background: `linear-gradient(180deg, ${s.c}, color-mix(in srgb, ${s.c} 70%, ${ds("gray", 600)}))`,
            transform: `rotate(${s.r}deg)`,
            boxShadow: `0 4px 6px color-mix(in srgb, ${ds("gray", 900)} 55%, transparent)`,
          }}
        />
      ))}
    </>
  );
};

const chalkFilter = "url(#fp-chalk)";

/** A soft-edged left-to-right reveal, as if the line were being written. */
const sweep = (p: number, feather = 50) => {
  const m = `linear-gradient(90deg, ${INK.white} calc(${p} * (100% + ${feather}px) - ${feather}px), transparent calc(${p} * (100% + ${feather}px)))`;
  return { maskImage: m, WebkitMaskImage: m };
};

/** Handwriting, written on from `at` at about `speed` letters a frame. */
export const Hand: React.FC<{
  at: number;
  x: number;
  y: number;
  size?: number;
  color?: string;
  weight?: number;
  speed?: number;
  rotate?: number;
  align?: "left" | "center";
  style?: React.CSSProperties;
  children: string;
}> = ({ at, x, y, size = 56, color = INK.white, weight = 600, speed = 0.85, rotate = 0, align = "left", style, children }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const p = lin(frame, at, Math.max(6, Math.round(children.length / speed)));
  return (
    <div
      style={{
        position: "absolute",
        // Caveat's strokes overhang their advance box, and a mask clips at
        // the box, so pad it and shift it back by the same amount.
        left: x - size * 0.3,
        top: y - size * 0.1,
        padding: `${size * 0.1}px ${size * 0.3}px ${size * 0.2}px`,
        transform: `${align === "center" ? "translateX(-50%) " : ""}rotate(${rotate}deg)`,
        fontFamily: HAND,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.1,
        color,
        whiteSpace: "pre",
        filter: chalkFilter,
        ...sweep(p),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** One run of digits or code inside a `Mono` line. */
export type Part = {
  text: string;
  color?: string;
  /** When this run starts; by default straight after the previous one. */
  at?: number;
  /** Characters a frame. */
  speed?: number;
  /** Smudge this run down to `dimTo` opacity from `dimAt`. */
  dimAt?: number;
  dimTo?: number;
};

/** JetBrains Mono advances exactly 0.6 em per glyph. */
export const charW = (size: number) => size * 0.6;

/** Digits and code in chalk, written one character at a time. Positions
 *  inside the line are exact (`charW`), so circles and braces can find a
 *  digit by its index. */
export const Mono: React.FC<{
  at: number;
  x: number;
  y: number;
  size?: number;
  color?: string;
  weight?: number;
  speed?: number;
  parts: Part[] | string;
}> = ({ at, x, y, size = 56, color = INK.white, weight = 600, speed = 1.2, parts }) => {
  const frame = useCurrentFrame();
  const runs = typeof parts === "string" ? [{ text: parts }] : parts;
  if (frame < Math.min(...runs.map((r) => r.at ?? at), at)) return null;
  let cursor = at;
  const spans: React.ReactNode[] = [];
  runs.forEach((run, ri) => {
    const start = run.at ?? cursor;
    const sp = run.speed ?? speed;
    const dim = run.dimAt === undefined ? 1 : 1 - (1 - (run.dimTo ?? 0.2)) * lin(frame, run.dimAt, 10);
    [...run.text].forEach((ch, i) => {
      const t = start + i / sp;
      const o = frame < t ? 0 : lin(frame, t, 2);
      spans.push(
        <span key={`${ri}-${i}`} style={{ opacity: o * dim, color: run.color ?? color }}>
          {ch}
        </span>,
      );
    });
    cursor = start + run.text.length / sp;
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontFamily: MONO,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.2,
        // JetBrains Mono ligates == and >>>; chalk is written a glyph at a time.
        fontVariantLigatures: "none",
        fontFeatureSettings: '"calt" 0, "liga" 0',
        color,
        whiteSpace: "pre",
        filter: chalkFilter,
      }}
    >
      {spans}
    </div>
  );
};

/** Hand-drawn strokes (circles, arrows, rules), drawn in order from `at`
 *  over `dur` frames, each taking its share of the time by length. */
export const Chalk: React.FC<{
  strokes: Stroke[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  opacity?: number;
}> = ({ strokes, at, dur = 14, color = INK.white, width = 6, opacity = 1 }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const total = strokes.reduce((s, k) => s + k.len, 0) || 1;
  const p = lin(frame, at, dur) * total;
  let done = 0;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
      <g filter="url(#fp-chalk-line)">
        {strokes.map((s, i) => {
          const q = Math.max(0, Math.min(1, (p - done) / (s.len || 1)));
          done += s.len;
          if (q <= 0) return null;
          return (
            <path
              key={i}
              d={s.d}
              fill="none"
              stroke={color}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - q}
            />
          );
        })}
      </g>
    </svg>
  );
};

/** A chalk drawing from illustrations.json, sketched on with a diagonal
 *  sweep and a small settle, then left to breathe. */
export const Drawing: React.FC<{
  id: string;
  at: number;
  x: number;
  y: number;
  w: number;
  h: number;
  flip?: boolean;
  dur?: number;
  drift?: number;
}> = ({ id, at, x, y, w, h, flip = false, dur = 22, drift = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const p = lin(frame, at, dur);
  const settle = pop(frame, at, fps, 16);
  const f = 18;
  const m = `linear-gradient(118deg, ${INK.white} calc(${p} * (100% + ${f}%) - ${f}%), transparent calc(${p} * (100% + ${f}%)))`;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `translateY(${bob(frame - at, drift, 120)}px) scale(${0.94 + 0.06 * settle}) scaleX(${flip ? -1 : 1})`,
        maskImage: m,
        WebkitMaskImage: m,
      }}
    >
      <Illustration video={VIDEO} id={id} style={{ width: w, height: h }} />
    </div>
  );
};
