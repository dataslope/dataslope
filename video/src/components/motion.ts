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

/**
 * How far a slow push across a scene has come, 0 to 1: up to speed over
 * `ramp` frames, then steady to the end. It replaces a cosine ease over the
 * whole scene, whose start slowed whenever the scene grew: in the Data
 * Scientist fix passes, lengthening a scene left its opening card still for
 * 3 s in five videos, though nothing at the opening had changed. With a fixed
 * ramp the opening moves the same however long the scene runs.
 */
export const drift = (frame: number, from: number, to: number, ramp = 60) => {
  const length = Math.max(1, to - from);
  const t = Math.min(length, Math.max(0, frame - from));
  const r = Math.min(ramp, length / 2);
  // The speed rises evenly to v over r frames and then holds, so the whole
  // push covers v * (length - r / 2) = 1.
  const v = 1 / (length - r / 2);
  return t < r ? (v * t * t) / (2 * r) : v * (t - r / 2);
};
