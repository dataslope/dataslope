import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { HIGHLIGHT, INK, note } from "../../editorial/style";
import { Badge, type BadgeTone, badgeStyle } from "../../editorial/ui";

/**
 * This round's metric chip and numbered step in the house badge look (a
 * light tint of a hue, in that hue's ink, rounded, no border; editorial/ui).
 * parts.tsx is imported by another video, so its outlined `Chip` and ringed
 * `Step` stay there unchanged, and this video and Part 11 take these.
 */

/**
 * A metric or a short tag as a house badge, inked in on `at`. It takes the
 * outlined `Chip`'s position: `y` is where the chip's box began, and the
 * badge's text sits where the chip's text sat, so a scene moves from one to
 * the other without moving a line. `lit` washes it in the highlighter; `dim`
 * fades it back; `out` takes it off the page; `turn` moves it to another hue
 * from `turnAt`.
 */
export const Tag: React.FC<{
  x: number;
  y: number;
  at: number;
  tone?: BadgeTone;
  size?: number;
  lit?: number;
  dim?: number;
  out?: number;
  turn?: BadgeTone;
  turnAt?: number;
  children: React.ReactNode;
}> = ({ x, y, at: from, tone = "gray", size = 26, lit, dim, out, turn, turnAt, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const l = lit === undefined ? 0 : ease(frame, lit, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const base = badgeStyle(tone, size);
  const t = turn === undefined || turnAt === undefined ? 0 : ease(frame, turnAt, 12);
  const next = turn === undefined ? base : badgeStyle(turn, size);
  const tint = t > 0 ? `color-mix(in srgb, ${next.background} ${Math.round(t * 100)}%, ${base.background})` : base.background;
  const ink = t > 0 ? `color-mix(in srgb, ${next.color} ${Math.round(t * 100)}%, ${base.color})` : base.color;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + Math.round(2 + 0.185 * size),
        opacity: p * (1 - d) * (1 - o),
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      <Badge
        tone={tone}
        size={size}
        style={{ ...note(size), fontWeight: base.fontWeight, lineHeight: base.lineHeight, color: ink, background: l > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(l * 100)}%, ${tint})` : tint }}
      >
        {children}
      </Badge>
    </div>
  );
};

/** A numbered step in a procedure: its number on a gray house-badge disc (the
 *  tint, no ring), at 26px, within 12% of the 28px words beside it. `lit`
 *  marks it current with the highlighter behind the row; `done` settles it
 *  back once the next one starts. The words start 58px in, as the ringed
 *  step's did, so notes set under them still line up. */
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
      <span
        style={{
          ...note(26),
          ...badgeStyle("gray", 26),
          position: "relative",
          width: 40,
          height: 40,
          flex: "0 0 40px",
          boxSizing: "border-box",
          padding: 0,
          borderRadius: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {n}
      </span>
      <span style={{ position: "relative", ...note(28, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
};
