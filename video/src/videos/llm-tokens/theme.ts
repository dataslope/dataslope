// The neon-terminal look of the tokens short, built only from brand ramps.
// Everything is laid out in 1080x1920 CSS pixels and rendered at --scale=1
// (FHD) or 2 (4K).
import { ds, type Hue } from "../../theme/brand";

export const W = 1080;
export const H = 1920;
/** Side gutter: platform UI and rounded phone corners eat the edges. */
export const SIDE = 90;
export const CONTENT_W = W - SIDE * 2;
/** First safe line below the platform's top bar. */
export const TOP = 250;
/** Nothing that must be read sits below this: the captions start near 1400. */
export const BOTTOM = 1320;
/** Where the captions sit, from the bottom edge. */
export const CAPTION_BOTTOM = 380;

/** The night: deep blue overhead, the site's near-black below. */
export const NIGHT_TOP = ds("blue", 950);
export const NIGHT = ds("gray", 900);

/** A mask that keeps the top of a band and fades it out downward (a mask
 *  reads only alpha, so any opaque token does). */
export const FADE_DOWN = `linear-gradient(180deg, ${NIGHT} 0%, ${NIGHT} 30%, transparent 100%)`;

/** A brand color at partial strength, for glows and tints. */
export const mix = (color: string, pct: number, other = "transparent") =>
  `color-mix(in srgb, ${color} ${pct}%, ${other})`;

/** One neon tube: the `400` step is the lit glass, `200` the hot core. */
export type Neon = { tube: string; core: string; fill: string };
export const neon = (hue: Hue): Neon => ({
  tube: ds(hue, 400),
  core: hue === "yellow" ? ds("yellow", 300) : ds(hue, 200),
  fill: mix(ds(hue, 600), 18),
});

/** The three tube colors token chips cycle through, as series colors. Yellow
 *  is kept for "look here", green for right and red for wrong. */
export const CHIP_HUES: Hue[] = ["blue", "purple", "teal"];
export const chipHue = (i: number) => CHIP_HUES[i % CHIP_HUES.length];

/** Layered text glow: a tight core, a halo and a wide bloom. */
export const glowText = (color: string, k = 1) =>
  [
    `0 0 ${3 * k}px ${mix(color, 95)}`,
    `0 0 ${12 * k}px ${mix(color, 70)}`,
    `0 0 ${32 * k}px ${mix(color, 45)}`,
  ].join(", ");

/** Glow for a tube outline: outside and a little inside the glass. */
export const glowBox = (color: string, k = 1) =>
  [
    `0 0 ${5 * k}px ${mix(color, 90)}`,
    `0 0 ${22 * k}px ${mix(color, 55)}`,
    `inset 0 0 ${14 * k}px ${mix(color, 40)}`,
  ].join(", ");

/** A soft rim of neon around a clay cut-out, so it sits in the scene. */
export const rimLight = (color: string, k = 1) =>
  `drop-shadow(0 0 ${18 * k}px ${mix(color, 38)})`;

/** Chromatic split, the glitch's colour fringe: zero-blur offset copies. */
export const fringe = (px: number) =>
  px === 0
    ? "none"
    : `drop-shadow(${px}px 0 0 ${mix(ds("red", 400), 80)}) drop-shadow(${-px}px 0 0 ${mix(ds("teal", 400), 80)})`;
