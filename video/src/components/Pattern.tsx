import React from "react";
import { Img, staticFile } from "remotion";

/**
 * A Tabbied pattern (https://tabbied.com), pre-rendered to SVG by
 * `npm run patterns` from src/videos/<video>/patterns.json.
 *
 * Patterns are decoration: use them sparingly (a band on a title or end card,
 * a transition wipe), never behind anything that has to be read.
 */
export const Pattern: React.FC<{
  video: string;
  /** `name` from the video's patterns.json. */
  name: string;
  style?: React.CSSProperties;
}> = ({ video, name, style }) => (
  <Img
    src={staticFile(`patterns/${video}/${name}.svg`)}
    alt=""
    style={{ display: "block", objectFit: "cover", ...style }}
  />
);
