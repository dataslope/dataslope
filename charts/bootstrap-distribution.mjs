/**
 * The bootstrap distribution of a median, with its percentile interval.
 *
 * The bootstrap is the one inference method in the course with no formula to
 * look at, so the picture *is* the explanation: resample the data you have,
 * take the statistic each time, and the histogram of those values is your
 * uncertainty. The interval is then just two percentiles read off it, which is
 * why "percentile interval" stops sounding like jargon once you have seen the
 * shape it is read from.
 *
 * The lesson's own setup: 120 lognormal incomes, 5,000 resamples, and the 2.5
 * and 97.5 percentiles of the resampled medians. The lumpiness is left in
 * rather than smoothed, because it is real — a median can only ever land on a
 * value that was in the original sample, and the visible steps in the tails
 * are that fact showing through.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A histogram of 5,000 bootstrap medians, mound-shaped with visibly uneven bars. The observed median is marked near the centre and a bracket above the histogram spans the middle 95% of the resampled medians.";

export const caption =
  "Resample the data you have, take the median of each resample, and this is what you get. The 95% interval is just the 2.5th and 97.5th percentiles of this histogram, no formula for the standard error of a median required.";

const N = 120;
const RESAMPLES = 5000;

// Lognormal incomes, seeded so the figure never churns between builds.
const next = rng(9);
const boxMuller = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};
const DATA = Array.from({ length: N }, () => Math.exp(10.5 + 0.6 * boxMuller()) / 1000);

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const OBSERVED = median(DATA);

const bootMedians = Array.from({ length: RESAMPLES }, () =>
  median(Array.from({ length: N }, () => DATA[Math.floor(next() * N)])),
);

const sorted = [...bootMedians].sort((a, b) => a - b);
const pct = (q) => sorted[Math.floor(q * (sorted.length - 1))];
const CI = [pct(0.025), pct(0.975)];

const DOMAIN = [
  Math.floor(sorted[0] / 2) * 2 - 2,
  Math.ceil(sorted[sorted.length - 1] / 2) * 2 + 2,
];
const BIN_WIDTH = 0.5;

/** Counted here rather than by Plot's bin transform, so the bin edges are
 *  fixed numbers and the shaded interval lines up with them exactly. */
const bins = (() => {
  const count = Math.round((DOMAIN[1] - DOMAIN[0]) / BIN_WIDTH);
  const tally = new Array(count).fill(0);
  for (const v of bootMedians) {
    const i = Math.floor((v - DOMAIN[0]) / BIN_WIDTH);
    if (i >= 0 && i < count) tally[i] += 1;
  }
  return tally.map((c, i) => {
    const x1 = DOMAIN[0] + i * BIN_WIDTH;
    return { x1, x2: x1 + BIN_WIDTH, share: c / RESAMPLES, inside: x1 >= CI[0] && x1 < CI[1] };
  });
})();

const PEAK = Math.max(...bins.map((b) => b.share));

export function render() {
  return plot({
    height: 330,
    marginTop: 40,
    marginLeft: 54,
    ariaLabel: title,
    x: { label: "Median income ($000)", labelAnchor: "center", domain: DOMAIN, ticks: 6 },
    y: { label: "Share of resamples", domain: [0, PEAK * 1.3], ticks: 4, tickFormat: "%" },
    marks: [
      Plot.rectY(bins, {
        x1: "x1",
        x2: "x2",
        y: "share",
        fill: (d) => (d.inside ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.inside ? 0.5 : 0.35),
      }),

      // The interval, as a span across the top rather than two lone verticals:
      // its width against the histogram under it is what a reader takes away.
      Plot.ruleY([PEAK * 1.16], { x1: CI[0], x2: CI[1], stroke: ACCENT, strokeWidth: 1.5 }),
      Plot.ruleX(CI, {
        x: (d) => d,
        y1: PEAK * 1.13,
        y2: PEAK * 1.19,
        stroke: ACCENT,
        strokeWidth: 1.5,
      }),
      Plot.text([{}], {
        x: (CI[0] + CI[1]) / 2,
        y: PEAK * 1.24,
        text: () => `95% interval: $${CI[0].toFixed(0)}k to $${CI[1].toFixed(0)}k`,
        fill: ACCENT,
        fontSize: 12.5,
        fontWeight: 600,
        ...HALO,
      }),

      Plot.ruleX([OBSERVED], {
        x: (d) => d,
        y1: 0,
        y2: PEAK * 1.05,
        stroke: GUIDE,
        strokeWidth: 1.5,
        strokeDasharray: "4,3",
      }),
      Plot.text([OBSERVED], {
        x: (d) => d,
        y: PEAK * 1.05,
        text: (d) => `observed median\n$${d.toFixed(0)}k`,
        fill: GUIDE,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 9,
        dy: 22,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
