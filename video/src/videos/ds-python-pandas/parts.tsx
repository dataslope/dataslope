import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The listing, the frame drawn as real rows and
 * cells, pandas' error box, the console and the arrows all come from DA Part
 * 2 (da-pandas/parts.tsx), so a frame looks the same in both series. What is
 * new is this video's own watercolor, and a pair of bars for a measured
 * contrast (a loop's time against one call's).
 */
export {
  Code,
  colsOf,
  Console,
  consoleHeight,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  Headline,
  KeyArrow,
  Kicker,
  lerp,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_KEY,
  MARK_OK,
  Mono,
  noteStyle,
  OK,
  OK_INK,
  pulse,
  RIGHT,
  Strike,
  Svg,
  TableName,
  Tag,
  X0,
} from "../da-pandas/parts";

/** A watercolor spot: this video's own from illustrations.json, or another
 *  video's (`video`), which pops in on `at`, bobs gently and fades on `out`.
 *  This video's own is left out until it has been imported. */
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
}> = ({ id, video = VIDEO, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
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

export type Bar = {
  /** What the bar measures, in the label face. */
  name: React.ReactNode;
  value: number;
  /** The value as printed at the bar's end. */
  text: string;
  color: string;
  ink: string;
  at: number;
};

/**
 * Horizontal bars on one scale, the longest `width` px: each grows from the
 * left on its cue and prints its value at its end. A bar too short to see
 * still gets a sliver, so "about nothing" reads as a mark, not a gap.
 */
export const Bars: React.FC<{
  bars: readonly Bar[];
  x: number;
  top: number;
  width: number;
  rowH: number;
  nameW?: number;
  out?: number;
}> = ({ bars, x, top, width, rowH, nameW = 220, out }) => {
  const frame = useCurrentFrame();
  const max = Math.max(...bars.map((b) => b.value));
  const gone = out === undefined ? 0 : ease(frame, out, 12);
  if (gone >= 1) return null;
  const thick = Math.round(rowH * 0.42);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - gone }}>
      {bars.map((b, i) => {
        const p = ease(frame, b.at, 22);
        if (p <= 0) return null;
        const full = Math.max(4, (b.value / max) * width);
        const w = full * p;
        const mid = top + i * rowH + rowH / 2;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: mid - 16,
                width: nameW - 20,
                textAlign: "right",
                ...label(24, INK),
                opacity: ease(frame, b.at - 4, 10),
                whiteSpace: "nowrap",
              }}
            >
              {b.name}
            </div>
            <div
              style={{
                position: "absolute",
                left: x + nameW,
                top: mid - thick / 2,
                width: w,
                height: thick,
                background: b.color,
                borderRadius: 3,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x + nameW + w + 16,
                top: mid - 17,
                ...note(28, b.ink),
                fontWeight: 650,
                ...TABULAR,
                opacity: ease(frame, b.at + 10, 10),
                whiteSpace: "nowrap",
              }}
            >
              {b.text}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Words that follow other words on one line, faded in on their own cue,
 *  so a second phrase flows after the first instead of sitting at a pixel
 *  offset. */
export const FadeIn: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  return <span style={{ opacity: ease(frame, at, 12) }}>{children}</span>;
};

/** Code set as a table's title: the title's own 21px, in the mono face.
 *  (`Mono` sets code at 0.88em, which inside a 21px title is 18.5px, under
 *  the 19px floor.) */
export const TitleCode: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600, fontVariantLigatures: "none" }}>{children}</span>
);

/** A small caption in the soft ink, for where a number came from. */
export const Source: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>{children}</span>
);
