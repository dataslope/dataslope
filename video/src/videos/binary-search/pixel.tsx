// The arcade's UI kit: notched pixel boxes, bitmap glyphs drawn as squares,
// display type with hard drop shadows, the CRT scanlines, and a Scene whose
// cross-fade moves in hard steps like everything else on this screen.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Illustration } from "../../components/Illustration";
import { Pattern } from "../../components/Pattern";
import { PIXEL, TERM } from "./fonts";
import { ARCADE, H, hop, shade, steps, W } from "./theme";

export const VIDEO = "binary-search";

/**
 * Shows its children between two absolute frames, like the shared `Scene`,
 * but fades in three hard steps instead of an eased ramp: a CRT changing
 * pictures, not a film dissolve.
 */
export const Screen: React.FC<{
  from: number;
  to: number;
  fade?: number;
  /** Frames to fade in; 0 for a scene that must be whole on its first frame. */
  fadeIn?: number;
  children: React.ReactNode;
}> = ({ from, to, fade = 6, fadeIn = fade, children }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const opacity = Math.min(
    fadeIn > 0 ? steps(frame, from, fadeIn, 3) : 1,
    1 - steps(frame, to - fade, fade, 3),
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** A clip-path that cuts one pixel block off every corner: the 8-bit box. */
export const notch = (px: number) =>
  `polygon(${px}px 0, calc(100% - ${px}px) 0, calc(100% - ${px}px) ${px}px, 100% ${px}px, ` +
  `100% calc(100% - ${px}px), calc(100% - ${px}px) calc(100% - ${px}px), calc(100% - ${px}px) 100%, ` +
  `${px}px 100%, ${px}px calc(100% - ${px}px), 0 calc(100% - ${px}px), 0 ${px}px, ${px}px ${px}px)`;

/** A hard-bordered panel with notched corners and a one-block bevel. */
export const PixelBox: React.FC<{
  border?: string;
  fill?: string;
  /** Bevel colors: light top-left, dark bottom-right. */
  hi?: string;
  lo?: string;
  px?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ border = ARCADE.neon, fill = ARCADE.panel, hi, lo, px = 6, style, children }) => (
  <div
    style={{
      position: "absolute",
      background: border,
      clipPath: notch(px),
      padding: px,
      boxSizing: "border-box",
      ...style,
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        background: fill,
        boxSizing: "border-box",
        boxShadow:
          hi && lo ? `inset ${px}px ${px}px 0 ${hi}, inset -${px}px -${px}px 0 ${lo}` : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  </div>
);

/** Display type in Press Start 2P with a hard, unblurred drop shadow. */
export const Pixel: React.FC<{
  size: number;
  color?: string;
  drop?: string | null;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ size, color = ARCADE.text, drop = null, style, children }) => (
  <div
    style={{
      fontFamily: PIXEL,
      fontSize: size,
      lineHeight: 1.25,
      color,
      whiteSpace: "nowrap",
      textShadow: drop ? `${Math.max(4, size / 12)}px ${Math.max(4, size / 12)}px 0 ${drop}` : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Body copy in VT323. */
export const Term: React.FC<{
  size: number;
  color?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ size, color = ARCADE.text, style, children }) => (
  <div
    style={{
      fontFamily: TERM,
      fontSize: size,
      lineHeight: 1,
      color,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** A glyph drawn from a bitmap: one square per non-"." character, colored
 *  by `inks[char]`. `crispEdges` keeps every block hard. */
export const Bitmap: React.FC<{
  rows: readonly string[];
  px: number;
  inks: Record<string, string>;
  style?: React.CSSProperties;
}> = ({ rows, px, inks, style }) => {
  const cols = Math.max(...rows.map((r) => r.length));
  return (
    <svg
      width={cols * px}
      height={rows.length * px}
      shapeRendering="crispEdges"
      style={{ display: "block", ...style }}
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "." ? null : (
            <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={inks[c]} />
          ),
        ),
      )}
    </svg>
  );
};

const flipV = (rows: readonly string[]) => [...rows].reverse();
const transpose = (rows: readonly string[]) =>
  [...rows[0]].map((_, x) => rows.map((r) => r[x]).join(""));

/** `#` is the ink, `+` its darker edge. */
export const ARROW_UP = [
  "....#....",
  "...###...",
  "..#####..",
  ".#######.",
  "#########",
  "+++###+++",
  "...###...",
  "...###...",
  "...+++...",
] as const;
export const ARROW_DOWN = flipV(ARROW_UP);
export const ARROW_LEFT = transpose(ARROW_UP);

export const CHECK = [
  ".......##",
  "......###",
  ".....###.",
  "##..###..",
  "###.##...",
  ".#####...",
  "..###....",
] as const;

export const CROSS = [
  "##.....##",
  "###...###",
  ".###.###.",
  "..#####..",
  "...###...",
  "..#####..",
  ".###.###.",
  "###...###",
  "##.....##",
] as const;

export const SPARKLE = [
  "...#...",
  "...#...",
  "..###..",
  "###.###",
  "..###..",
  "...#...",
  "...#...",
] as const;

export const BANG = ["###", "###", "###", "###", "###", "...", "###"] as const;

/** A row of square pips, `filled` of `count` lit: the tries meter. */
export const Pips: React.FC<{
  count: number;
  filled: number;
  size: number;
  gap?: number;
  on: string;
  off?: string;
}> = ({ count, filled, size, gap = size / 3, on, off = ARCADE.panelEdge }) => (
  <div style={{ display: "flex", gap }}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} style={{ width: size, height: size, background: i < filled ? on : off }} />
    ))}
  </div>
);

