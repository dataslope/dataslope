import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Pattern } from "../../components/Pattern";
import { VIDEO } from "./data";

/** Frames the wipe takes to cover the screen, hold, and clear it. */
export const WIPE = { in: 12, hold: 4, out: 12 };

/**
 * The video's one transition: a Tabbied pattern sweeps across and off again,
 * and the scene underneath changes while it covers the screen (at
 * `at + WIPE.in`).
 */
export const PatternWipe: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const end = at + WIPE.in + WIPE.hold + WIPE.out;
  if (frame < at || frame > end) return null;
  const x = interpolate(
    frame,
    [at, at + WIPE.in, at + WIPE.in + WIPE.hold, end],
    [1920, 0, 0, -1920],
    { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}px)` }}>
      <Pattern video={VIDEO} name="wipe" style={{ width: 1920, height: 1080 }} />
    </AbsoluteFill>
  );
};
