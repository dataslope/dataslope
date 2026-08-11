/**
 * How much of a sample has to go wrong before each spread measure does.
 *
 * A statistic's *breakdown point* is the fraction of the data an adversary has
 * to corrupt before they can move it anywhere they like. It is the cleanest
 * single number for how robust something is, and the three measures here have
 * three very different ones.
 *
 * Watch what happens as points are replaced by wild values, one at a time. The
 * standard deviation moves on the *first* one, because it is a mean of squared
 * deviations and a mean has a breakdown point of zero: one value taken to
 * infinity takes the answer with it. By the time a twentieth of the sample is
 * corrupted the SD has doubled and stopped describing anything.
 *
 * The interquartile range holds until a quarter of the data is corrupted,
 * because that is when the corruption reaches the upper quartile. The median
 * absolute deviation holds until *half* of it is, which is the highest
 * breakdown point any measure can have: past half, the corrupted points are
 * the majority and no statistic can tell which half is the data.
 *
 * The reason this matters is that "check for outliers first" is not a
 * substitute. Outlier detection usually means comparing points to a spread
 * estimate, so an outlier rule built on the standard deviation is already
 * broken by the outliers it is looking for. This is called masking, and it is
 * why robust estimates are used to *find* outliers rather than the other way
 * round.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, SERIES, mean, normalSamples } from "./_theme.mjs";

export const title =
  "Standard deviation, interquartile range and median absolute deviation as points in a clean sample are replaced by extreme values one at a time. The SD moves on the first corrupted point; the IQR holds to a quarter; the MAD holds to a half.";

const N = 100;
const CLEAN = normalSamples(N, 50, 8, 6_617);
// Big enough to break things, small enough that the standard deviation climbs
// as a visible curve rather than a vertical wall at the left edge.
const WILD = 260;

const quantile = (sorted, q) => {
  const h = (sorted.length - 1) * q;
  const lo = Math.floor(h);
  return sorted[lo] + (h - lo) * (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]);
};
const medianOf = (xs) => quantile([...xs].sort((a, b) => a - b), 0.5);
const sdOf = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
};
const iqrOf = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return quantile(s, 0.75) - quantile(s, 0.25);
};
const madOf = (xs) => {
  const m = medianOf(xs);
  return 1.4826 * medianOf(xs.map((v) => Math.abs(v - m)));
};

const BASE = { sd: sdOf(CLEAN), iqr: iqrOf(CLEAN), mad: madOf(CLEAN) };
const STEPS = Array.from({ length: 61 }, (_, k) => {
  const corrupted = CLEAN.map((v, i) => (i < k ? WILD : v));
  return {
    share: k / N,
    sd: sdOf(corrupted) / BASE.sd,
    iqr: iqrOf(corrupted) / BASE.iqr,
    mad: madOf(corrupted) / BASE.mad,
  };
});

const MEASURES = [
  { key: "sd", label: "Standard deviation", color: ACCENT, breakdown: 0 },
  { key: "iqr", label: "Interquartile range", color: SERIES[1], breakdown: 0.25 },
  { key: "mad", label: "Median absolute deviation", color: PRIMARY, breakdown: 0.5 },
];

const YMAX = 6;
/** Each series stops just past its own breakdown point. Beyond that the
 *  corrupted values are the majority, the statistic starts describing *them*,
 *  and a line that turns back down reads as the measure recovering. */
const STOP = { sd: 0.55, iqr: 0.32, mad: 0.49 };
const rows = MEASURES.flatMap((m) =>
  STEPS.filter((s) => s.share <= STOP[m.key]).map((s) => ({
    key: m.key,
    color: m.color,
    x: s.share,
    y: Math.min(s[m.key], YMAX),
  })),
);
/** Where each measure first doubles, found rather than asserted. */
const doubling = Object.fromEntries(
  MEASURES.map((m) => [m.key, STEPS.find((s) => s[m.key] >= 2)?.share ?? null]),
);

export const caption = `Three spread estimates as clean points are replaced by wild ones. The standard deviation moves on the very first and has doubled by ${(doubling.sd * 100).toFixed(0)}% corruption; the interquartile range holds until a quarter of the data is gone, and the median absolute deviation until half is.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 56,
    marginRight: 182,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Share of the sample replaced by an extreme value",
      labelAnchor: "center",
      domain: [0, 0.55],
      ticks: [0, 0.1, 0.25, 0.4, 0.5],
      tickFormat: (v) => `${Math.round(v * 100)}%`,
    },
    y: {
      label: "Estimate, relative to the clean sample",
      domain: [0.6, YMAX],
      ticks: [1, 2, 4, 6],
      tickFormat: (v) => `${v}×`,
    },
    marks: [
      Plot.ruleY([1], { stroke: "currentColor", strokeOpacity: 0.3 }),
      Plot.ruleX([0.25, 0.5], { stroke: GUIDE, strokeWidth: 1.2, strokeDasharray: "4,3" }),
      Plot.line(rows, { x: "x", y: "y", z: "key", stroke: "color", strokeWidth: 2.2, clip: true }),
      Plot.text(
        MEASURES.map((m, i) => ({ ...m, x: 0.55, y: [5.3, 4.0, 1.3][i] })),
        {
          x: "x",
          y: "y",
          text: (d) => `${d.label}\nbreaks at ${Math.round(d.breakdown * 100)}%`,
          fill: "color",
          fontSize: 10.5,
          fontWeight: 700,
          lineHeight: 1.35,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 0.055,
        y: 5.4,
        text: () => "the SD is already moving\nat one corrupted point",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
