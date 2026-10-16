import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { HAIRLINE, INK, INK_SOFT, note } from "../../editorial/style";
import type { Group } from "./data";
import { COLOR } from "./data";

const STOPS = [0, 0.25, 0.5, 0.75, 1];

/** Faint vertical rules at 0, 25, 50, 75 and 100% behind horizontal bars or
 *  dots, the 0% one in ink: the only grid this page draws. */
export const Gridlines: React.FC<{ x0: number; x1: number; top: number; bottom: number; at: number }> = ({
  x0,
  x1,
  top,
  bottom,
  at,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: p }}>
      {STOPS.map((s) => {
        const x = x0 + (x1 - x0) * s;
        return (
          <line
            key={s}
            x1={x}
            x2={x}
            y1={top}
            y2={top + (bottom - top) * p}
            stroke={s === 0 ? INK : HAIRLINE}
            strokeWidth={s === 0 ? 1.6 : 1}
            strokeDasharray={s === 0 ? undefined : "2 5"}
          />
        );
      })}
    </svg>
  );
};

/** "0%  25%  50%  75%  100%" under the gridlines. */
export const RateScale: React.FC<{ x0: number; x1: number; top: number; at: number }> = ({ x0, x1, top, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <>
      {STOPS.map((s) => (
        <div
          key={s}
          style={{
            position: "absolute",
            left: x0 + (x1 - x0) * s,
            top,
            transform: "translateX(-50%)",
            opacity: p,
            ...note(20, INK_SOFT),
          }}
        >
          {Math.round(s * 100)}%
        </div>
      ))}
    </>
  );
};

/** A legend swatch: a dot in the group's color. */
export const Swatch: React.FC<{ group: Group; size?: number }> = ({ group, size = 16 }) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "50%",
      background: COLOR[group],
      flex: "none",
    }}
  />
);
