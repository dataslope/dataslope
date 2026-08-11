/**
 * One mean, three error bars, and the fact that most charts do not say which
 * one you are looking at.
 *
 * All three of these describe the same forty numbers. They are different
 * lengths because they answer different questions, and the questions are not
 * variations on a theme:
 *
 *   • **standard deviation** describes the *data*. It says how spread out the
 *     forty observations are, and it does not shrink when you collect more of
 *     them, because the population is as variable as it is;
 *   • **standard error** describes the *mean*. It says how much the sample
 *     mean would jump around if you repeated the whole study, and it shrinks
 *     like one over the square root of n;
 *   • a **95% confidence interval** is the standard error scaled up to a
 *     stated coverage, so it is about twice as long as the SE bar and answers
 *     the same kind of question.
 *
 * At n = 40 the SD bar is more than six times the SE bar. That ratio is
 * `sqrt(n)`, so it grows with the study: at n = 100 it is ten. Which means the
 * *same data* can be drawn with error bars that differ by an order of
 * magnitude, and nothing about the drawing says which one was chosen.
 *
 * This matters because readers use error bars to eyeball significance, with
 * the rough rule that non-overlapping bars mean a real difference. That rule
 * is approximately true for confidence intervals, false for standard errors
 * (which overlap in plenty of significant cases) and meaningless for standard
 * deviations, which are not about the mean at all.
 *
 * There is no way to tell them apart by looking. The only fix is the caption:
 * say which one, and say n.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean, normalSamples } from "./_theme.mjs";

export const title =
  "One sample of forty measurements, with its mean drawn three times carrying a standard deviation bar, a standard error bar and a 95% confidence interval. The three bars differ in length by a factor of six, and nothing on a chart normally says which one is drawn.";

const N = 40;
const SAMPLE = normalSamples(N, 62, 11.5, 77_431).map((v) => Math.round(v * 10) / 10);
const M = mean(SAMPLE);
const SD = Math.sqrt(SAMPLE.reduce((s, v) => s + (v - M) ** 2, 0) / (N - 1));
const SE = SD / Math.sqrt(N);
/** t(0.975, 39) is 2.023; close enough to 1.96 that the shape is the same. */
const T95 = 2.023;

const BARS = [
  {
    key: "± 1 SD",
    half: SD,
    what: "how spread the data is",
    detail: "does not shrink with n",
  },
  {
    key: "± 1 SE",
    half: SE,
    what: "how precise the mean is",
    detail: "shrinks like 1/√n",
  },
  {
    key: "95% CI",
    half: T95 * SE,
    what: "how precise the mean is",
    detail: "the SE bar, scaled to 95%",
  },
];

const ORDER = BARS.map((d) => d.key);
const RATIO = (SD / SE).toFixed(1);

export const caption = `The same ${N} numbers with three different error bars. The standard deviation bar is ${RATIO} times the standard error bar, and that ratio is the square root of the sample size, so at n = 100 it would be ten.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 28,
    marginLeft: 78,
    marginRight: 168,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Measurement",
      labelAnchor: "center",
      domain: [30, 95],
      ticks: [40, 50, 60, 70, 80, 90],
    },
    y: { label: null, domain: ORDER, padding: 0.55, grid: false },
    marks: [
      // The forty observations, once, behind everything, so the SD bar can be
      // seen to be describing them and the other two can be seen not to be.
      Plot.dot(
        SAMPLE.flatMap((v) => ORDER.map((key) => ({ v, key }))),
        {
          y: "key",
          x: "v",
          r: 2.6,
          fill: MUTED,
          fillOpacity: 0.28,
          dy: -13,
        },
      ),
      Plot.ruleY(ORDER, { stroke: "currentColor", strokeOpacity: 0.07 }),
      Plot.link(BARS, {
        y: "key",
        x1: (d) => M - d.half,
        x2: (d) => M + d.half,
        stroke: (d) => (d.key === "± 1 SD" ? ACCENT : PRIMARY),
        strokeWidth: 3,
        strokeLinecap: "round",
      }),
      Plot.dot(BARS, { y: "key", x: () => M, r: 4.5, fill: PRIMARY }),
      Plot.text(BARS, {
        y: "key",
        x: (d) => M + d.half,
        text: (d) => `${d.what}\n${d.detail}`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 12,
        ...HALO,
      }),
      Plot.text(BARS, {
        y: "key",
        x: (d) => M - d.half,
        text: (d) => `±${d.half.toFixed(1)}`,
        fill: (d) => (d.key === "± 1 SD" ? ACCENT : PRIMARY),
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
      Plot.text([{ at: ORDER[0] }], {
        y: "at",
        x: 30,
        text: () => `the ${N} observations`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dy: -13,
        ...HALO,
      }),
    ],
  });
}
