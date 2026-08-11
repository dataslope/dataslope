/**
 * Five lines through one scatter, answering five different questions.
 *
 * Ordinary least squares fits the *conditional mean*. Quantile regression fits
 * a conditional quantile, and running it at several quantiles at once produces
 * this fan, which says something the single line cannot: how the *spread*
 * changes across the range, not just the level.
 *
 * On pay against experience the fan opens, because a year of experience does
 * much more for the top of the distribution than for the bottom. A mean line
 * reports one slope and hides that entirely, and so does a residual standard
 * deviation, because there is no single residual standard deviation to report.
 *
 * Two things follow that matter in practice.
 *
 * The median line and the mean line answer different questions and separate as
 * soon as the conditional distribution is skewed, which it usually is for
 * money, durations and counts. "Typical" almost always means the median, and
 * almost always gets estimated with the mean.
 *
 * And the quantile lines are what a service-level question actually needs.
 * "How long does a request take" is a mean; "how long does the slowest one in
 * twenty take" is the 95th percentile, and only one of those appears in an
 * SLA. Fitting the mean and adding two standard deviations is a normal-tailed
 * approximation to the second question, and on skewed data it is wrong in the
 * direction that hurts.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES, mean, normalSamples, rng } from "./_theme.mjs";

export const title =
  "Pay against years of experience with quantile regression lines at the 10th, 25th, 50th, 75th and 90th percentiles, plus the least-squares mean fit. The fan opens to the right and the mean line sits above the median, both of which a single slope hides.";

const N = 420;
const u = rng(6_449);
const Z = normalSamples(N, 0, 1, 3_733);
/** A skewed, widening conditional distribution: a floor that rises with
 *  experience, plus a lognormal bonus whose scale rises with it too. */
const POINTS = Array.from({ length: N }, (_, i) => {
  const x = u() * 20;
  const scale = 10 + 1.1 * x;
  return { x, y: 28 + 1.8 * x + scale * Math.exp(0.6 * Z[i]) };
});

const QUANTILES = [0.1, 0.25, 0.5, 0.75, 0.9];

/**
 * Quantile regression by iteratively reweighted least squares on the check
 * loss, which converges in a handful of passes at this size and keeps the spec
 * self-contained.
 */
function quantileFit(rows, tau) {
  let a = 0;
  let b = 0;
  let w = rows.map(() => 1);
  for (let pass = 0; pass < 40; pass++) {
    let sw = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    rows.forEach((d, i) => {
      sw += w[i];
      sx += w[i] * d.x;
      sy += w[i] * d.y;
      sxx += w[i] * d.x * d.x;
      sxy += w[i] * d.x * d.y;
    });
    const den = sw * sxx - sx * sx;
    b = (sw * sxy - sx * sy) / den;
    a = (sy - b * sx) / sw;
    w = rows.map((d) => {
      const r = d.y - (a + b * d.x);
      const weight = r > 0 ? tau : 1 - tau;
      return weight / Math.max(Math.abs(r), 0.6);
    });
  }
  return { a, b };
}

const FITS = QUANTILES.map((tau, i) => ({ tau, color: SERIES[i], ...quantileFit(POINTS, tau) }));

/** Least squares, for the mean line. */
const MEAN_FIT = (() => {
  const mx = mean(POINTS.map((d) => d.x));
  const my = mean(POINTS.map((d) => d.y));
  let num = 0;
  let den = 0;
  for (const d of POINTS) {
    num += (d.x - mx) * (d.y - my);
    den += (d.x - mx) ** 2;
  }
  const b = num / den;
  return { a: my - b * mx, b };
})();

const MEDIAN = FITS.find((f) => f.tau === 0.5);
const HIGH = FITS.at(-1);
const LOW = FITS[0];

const X0 = 1;
const X1 = 19;
const at = (fit, x) => fit.a + fit.b * x;
/** The honest measure of the fan: how much wider the 10-to-90 band is at the
 *  right-hand end than at the left. A ratio of the two slopes would divide by
 *  a number close to zero and report nonsense. */
const BAND_LEFT = at(HIGH, X0) - at(LOW, X0);
const BAND_RIGHT = at(HIGH, X1) - at(LOW, X1);
const FAN = (BAND_RIGHT / BAND_LEFT).toFixed(1);
const MEAN_GAP = Math.round(at(MEAN_FIT, X1) - at(MEDIAN, X1));

const lineFor = (fit) => [0.4, 19.8].map((x) => ({ x, y: at(fit, x) }));

/** Six lines end within a few thousand pounds of each other, so the labels go
 *  in a gutter at evenly spaced slots with a leader back to each line. The
 *  slots are assigned in the lines' own order, so no leader crosses another. */
const GUTTER = [
  ...FITS.map((f) => ({ label: `${Math.round(f.tau * 100)}th`, color: f.color, y: at(f, 19.8) })),
  { label: "mean", color: "currentColor", y: at(MEAN_FIT, 19.8) },
]
  .sort((a, b) => a.y - b.y)
  .map((d, i) => ({ ...d, slot: 62 + i * 19 }));

export const caption = `Quantile regression at five quantiles through a skewed scatter, with the least-squares mean fit among them. The 10-to-90 band is about £${Math.round(BAND_LEFT)}k wide at one year of experience and £${Math.round(BAND_RIGHT)}k at ${X1}, ${FAN} times wider, and the mean line ends £${MEAN_GAP}k above the median.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 30,
    marginLeft: 54,
    marginRight: 88,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Years of experience",
      labelAnchor: "center",
      domain: [0, 20.2],
      ticks: [0, 5, 10, 15, 20],
    },
    y: {
      label: "Annual pay (£000)",
      domain: [15, 205],
      ticks: [40, 80, 120, 160, 200],
    },
    marks: [
      Plot.dot(POINTS, { x: "x", y: "y", r: 2.3, fill: MUTED, fillOpacity: 0.5, clip: true }),
      ...FITS.map((f) =>
        Plot.line(lineFor(f), { x: "x", y: "y", stroke: f.color, strokeWidth: 1.8, clip: true }),
      ),
      Plot.line(lineFor(MEAN_FIT), {
        x: "x",
        y: "y",
        stroke: "currentColor",
        strokeOpacity: 0.75,
        strokeWidth: 2.6,
        strokeDasharray: "6,3",
        clip: true,
      }),
      Plot.link(GUTTER, {
        x1: 19.9,
        y1: "y",
        x2: 20.9,
        y2: "slot",
        stroke: "color",
        strokeOpacity: 0.5,
        strokeWidth: 1,
      }),
      Plot.text(GUTTER, {
        x: 20.9,
        y: "slot",
        text: "label",
        fill: "color",
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 5,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0.4,
        y: 203,
        text: () => `the fan opens: the 10-to-90 band is £${Math.round(BAND_LEFT)}k wide at one year\nand £${Math.round(BAND_RIGHT)}k wide at ${X1}, so experience moves the top\nof the distribution far more than the bottom`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        lineAnchor: "top",
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0.4,
        y: 168,
        text: () => `and the dashed mean line runs above the median all the way\nacross, £${MEAN_GAP}k above it by ${X1} years, because a few very large\nsalaries pull an average and leave a median alone`,
        fill: "currentColor",
        fillOpacity: 0.75,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        lineAnchor: "top",
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
