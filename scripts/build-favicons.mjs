#!/usr/bin/env node
/**
 * Generates the site's favicon set from the brand mark.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * The only icon the site used to declare was the brand mark itself,
 * `public/dataslope-logo-blue.svg`, whose viewBox is 1087.59 × 682.55 — a
 * 1.594:1 *wide* canvas. Every surface that shows a favicon paints it into a
 * square (Google's search results then crop that square to a circle), and a
 * wide drawing forced into a square slot is scaled non-uniformly: the mark
 * arrived on the search page visibly squeezed, its lobes stretched vertical.
 *
 * The fix is a square source, and it cannot be done by editing the brand file:
 * `dataslope-logo-blue.svg` is the *nav* logo in a dozen components, sized
 * `h-[15px] w-auto`, so squaring its viewBox would letterbox the header
 * everywhere. So the mark is re-wrapped here instead, and generated rather
 * than hand-drawn so it cannot drift from the brand file it comes out of.
 *
 * ── The safe area ───────────────────────────────────────────────────────────
 *
 * `INSET` is not decoration. A favicon that bleeds to its own edges loses its
 * extremities the moment anything crops the square to a circle, which is
 * exactly what a Google result header does: the inscribed circle is at 96% of
 * the box width by the height the mark's side lobes sit at, so a full-bleed
 * mark comes back with both tips shaved. At 80% the furthest painted point is
 * 0.47 of the box from its centre, comfortably inside a 0.5 circle.
 *
 * ── The outputs ─────────────────────────────────────────────────────────────
 *
 *   public/favicon.svg          square, transparent — modern browsers, Google
 *   public/favicon.ico          16/32/48 — the implicit /favicon.ico request
 *   public/icon-192.png         Android home screens, `sizes="192x192"`
 *   public/apple-touch-icon.png 180, opaque — iOS composites on black
 *                               otherwise, so this one carries a background
 *
 * All four are committed static assets served by the Worker's ASSETS binding
 * and declared through `metadata.icons` in `app/layout.tsx`. Standalone on
 * purpose and not wired into `npm run build`, exactly like
 * `scripts/build-og-image.mjs`: the brand mark changes about never, and a
 * deploy should not be re-encoding four images to prove it.
 *
 * Regenerate with `npm run build:favicons`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCE = join(ROOT, "public", "dataslope-logo-blue.svg");
const PUBLIC = join(ROOT, "public");

/** Side of the square canvas the favicon SVG is authored in. Arbitrary — the
 *  file is scaled to whatever a consumer asks for — but round numbers keep the
 *  emitted transform readable. */
const BOX = 512;
/** Fraction of the box the mark spans, leaving a safe margin for circular
 *  crops. See the note above; this is the one number worth thinking about. */
const INSET = 0.8;
/** Sizes packed into favicon.ico. 48 is the size Google's guidance asks for;
 *  16 and 32 are what a browser tab and a bookmark bar actually paint. */
const ICO_SIZES = [16, 32, 48];
/** iOS home screen. Rendered opaque: a transparent apple-touch-icon is
 *  composited onto black by some iOS versions, which the blue mark disappears
 *  into. White is the site's own light surface. */
const APPLE_SIZE = 180;
const APPLE_BACKGROUND = "#ffffff";
/** Android home screens and anything reading `sizes="192x192"`. */
const ANDROID_SIZE = 192;

// ── Reading the brand mark ──────────────────────────────────────────────────

/**
 * The two gradient definitions and the two paths that reference them.
 *
 * Parsed rather than copied so a redrawn brand file flows through on the next
 * run, and asserted rather than trusted so a redraw that changes the shape of
 * the file fails here instead of silently emitting half a logo. The mark has
 * had exactly two paths, `cls-1` and `cls-2`, filled by two `userSpaceOnUse`
 * radial gradients, since it was drawn.
 */
