#!/usr/bin/env node
/**
 * Generates the default social-share image, `public/og-default.png`
 * (1200 × 630), the card a link to the site unfurls into on Slack, X,
 * LinkedIn, iMessage and the rest. It is a committed static asset referenced
 * by `OG_IMAGE` in `lib/site.ts` (no runtime `next/og`). Standalone on
 * purpose, not wired into `npm run build`; regenerate with
 * `npm run build:og-image`.
 *
 * ── The look ────────────────────────────────────────────────────────────────
 *
 * The site's light theme, the same family as the YouTube channel art
 * (`build-youtube-art.mjs`): white, the blue mark beside "Dataslope" in Inter
 * SemiBold, ink `#121212`. The left half says what the site is; the right half
 * shows it, a lesson code block that has been run with its output underneath,
 * set in JetBrains Mono like the real one. The row along the bottom is the
 * home page's language roster (`HeroMarquee.tsx`), the same icons cycled
 * through the same three brand 500s.
 *
 * Everything sits inside a 64px margin. X and LinkedIn show the full 1.91:1
 * frame; a few clients crop it toward 2:1, which takes about 15px off the
 * top and bottom, well clear of anything drawn.
 *
 * ── Fonts ───────────────────────────────────────────────────────────────────
 *
 * resvg reads OpenType/TrueType only, and the repo carries no font files, so
 * Inter and JetBrains Mono are read from an installed copy (`FONT_DIRS`, or a
 * colon-separated `OG_FONT_DIRS`). It refuses to run without them rather
 * than set the card in a fallback face, which is what the previous version
 * of this image shipped in.
 */
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SiCplusplus,
  SiDuckdb,
  SiJavascript,
  SiOpenjdk,
  SiPostgresql,
  SiPython,
  SiR,
  SiSharp,
  SiSqlite,
  SiTypescript,
} from "react-icons/si";
import { RiPhpFill } from "react-icons/ri";
import { placeMark, readMark, round } from "./lib/brand-mark.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "public", "og-default.png");

const W = 1200;
const H = 630;
const MARGIN = 64;

// Brand tokens (app/brand.css). resvg cannot read CSS variables, so the
// values are written out here; the names say which token each one is.
const WHITE = "#ffffff";
const INK = "#121212"; // the nav wordmark's light-theme color
const GRAY_50 = "#f9fafb";
const GRAY_200 = "#e5e7eb";
const GRAY_400 = "#9ca3af";
const GRAY_500 = "#6b7280";
const BLUE_500 = "#148CFF";
const GREEN_500 = "#20C621";
const RED_500 = "#FF4F59";
const BLUE_INK = "#0064BD"; // --ds-blue-700
const GREEN_INK = "#006F01"; // --ds-green-800
const RED_INK = "#BA303A"; // --ds-red-700

// ── Fonts ───────────────────────────────────────────────────────────────────

const FONT_DIRS = [
  ...(process.env.OG_FONT_DIRS ?? "").split(":").filter(Boolean),
  "/usr/share/fonts/opentype/inter",
  "/usr/share/fonts/truetype/inter",
  "/usr/share/fonts/truetype/jetbrains-mono",
  "/Library/Fonts",
  join(homedir(), "Library", "Fonts"),
];

const FACES = ["Inter-Regular", "Inter-SemiBold", "Inter-Bold", "JetBrainsMono-Regular"];

function findFonts() {
  return FACES.map((face) => {
    for (const dir of FONT_DIRS) {
      for (const ext of [".otf", ".ttf"]) {
        const path = join(dir, face + ext);
        if (existsSync(path)) return path;
      }
    }
    throw new Error(
      `build-og-image: ${face} not found. Install Inter and JetBrains Mono, ` +
        `or point OG_FONT_DIRS at the folders holding them. Looked in:\n  ${FONT_DIRS.join("\n  ")}`,
    );
  });
}

const fonts = findFonts();

function render(svg) {
  return new Resvg(svg, {
    font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: "Inter" },
  });
}

/** A `<text>` element. `size` in px, `tracking` in ems. */
function text(str, { x, y, size, weight = 400, fill = INK, family = "Inter", tracking = 0, anchor }) {
  const esc = str.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const align = anchor ? ` text-anchor="${anchor}"` : "";
  return `<text x="${round(x)}" y="${round(y)}" font-family="${family}" font-weight="${weight}"
    font-size="${size}" letter-spacing="${round(tracking * size)}" fill="${fill}"${align}
    xml:space="preserve">${esc}</text>`;
}

