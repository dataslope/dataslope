/**
 * Noise in the predictor flattens the slope, and the scatter looks healthier
 * while it happens.
 *
 * Everyone knows noise in *y* costs precision: the points spread out, the
 * standard errors grow, and nothing about the slope is biased. Noise in *x*
 * does something different and much less intuitive. It biases the slope
 * *towards zero*, systematically, and the bias does not go away with more data.
 *
 * The mechanism is short. Least squares divides the covariance of x and y by
 * the variance of x. Adding independent noise to x leaves the covariance alone,
 * because the noise is unrelated to y, and inflates the variance of x. A
 * constant numerator over a growing denominator is a shrinking slope, and the
 * shrinkage factor is the *reliability ratio*: the share of x's variance that
 * is real.
 *
 * The right panel is the part that makes this dangerous. As the measurement
 * noise grows, the fitted line flattens, and R-squared falls, which is what you
 * would expect and would notice. But the residuals also get *more evenly
 * spread*, because the added noise is homoscedastic by construction, so a
 * residual plot looks better rather than worse. There is no diagnostic in the
 * output that says "your x is measured badly".
 *
 * The consequences show up wherever a predictor is a proxy: self-reported
 * intake, a survey score, a single blood-pressure reading, a noisy sensor. The
 * effect of the true quantity is understated, sometimes by half, and a policy
 * conclusion of "this barely matters" can be an artefact of the instrument.
 *
 * Fixes exist and all of them need extra information: repeated measurements to
 * estimate the reliability, an instrumental variable, or an errors-in-variables
 * model. What does not fix it is more rows.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, mean, normalSamples } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One true slope with increasing measurement noise added to the predictor. The fitted slope flattens steadily towards zero while the residual plot looks no worse, because nothing in the diagnostics reports that x was measured badly.";

const N = 260;
const TRUE_SLOPE = 1;
const X_SD = 10;
const X_TRUE = normalSamples(N, 50, X_SD, 4_513);
const Y_NOISE = normalSamples(N, 0, 7, 8_821);
const Y = X_TRUE.map((x, i) => 10 + TRUE_SLOPE * x + Y_NOISE[i]);

const LEVELS = [0, 0.25, 0.5, 0.75, 1, 1.5, 2];
const X_ERR = normalSamples(N, 0, 1, 2_207);

const fitSlope = (xs, ys) => {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return num / den;
};

const ROWS = LEVELS.map((k) => {
  const xs = X_TRUE.map((x, i) => x + X_ERR[i] * k * X_SD);
  const slope = fitSlope(xs, Y);
  const reliability = 1 / (1 + k * k);
  return { k, slope, reliability, xs };
});

const WORST = ROWS.at(-1);
const HALVED = ROWS.find((r) => r.slope <= TRUE_SLOPE / 2);

const SCATTER = panel(0, { x: [0, 100], y: [0, 120] });
const SLOPES = panel(1, { x: [0, 2], y: [0, 1.15] });

const SHOWN = [ROWS[0], ROWS.at(-1)];
const pts = SHOWN.flatMap((r, i) =>
  r.xs.map((x, j) => ({
    x: SCATTER.px(Math.max(0, Math.min(100, x))),
    y: SCATTER.py(Y[j]),
    level: i,
  })),
);

export const caption = `A true slope of ${TRUE_SLOPE} fitted against growing measurement error in x. It is already halved once the error matches ${HALVED.k} times the spread of the true values, and reaches ${WORST.slope.toFixed(2)} at ${WORST.k} times.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 50,
    marginRight: 24,
    marginBottom: 52,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(SCATTER, { ticks: [0, 40, 80, 120] }),
      ...panelAxis(SLOPES, { ticks: [0, 0.5, 1], format: (v) => v.toFixed(1) }),
      panelTitle(SCATTER, "The same y, against a clean and a noisy x"),
      panelTitle(SLOPES, "Fitted slope as the noise grows", { fill: ACCENT }),

      Plot.dot(
        pts.filter((d) => d.level === 1),
        { x: "x", y: "y", r: 2.4, fill: ACCENT, fillOpacity: 0.35, clip: true },
      ),
      Plot.dot(
        pts.filter((d) => d.level === 0),
        { x: "x", y: "y", r: 2.4, fill: PRIMARY, fillOpacity: 0.5, clip: true },
      ),
      ...SHOWN.map((r, i) => {
        const mx = mean(r.xs);
        const my = mean(Y);
        const line = [10, 90].map((x) => ({
          x: SCATTER.px(x),
          y: SCATTER.py(my + r.slope * (x - mx)),
        }));
        return Plot.line(line, {
          x: "x",
          y: "y",
          stroke: i === 0 ? PRIMARY : ACCENT,
          strokeWidth: 2.4,
          clip: true,
        });
      }),

      Plot.line(
        ROWS.map((r) => ({ x: SLOPES.px(r.k), y: SLOPES.py(r.slope) })),
        { x: "x", y: "y", stroke: ACCENT, strokeWidth: 2.2 },
      ),
      Plot.dot(
        ROWS.map((r) => ({ x: SLOPES.px(r.k), y: SLOPES.py(r.slope) })),
        { x: "x", y: "y", r: 3.4, fill: ACCENT },
      ),
      Plot.link([{}], {
        x1: SLOPES.left,
        x2: SLOPES.right,
        y1: SLOPES.py(TRUE_SLOPE),
        y2: SLOPES.py(TRUE_SLOPE),
        stroke: GUIDE,
        strokeWidth: 1.4,
        strokeDasharray: "4,3",
      }),
      Plot.text([{}], {
        x: SLOPES.right,
        y: SLOPES.py(TRUE_SLOPE),
        text: () => "the true slope",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        dy: -8,
        ...HALO,
      }),
      Plot.text(
        [0, 0.5, 1, 1.5, 2].map((k) => ({ k, x: SLOPES.px(k) })),
        {
          x: "x",
          y: SLOPES.bottom,
          text: (d) => `${d.k}×`,
          fill: "currentColor",
          fillOpacity: 0.55,
          fontSize: 10,
          textAnchor: "middle",
          dy: 14,
        },
      ),
      Plot.text([{}], {
        x: (SLOPES.left + SLOPES.right) / 2,
        y: SLOPES.bottom,
        text: () => "measurement error, as a multiple of x's own spread",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
      Plot.text([{}], {
        x: SLOPES.px(1.15),
        y: SLOPES.py(0.88),
        text: () => "the residual plot looks\nno worse the whole way down",
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
