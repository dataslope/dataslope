import { Easing, interpolate, spring } from "remotion";

/**
 * Small motion vocabulary shared by every video. Each takes the current
 * frame and a cue frame (from `useNarration()`), so timing always lives in
 * the narration and never in a scene.
 */

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** 0 → 1 with a soft spring, starting at `at`. */
export const pop = (frame: number, at: number, fps: number, damping = 14) =>
  spring({ frame: frame - at, fps, config: { damping, mass: 0.6 } });

/** 0 → 1 linearly-eased over `duration` frames from `at`. */
export const ease = (frame: number, at: number, duration = 12) =>
  interpolate(frame, [at, at + duration], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });

/** 1 while `from <= frame < to`, cross-fading over `fade` frames each end. */
export const during = (frame: number, from: number, to: number, fade = 8) =>
  Math.min(ease(frame, from, fade), 1 - ease(frame, to - fade, fade));

/** Linear map with clamping, for the odd one-off. */
export const map = (
  frame: number,
  input: [number, number],
  output: [number, number],
) => interpolate(frame, input, output, clamp);

/** A gentle idle bob for illustrations, in px. Deterministic per frame. */
export const bob = (frame: number, amplitude = 8, period = 90) =>
  Math.sin((frame / period) * Math.PI * 2) * amplitude;
