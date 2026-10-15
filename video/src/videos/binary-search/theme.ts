// Palette, layout and the hard-step motion vocabulary of the arcade short.
// Everything is laid out in 1080x1920 CSS pixels.
import { colors, ds } from "../../theme/brand";

export const W = 1080;
export const H = 1920;
/** Side gutter: platform UI and rounded phone corners eat the edges. */
export const SIDE = 90;
// Safe area: nothing critical above y 236 (platform top bar) or below
// y 1380 (captions start near 1440).

/**
 * `brand.ts`'s `Step` type stops at 900, but app/brand.css also defines blue
 * 950 (and the 50-unit half-steps). Same `var()` that `ds()` builds.
 */
const deepBlue = (step: 850 | 950) => `var(--ds-blue-${step})`;

/** The cabinet screen and its neon inks, all from brand ramps. */
export const ARCADE = {
  /** The screen itself. */
  screen: deepBlue(950),
  /** Panels and switched-off cells. */
  panel: ds("blue", 900),
  panelEdge: deepBlue(850),
  dim: ds("blue", 700),
  /** A lit cell: the brand blue with a hard bevel. */
  lit: ds("blue", 500),
  litHi: ds("blue", 300),
  litLo: ds("blue", 700),
  neon: ds("blue", 400),
  text: ds("blue", 50),
  textDim: ds("blue", 300),
  white: colors.page,
  yellow: ds("yellow", 500),
  yellowHi: ds("yellow", 300),
  yellowLo: ds("yellow", 700),
  green: ds("green", 500),
  greenHi: ds("green", 300),
  greenLo: ds("green", 700),
  red: ds("red", 500),
  redLo: ds("red", 700),
  /** Hard drop shadow under display type. */
  drop: ds("red", 600),
} as const;

/** A shade of the screen color, for shadows and the scanlines. */
export const shade = (pct: number) =>
  `color-mix(in srgb, var(--ds-black) ${pct}%, transparent)`;

// ── Motion: hard steps, never easing ────────────────────────────────────

/**
 * 0 → 1 over `duration` frames from `at`, in `n` hard steps. The first step
 * lands on `at` itself, so a cue shows something on its own frame.
 */
export const steps = (frame: number, at: number, duration: number, n = 4) => {
  if (frame < at) return 0;
  const p = Math.min(1, (frame - at + 1) / Math.max(1, duration));
  return Math.ceil(p * n - 1e-9) / n;
};

/** On/off at a fixed rate from `at`; off before it. */
export const blink = (frame: number, at: number, period = 8) =>
  frame >= at && (frame - at) % period < period / 2;

/** Blinks `times` times from `at`, then stays on. The arcade "appear". */
export const blinkIn = (frame: number, at: number, times = 3, period = 4) => {
  if (frame < at) return false;
  if (frame - at >= times * period) return true;
  return (frame - at) % period < period / 2;
};

/** A two-frame sprite hop: up `amp` px for half of every `period`. */
export const hop = (frame: number, period = 16, amp = 8, phase = 0) =>
  Math.floor((frame + phase) / (period / 2)) % 2 === 0 ? 0 : -amp;

/** How many characters of a string a typewriter shows, one per `per` frames. */
export const typed = (frame: number, at: number, length: number, per = 2) =>
  frame < at ? 0 : Math.min(length, Math.floor((frame - at) / per) + 1);

/** A number that rolls from `from` to `to` in `n` hard steps. */
export const roll = (frame: number, at: number, from: number, to: number, duration = 8, n = 4) =>
  Math.round(from + (to - from) * steps(frame, at, duration, n));
