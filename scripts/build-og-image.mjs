/**
 * Generates the default social-share image at public/og-default.png (1200×630).
 *
 * Renders an on-brand SVG (the DataSlope logo + a descending "data slope"
 * motif + headline) to PNG with @resvg/resvg-js using system fonts. The PNG is
 * a committed static asset — referenced as the default OpenGraph/Twitter image
 * in lib/site.ts — so it costs nothing at request time (no runtime next/og).
 *
 * Regenerate after editing the copy/design:  npm run build:og-image
 *
 * Standalone on purpose (not wired into `npm run build`): the card changes
 * about as often as the logo, so there's no reason to re-rasterize every build.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const W = 1200;
const H = 630;
const FONT = "DejaVu Sans";

// --- Language chips ---------------------------------------------------------
const CHIPS = ["Python", "SQL", "C++", "R", "Java", "C#", "TypeScript"];
const CHIP_H = 52;
const CHIP_Y = 512;
const CHIP_FS = 26;
let chipX = 80;
const chipSvg = CHIPS.map((label) => {
  // Rough monospace-ish estimate; DejaVu Sans averages ~0.55em per glyph.
  const w = Math.round(label.length * 14.5 + 44);
  const cx = chipX + w / 2;
  const g = `
    <rect x="${chipX}" y="${CHIP_Y}" width="${w}" height="${CHIP_H}" rx="${CHIP_H / 2}"
          fill="#0E2A4A" stroke="#1E4D7E" stroke-width="1.5"/>
    <text x="${cx}" y="${CHIP_Y + CHIP_H / 2 + CHIP_FS * 0.35}" font-family="${FONT}"
          font-size="${CHIP_FS}" fill="#9FD0FF" text-anchor="middle">${label}</text>`;
  chipX += w + 18;
  return g;
}).join("");

// --- Descending "data slope" data points (decorative, right side) -----------
const PTS = [
  [770, 150],
  [848, 198],
  [918, 250],
  [982, 306],
  [1040, 368],
  [1092, 436],
];
const polyline = PTS.map((p) => p.join(",")).join(" ");
const dots = PTS.map(
  ([cx, cy]) =>
    `<circle cx="${cx}" cy="${cy}" r="22" fill="#148CFF" opacity="0.16"/>` +
    `<circle cx="${cx}" cy="${cy}" r="11" fill="#148CFF"/>`,
).join("");

// The real brand mark (public/dataslope-logo-blue.svg), scaled into the card.
// viewBox is 1087.59 × 682.55; scale 0.10 → ~109 × 68.
const LOGO = `
  <g transform="translate(80,70) scale(0.10)">
    <defs>
      <radialGradient id="lg1" cx="339.84" cy="341.28" r="340.56" gradientUnits="userSpaceOnUse">
        <stop offset=".19" stop-color="#148cff" stop-opacity=".6"/>
        <stop offset="1" stop-color="#148cff"/>
      </radialGradient>
      <radialGradient id="lg2" cx="798.17" cy="382.86" r="318.51" gradientUnits="userSpaceOnUse">
        <stop offset=".14" stop-color="#148cff"/>
        <stop offset=".96" stop-color="#148cff" stop-opacity=".6"/>
      </radialGradient>
    </defs>
    <path fill="url(#lg1)" d="M679.63,139.57c.05-1.45.06-2.21.06-3.67C679.69,60.84,618.85,0,543.79,0s-132.49,57.51-135.75,129.67h0s-2.99,129.29-85.67,205.52c-73.47,67.75-167.89,74.85-188,75.59-1.2.01-2.39.04-3.58.09-.2,0-.3,0-.3,0h0C57.94,413.72,0,473.42,0,546.66s60.84,135.89,135.89,135.89c3.22,0,6.41-.12,9.57-.34h0s278.11,3.51,437.31-237.01c100.12-151.26,96.85-304.24,96.85-304.24v-1.4Z"/>
    <path fill="url(#lg2)" d="M407.96,139.57c-.05-1.45-.06-2.21-.06-3.67C407.91,60.84,468.75,0,543.8,0s132.49,57.51,135.75,129.67h0s2.99,129.29,85.67,205.52c73.47,67.75,167.89,74.85,188,75.59,1.2.01,2.39.04,3.58.09.2,0,.3,0,.3,0h0c72.55,2.85,130.49,62.55,130.49,135.79s-60.84,135.89-135.89,135.89c-3.22,0-6.41-.12-9.57-.34h0s-278.11,3.51-437.31-237.01c-100.12-151.26-96.85-304.24-96.85-304.24v-1.4Z"/>
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B1A2E"/>
      <stop offset="1" stop-color="#05101E"/>
    </linearGradient>
    <linearGradient id="slope" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#148CFF" stop-opacity="0"/>
      <stop offset="1" stop-color="#148CFF" stop-opacity="0.12"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <path d="M0 ${H} L0 470 C 320 470, 560 350, ${W} 250 L${W} ${H} Z" fill="url(#slope)"/>
  <polyline points="${polyline}" fill="none" stroke="#148CFF" stroke-width="4"
            stroke-opacity="0.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${dots}

  ${LOGO}
  <text x="210" y="120" font-family="${FONT}" font-weight="bold" font-size="32"
        letter-spacing="4" fill="#BFDBFE">DATASLOPE</text>

  <text x="80" y="300" font-family="${FONT}" font-weight="bold" font-size="72" fill="#FFFFFF">Learn by running code</text>
  <text x="80" y="388" font-family="${FONT}" font-weight="bold" font-size="72" fill="#5BA7FF">in your browser</text>

  <text x="82" y="452" font-family="${FONT}" font-size="29" fill="#AEB9C6">Free · Interactive · No sign-up · Runs on WebAssembly</text>

  ${chipSvg}
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: W },
  font: { loadSystemFonts: true, defaultFontFamily: FONT },
  background: "#05101E",
});
const png = resvg.render().asPng();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "public", "og-default.png");
writeFileSync(out, png);
console.log(`[build-og-image] wrote ${out} (${(png.length / 1024).toFixed(1)} kB, ${W}×${H})`);