/** Ink bounds of a `text()` set at the origin, relative to its baseline. */
function measure(str, opts) {
  const { size } = opts;
  const box = render(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 40}" height="${size * 4}">${text(str, {
      ...opts,
      x: 0,
      y: size * 2,
    })}</svg>`,
  ).getBBox();
  if (!box) throw new Error(`build-og-image: "${str}" rendered nothing; the font did not load`);
  return { x: box.x, top: box.y - size * 2, bottom: box.y + box.height - size * 2, width: box.width };
}

// ── Language icons ──────────────────────────────────────────────────────────

/** The home page's roster (`HeroMarquee.tsx`), minus C, whose icon is an
 *  inline component there rather than a react-icons export. */
const ROSTER = [
  SiPython,
  SiR,
  SiJavascript,
  SiTypescript,
  RiPhpFill,
  SiCplusplus,
  SiOpenjdk,
  SiSharp,
  SiSqlite,
  SiPostgresql,
  SiDuckdb,
];
/** As in the hero: only the three primary brand 500s, cycled. */
const BRAND_CYCLE = [BLUE_500, GREEN_500, RED_500];

/** A react-icons glyph's viewBox width and inner markup. */
function glyph(Icon) {
  const markup = renderToStaticMarkup(createElement(Icon));
  const viewBox = markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const inner = markup.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  if (!viewBox || !inner.includes("<path")) {
    throw new Error(`build-og-image: ${Icon.name} did not render as a viewBox and paths`);
  }
  return { box: Number(viewBox[1]), inner };
}

/** A react-icons glyph `size` px square with its top-left at (x, y). */
function icon(Icon, x, y, size, fill) {
  const { box, inner } = glyph(Icon);
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(size / box)})" fill="${fill}">${inner}</g>`;
}

/** A glyph scaled so its ink, not its box, spans `size` on its longer side,
 *  centred on (cx, cy). The roster's glyphs fill their boxes very unevenly
 *  (PHP is a wide, short wordmark), so box-sizing them reads as a row of
 *  different sizes at different heights. */
function inkIcon(Icon, cx, cy, size, fill) {
  const { box, inner } = glyph(Icon);
  const ink = render(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box}" height="${box}" viewBox="0 0 ${box} ${box}">${inner}</svg>`,
  ).getBBox();
  const scale = size / Math.max(ink.width, ink.height);
  const x = cx - (ink.x + ink.width / 2) * scale;
  const y = cy - (ink.y + ink.height / 2) * scale;
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(scale)})" fill="${fill}">${inner}</g>`;
}

// ── Composition ─────────────────────────────────────────────────────────────

const mark = readMark();
const parts = [];

// Lockup, top left: the mark as tall as the wordmark's capitals, on its
// baseline, 0.44em from it, as the nav draws it (see build-youtube-art.mjs).
const WORDMARK = { size: 34, weight: 600, tracking: -0.025 };
{
  const markH = -measure("D", WORDMARK).top;
  const markW = (mark.width / mark.height) * markH;
  const baseline = MARGIN + markH;
  const word = measure("Dataslope", WORDMARK);
  parts.push(placeMark(mark, MARGIN, baseline - markH, markH));
  parts.push(
    text("Dataslope", { ...WORDMARK, x: MARGIN + markW + 0.44 * WORDMARK.size - word.x, y: baseline }),
  );
}

// Headline and standfirst, left column. Each line's x is pulled in by its
// first glyph's side bearing so the ink lines up on the margin.
const HEAD = { size: 66, weight: 700, tracking: -0.035 };
const HEAD_LEADING = 74;
const HEAD_TOP = 196;
{
  const flush = (line, opts) => MARGIN - measure(line[0], opts).x;
  ["Learn by", "running code", "in your browser"].forEach((line, i) =>
    parts.push(
      text(line, { ...HEAD, fill: i === 2 ? BLUE_500 : INK, x: flush(line, HEAD), y: HEAD_TOP + i * HEAD_LEADING }),
    ),
  );
  const SUB = { size: 25, tracking: -0.01, fill: GRAY_500 };
  const subTop = HEAD_TOP + 2 * HEAD_LEADING + 64;
  ["Free courses and playgrounds.", "No sign-up, nothing to install."].forEach((line, i) =>
    parts.push(text(line, { ...SUB, x: flush(line, SUB), y: subTop + i * 34 })),
  );
}

