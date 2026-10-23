import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { HAIRLINE, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { NOW } from "./data";
import { Svg } from "./parts";

/**
 * Fig. 1, the timeline the video opens and closes on: one year axis, the same
 * in both scenes, so the figure that returns at the end is the figure the
 * viewer met at the start.
 */
export const TX: XScale = { lo: 1928, hi: 2032, x0: 170, x1: 1750 };
export const tx = (year: number) => sx(TX, year);
const TICKS = Array.from({ length: 11 }, (_, i) => 1930 + i * 10);
const LABELLED = new Set([1930, 1950, 1970, 1990, 2010, 2030]);

/** The axis: a hairline drawn left to right on `at`, decade ticks, and every
 *  other decade labelled. "Today" is marked on `todayAt`. */
export const TimelineAxis: React.FC<{ y: number; at: number; todayAt?: number; dim?: number }> = ({ y, at, todayAt, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 24);
  const t = ease(frame, at + 8, 14);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.5;
  const today = todayAt === undefined ? 0 : ease(frame, todayAt, 12);
  return (
    <>
      <Svg opacity={1 - d}>
        <line x1={TX.x0} x2={TX.x0 + (TX.x1 - TX.x0) * p} y1={y} y2={y} stroke={INK} strokeWidth={1.8} />
        <g opacity={t}>
          {TICKS.map((v) => (
            <line key={v} x1={tx(v)} x2={tx(v)} y1={y} y2={y + (LABELLED.has(v) ? 10 : 6)} stroke={INK} strokeWidth={1.4} />
          ))}
        </g>
        {today > 0 ? (
          <g opacity={today}>
            <line x1={tx(NOW)} x2={tx(NOW)} y1={y - 22} y2={y + 22} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
          </g>
        ) : null}
      </Svg>
      {TICKS.filter((v) => LABELLED.has(v)).map((v) => (
        <div
          key={v}
          style={{
            position: "absolute",
            left: tx(v),
            top: y + 16,
            transform: "translateX(-50%)",
            opacity: t * (1 - d),
            ...note(20, INK_SOFT),
          }}
        >
          {v}
        </div>
      ))}
      {today > 0 ? (
        <div
          style={{
            position: "absolute",
            left: tx(NOW),
            top: y - 56,
            transform: `translate(-50%, ${(1 - today) * 6}px)`,
            opacity: today * (1 - d),
            ...note(21, INK),
            fontWeight: 650,
          }}
        >
          today
        </div>
      ) : null}
    </>
  );
};

/** A year's dot on the axis, popping in on `at`, swelling on a `swell`. */
export const YearDot: React.FC<{ year: number; y: number; at: number; color: string; r?: number; swell?: number; dim?: number }> = ({
  year,
  y,
  at,
  color,
  r = 10,
  swell = 0,
  dim,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 12));
  if (p <= 0.001) return null;
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  return (
    <Svg opacity={1 - d}>
      <circle cx={tx(year)} cy={y} r={r * p * (1 + swell * 0.45)} fill={color} stroke={PAPER} strokeWidth={2.5} />
    </Svg>
  );
};

/** A vertical leader from a dot up (or down) to its label, drawn on `at`. */
export const Stem: React.FC<{ year: number; from: number; to: number; at: number; color?: string; dim?: number }> = ({
  year,
  from,
  to,
  at,
  color = HAIRLINE,
  dim,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0) return null;
  return (
    <Svg opacity={1 - d}>
      <line x1={tx(year)} x2={tx(year)} y1={from} y2={from + (to - from) * p} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
};
