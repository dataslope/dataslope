import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, headline, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/** Walk a in blue, walk b in orange: neither is the page's red accent. The
 *  ink steps are for text. */
export const COLOR = { a: ds("blue", 500), b: ds("orange", 500) } as const;
export const COLOR_INK = { a: "var(--ds-blue-ink)", b: ds("orange", 700) } as const;
/** The verdict colors of the last figure: fails and passes. */
export const PASS_INK = "var(--ds-green-ink)";

/** Figs. 1 and 2 share one chart, so walk a stays put across the cut. Y
 *  values are layout coordinates, mapped through `useLayout().y()`. */
export const WALK_X: XScale = { lo: 0, hi: 300, x0: 200, x1: 1300 };
export const WALK_Y = { lo: -15, hi: 30, top: 370, bottom: 800, ticks: [-10, 0, 10, 20, 30] } as const;

/** Figs. 3 and 5 share one histogram frame. */
export const HIST_X: XScale = { lo: -1, hi: 1, x0: 200, x1: 1300 };
export const HIST_BASE = 790;
/** The tallest bar of a histogram, in layout px. */
export const HIST_TALL = 400;

/** Maps a value on a vertical domain to a page y, in px. */
export const useValueY = (spec: { lo: number; hi: number; top: number; bottom: number }) => {
  const { y } = useLayout();
  return (v: number) => y(spec.top + ((spec.hi - v) / (spec.hi - spec.lo)) * (spec.bottom - spec.top));
};

/** A full-page SVG layer. */
export const Layer: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** The path of a walk through its first `upto` steps (fractional: the last
 *  segment is drawn part way), from step `from`. */
export const walkD = (
  values: readonly number[],
  scale: XScale,
  yOf: (v: number) => number,
  upto = values.length - 1,
  from = 0,
) => {
  const end = Math.max(from, Math.min(values.length - 1, upto));
  const whole = Math.floor(end);
  const pts: [number, number][] = [];
  for (let i = from; i <= whole; i++) pts.push([sx(scale, i), yOf(values[i])]);
  if (end > whole && whole + 1 < values.length) {
    const t = end - whole;
    const v = values[whole] + (values[whole + 1] - values[whole]) * t;
    pts.push([sx(scale, whole + t), yOf(v)]);
  }
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
};

/** The tip of a walk drawn through `upto` steps. */
export const walkTip = (values: readonly number[], scale: XScale, yOf: (v: number) => number, upto: number) => {
  const end = Math.max(0, Math.min(values.length - 1, upto));
  const whole = Math.floor(end);
  const t = end - whole;
  const v = whole + 1 < values.length ? values[whole] + (values[whole + 1] - values[whole]) * t : values[whole];
  return [sx(scale, end), yOf(v)] as const;
};

/** Horizontal rules at the value ticks, the zero rule in ink, with numbers
 *  to the left of the frame and a title above it. */
export const ValueGrid: React.FC<{
  scale: XScale;
  spec: { lo: number; hi: number; top: number; bottom: number; ticks: readonly number[] };
  at: number;
  title?: string;
}> = ({ scale, spec, at, title }) => {
  const frame = useCurrentFrame();
  const yOf = useValueY(spec);
  const p = ease(frame, at, 16);
  const t = ease(frame, at + 6, 12);
  return (
    <>
      <Layer>
        {spec.ticks.map((v) => (
          <line
            key={v}
            x1={scale.x0}
            x2={scale.x0 + (scale.x1 - scale.x0) * p}
            y1={yOf(v)}
            y2={yOf(v)}
            stroke={v === 0 ? INK : HAIRLINE}
            strokeWidth={v === 0 ? 1.6 : 1}
            strokeDasharray={v === 0 ? undefined : "2 5"}
          />
        ))}
      </Layer>
      {spec.ticks.map((v) => (
        <div
          key={v}
          style={{
            position: "absolute",
            right: 1920 - scale.x0 + 16,
            top: yOf(v) - 14,
            opacity: t,
            ...note(20, INK_SOFT),
          }}
        >
          {v < 0 ? `−${-v}` : v}
        </div>
      ))}
      {title ? (
        <div style={{ position: "absolute", left: scale.x0, top: yOf(spec.hi) - 44, opacity: t, ...note(20, INK_SOFT) }}>
          {title}
        </div>
      ) : null}
    </>
  );
};

/** One headline in two inks: the second half follows the first in the flow,
 *  so it sits a word space after it in any face. */
export const Headline: React.FC<{ first: string; second: string; at: number; secondAt: number }> = ({
  first,
  second,
  at,
  secondAt,
}) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
      <Ink at={at} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {first}
      </Ink>
      <Ink
        at={secondAt}
        dur={18}
        style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
      >
        {second}
      </Ink>
    </div>
  );
};

/** A legend key: a short stroke, solid or dashed, or a filled square. */
export const Key: React.FC<{ color: string; kind?: "line" | "dash" | "box" | "outline" }> = ({ color, kind = "line" }) =>
  kind === "box" || kind === "outline" ? (
    <span
      style={{
        display: "inline-block",
        width: 18,
        height: 18,
        flex: "none",
        background: kind === "box" ? color : "transparent",
        border: kind === "outline" ? `2px solid ${color}` : undefined,
        boxSizing: "border-box",
      }}
    />
  ) : (
    <svg width={34} height={12} style={{ flex: "none", overflow: "visible" }}>
      <line
        x1={1}
        x2={33}
        y1={6}
        y2={6}
        stroke={color}
        strokeWidth={kind === "dash" ? 2.6 : 4}
        strokeDasharray={kind === "dash" ? "7 5" : undefined}
        strokeLinecap="round"
      />
    </svg>
  );

/** A watercolor spot illustration that pops in on `at` and bobs gently.
 *  Drawn only once its WebP exists (data.ts `ILLUSTRATIONS`). */
export const Spot: React.FC<{ id: string; at: number; box: React.CSSProperties }> = ({ id, at, box }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!ILLUSTRATIONS) return null;
  const p = pop(frame, at, fps, 16);
  return (
    <Illustration
      video={VIDEO}
      id={id}
      style={{
        position: "absolute",
        ...box,
        opacity: p,
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};
