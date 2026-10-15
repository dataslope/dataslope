import React from "react";
import { useCurrentFrame } from "remotion";
import { Pattern } from "../../../components/Pattern";
import { ease } from "../../../components/motion";
import { W } from "../layout";

const H = 1920;

/** A full-frame pattern that sweeps up through the cut at `at`: in from the
 *  bottom, fully covering on `at`, out through the top. */
export const Wipe: React.FC<{ at: number; duration?: number }> = ({ at, duration = 12 }) => {
  const frame = useCurrentFrame();
  if (frame < at - duration || frame > at + duration) return null;
  const y = frame < at ? H * (1 - ease(frame, at - duration, duration)) : -H * ease(frame, at, duration);
  return (
    <Pattern
      video="tabs-vs-spaces"
      name="wipe"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: W,
        height: H,
        transform: `translateY(${y}px)`,
      }}
    />
  );
};