/** A sprite from illustrations.json that pops in over four hard scale
 *  steps and then hops on a two-frame loop. */
export const Sprite: React.FC<{
  id: string;
  at: number;
  width: number;
  height: number;
  hopAmp?: number;
  hopPeriod?: number;
  phase?: number;
  style?: React.CSSProperties;
}> = ({ id, at, width, height, hopAmp = 8, hopPeriod = 20, phase = 0, style }) => {
  const frame = useCurrentFrame();
  const p = steps(frame, at, 8, 4);
  if (p === 0) return null;
  const y = p < 1 ? 0 : hop(frame - at, hopPeriod, hopAmp, phase);
  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        transform: `translateY(${y}px) scale(${p})`,
        transformOrigin: "50% 100%",
        ...style,
      }}
    >
      <Illustration video={VIDEO} id={id} style={{ width, height }} />
    </div>
  );
};

/** The cabinet screen: deep blue with a faint pixel grid. */
export const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: ARCADE.screen,
      backgroundImage:
        `linear-gradient(to right, color-mix(in srgb, ${ARCADE.panel} 55%, transparent) 2px, transparent 2px),` +
        `linear-gradient(to bottom, color-mix(in srgb, ${ARCADE.panel} 55%, transparent) 2px, transparent 2px)`,
      backgroundSize: "54px 54px",
      backgroundPosition: "0 0",
    }}
  />
);

/** Very subtle CRT scanlines over everything: a dark line every 4px. */
export const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      width: W,
      height: H,
      pointerEvents: "none",
      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, ${shade(16)} 3px, ${shade(16)} 4px)`,
    }}
  />
);

/** A Tabbied band that marches sideways one tile every `every` frames, in
 *  hard steps, wrapping seamlessly. */
export const MarchBand: React.FC<{
  name: string;
  top: number;
  height: number;
  tile: number;
  dir?: 1 | -1;
  every?: number;
  /** Frame the march counts from. */
  from?: number;
}> = ({ name, top, height, tile, dir = 1, every = 4, from = 0 }) => {
  const frame = useCurrentFrame();
  const x = (((Math.floor((frame - from) / every) * tile * dir) % W) + W) % W;
  return (
    <div style={{ position: "absolute", top, left: 0, width: W, height, overflow: "hidden" }}>
      {[-W, 0].map((o) => (
        <Pattern
          key={o}
          video={VIDEO}
          name={name}
          style={{ position: "absolute", top: 0, left: x + o, width: W, height }}
        />
      ))}
    </div>
  );
};
