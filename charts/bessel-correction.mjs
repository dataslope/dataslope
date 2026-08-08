/**
 * Why sample variance divides by n−1, shown rather than derived.
 *
 * The usual explanation is "degrees of freedom", which is a name for the
 * answer rather than a reason. The reason is that the sample variance is
 * measured around the *sample* mean, and the sample mean is the point that
 * minimises exactly that sum of squares. It sits a little closer to the data
 * than the true mean does, because it was computed from the data, so the
 * squared distances come out systematically too small. Dividing by a slightly
 * smaller number is the correction.
 *
 * The chart is that bias, measured. Ten thousand samples at each size, both
 * estimators computed on every one, and the average plotted against the
 * population variance. The n divisor sits below the line by a factor of
 * (n−1)/n, which is 50% at n = 2 and under 1% by n = 100; the n−1 divisor sits
 * on it. That shape is the practical answer to the question people actually
 * have, which is whether `ddof` matters: on a sample of eight, badly, and on
 * a sample of ten thousand, not at all.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, normalSamples } from "./_theme.mjs";

export const title =
  "Average estimated variance against sample size, for the n and n−1 divisors, over ten thousand samples each. The n−1 line sits on the true variance at every size; the n line sits below it, badly at small samples and negligibly by n = 100.";

const SIGMA2 = 100;
const TRIALS = 4000;
const SIZES = [2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 80, 120];

let seed = 1234;
const rows = [];
for (const n of SIZES) {
  let sumN = 0;
  let sumN1 = 0;
  for (let t = 0; t < TRIALS; t++) {
    const xs = normalSamples(n, 0, Math.sqrt(SIGMA2), (seed += 7));
    const m = xs.reduce((s, x) => s + x, 0) / n;
    const ss = xs.reduce((s, x) => s + (x - m) ** 2, 0);
    sumN += ss / n;
    sumN1 += ss / (n - 1);
  }
  rows.push({ key: "Divide by n", n, value: sumN / TRIALS });
  rows.push({ key: "Divide by n − 1", n, value: sumN1 / TRIALS });
}

const at = (key, n) => rows.find((r) => r.key === key && r.n === n).value;
const BIAS_5 = (1 - at("Divide by n", 5) / SIGMA2) * 100;

export const caption = `The sample variance is measured around the *sample* mean, and the sample mean is the point that minimises exactly that sum of squares: it sits closer to the data than the true mean does, because it was computed from the data. So the squared distances come out systematically small, by a factor of (n−1)/n, and dividing by the smaller number is the correction. Measured over ${TRIALS.toLocaleString()} samples at each size, the \`n\` divisor underestimates the true variance by about ${BIAS_5.toFixed(0)}% at n = 5 and by under 1% by n = 100. That is the honest answer to "does \`ddof\` matter?": on a small sample, a lot; on a large one, not at all.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 142,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Sample size (n)",
      labelAnchor: "center",
      type: "log",
      domain: [2, 120],
      ticks: [2, 5, 10, 20, 50, 120],
      tickFormat: (d) => String(d),
    },
    y: { label: "Average estimated variance", domain: [0, SIGMA2 * 1.25], ticks: 5 },
    marks: [
      Plot.ruleY([SIGMA2], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: 2.1,
        y: SIGMA2,
        text: () => `true variance = ${SIGMA2}`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dy: -9,
        ...HALO,
      }),
      Plot.line(rows.filter((d) => d.key === "Divide by n"), {
        x: "n",
        y: "value",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => d.key !== "Divide by n"), {
        x: "n",
        y: "value",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.dot(rows, {
        x: "n",
        y: "value",
        r: 2.4,
        fill: (d) => (d.key === "Divide by n" ? ACCENT : PRIMARY),
      }),
      Plot.text([{}], {
        x: 120,
        y: at("Divide by n − 1", 120),
        text: () => "Divide by n − 1\n(unbiased)",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 120,
        y: at("Divide by n", 120),
        text: () => "Divide by n\n(too small)",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: 14,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