function readMark() {
  const svg = readFileSync(SOURCE, "utf8");

  const gradients = svg.match(/<radialGradient[\s\S]*?<\/radialGradient>/g) ?? [];
  const paths = [...svg.matchAll(/<path\b[^>]*\bclass="(cls-\d)"[^>]*\bd="([^"]+)"[^>]*\/>/g)];
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);

  if (gradients.length !== 2 || paths.length !== 2 || !viewBox) {
    throw new Error(
      `build-favicons: ${SOURCE} is not the two-path, two-gradient mark this ` +
        `script knows how to re-wrap (found ${paths.length} path(s), ` +
        `${gradients.length} gradient(s)). Re-read it and update readMark().`,
    );
  }
  if (paths[0][1] !== "cls-1" || paths[1][1] !== "cls-2") {
    throw new Error(
      "build-favicons: the mark's paths are no longer cls-1 then cls-2, so " +
        "pairing them with the gradients by position would be a guess",
    );
  }

  return {
    width: Number(viewBox[1]),
    height: Number(viewBox[2]),
    // Ids are rewritten so the file is safe to inline beside anything else.
    gradients: gradients.map((g, i) =>
      g.replace(/id="[^"]*"/, `id="ds-favicon-${i + 1}"`),
    ),
    paths: paths.map((p) => p[2]),
  };
}

/** The mark centred on a square canvas at `INSET` of its width, transparent
 *  behind. `userSpaceOnUse` gradients live in the coordinate system of the
 *  element that references them, so wrapping the paths in one transformed
 *  group carries the gradients along with the drawing. */
function squareSvg({ width, height, gradients, paths }) {
  const scale = (BOX * INSET) / width;
  const round = (n) => Number(n.toFixed(4));
  const tx = round((BOX - width * scale) / 2);
  const ty = round((BOX - height * scale) / 2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/build-favicons.mjs from public/dataslope-logo-blue.svg. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${BOX}" height="${BOX}" role="img" aria-label="Dataslope">
  <defs>
    ${gradients.join("\n    ")}
  </defs>
  <g transform="translate(${tx} ${ty}) scale(${round(scale)})">
    <path fill="url(#ds-favicon-1)" d="${paths[0]}"/>
    <path fill="url(#ds-favicon-2)" d="${paths[1]}"/>
  </g>
</svg>
`;
}

/** The square SVG rasterized to `size` px, optionally over a solid ground. */
function png(svg, size, background) {
  return new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    ...(background ? { background } : {}),
  })
    .render()
    .asPng();
}

// ── Packing the .ico ────────────────────────────────────────────────────────

/**
 * An ICO holding PNG-compressed entries.
 *
 * PNG inside ICO is the modern encoding and is what the format's own header
 * describes: an ICONDIR, one 16-byte ICONDIRENTRY per image, then the image
 * bytes verbatim. Storing the PNGs resvg already produced means nothing here
 * packs a pixel by hand, so there is no row-padding or AND-mask bug for this
 * file to have — the alternative, hand-rolled BMP entries, buys compatibility
 * only with browsers this site does not otherwise support.
 *
 * A dimension of 256 is written as 0 by the format's convention; nothing here
 * reaches it, but the encoding is cheap to honour.
 */
function ico(images) {
  const HEADER = 6;
  const ENTRY = 16;
  const directory = Buffer.alloc(HEADER + ENTRY * images.length);
  directory.writeUInt16LE(0, 0); // reserved
  directory.writeUInt16LE(1, 2); // 1 = icon
  directory.writeUInt16LE(images.length, 4);

  let offset = directory.length;
  images.forEach(({ size, data }, i) => {
    const at = HEADER + ENTRY * i;
    directory.writeUInt8(size >= 256 ? 0 : size, at);
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1);
    directory.writeUInt8(0, at + 2); // palette size, 0 = truecolour
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });

  return Buffer.concat([directory, ...images.map((i) => i.data)]);
}

// ── Run ─────────────────────────────────────────────────────────────────────

const mark = readMark();
const svg = squareSvg(mark);

const outputs = [
  ["favicon.svg", Buffer.from(svg, "utf8")],
  ["favicon.ico", ico(ICO_SIZES.map((size) => ({ size, data: png(svg, size) })))],
  ["icon-192.png", png(svg, ANDROID_SIZE)],
  ["apple-touch-icon.png", png(svg, APPLE_SIZE, APPLE_BACKGROUND)],
];

for (const [name, data] of outputs) {
  writeFileSync(join(PUBLIC, name), data);
  console.log(`build-favicons: public/${name} (${(data.length / 1024).toFixed(1)} KB)`);
}
