/**
 * Why a coin-flip conversion rate is the hardest one to measure.
 *
 * The standard error of a proportion is `sqrt(p(1-p)/n)`, and the `p(1-p)`
 * factor is a downward parabola with its maximum at exactly one half. A rate
 * near 50% is the noisiest thing you can measure; a rate near 0% or 100% is
 * the quietest.
 *
 * The intuition is worth having rather than the formula. If the true rate is
 * 2%, almost every visitor does the same thing, so almost every sample looks
 * the same and the estimate barely moves. If the true rate is 50%, every
 * visitor is a fresh coin flip, and the sample is as variable as it can
 * possibly be.
 *
 * The practical consequences run in two directions and both are useful. A test
 * on a 2% checkout rate needs far fewer observations to pin the rate itself
 * down than a test on a 50% click rate does, because the standard error is a
 * third the size. But *relative* precision goes the other way: an error of
 * ±0.4 points on a 2% rate is a fifth of the whole quantity, while ±1.6 points
 * on 50% is a thirtieth of it, so if the question is "did this move by 10%
 * relative" the rare event is far harder.
 *
 * Which is why the sample-size question always has to name the thing being
 * measured. "How many users do I need" has no answer; "how many users to
 * detect a one-point change in a 4% rate" has one.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, SERIES, linspace } from "./_theme.mjs";

export const title =
  "The standard error of a proportion against the proportion itself, at three sample sizes. Every curve peaks at exactly one half, so a 50 per cent rate is the noisiest quantity to measure and a 2 per cent rate the quietest.";

const SIZES = [400, 2000, 10_000];
const CURVES = SIZES.map((n, i) => ({
  n,
  color: SERIES[i === 0 ? 5 : i === 1 ? 1 : 0],
  points: linspace(0.005, 0.995, 199).map((p) => ({ p, se: Math.sqrt((p * (1 - p)) / n) * 100 })),
}));

const REF_N = SIZES[1];
const seAt = (p, n) => Math.sqrt((p * (1 - p)) / n) * 100;
const RARE = 0.02;
const HALF = 0.5;
const ABS_RATIO = (seAt(HALF, REF_N) / seAt(RARE, REF_N)).toFixed(1);
const REL_RARE = ((seAt(RARE, REF_N) / (RARE * 100)) * 100).toFixed(0);
const REL_HALF = ((seAt(HALF, REF_N) / (HALF * 100)) * 100).toFixed(0);

export const caption = `The standard error of a proportion is the square root of p times one minus p over n, and that p(1−p) is a downward parabola peaking at exactly one half. So a rate near 50% is the noisiest quantity you can measure and a rate near 0% or 100% is the quietest. The intuition beats the formula: if the true rate is 2%, nearly every visitor does the same thing, so nearly every sample looks the same and the estimate hardly moves; if it is 50%, every visitor is a fresh coin flip and the sample is as variable as it can get. At n = ${REF_N.toLocaleString()} the standard error at one half is ${ABS_RATIO} times the one at 2%. Both practical consequences are worth carrying, because they point opposite ways. In absolute terms the rare event is easier: fewer observations pin the rate down. In *relative* terms it is far harder, because ±${seAt(RARE, REF_N).toFixed(2)} points on a 2% rate is ${REL_RARE}% of the whole quantity while ±${seAt(HALF, REF_N).toFixed(2)} on 50% is ${REL_HALF}% of it. Which is why "how many users do I need" has no answer and "how many users to detect a one-point change in a 4% rate" has one.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 60,
    marginRight: 108,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "True proportion",
      labelAnchor: "center",
      domain: [0, 1],
      ticks: [0, 0.25, 0.5, 0.75, 1],
      tickFormat: (v) => `${Math.round(v * 100)}%`,
    },
    y: {
      label: "Standard error (percentage points)",
      domain: [0, 2.8],
      ticks: [0, 1, 2],
      tickFormat: (v) => `${v}`,
    },
    marks: [
      Plot.ruleX([0.5], { stroke: GUIDE, strokeWidth: 1.3, strokeDasharray: "4,3" }),
      ...CURVES.map((c) =>
        Plot.line(c.points, { x: "p", y: "se", stroke: c.color, strokeWidth: 2.2, clip: true }),
      ),
      Plot.text(
        CURVES.map((c) => ({ n: c.n, color: c.color, p: 0.995, se: c.points.at(-1).se })),
        {
          x: "p",
          y: "se",
          text: (d) => `n = ${d.n.toLocaleString()}`,
          fill: "color",
          fontSize: 10.5,
          fontWeight: 700,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.dot(
        [RARE, HALF].map((p) => ({ p, se: seAt(p, REF_N) })),
        { x: "p", y: "se", r: 4.4, fill: ACCENT },
      ),
      Plot.text([{ p: HALF, se: seAt(HALF, REF_N) }], {
        x: "p",
        y: "se",
        text: () => `worst case, ±${seAt(HALF, REF_N).toFixed(2)} points`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -12,
        ...HALO,
      }),
      Plot.text([{ p: RARE, se: seAt(RARE, REF_N) }], {
        x: "p",
        y: "se",
        text: () => `2%: ±${seAt(RARE, REF_N).toFixed(2)} points,\nbut ${REL_RARE}% of the quantity`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: -14,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
