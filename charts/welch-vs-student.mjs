/**
 * Why `equal_var=False` is the right default, in one simulation.
 *
 * Student's t-test assumes the two groups share a variance, and pools them into
 * one estimate. Welch's does not, and estimates each group's variance
 * separately with an adjusted degrees of freedom. The textbook order of
 * operations is to test for equal variances first and choose accordingly. The
 * simulation says skip that and use Welch's always.
 *
 * Here both groups have identical means, so *every* significant result is a
 * false positive and the rate should be 5%. The variance ratio between them is
 * swept from equal to sixteen to one, with unequal group sizes, which is the
 * combination that matters.
 *
 * Student's drifts badly. When the *smaller* group has the *larger* variance,
 * the pooled estimate is dragged down, the denominator is too small, and the
 * test rejects far more often than it promised, approaching 30% here. Six times
 * the advertised error rate is not a subtlety.
 *
 * Welch's holds at 5% across the whole sweep, which is what a test is supposed
 * to do.
 *
 * The cost of using Welch's when the variances really are equal is a few per
 * cent of power, which is a trade nobody should hesitate over: a small loss in
 * the case where things are fine, against a large gain in the case where they
 * are not.
 *
 * The pre-test does not rescue Student's, and it is worth knowing why: the
 * variance test is itself underpowered at small n, which is exactly when the
 * problem bites, so it fails to detect the inequality precisely in the cases
 * where detecting it mattered.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, mean, normalSamples } from "./_theme.mjs";

export const title =
  "Simulated Type I error rate against the ratio of group variances, for Student's t-test and Welch's, with unequal group sizes and identical true means. Student's climbs towards 30 per cent while Welch's holds at the 5 per cent it promised.";

const N_SMALL = 10;
const N_BIG = 40;
const REPS = 3000;
const RATIOS = [1, 2, 4, 6, 9, 12, 16];
const ALPHA = 0.05;

/**
 * Two-sided t critical value at 5%, by the Cornish-Fisher expansion around the
 * normal one. Accurate to about a thousandth at every degrees of freedom this
 * simulation reaches, and the accuracy matters: Welch's degrees of freedom
 * drop into the teens here, where the normal value would reject far too often
 * and make Welch's look broken when it is not.
 */
const Z = 1.959964;
const tCrit = (v) =>
  Z +
  (Z ** 3 + Z) / (4 * v) +
  (5 * Z ** 5 + 16 * Z ** 3 + 3 * Z) / (96 * v * v);
const STUDENT_CRIT = tCrit(N_SMALL + N_BIG - 2);

const varianceOf = (xs) => {
  const m = mean(xs);
  return xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1);
};

const ROWS = RATIOS.map((ratio, k) => {
  // The SMALL group carries the LARGE variance, which is the arrangement that
  // breaks the pooled estimate.
  const sdSmall = Math.sqrt(ratio);
  let student = 0;
  let welch = 0;
  for (let r = 0; r < REPS; r++) {
    const a = normalSamples(N_SMALL, 0, sdSmall, 100_000 + k * 9973 + r * 7);
    const b = normalSamples(N_BIG, 0, 1, 500_000 + k * 7919 + r * 11);
    const va = varianceOf(a);
    const vb = varianceOf(b);
    const pooled =
      ((N_SMALL - 1) * va + (N_BIG - 1) * vb) / (N_SMALL + N_BIG - 2);
    const tStudent =
      (mean(a) - mean(b)) / Math.sqrt(pooled * (1 / N_SMALL + 1 / N_BIG));
    const seA = va / N_SMALL;
    const seB = vb / N_BIG;
    const tWelch = (mean(a) - mean(b)) / Math.sqrt(seA + seB);
    // Welch-Satterthwaite: the whole point of the test is that its degrees of
    // freedom depend on the observed variances, not just on the sample sizes.
    const df =
      (seA + seB) ** 2 /
      (seA ** 2 / (N_SMALL - 1) + seB ** 2 / (N_BIG - 1));
    if (Math.abs(tStudent) > STUDENT_CRIT) student += 1;
    if (Math.abs(tWelch) > tCrit(df)) welch += 1;
  }
  return { ratio, student: student / REPS, welch: welch / REPS };
});

const WORST = ROWS.reduce((a, b) => (b.student > a.student ? b : a));
const WELCH_RANGE = [
  Math.min(...ROWS.map((d) => d.welch)),
  Math.max(...ROWS.map((d) => d.welch)),
];

export const caption = `Both groups here have identical true means, so every significant result is a false positive and the rate ought to be ${ALPHA * 100}%. The variance ratio between them is swept from equal to ${RATIOS.at(-1)} to one, with ${N_SMALL} observations in one group and ${N_BIG} in the other, which is the combination that matters. Student's t-test pools the two variances into one estimate, and when the smaller group carries the larger variance the pooled figure is dragged down, the denominator is too small, and the test rejects far more often than it promised: ${(WORST.student * 100).toFixed(0)}% at a ratio of ${WORST.ratio}, which is ${(WORST.student / ALPHA).toFixed(0)} times the advertised error rate. Welch's estimates each group's variance separately and stays between ${(WELCH_RANGE[0] * 100).toFixed(1)}% and ${(WELCH_RANGE[1] * 100).toFixed(1)}% across the whole sweep, which is what a test is supposed to do. The cost of using Welch's when the variances really are equal is a few per cent of power, which is a trade nobody should hesitate over. And the textbook advice of testing for equal variances first does not rescue Student's, for a reason worth knowing: the variance test is itself underpowered at small n, which is exactly when the problem bites, so it fails to detect the inequality precisely in the cases where detecting it mattered.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 126,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Ratio of the two group variances",
      labelAnchor: "center",
      domain: [1, 16],
      ticks: RATIOS,
      tickFormat: (v) => `${v}:1`,
    },
    y: {
      label: "False positives (should be 5%)",
      domain: [0, 0.3],
      ticks: [0, 0.05, 0.1, 0.2, 0.3],
      tickFormat: (v) => `${Math.round(v * 100)}%`,
    },
    marks: [
      Plot.ruleY([ALPHA], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.areaY(ROWS, {
        x: "ratio",
        y1: ALPHA,
        y2: "student",
        fill: ACCENT,
        fillOpacity: 0.15,
        clip: true,
      }),
      Plot.line(ROWS, { x: "ratio", y: "student", stroke: ACCENT, strokeWidth: 2.2, clip: true }),
      Plot.dot(ROWS, { x: "ratio", y: "student", r: 3.2, fill: ACCENT }),
      Plot.line(ROWS, { x: "ratio", y: "welch", stroke: PRIMARY, strokeWidth: 2.2, clip: true }),
      Plot.dot(ROWS, { x: "ratio", y: "welch", r: 3.2, fill: PRIMARY }),
      Plot.text([ROWS.at(-1)], {
        x: "ratio",
        y: "student",
        text: () => "Student's t\n(pools the variances)",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([ROWS.at(-1)], {
        x: "ratio",
        y: "welch",
        text: () => "Welch's t\n(the default to use)",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1.2,
        y: ALPHA,
        text: () => "the 5% it promised",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dy: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 8,
        y: 0.285,
        text: () => `${N_SMALL} observations in one group, ${N_BIG} in the other,\nand the small group has the large variance`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
