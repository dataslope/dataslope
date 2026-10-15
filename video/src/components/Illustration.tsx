import React from "react";
import { Img, staticFile } from "remotion";

/**
 * An isometric cut-out from the video's illustrations.json, generated and
 * trimmed by `npm run illustrations -- <video>` into
 * public/images/<video>/<id>.webp.
 */
export const Illustration: React.FC<{
  video: string;
  id: string;
  style?: React.CSSProperties;
}> = ({ video, id, style }) => (
  <Img
    src={staticFile(`images/${video}/${id}.webp`)}
    alt=""
    style={{ display: "block", objectFit: "contain", ...style }}
  />
);
