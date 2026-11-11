import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { INK, INK_SOFT, label } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { tint } from "./parts";

/**
 * The milliseconds of the page's two fetches, as questions 7 and 8 draw
 * them: one axis, a row per fetch, its wait as a bar and its finish as a
 * tick. The delays are the page's (data.ts); nothing here is a measurement.
 */
export type Axis = { x: number; perMs: number };
export const msX = (a: Axis, ms: number) => a.x + ms * a.perMs;

/** A fetch's bar: from `start` to `stop` ms, grown in on `at`. */
export const WaitBar: React.FC<{
  axis: Axis;
  y: number;
  h: number;
  start: number;
  stop: number;
  at: number;
  color: string;
  solid?: boolean;
  dur?: number;
  opacity?: number;
  children?: React.ReactNode;
}> = ({ axis, y, h, start, stop, at, color, solid, dur = 24, opacity = 1, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  if (p <= 0) return null;
  const x0 = msX(axis, start);
  const w = (msX(axis, stop) - x0) * p;
  return (
    <div
      style={{
        position: "absolute",
        left: x0,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        borderRadius: 4,
        border: `2.5px ${solid ? "solid" : "dashed"} ${color}`,
        background: tint(color, solid ? 34 : 10),
        display: "flex",
        alignItems: "center",
        paddingLeft: 12,
        overflow: "hidden",
        opacity,
      }}
    >
      {children}
    </div>
  );
};

/** The axis under the rows: a hairline with a tick and a label every 10 ms. */
export const MsAxis: React.FC<{ axis: Axis; y: number; to: number; at: number; opacity?: number }> = ({ axis, y, to, at, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  const ticks = Array.from({ length: Math.floor(to / 10) + 1 }, (_, i) => i * 10);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: opacity * p }}>
        <line x1={axis.x} x2={msX(axis, to)} y1={y} y2={y} stroke={INK} strokeWidth={1.6} />
        {ticks.map((t) => (
          <line key={t} x1={msX(axis, t)} x2={msX(axis, t)} y1={y} y2={y + 7} stroke={INK} strokeWidth={1.4} />
        ))}
      </svg>
      {ticks.map((t) => (
        <Note key={t} at={at + 4} x={msX(axis, t) - 40} y={y + 12} width={80} style={{ textAlign: "center" }} dim={opacity < 1 ? at : undefined}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>{t === to ? `${t} ms` : t}</span>
        </Note>
      ))}
    </>
  );
};
