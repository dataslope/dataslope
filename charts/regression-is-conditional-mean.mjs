/**
 * What a regression line is actually estimating, drawn slice by slice.
 *
 * "The line of best fit" is a description of the algorithm, not of the answer,
 * and it leaves people thinking the line is a summary of the *cloud*. It is
 * not. It is an estimate of the **conditional mean**: for each value of x, the
 * average y among points with that x.
 *
 * The vertical slices make it literal. Each band holds the points in a narrow
 * range of x, the marker is the mean of that band, and the fitted line runs
 * through the markers. That is the whole content of the model.
 *
 * Three things follow immediately, and each one is a mistake people make:
 *
 *   • the line is a statement about *averages*, so it never claimed to predict
 *     an individual well. A model can have a perfect line and enormous
 *     prediction error, and the two facts are not in tension;
 *   • the vertical spread inside a slice is what the residual standard
 *     deviation measures, and it is what a prediction interval is made of. The
 *     confidence interval on the line is about where the *markers* are, which
 *     is a much narrower thing;
 *   • fitting minimises *vertical* distances, so x and y are not symmetric.
 *     Regressing y on x and x on y give two different lines, and neither is
 *     "the relationship".
 *
 * It also explains what happens with a curve. If the true conditional means
 * fall on a bend, a straight line cannot pass through the markers, and the
 * residual plot will show it as structure rather than noise, which is exactly
 * what a residual plot is for.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, mean, normalSamples, rng } from "./_theme.mjs";

export const title =
  "A scatter cut into vertical slices, with the mean of each slice marked and the fitted line passing through the marks. A regression line estimates the conditional mean of y given x, not a summary of the cloud.";

const N = 320;
const u = rng(4_231);
const NOISE = normalSamples(N, 0, 9, 6_607);
const SLOPE = 0.62;
const INTERCEPT = 18;

const POINTS = Array.from({ length: N }, (_, i) => {
  const x = 6 + u() * 84;
  return { x, y: INTERCEPT + SLOPE * x + NOISE[i] };
});

const EDGES = [6, 20, 34, 48, 62, 76, 90];
const SLICES = EDGES.slice(1).map((hi, i) => {
  const lo = EDGES[i];
  const inside = POINTS.filter((d) => d.x >= lo && d.x < hi);
  return { lo, hi, mid: (lo + hi) / 2, n: inside.length, my: mean(inside.map((d) => d.y)) };
});

/** Ordinary least squares, computed rather than assumed, so the line really is
 *  the one that goes through the marks. */
const FIT = (() => {
  const mx = mean(POINTS.map((d) => d.x));
  const my = mean(POINTS.map((d) => d.y));
  let num = 0;
  let den = 0;
  for (const d of POINTS) {
    num += (d.x - mx) * (d.y - my);
    den += (d.x - mx) ** 2;
  }
  const b = num / den;
  return { b, a: my - b * mx };
})();
const at = (x) => FIT.a + FIT.b * x;

const residualSd = Math.sqrt(
  POINTS.reduce((s, d) => s + (d.y - at(d.x)) ** 2, 0) / (POINTS.length - 2),
);

export const caption = `Each band holds the points in a narrow range of x, and the marker is that band's mean. The fitted line runs through the markers, which is the whole content of the model, and the residual standard deviation around it is ${residualSd.toFixed(1)}.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 52,
    marginRight: 26,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "x", labelAnchor: "center", domain: [4, 92], ticks: [20, 40, 60, 80] },
    y: { label: "y", domain: [0, 100], ticks: [0, 25, 50, 75, 100] },
    marks: [
      // The slices, alternating so the boundaries are visible without rules.
      Plot.rect(
        SLICES.filter((_, i) => i % 2 === 0),
        { x1: "lo", x2: "hi", y1: 0, y2: 100, fill: MUTED, fillOpacity: 0.07 },
      ),
      Plot.dot(POINTS, { x: "x", y: "y", r: 2.4, fill: MUTED, fillOpacity: 0.45, clip: true }),
      Plot.link(SLICES, {
        x1: "lo",
        x2: "hi",
        y1: "my",
        y2: "my",
        stroke: ACCENT,
        strokeWidth: 2.6,
      }),
      Plot.dot(SLICES, { x: "mid", y: "my", r: 4.4, fill: ACCENT }),
      Plot.line(
        [6, 90].map((x) => ({ x, y: at(x) })),
        { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.2, clip: true },
      ),
      Plot.text([{ x: 90, y: at(90) }], {
        x: "x",
        y: "y",
        text: () => "the fitted line",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "end",
        dy: -12,
        ...HALO,
      }),
      Plot.text([SLICES[1]], {
        x: "mid",
        y: "my",
        text: () => "the mean of\nthis slice",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -22,
        ...HALO,
      }),
      Plot.link([{}], {
        x1: SLICES[4].mid,
        x2: SLICES[4].mid,
        y1: SLICES[4].my - 2 * residualSd,
        y2: SLICES[4].my + 2 * residualSd,
        stroke: GUIDE,
        strokeWidth: 1.6,
      }),
      Plot.text([{ x: SLICES[4].mid, y: SLICES[4].my + 2 * residualSd }], {
        x: "x",
        y: "y",
        text: () => `the spread inside a slice\nis the prediction error (${residualSd.toFixed(1)})`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
    ],
  });
}
