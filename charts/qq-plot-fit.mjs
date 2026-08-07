/**
 * The Q-Q plot: the standard way to check whether a fitted distribution
 * actually describes the data, and what a bad fit looks like.
 *
 * Two panels, because the plot is only legible by contrast. On the left the
 * data really are normal and the points sit on the line; on the right they are
 * right-skewed and the points bend away from it in a curve that a histogram at
 * this sample size would not have made obvious.
 *
 * Both samples are standardised, which is what makes the facet legitimate:
 * shared scales mean both panels must plot the same quantity in the same
 * units, and after standardising, both axes are standard deviations.
 */
import { Plot, plot, normalSamples, rng, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two quantile-quantile plots. On the left, normally distributed data sits along the diagonal reference line. On the right, right-skewed data curves away from the line, sitting below it at the low end and far above it at the high end.";

export const caption =
  "A Q-Q plot compares your data's quantiles against the distribution you fitted. Points on the line mean the fit holds. A systematic curve away from it, as on the right, is the fit failing in the tails, which is exactly where it usually matters.";

const N = 200;

/** Φ⁻¹, Acklam's rational approximation. Accurate to ~1e-9 across the range,
 *  which is far more than a plotted position needs. */
function probit(p) {
  const a = [-39.696830286653757, 220.94609842452050, -275.92851044696869,
    138.35775186726900, -30.664798066147160, 2.5066282774592392];
  const b = [-54.476098798224058, 161.58583685804089, -155.69897985988661,
    66.801311887719720, -13.280681552885721];
  const c = [-0.0077848940024302926, -0.32239645804113648, -2.4007582771618381,
    -2.5497325393437338, 4.3746641414649678, 2.9381639826987831];
  const d = [0.0077846957090414622, 0.32246712907003983, 2.4451341117582191,
    3.7544086619074162];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -probit(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Standardise, sort, and pair each order statistic with its theoretical
 *  normal quantile at the usual (i − 0.5) / n plotting position. */
function quantilePairs(values, panel) {
  const m = values.reduce((s, x) => s + x, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1));
  const z = values.map((x) => (x - m) / sd).sort((a, b) => a - b);
  return z.map((sample, i) => ({
    panel,
    theoretical: probit((i + 0.5) / values.length),
    sample,
  }));
}

const NORMAL = normalSamples(N, 0, 1, 20260807);

// Right-skewed, from the same generator so the two panels differ in shape
// rather than in anything incidental.
const skewNext = rng(4242);
const SKEWED = Array.from({ length: N }, () => -Math.log(1 - skewNext()));

const points = [
  ...quantilePairs(NORMAL, "Normal data: a good fit"),
  ...quantilePairs(SKEWED, "Skewed data: a bad fit"),
];

const DOMAIN = [-3.2, 4.6];

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 46,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: ["Normal data: a good fit", "Skewed data: a bad fit"] },
    x: { label: "Theoretical quantile", labelAnchor: "center", domain: DOMAIN, ticks: 4 },
    y: { label: "Sample quantile", domain: DOMAIN, ticks: 4 },
    marks: [
      Plot.link([{}], {
        x1: DOMAIN[0],
        y1: DOMAIN[0],
        x2: DOMAIN[1],
        y2: DOMAIN[1],
        stroke: MUTED,
        strokeWidth: 1.5,
        strokeDasharray: "4,3",
      }),
      Plot.dot(points, {
        x: "theoretical",
        y: "sample",
        fx: "panel",
        r: 2.6,
        fill: PRIMARY,
        fillOpacity: 0.7,
        stroke: null,
        clip: true,
      }),
      Plot.text([{ panel: "Skewed data: a bad fit" }], {
        x: 0.4,
        y: DOMAIN[0] + 0.9,
        fx: "panel",
        text: () => "the tail runs away\nfrom the line",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
    ],
  });
}
