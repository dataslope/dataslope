/**
 * The three shapes, side by side, with the mean and median marked on each.
 *
 * Faceted, which is legitimate here because all three panels plot a density
 * against the same units (see the note on plot() in _theme.mjs for when
 * faceting does *not* work). The pair of rules in every panel is what turns
 * "skew" from a word into a rule you can apply: whichever side of the median
 * the mean falls on is the direction of the tail.
 *
 * The distributions are lognormal with σ = 0.85, mirrored for the left-skewed
 * panel, rather than the skew-normal family this started with. A skew-normal
 * separates its mean and median by about a tenth of a standard deviation even
 * at extreme shape parameters, so the two rules printed as one thick line and
 * the figure's entire subject was invisible.
 */
import { Plot, plot, linspace, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Three density curves in separate panels: left-skewed, symmetric, and right-skewed. Each has its mean and median marked, showing the mean pulled well into the long tail in the skewed panels and the two coinciding in the symmetric one.";

export const caption =
  "The gap between mean and median is a read on shape, and its sign is the direction of the tail. On symmetric data the two coincide, which is why the difference is worth checking before trusting either.";

const SIGMA = 0.85;
const WINDOW = [0, 4];
const XS = linspace(WINDOW[0] + 0.01, WINDOW[1], 161);

/** Lognormal with median 1, so the tail runs right. */
const rightPdf = (x) =>
  x <= 0
    ? 0
    : Math.exp(-(Math.log(x) ** 2) / (2 * SIGMA * SIGMA)) / (x * SIGMA * Math.sqrt(2 * Math.PI));

/** The same density reflected in the middle of the window, so the tail runs
 *  left and the mean lands *below* the median. */
const MIRROR = WINDOW[0] + WINDOW[1];
const leftPdf = (x) => rightPdf(MIRROR - x);

/** A normal centred in the window, matched roughly in width to the others. */
const symmetricPdf = (x) => {
  const z = (x - 2) / 0.62;
  return Math.exp(-0.5 * z * z) / (0.62 * Math.sqrt(2 * Math.PI));
};

const PANELS = [
  { key: "Left-skewed", pdf: leftPdf },
  { key: "Symmetric", pdf: symmetricPdf },
  { key: "Right-skewed", pdf: rightPdf },
];

const curves = PANELS.flatMap(({ key, pdf }) => XS.map((x) => ({ panel: key, x, y: pdf(x) })));

/** Mean and median by numeric integration over the grid the curve is drawn on,
 *  so the marks agree with the picture rather than with a formula for an
 *  untruncated distribution. */
function moments(pdf) {
  const step = XS[1] - XS[0];
  const total = XS.reduce((s, x) => s + pdf(x) * step, 0);
  let mass = 0;
  let mean = 0;
  let median = XS[0];
  let seenHalf = false;
  for (const x of XS) {
    const d = pdf(x) * step;
    mean += x * d;
    mass += d;
    if (!seenHalf && mass >= total / 2) {
      median = x;
      seenHalf = true;
    }
  }
  return { mean: mean / total, median };
}

// The median's rule stops lower than the mean's, so the two labels sit on
// separate lines even in the symmetric panel where the marks coincide exactly.
const MARKS = PANELS.flatMap(({ key, pdf }) => {
  const { mean, median } = moments(pdf);
  return [
    { panel: key, at: median, label: "median", color: MUTED, lift: 0.88 },
    { panel: key, at: mean, label: "mean", color: SERIES[1], lift: 1.06 },
  ];
});

const PEAK = Math.max(...curves.map((d) => d.y));

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 30,
    marginBottom: 44,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    // A little air either side of the data. A lognormal's near-zero edge is
    // genuinely near-vertical, and with the domain ending exactly there the
    // steep side sat on the frame and read as a clipped curve rather than as
    // the short side of a skew.
    x: { label: null, domain: [WINDOW[0] - 0.35, WINDOW[1] + 0.35], ticks: [] },
    y: { label: null, ticks: [], grid: false, domain: [0, PEAK * 1.3] },
    marks: [
      Plot.areaY(curves, { x: "x", y: "y", fx: "panel", fill: SERIES[0], fillOpacity: 0.14 }),
      Plot.lineY(curves, { x: "x", y: "y", fx: "panel", stroke: SERIES[0], strokeWidth: 2 }),
      Plot.ruleX(MARKS, {
        x: "at",
        fx: "panel",
        y1: 0,
        y2: (d) => PEAK * d.lift,
        stroke: (d) => d.color,
        strokeWidth: 1.5,
      }),
      Plot.text(MARKS, {
        x: "at",
        fx: "panel",
        y: (d) => PEAK * (d.lift + 0.06),
        text: "label",
        fill: (d) => d.color,
        fontSize: 12,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.ruleY([0], { fx: "panel", stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
