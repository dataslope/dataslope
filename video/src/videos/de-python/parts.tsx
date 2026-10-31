import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The listing, the table drawn as real rows and
 * cells, Python's error box, the console and the arrows all come from DA
 * Part 2 (da-pandas/parts.tsx), as they do for DS Part 9, so Python looks
 * the same in all three series. The bars for a measured contrast are DS Part
 * 9's (ds-python-pandas/parts.tsx), restated here with the number set apart
 * from its unit. What is new: `lineOf`, which finds a listing line by what it
 * says (ds-sql/parts.tsx has the same), the spot bound to this video, and a
 * row of blocks for a stream.
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
  LISTING_PAPER,
  Mark,
  MARK,
  MARK_BAD,
  MARK_KEY,
  MARK_OK,
  Mono,
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
export { FadeIn, Source } from "../ds-python-pandas/parts";

/**
 * The index of the listing line that holds `text`. A highlight finds its line
 * by what the line says, never by a number, so a snippet edited in check.mjs
 * cannot leave a band on the wrong line: a text that is gone fails the render.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/** A watercolor spot: this video's own from illustrations.json, or another
 *  video's (`video`), which pops in on `at`, bobs gently and fades on `out`. */
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
  /** The number printed at the bar's end, in tabular figures. */
  num: string;
  /** Its unit, after it in proportional figures ("MB", "KB"). */
  unit?: string;
  color: string;
  ink: string;
  at: number;
};

/**
 * Horizontal bars on one scale, the longest `width` px: each grows from the
 * left on its cue and prints its value at its end. A bar too short to see
 * still gets a sliver, so "about nothing" reads as a mark, not a gap. (DS Part
 * 9's Bars, with the number and its unit set apart, so TABULAR sits on the
 * digits alone.)
 */
export const Bars: React.FC<{
  bars: readonly Bar[];
  x: number;
  top: number;
  width: number;
  rowH: number;
  nameW?: number;
  out?: number;
  /** The scale's maximum, when it is not the longest bar here (bars shared
   *  with another figure on the page). */
  max?: number;
}> = ({ bars, x, top, width, rowH, nameW = 220, out, max }) => {
  const frame = useCurrentFrame();
  const top1 = max ?? Math.max(...bars.map((b) => b.value));
  const gone = out === undefined ? 0 : ease(frame, out, 12);
  if (gone >= 1) return null;
  const thick = Math.round(rowH * 0.42);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - gone }}>
      {bars.map((b, i) => {
        const p = ease(frame, b.at, 22);
        if (p <= 0) return null;
        const full = Math.max(4, (b.value / top1) * width);
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
                ...label(23, INK),
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
                top: mid - 18,
                ...note(28, b.ink),
                fontWeight: 650,
                opacity: ease(frame, b.at + 10, 10),
                whiteSpace: "nowrap",
              }}
            >
              <span style={TABULAR}>{b.num}</span>
              {b.unit ? ` ${b.unit}` : null}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** A small caption in the soft ink, set in the annotation face. */
export const Aside: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({
  children,
  size = 22,
  color = INK_SOFT,
}) => <span style={{ ...note(size, color), whiteSpace: "nowrap" }}>{children}</span>;

/** A label in the annotation face, set heavier, for a figure's own titles. */
export const Title: React.FC<{ children: React.ReactNode; color?: string; size?: number }> = ({
  children,
  color = INK,
  size = 23,
}) => <span style={{ ...note(size, color), fontWeight: 650, whiteSpace: "nowrap" }}>{children}</span>;

/** Code set as a figure's title: the title's own size, in the mono face. */
export const TitleCode: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 22 }) => (
  <span style={{ fontFamily: MONO, fontSize: size, fontWeight: 600, fontVariantLigatures: "none" }}>{children}</span>
);

/** Bytes as the screen prints them: "62.6" and "MB", "149" and "KB". */
export const bytes = (b: number): { num: string; unit: string } =>
  b >= 1e6 ? { num: (b / 1e6).toFixed(1), unit: "MB" } : { num: String(Math.round(b / 1e3)), unit: "KB" };
