/**
 * Why "the average" is a choice: on a right-skewed distribution the mode,
 * median and mean sit at three visibly different places, in that order.
 *
 * The distribution is a lognormal drawn to look like the salary/order-value
 * data the lesson talks about. The three centres are marked on the density
 * itself rather than reported as numbers, because the point is *positional*:
 * the long right tail drags the mean away from where most of the data is.
 */
import { Plot, plot, linspace, SERIES } from "./_theme.mjs";

export const title =
  "A right-skewed distribution with the mode, median and mean marked at three separate points, the mean pulled furthest into the long tail.";

export const caption =
  "On skewed data the three centers separate, and they separate in a predictable order: mode, then median, then mean, with the tail pulling the mean furthest.";

// Lognormal with μ = 0, σ = 0.62 on the log scale, rescaled so the numbers read
// like an order value in dollars. Closed form, so no sampling and no seed.
const SIGMA = 0.62;
const SCALE = 60;

const lognormalPdf = (x) =>
  x <= 0
    ? 0
    : Math.exp(-((Math.log(x / SCALE)) ** 2) / (2 * SIGMA * SIGMA)) /
      (x * SIGMA * Math.sqrt(2 * Math.PI));

// Exact values for a lognormal: mode = scale·e^(−σ²), median = scale,
// mean = scale·e^(σ²/2).
const MODE = SCALE * Math.exp(-SIGMA * SIGMA);
const MEDIAN = SCALE;
const MEAN = SCALE * Math.exp((SIGMA * SIGMA) / 2);

const curve = linspace(0.5, 220, 220).map((x) => ({ x, y: lognormalPdf(x) }));
const peak = Math.max(...curve.map((d) => d.y));

// `side` puts the mode's label to the left of its rule. At this skew the three
// marks are close enough that three right-hand labels would have the median's
// rule striking through the mode's text.
const CENTERS = [
  { label: "Mode", at: MODE, color: SERIES[2], side: "end" },
  { label: "Median", at: MEDIAN, color: SERIES[0], side: "start" },
  { label: "Mean", at: MEAN, color: SERIES[1], side: "start" },
];

export function render() {
  return plot({
    height: 330,
    marginLeft: 24,
    ariaLabel: title,
    x: {
      label: "Order value ($)",
      labelAnchor: "center",
      domain: [0, 220],
      ticks: 6,
      tickFormat: (d) => `$${d}`,
    },
    // Density units would be noise here; the shape and the three marks carry
    // the whole message.
    y: { label: null, ticks: [], grid: false, domain: [0, peak * 1.34] },
    marks: [
      Plot.areaY(curve, { x: "x", y: "y", fill: SERIES[0], fillOpacity: 0.13 }),
      Plot.lineY(curve, { x: "x", y: "y", stroke: SERIES[0], strokeWidth: 2 }),
      // Staggered label heights, because at this skew the median and mean sit
      // close enough together that level labels would collide.
      Plot.ruleX(CENTERS, {
        x: "at",
        y1: 0,
        y2: (d, i) => peak * (1.06 + i * 0.09),
        stroke: (d) => d.color,
        strokeWidth: 1.5,
      }),
      Plot.text(CENTERS, {
        x: "at",
        y: (d, i) => peak * (1.09 + i * 0.09),
        text: (d) => `${d.label}  $${d.at.toFixed(0)}`,
        fill: (d) => d.color,
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: (d) => d.side,
        dx: (d) => (d.side === "end" ? -6 : 6),
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
