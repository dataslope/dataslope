/**
 * How many tries until the first success, and why the mean is a bad summary of
 * the answer.
 *
 * The geometric distribution answers a question that comes up constantly:
 * given an independent chance `p` on every attempt, how many attempts until
 * one works? Retries against a flaky service, calls until a sale, rolls until a
 * six.
 *
 * Its shape is always the same: the *most likely* number of attempts is one,
 * for every p, because the highest-probability outcome is always "it worked
 * straight away". The distribution only ever decreases, and it decreases
 * geometrically, which is where the long tail comes from.
 *
 * The mean is `1/p`, and that number is the reason to draw the distribution
 * rather than quote it. At a 20% success rate the mean is five attempts, and
 * five is not a typical experience of anything: the single commonest outcome is
 * one attempt, the median is four, and the chance of needing more than ten is
 * over ten per cent. A retry budget planned around the mean fails often enough
 * to matter.
 *
 * The property that makes it strange is *memorylessness*. Given that the first
 * seven attempts failed, the distribution of how many more you need is the same
 * distribution you started with. Seven failures are not evidence that a success
 * is due, and they are not evidence that it is not: they are no evidence at
 * all, assuming independence.
 *
 * That assumption is the one to check. Real retries are usually not
 * independent, because whatever made the first attempt fail is often still
 * happening, and then the tail is heavier than this and a fixed retry budget
 * is even less safe.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "The geometric distribution at success rates of 0.5, 0.2 and 0.08, with the mean 1/p marked on each. The most likely number of attempts is always one, and the mean sits far out in a long right tail.";

const RATES = [
  { p: 0.5, color: SERIES[0] },
  { p: 0.2, color: SERIES[1] },
  { p: 0.08, color: SERIES[5] },
];
const K_MAX = 26;

const CURVES = RATES.map((r) => {
  const pmf = Array.from({ length: K_MAX }, (_, i) => {
    const k = i + 1;
    return { k, p: r.p * (1 - r.p) ** (k - 1) };
  });
  const mean = 1 / r.p;
  let acc = 0;
  let median = 1;
  for (const d of pmf) {
    acc += d.p;
    if (acc >= 0.5) {
      median = d.k;
      break;
    }
  }
  const beyondMean = 1 - (1 - (1 - r.p) ** Math.floor(mean));
  return { ...r, pmf, mean, median, beyondMean };
});

const FOCUS = CURVES[1];
const TAIL_10 = (1 - FOCUS.p) ** 10;

export const caption = `The geometric distribution answers a question that comes up constantly: given an independent chance p on every attempt, how many attempts until one works? Retries against a flaky service, calls until a sale, rolls until a six. The shape is always the same. The most likely number of attempts is one, for every p, because the highest-probability outcome is always that it worked straight away, and from there the curve only decreases. The mean is 1/p, and that number is the reason to draw the distribution rather than quote it. At a ${FOCUS.p * 100}% success rate the mean is ${FOCUS.mean} attempts, and five is not a typical experience of anything here: the commonest outcome is a single attempt, the median is ${FOCUS.median}, and the chance of needing more than ten is ${(TAIL_10 * 100).toFixed(0)}%. A retry budget planned around the mean fails often enough to matter. The property that makes this distribution strange is memorylessness: given that the first seven attempts failed, the distribution of how many more you need is the same distribution you started with. Seven failures are not evidence that a success is due, and not evidence that it is not. That is also the assumption worth checking, because real retries are usually not independent, since whatever made the first attempt fail is often still happening, and then the tail is heavier than this and a fixed budget is less safe still.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 54,
    marginRight: 132,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Attempts until the first success",
      labelAnchor: "center",
      domain: [0.4, K_MAX + 0.6],
      ticks: [1, 5, 10, 15, 20, 25],
    },
    y: { label: "Probability", domain: [0, 0.55], ticks: [0, 0.2, 0.4] },
    marks: [
      ...CURVES.map((c) =>
        Plot.line(c.pmf, { x: "k", y: "p", stroke: c.color, strokeWidth: 2, clip: true }),
      ),
      ...CURVES.map((c) => Plot.dot(c.pmf, { x: "k", y: "p", r: 2.4, fill: c.color, clip: true })),
      ...CURVES.map((c) =>
        Plot.ruleX([c.mean], {
          stroke: c.color,
          strokeWidth: 1.3,
          strokeDasharray: "4,3",
          strokeOpacity: 0.8,
        }),
      ),
      Plot.text(
        CURVES.map((c, i) => ({ ...c, ly: 0.52 - i * 0.075 })),
        {
          x: K_MAX + 0.6,
          y: "ly",
          text: (d) => `p = ${d.p}\nmean ${d.mean.toFixed(1)}, median ${d.median}`,
          fill: "color",
          fontSize: 10.5,
          fontWeight: 700,
          lineHeight: 1.35,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text(
        CURVES.map((c) => ({ ...c })),
        {
          x: "mean",
          y: 0,
          text: (d) => `1/p = ${d.mean.toFixed(1)}`,
          fill: "color",
          fontSize: 10,
          fontWeight: 700,
          textAnchor: "middle",
          dy: -8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 13,
        y: 0.3,
        text: () => "the most likely answer is\nalways one attempt",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