// The code block, right column, top-aligned with the lockup.
{
  const x = 640;
  const y = MARGIN;
  const w = W - MARGIN - x;
  const r = 18;
  const MONO = { family: "JetBrains Mono", size: 21 };
  const LEADING = 34;
  const HEADER_H = 60;
  const PAD = 22;
  const GUTTER = 44; // right edge of the line numbers

  const code = [
    [["langs", INK], [" = [", GRAY_500], ['"Python"', GREEN_INK], [", ", GRAY_500], ['"SQL"', GREEN_INK],
      [", ", GRAY_500], ['"R"', GREEN_INK], ["]", GRAY_500]],
    [["for", BLUE_INK], [" lang ", INK], ["in", BLUE_INK], [" langs:", INK]],
    [["    "], ["print", RED_INK], ["(", GRAY_500], ['f"Learn ', GREEN_INK], ["{lang}", INK], ['"', GREEN_INK],
      [")", GRAY_500]],
  ];
  const output = ["Learn Python", "Learn SQL", "Learn R"];

  const advance = measure("0000000000", MONO).width / 10; // monospaced
  const codeH = PAD + code.length * LEADING + 12;
  const outTop = y + HEADER_H + codeH;
  const outH = 52 + output.length * LEADING + 8;
  const cardH = HEADER_H + codeH + outH;

  // Card, the output panel's tint across its rounded foot, the two rules,
  // and the border again on top so the tint does not cover it.
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${cardH}" rx="${r}" fill="${WHITE}" filter="url(#lift)"/>`);
  parts.push(`<path d="M${x} ${outTop} H${x + w} V${y + cardH - r} a${r} ${r} 0 0 1 -${r} ${r}
    H${x + r} a${r} ${r} 0 0 1 -${r} -${r} Z" fill="${GRAY_50}"/>`);
  parts.push(`<path d="M${x} ${y + HEADER_H} H${x + w} M${x} ${outTop} H${x + w}" stroke="${GRAY_200}" stroke-width="1.5"/>`);
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${cardH}" rx="${r}" fill="none"
    stroke="${GRAY_200}" stroke-width="1.5"/>`);

  // Header: file tab on the left, Run on the right.
  const mid = y + HEADER_H / 2;
  parts.push(icon(SiPython, x + PAD, mid - 10, 20, BLUE_500));
  parts.push(text("main.py", { ...MONO, size: 18, x: x + 52, y: mid + 6 }));

  const RUN = { size: 18, weight: 600, tracking: -0.01, fill: WHITE };
  const label = measure("Run", RUN);
  const btnH = 36;
  const btnW = 16 + 12 + 8 + label.width + 18;
  const btnX = x + w - 16 - btnW;
  const triX = btnX + 16;
  parts.push(`<rect x="${btnX}" y="${mid - btnH / 2}" width="${btnW}" height="${btnH}" rx="${btnH / 2}" fill="${BLUE_500}"/>`);
  parts.push(`<path d="M${triX} ${mid - 7} L${triX + 12} ${mid} L${triX} ${mid + 7} Z" fill="${WHITE}"
    stroke="${WHITE}" stroke-width="2" stroke-linejoin="round"/>`);
  parts.push(text("Run", { ...RUN, x: triX + 20 - label.x, y: mid - (label.top + label.bottom) / 2 }));

  // Code, with line numbers.
  code.forEach((tokens, i) => {
    const baseline = y + HEADER_H + PAD + (i + 1) * LEADING - 10;
    parts.push(text(String(i + 1), { ...MONO, fill: GRAY_400, x: x + GUTTER, y: baseline, anchor: "end" }));
    let col = 0;
    for (const [str, fill] of tokens) {
      if (fill) parts.push(text(str, { ...MONO, fill, x: x + GUTTER + PAD + col * advance, y: baseline }));
      col += str.length;
    }
  });

  // Output.
  parts.push(text("OUTPUT", { size: 14, weight: 600, tracking: 0.08, fill: GRAY_500, x: x + PAD, y: outTop + 34 }));
  output.forEach((line, i) =>
    parts.push(text(line, { ...MONO, x: x + PAD, y: outTop + 52 + (i + 1) * LEADING - 10 })),
  );
}

// The language roster along the bottom, edge to edge across the margins.
{
  const size = 34;
  const cy = H - MARGIN - size / 2;
  const step = (W - 2 * MARGIN - size) / (ROSTER.length - 1);
  ROSTER.forEach((Icon, i) =>
    parts.push(inkIcon(Icon, MARGIN + size / 2 + i * step, cy, size, BRAND_CYCLE[i % BRAND_CYCLE.length])),
  );
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${mark.gradients.join("\n    ")}
    <filter id="lift" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="${INK}" flood-opacity="0.08"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${WHITE}"/>
  ${parts.join("\n  ")}
</svg>`;

const png = render(svg).render().asPng();
writeFileSync(OUT, png);
console.log(`build-og-image: ${relative(ROOT, OUT)} (${(png.length / 1024).toFixed(1)} KB, ${W}×${H})`);
