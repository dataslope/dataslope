import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The page furniture and the plotting pieces come
 * from the Data Analyst statistics part, and the bridge's clear from the
 * probability part, so the two series stay one family. What is new is the
 * product round's own vocabulary: a metric written as a chip, a dashboard
 * tile, and the label every made-up number carries.
 */
export {
  at,
  Axes,
  Bracket,
  chartLabel,
  Dots,
  Drift,
  Headline,
  Kicker,
  lerp,
  Mark,
  MARK_BAD,
  MARK_OK,
  OK,
  OK_INK,
  pulse,
  type Scale,
  Strike,
  Svg,
  VLine,
  WARM,
  WARM_INK,
  X0,
} from "../da-statistics-communication/parts";
export { Clear } from "../ds-probability/parts";

/** Data blue, a lighter blue for a band or a whole, and the bad news red. */
export const DATA = ds("blue", 500);
export const DATA_LIGHT = ds("blue", 200);
export const BAD = ds("red", 500);

/** The small print every made-up number carries. */
export const madeUp = (size = 19): React.CSSProperties => ({ ...label(size, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap" });

/**
 * A metric written as a chip: its name in a rounded box that inks in on `at`.
 * `ink` colors the border and the text; `lit` washes it in the highlighter;
 * `dim` fades it back; `out` takes it off the page.
 */
export const Chip: React.FC<{
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
        top: y,
        padding: `${Math.round(size * 0.32)}px ${Math.round(size * 0.6)}px`,
        border: `2.2px solid ${ink}`,
        borderRadius: 10,
        background: `color-mix(in srgb, ${HIGHLIGHT} ${l * 100}%, ${PAPER})`,
        ...note(size, ink),
        fontWeight: weight,
        whiteSpace: "nowrap",
        opacity: p * (1 - d) * (1 - o),
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** A watercolor spot from illustrations.json (or another part's, by
 *  `video`): it pops in on `at`, bobs gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, video = VIDEO, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if ((video === VIDEO && !ILLUSTRATIONS) || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={video}
      id={id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** A numbered step in a procedure: a ringed number and its words. `lit`
 *  marks it current; `done` settles it back once the next one starts. */
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
          position: "relative",
          width: 40,
          height: 40,
          flex: "0 0 40px",
          borderRadius: 20,
          border: `2.2px solid ${INK}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...label(21, INK),
          fontWeight: 700,
        }}
      >
        {n}
      </span>
      <span style={{ position: "relative", ...note(28, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
};
