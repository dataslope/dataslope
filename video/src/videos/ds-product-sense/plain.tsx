import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { HIGHLIGHT, INK, INK_SOFT, note } from "../../editorial/style";

/**
 * Plain-text stand-ins for parts.tsx's boxed pieces (the no-cards rule,
 * video/README.md). parts.tsx is imported by another video, so its outlined
 * `Chip` and ringed `Step` stay there unchanged, and this video and Part 11
 * take these instead.
 */

/**
 * A metric or a short tag as plain text in its meaning's ink: no outline, no
 * box (the no-cards rule, video/README.md). It takes the outlined `Chip`'s
 * props and sets its words where the chip set them, so a scene swaps one for
 * the other without moving a line: the text's top is where the chip's text
 * was, and its left edge is `x`, flush with the text around it. `lit` lays the
 * highlighter behind the words, given back as margin so the line does not
 * shift.
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

/** A numbered step in a procedure: its number and its words at one size, the
 *  number in the soft ink in a column of its own, no ring. `lit` marks it
 *  current with the highlighter behind the row; `done` settles it back once
 *  the next one starts. The words start 58px in, where the ringed step's did,
 *  so notes set under them still line up. */
export const Step: React.FC<{
  n: number;
  x: number;
  y: number;
  at: number;
  lit?: number;
  done?: number;
  out?: number;
  width?: number;
  children: React.ReactNode;
}> = ({ n, x, y, at: from, lit, done, out, width = 520, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const l = lit === undefined ? 0 : ease(frame, lit, 10) * (1 - (done === undefined ? 0 : ease(frame, done, 12)));
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height: 40,
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity: p * (1 - o),
        transform: `translateX(${(1 - p) * -16}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -14,
          right: 0,
          top: -8,
          bottom: -8,
          background: HIGHLIGHT,
          borderRadius: 6,
          opacity: l * 0.6,
        }}
      />
      <span style={{ position: "relative", width: 40, flex: "0 0 40px", ...note(28, INK_SOFT), fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n}</span>
      <span style={{ position: "relative", ...note(28, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
};
