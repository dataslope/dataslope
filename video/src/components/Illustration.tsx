import React from "react";
import { Img, staticFile } from "remotion";

/**
 * How many device pixels each of an image's own pixels is drawn across, at
 * the scale this frame is rendering at. Above 1 the image is being stretched,
 * which a 4K render (--scale=2) shows as soft edges; `npm run check:4k`
 * collects these from every composition.
 */
const stretch = (img: HTMLImageElement) =>
  Math.min(img.offsetWidth / img.naturalWidth, img.offsetHeight / img.naturalHeight) * window.devicePixelRatio;

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
    onLoad={(e) => {
      const img = e.currentTarget;
      if (!img.naturalWidth || !img.offsetWidth) return;
      const s = stretch(img);
      const report = `[illustration] ${video}/${id} ${img.naturalWidth}x${img.naturalHeight} drawn in ${img.offsetWidth}x${img.offsetHeight} at ${window.devicePixelRatio}x: ${s.toFixed(2)}`;
      if (s > 1) console.warn(`${report}, stretched beyond its pixels`);
      else console.debug(report);
    }}
  />
);
