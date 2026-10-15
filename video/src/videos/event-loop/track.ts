import { ease } from "../../components/motion";

export type Key = { at: number; v: number };

/**
 * A value that steps between keyframes, easing from the previous key's value
 * to each new one over `dur` frames. Keys are cue frames, so a pointer that
 * moves "on the word" stays on the word when the narration is re-timed.
 */
export function track(frame: number, keys: Key[], dur = 8, initial = 0) {
  let v = initial;
  for (const k of [...keys].sort((a, b) => a.at - b.at)) {
    if (frame < k.at) break;
    v = v + (k.v - v) * ease(frame, k.at, dur);
  }
  return v;
}

/** Present between `from` and `to`, easing in and out over `fade` frames. */
export const window01 = (frame: number, from: number, to: number, fade = 8) =>
  Math.min(ease(frame, from, fade), 1 - ease(frame, to, fade));
