/**
 * The Dataslope mark, read from `public/dataslope-logo-blue.svg` for the
 * scripts that composite it into raster art (`build-youtube-art.mjs`,
 * `build-og-image.mjs`). Parsed and asserted the same way
 * `build-favicons.mjs` does, so a redrawn brand file fails loudly instead of
 * emitting half a logo.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const MARK_SOURCE = join(ROOT, "public", "dataslope-logo-blue.svg");

/** The mark's two gradients and two paths, with the gradients renamed to
 *  `ds-mark-1` / `ds-mark-2` so a caller can put them in its own `<defs>`. */
export function readMark(source = MARK_SOURCE) {
  const svg = readFileSync(source, "utf8");
  const gradients = svg.match(/<radialGradient[\s\S]*?<\/radialGradient>/g) ?? [];
  const paths = [...svg.matchAll(/<path\b[^>]*\bclass="(cls-\d)"[^>]*\bd="([^"]+)"[^>]*\/>/g)];
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);

  if (gradients.length !== 2 || paths.length !== 2 || !viewBox) {
    throw new Error(
      `brand-mark: ${source} is not the two-path, two-gradient mark ` +
        `this module knows how to place (found ${paths.length} path(s), ` +
        `${gradients.length} gradient(s)). Re-read it and update readMark().`,
    );
  }
  if (paths[0][1] !== "cls-1" || paths[1][1] !== "cls-2") {
    throw new Error(
      "brand-mark: the mark's paths are no longer cls-1 then cls-2, " +
        "so pairing them with the gradients by position would be a guess",
    );
  }

  return {
    width: Number(viewBox[1]),
    height: Number(viewBox[2]),
    gradients: gradients.map((g, i) => g.replace(/id="[^"]*"/, `id="ds-mark-${i + 1}"`)),
    paths: paths.map((p) => p[2]),
  };
}

export const round = (n) => Number(n.toFixed(4));

/** The mark scaled to `height` with its top-left corner at (x, y). The
 *  gradients are `userSpaceOnUse`, so they travel with the group transform. */
export function placeMark(mark, x, y, height) {
  const scale = height / mark.height;
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(scale)})">
    <path fill="url(#ds-mark-1)" d="${mark.paths[0]}"/>
    <path fill="url(#ds-mark-2)" d="${mark.paths[1]}"/>
  </g>`;
}
