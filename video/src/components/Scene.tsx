import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during } from "./motion";

/**
 * Shows its children between two frames, cross-fading in and out.
 *
 * Unlike a `<Sequence>`, a Scene does not re-base time: children read the
 * same absolute frame as everything else, so they can compare it directly
 * against narration cues. That is the reason it exists.
 */
export const Scene: React.FC<{
  from: number;
  to: number;
  fade?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ from, to, fade = 8, children, style }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  return (
    <AbsoluteFill style={{ opacity: during(frame, from, to, fade), ...style }}>
      {children}
    </AbsoluteFill>
  );
};
