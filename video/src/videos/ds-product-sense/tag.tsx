import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { HIGHLIGHT, INK, note } from "../../editorial/style";

/**
 * A metric or a short tag as plain text in its meaning's ink: no outline, no
 * box (the no-cards rule, video/README.md). It takes the outlined `Chip`'s
 * props and sets its words where the chip set them, so a scene swaps one for
 * the other without moving a line: the text's top is where the chip's text
 * was, and its left edge is `x`, flush with the text around it. `lit` lays the
 * highlighter behind the words, given back as margin so the line does not
 * shift. `Chip` itself stays in parts.tsx, which another video imports.
 */
export const Tag: React.FC<{
  x: number;
  y: number;
  at: number;
  ink?: string;
  size?: number;
  lit?: number;
  dim?: number;
  out?: number;
  weight?: number;
  children: React.ReactNode;
}> = ({ x, y, at: from, ink = INK, size = 26, lit, dim, out, weight = 600, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const l = lit === undefined ? 0 : ease(frame, lit, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + Math.round(size * 0.32) + 2,
        ...note(size, ink),
        fontWeight: weight,
        whiteSpace: "nowrap",
        opacity: p * (1 - d) * (1 - o),
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      <span
        style={{
          padding: "1px 8px 2px",
          margin: "0 -8px",
          borderRadius: 4,
          background: l > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${l * 100}%, transparent)` : undefined,
        }}
      >
        {children}
      </span>
    </div>
  );
};
