#!/usr/bin/env node
/**
 * Generates the YouTube channel art from the brand mark: the channel banner
 * and the profile picture, both the blue mark on white.
 *
 * ── The banner ──────────────────────────────────────────────────────────────
 *
 * YouTube takes one 16:9 image and crops it per device: a TV shows all of it,
 * a desktop a full-width strip, a phone less again. The only region every
 * device shows is the centred 1546 × 423 "safe area", so the artwork lives
 * there and the rest is plain white, which is also what makes the crop
 * invisible. 2560 × 1440 is YouTube's recommended upload (2048 × 1152 is the
 * minimum), and a flat white PNG of it is well under the 6 MB limit.
 *
 * The lockup is the site's own (`app/_components/home/HomeNav.tsx`): the mark,
 * then "Dataslope" in Inter SemiBold, tracked tight, in `#121212`. The mark is
 * as tall as the wordmark's capitals and sits on its baseline, which is the
 * proportion the nav draws at 13px beside 18px type. A mark-only banner is
 * written too, for a channel whose name already sits under the banner.
 *
 * ── The profile picture ─────────────────────────────────────────────────────
 *
 * Uploaded square and displayed as a circle, as small as 98px. `AVATAR_INSET`
 * keeps the mark's outer lobes well inside the inscribed circle (the favicon's
 * 0.8 is the tightest that clears it; this leaves air around it as well).
 *
 * ── Fonts ───────────────────────────────────────────────────────────────────
 *
 * resvg reads OpenType/TrueType only, and the repo carries no Inter file, so
 * the wordmark is set from an installed Inter SemiBold: `INTER_FONT=<path>`,
 * or the first of `FONT_CANDIDATES` that exists. It refuses to run without
 * one rather than set the wordmark in a fallback face.
 *
 * Outputs go to `brand-assets/youtube/`, outside `public/`, because nothing on
 * the site serves them. Standalone like `build-favicons.mjs`; regenerate with
 * `npm run build:youtube-art`.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { placeMark, readMark, round } from "./lib/brand-mark.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "brand-assets", "youtube");

const BACKGROUND = "#ffffff";
/** The nav wordmark's light-theme color. */
const INK = "#121212";

const BANNER_W = 2560;
const BANNER_H = 1440;
/** The region of the banner that every device shows, centred. */
const SAFE_W = 1546;
const SAFE_H = 423;
/** Wordmark size in the lockup banner. About 64% of the safe area's width. */
const WORDMARK_SIZE = 150;
/** Tailwind's `tracking-tight`, as the nav sets it. */
const TRACKING = -0.025;
/** Space between mark and wordmark, in ems: the nav's 8px gap beside 18px type. */
const GAP = 0.44;
/** Mark height in the mark-only banner. */
const BANNER_MARK_H = 220;

/** The mark's weight sits in its two lower lobes: its ink centroid is 11% of
 *  its height below the centre of its box (measured). Centred by its box it
 *  reads low, so where it stands alone it is lifted half that distance. */
const OPTICAL_LIFT = 0.055;

const AVATAR = 800;
/** Fraction of the avatar's width the mark spans. */
const AVATAR_INSET = 0.7;

const FONT_CANDIDATES = [
  process.env.INTER_FONT,
  "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
  "/usr/share/fonts/truetype/inter/Inter-SemiBold.ttf",
  "/Library/Fonts/Inter-SemiBold.otf",
  "/Library/Fonts/Inter-SemiBold.ttf",
].filter(Boolean);

function canvas(mark, width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    ${mark.gradients.join("\n    ")}
  </defs>
  <rect width="${width}" height="${height}" fill="${BACKGROUND}"/>
  ${body}
</svg>`;
}

// ── The wordmark ────────────────────────────────────────────────────────────

function findFont() {
  const font = FONT_CANDIDATES.find((path) => existsSync(path));
  if (!font) {
    throw new Error(
      "build-youtube-art: no Inter SemiBold found. Install Inter, or point " +
        `INTER_FONT at its .otf/.ttf. Looked in:\n  ${FONT_CANDIDATES.join("\n  ")}`,
    );
  }
  return font;
}

function render(svg, font) {
  return new Resvg(svg, {
    font: { fontFiles: [font], loadSystemFonts: false, defaultFontFamily: "Inter" },
  });
}

function wordmarkText(x, baseline, text = "Dataslope") {
  return `<text x="${round(x)}" y="${round(baseline)}" font-family="Inter" font-weight="600"
        font-size="${WORDMARK_SIZE}" letter-spacing="${round(TRACKING * WORDMARK_SIZE)}"
        fill="${INK}">${text}</text>`;
}

/** Ink bounds of `text` set with its baseline at y = 0. "D" alone gives the
 *  cap height, since its top and bottom are flat at cap height and baseline. */
function measure(font, text) {
  const size = WORDMARK_SIZE * 4;
  const box = render(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 8}" height="${size}">${wordmarkText(0, WORDMARK_SIZE * 2, text)}</svg>`,
    font,
  ).getBBox();
  if (!box) {
    throw new Error(`build-youtube-art: "${text}" rendered nothing; the font did not load`);
  }
  return { x: box.x, top: box.y - WORDMARK_SIZE * 2, width: box.width };
}

// ── Compositions ────────────────────────────────────────────────────────────

function lockupBanner(mark, font) {
  const word = measure(font, "Dataslope");
  const capHeight = -measure(font, "D").top;

  const markH = capHeight;
  const markW = (mark.width / mark.height) * markH;
  const gap = GAP * WORDMARK_SIZE;
  const total = markW + gap + word.width;

  const left = (BANNER_W - total) / 2;
  const baseline = (BANNER_H + capHeight) / 2;
  const textX = left + markW + gap - word.x;

  if (total > SAFE_W || capHeight > SAFE_H) {
    throw new Error(`build-youtube-art: the lockup (${Math.round(total)}px) overflows the safe area`);
  }

  return canvas(
    mark,
    BANNER_W,
    BANNER_H,
    `${placeMark(mark, left, baseline - markH, markH)}
  ${wordmarkText(textX, baseline)}`,
  );
}

function markBanner(mark) {
  const w = (mark.width / mark.height) * BANNER_MARK_H;
  return canvas(
    mark,
    BANNER_W,
    BANNER_H,
    placeMark(
      mark,
      (BANNER_W - w) / 2,
      (BANNER_H - BANNER_MARK_H) / 2 - OPTICAL_LIFT * BANNER_MARK_H,
      BANNER_MARK_H,
    ),
  );
}

function avatar(mark) {
  const w = AVATAR * AVATAR_INSET;
  const h = (mark.height / mark.width) * w;
  const y = (AVATAR - h) / 2 - OPTICAL_LIFT * h;
  return canvas(mark, AVATAR, AVATAR, placeMark(mark, (AVATAR - w) / 2, y, h));
}

// ── Run ─────────────────────────────────────────────────────────────────────

const mark = readMark();
const font = findFont();
mkdirSync(OUT, { recursive: true });

const outputs = [
  ["dataslope-youtube-banner.png", lockupBanner(mark, font)],
  ["dataslope-youtube-banner-mark-only.png", markBanner(mark)],
  ["dataslope-youtube-profile.png", avatar(mark)],
];

for (const [name, svg] of outputs) {
  const png = render(svg, font).render().asPng();
  const path = join(OUT, name);
  writeFileSync(path, png);
  console.log(`build-youtube-art: ${relative(ROOT, path)} (${(png.length / 1024).toFixed(1)} KB)`);
}
