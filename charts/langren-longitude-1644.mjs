/**
 * Van Langren's 1644 longitude estimates, with the answer he did not have.
 *
 * This is the figure usually named as the first statistical graph: twelve
 * published determinations of the longitude difference between Toledo and
 * Rome, drawn by Michael Florent van Langren on a single horizontal scale to
 * argue to the Spanish court that the longitude problem was unsolved. Drawing
 * the estimates rather than averaging them is the whole move. A mean of these
 * twelve is 24.7 degrees, stated to one decimal place, and it is wrong by
 * eight; the picture of the disagreement is the honest object and the summary
 * is not.
 *
 * The data is the `Langren1644` table from the HistData package, compiled by
 * Friendly, Valero-Mora and Ulargui for The American Statistician (2010) from
 * van Langren's own plate, so the positions here are the positions he drew
 * rather than an artist's impression of them.
 *
 * The part worth adding, which van Langren could not have drawn, is the truth.
 * Toledo sits at 4.03 degrees west and Rome at 12.5 east, so the difference is
 * about 16.5 degrees, and *every one of the twelve overshoots it* — the best by
 * 1.2 degrees and the worst by 13.6. The spread is the famous half of this
 * figure and the bias is the more useful half: a dozen independent
 * authorities, four centuries of them, agreeing with each other far more
 * closely than any of them agreed with the world. Scatter you can see. A
 * shared systematic error looks exactly like data.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Twelve seventeenth-century estimates of the longitude difference between Toledo and Rome, drawn as a row each against the true value of 16.5 degrees. Every estimate lies to the right of the truth, from 1.2 degrees too far to 13.6 degrees too far.";

/** HistData::Langren1644, the twelve determinations from van Langren's 1644
 *  plate, in the order he drew them: ascending. */
const ESTIMATES = [
  { name: "G. Jansonius", lon: 17.736, year: 1605 },
  { name: "G. Mercator", lon: 19.872, year: 1567 },
  { name: "I. Schonerus", lon: 20.638, year: 1536 },
  { name: "P. Lantsbergius", lon: 21.106, year: 1530 },
  { name: "T. Brahe", lon: 21.447, year: 1578 },
  { name: "I. Regiomontanus", lon: 25.617, year: 1463 },
  { name: "Orontius", lon: 26.0, year: 1542 },
  { name: "C. Clavius", lon: 26.34, year: 1567 },
  { name: "C. Ptolomeus", lon: 27.787, year: 150 },
  { name: "A. Argelius", lon: 28.17, year: 1610 },
  { name: "A. Maginus", lon: 29.787, year: 1582 },
  { name: "D. Origanus", lon: 30.128, year: 1601 },
];

/** Modern coordinates, from the same HistData reference. */
const TOLEDO = -4.03;
const ROME = 12.5;
const TRUTH = ROME - TOLEDO;

const rows = ESTIMATES.map((d, i) => ({
  ...d,
  i,
  error: d.lon - TRUTH,
}));

const CLOSEST = rows[0];
const FURTHEST = rows.at(-1);
const MEAN = rows.reduce((s, d) => s + d.lon, 0) / rows.length;

/** The 4.2 degree hole in the middle of the estimates, which is real: nobody
 *  published a value between Brahe and Regiomontanus. */
const GAP = rows.reduce(
  (best, d, i) =>
    i > 0 && d.lon - rows[i - 1].lon > best.size
      ? { size: d.lon - rows[i - 1].lon, lo: rows[i - 1].lon, hi: d.lon }
      : best,
  { size: 0, lo: 0, hi: 0 },
);

export const caption = `Twelve published determinations of the longitude difference between Toledo and Rome, redrawn from van Langren's 1644 plate, the figure usually named as the first statistical graph. He drew them instead of averaging them in order to argue to the Spanish court that the problem was unsolved, and the argument works: the estimates span ${(FURTHEST.lon - CLOSEST.lon).toFixed(1)} degrees, with a ${GAP.size.toFixed(1)} degree hole in the middle where nobody published at all. The part van Langren could not draw is the answer. Toledo is at 4.03 west and Rome at 12.5 east, so the true difference is ${TRUTH.toFixed(2)} degrees, and every one of the twelve overshoots it: ${CLOSEST.name} by ${CLOSEST.error.toFixed(1)}, ${FURTHEST.name} by ${FURTHEST.error.toFixed(1)}. Their mean, ${MEAN.toFixed(1)}, is wrong by ${(MEAN - TRUTH).toFixed(1)} and would have looked authoritative to one decimal place. The spread is the famous half of this figure; the bias is the more useful half. Scatter is visible. A systematic error that everyone shares looks exactly like data.`;

export function render() {
  const N = rows.length;
  return plot({
    height: 360,
    marginTop: 30,
    marginLeft: 126,
    marginRight: 54,
    marginBottom: 44,
    ariaLabel: title,
    x: {
      label: "Longitude difference, Toledo to Rome (degrees)",
      labelAnchor: "center",
      domain: [15, 31.4],
      ticks: [16, 18, 20, 22, 24, 26, 28, 30],
      tickFormat: (d) => `${d}°`,
    },
    y: {
      // The extra strip below the last row is where the gap band is labelled,
      // since every row's error bar crosses the band and there is no clear
      // space for the label inside it.
      label: null,
      domain: [N + 0.8, -0.6],
      ticks: rows.map((d) => d.i + 0.5),
      tickFormat: (v) => rows[Math.floor(v)].name,
      grid: false,
    },
    marks: [
      // The band nobody published into, drawn as a band rather than a rule so
      // that what is missing from it is dots and not ink.
      Plot.rect([GAP], {
        x1: "lo",
        x2: "hi",
        y1: -0.6,
        y2: N + 0.8,
        fill: MUTED,
        fillOpacity: 0.12,
      }),
      // Each row's error, drawn as the distance it has to travel back.
      Plot.ruleY(rows, {
        y: (d) => d.i + 0.5,
        x1: TRUTH,
        x2: "lon",
        stroke: PRIMARY,
        strokeOpacity: 0.32,
        strokeWidth: 5,
      }),
      Plot.ruleX([TRUTH], {
        y1: -0.6,
        y2: N,
        stroke: ACCENT,
        strokeWidth: 1.8,
      }),
      Plot.dot(rows, {
        y: (d) => d.i + 0.5,
        x: "lon",
        r: 4.4,
        fill: PRIMARY,
      }),
      // The year each determination was published, since the oldest of them
      // is not the worst and the newest is not the best.
      Plot.text(rows, {
        y: (d) => d.i + 0.5,
        x: "lon",
        text: (d) => `+${d.error.toFixed(1)}°`,
        fill: MUTED,
        fontSize: 10.5,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.text([{ at: TRUTH }], {
        x: "at",
        y: -0.6,
        text: () => "the true difference, 16° 30′",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 7,
        dy: 4,
        ...HALO,
      }),
      Plot.text([{ at: (GAP.lo + GAP.hi) / 2 }], {
        x: "at",
        y: N + 0.8,
        text: () => `no estimate in ${GAP.size.toFixed(1)}°`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -7,
        ...HALO,
      }),
      Plot.text([{}], {
        frameAnchor: "top-right",
        text: () => "every estimate is too large",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -4,
        dy: 2,
        ...HALO,
      }),
    ],
  });
}
