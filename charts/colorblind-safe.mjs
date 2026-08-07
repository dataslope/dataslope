/**
 * A red/green pair and a blue/orange pair, each shown as they are and as a
 * reader with deuteranopia sees them.
 *
 * Around one man in twelve has some form of red-green colour vision
 * deficiency, so a chart that distinguishes two series by red against green is
 * unreadable for a substantial slice of any audience. The simulated rows are
 * not an impression: they are the same colours run through the standard
 * Viénot-Brettel-Mollon deuteranope transform, which is what the accessibility
 * checkers use.
 *
 * The fix is not to avoid colour. It is to pick pairs that differ in something
 * the deficiency does not touch: blue against orange survives, because it
 * differs along the blue-yellow axis rather than the red-green one, and it
 * differs in lightness as well.
 */
import { Plot, plot, HALO, MUTED } from "./_theme.mjs";

export const literalColorsAllowed =
  "The chart is a comparison of specific colour pairs and a simulation of how " +
  "they appear under deuteranopia, so the swatches have to be those exact sRGB " +
  "values. Theme roles would change the very thing being demonstrated.";

export const title =
  "Two colour pairs shown normally and as simulated for deuteranopia. The red and green pair becomes two nearly identical mustard tones; the blue and orange pair stays clearly distinct.";

export const caption =
  "The lower row is the upper row seen with the commonest form of colour vision deficiency. Red against green collapses; blue against orange survives, because it differs in lightness and along an axis the deficiency leaves alone.";

const PAIRS = [
  { key: "Red / green", colors: ["#d62728", "#2ca02c"] },
  { key: "Blue / orange", colors: ["#1f77b4", "#ff7f0e"] },
];

/** Viénot, Brettel & Mollon (1999) deuteranope simulation: to linear RGB, into
 *  LMS, collapse the M cone onto a plane, back out again. */
function deuteranope(hex) {
  const srgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = srgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = lin;
  const L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  const M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  const S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
  // The deuteranope plane: M is reconstructed from L and S.
  const M2 = 0.494207 * L + 1.24827 * S;
  const r2 = 0.080944 * L - 0.130504 * M2 + 0.116721 * S;
  const g2 = -0.0102485 * L + 0.0540194 * M2 - 0.113615 * S;
  const b2 = -0.000365294 * L - 0.00412163 * M2 + 0.693513 * S;
  const out = [r2, g2, b2].map((c) => {
    const clamped = Math.min(1, Math.max(0, c));
    const enc = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(enc * 255);
  });
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const ROWS = [
  { key: "As drawn", transform: (c) => c },
  { key: "As a deuteranope sees it", transform: deuteranope },
];

const swatches = PAIRS.flatMap((pair, p) =>
  ROWS.flatMap((row, r) =>
    pair.colors.map((c, i) => ({
      panel: pair.key,
      row: r,
      x: i,
      color: row.transform(c),
    })),
  ),
);

export function render() {
  return plot({
    height: 280,
    marginTop: 34,
    marginLeft: 178,
    marginRight: 26,
    marginBottom: 26,
    ariaLabel: title,
    fx: { label: null, domain: PAIRS.map((p) => p.key) },
    x: { label: null, domain: [-0.6, 1.6], ticks: [], grid: false },
    y: {
      label: null,
      domain: [-0.6, 1.6],
      ticks: [0, 1],
      tickFormat: (r) => ROWS[r].key,
      grid: false,
      reverse: true,
    },
    marks: [
      Plot.rect(swatches, {
        x1: (d) => d.x - 0.42,
        x2: (d) => d.x + 0.42,
        y1: (d) => d.row - 0.34,
        y2: (d) => d.row + 0.34,
        fx: "panel",
        fill: "color",
      }),
      Plot.text([{ panel: "Red / green" }], {
        x: 0.5,
        y: 1.52,
        fx: "panel",
        text: () => "two series, one colour",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.text([{ panel: "Blue / orange" }], {
        x: 0.5,
        y: 1.52,
        fx: "panel",
        text: () => "still two series",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        ...HALO,
      }),
    ],
  });
}
