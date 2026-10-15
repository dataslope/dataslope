// Layout and motion helpers local to the tabs vs spaces short. Everything is
// laid out in 1080x1920 CSS pixels and rendered at --scale=2.
import { ease } from "../../components/motion";

export const W = 1080;
/** Side gutter: platform UI and rounded phone corners eat the edges. */
export const SIDE = 90;
export const CONTENT_W = W - SIDE * 2;
/** First safe line below the platform's top bar. */
export const TOP = 250;
/** Nothing that must be read sits below this: captions start near 1440. */
export const BOTTOM = 1340;

export const CODE_SIZE = 44;
/** JetBrains Mono advances 600/1000 em per glyph. */
export const CHAR_W = CODE_SIZE * 0.6;
export const LINE_H = 66;

/**
 * A value that eases to a new target at each cue: `[[cue, 2], [cue2, 8]]`
 * starts at `initial`, slides to 2 at `cue`, then to 8 at `cue2`.
 */
export const stepTo = (
  frame: number,
  initial: number,
  steps: [number, number][],
  duration = 12,
) =>
  steps.reduce(
    (v, [at, target]) => v + (target - v) * ease(frame, at, duration),
    initial,
  );

/** The last step whose cue has passed (or `initial`), for discrete state. */
export const latest = <T>(frame: number, initial: T, steps: [number, T][]) =>
  steps.reduce((v, [at, target]) => (frame >= at ? target : v), initial);

/** A single 0 → 1 → 0 pulse over `duration` frames from `at`. */
export const knock = (frame: number, at: number, duration = 14) =>
  frame < at || frame >= at + duration
    ? 0
    : Math.sin((Math.PI * (frame - at)) / duration);

/** A decaying horizontal shake in px, for something that just failed. */
export const shake = (frame: number, at: number, duration = 14, amp = 16) =>
  frame < at || frame >= at + duration
    ? 0
    : Math.sin((frame - at) * 1.9) * amp * (1 - (frame - at) / duration);
