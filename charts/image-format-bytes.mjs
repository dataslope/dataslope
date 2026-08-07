/**
 * The same photograph in five encodings, at the quality people actually ship.
 *
 * Format choice is usually the largest single saving available on a page, and
 * it costs nothing but a build step. The bars are bytes; the second column is
 * what the saving is worth on a slow connection, computed from the bytes rather
 * than quoted, because "60% smaller" means nothing until it is seconds.
 *
 * The figures are representative of a 1600px photographic image at visually
 * comparable quality, which the caption says plainly: exact ratios depend on
 * the picture, and a screenshot or a line drawing behaves differently. What is
 * stable is the ordering and the rough scale of the gaps.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same photograph as PNG, JPEG, WebP and AVIF, as bars of file size, with the download time on a slow connection beside each.";

/** Kilobytes, and the transfer rate of a poor mobile connection. */
const KBPS = 150;
const FORMATS = [
  { key: "PNG", kb: 1840 },
  { key: "JPEG (q80)", kb: 420 },
  { key: "WebP (q80)", kb: 268 },
  { key: "AVIF (q60)", kb: 148 },
];

const rows = FORMATS.map((f) => ({ ...f, seconds: f.kb / KBPS }));
const BASE = rows.find((r) => r.key === "JPEG (q80)");
const BEST = rows.at(-1);
const SAVED = ((BASE.kb - BEST.kb) / BASE.kb) * 100;

export const caption =
  `The same picture, four encodings. Moving from JPEG to AVIF drops ${SAVED.toFixed(0)}% of the bytes, which on a ${KBPS}KB/s connection is ${(BASE.seconds - BEST.seconds).toFixed(1)} seconds off a single image. These figures are representative of a photograph at comparable quality; a screenshot or a line drawing ranks differently, and the only way to know is to encode yours.`;

export function render() {
  return plot({
    height: 290,
    marginTop: 36,
    marginLeft: 118,
    marginRight: 152,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Kilobytes", labelAnchor: "center", domain: [0, 2000], ticks: 5 },
    y: { label: null, domain: rows.map((r) => r.key), padding: 0.3 },
    marks: [
      Plot.barX(rows, {
        y: "key",
        x: "kb",
        fill: (d) => (d.key === "PNG" ? ACCENT : PRIMARY),
        fillOpacity: 0.5,
      }),
      Plot.text(rows, {
        y: "key",
        x: "kb",
        text: (d) => `${d.kb} KB`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text(rows, {
        y: "key",
        x: 2000,
        text: (d) => `${d.seconds.toFixed(1)}s to load`,
        fill: MUTED,
        fontSize: 10.5,
        textAnchor: "start",
        dx: 62,
        ...HALO,
      }),
      Plot.ruleX([BASE.kb], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: BASE.kb,
        frameAnchor: "top",
        text: () => "the usual default",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        dy: -12,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
