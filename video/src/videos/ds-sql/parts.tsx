import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The SQL listing, the error box and the result tables are the Data Analyst
 * SQL videos' (da-sql/parts.tsx, and the column and geometry helpers from
 * da-advanced-sql/parts.tsx), so the two series' SQL videos look like one
 * family. What is local is the spot illustration bound to this video.
 */
export {
  DataTable,
  Drift,
  ErrorBox,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  pulse,
  Strike,
  Svg,
  TableName,
  X0,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { colsOf, geoOf, rowsAt } from "../da-advanced-sql/parts";

/**
 * The index of the listing line that holds `text`. A highlight finds its line
 * by what the line says, not by a number: four hard-coded indices had drifted
 * one line off their clause (NULLIF, the session SUM, the running SUM,
 * rn = 1), so the band sat on boilerplate while the narration named the
 * clause. A query reworded so the text is gone fails the render instead.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/**
 * Code inside a question, a list label or a line of prose, in the mono face
 * at 0.92em of the words around it: within the 12% a line's sizes may differ
 * by (`check:frames`, `[mixed]`), where the interview kit's shared `QMono`
 * sets it at 0.84em (a 62px question's `LEFT JOIN` at 52px, a 23px list
 * label's `HAVING` at 19px). That one is shared with every interview video,
 * so this video takes its own, as da-sql's mono.tsx does. Never under the
 * house floor of 19px. A mono space is 0.6em, so the word spacing brings it
 * back to about a sans space.
 */
export const QMono: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: 500, fontVariantLigatures: "none", wordSpacing: "-0.3em" }}>
    {children}
  </span>
);

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  /** Another video's folder, for art the series shares. */
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
  // Another video's art is always there; this video's waits for its file.
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
