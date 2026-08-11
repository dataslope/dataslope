/**
 * Two residual plots, one fit that is fine and one that is fine in a way that
 * makes every interval it produces wrong.
 *
 * A residual plot answers one question: is there structure left over? The left
 * panel says no. The residuals are a horizontal band of constant width around
 * zero, which is what "the model has extracted everything it can" looks like.
 *
 * The right panel is the fan. The residuals still average zero at every fitted
 * value, so the *coefficients* are unbiased and the line is in the right place.
 * What has failed is the constant-variance assumption, and everything that
 * depends on it fails with it: the standard errors, the confidence intervals,
 * the p-values and the prediction intervals are all computed from a single
 * pooled estimate of the residual variance, and there is no single residual
 * variance here. The intervals are too wide at the left of the range and too
 * narrow at the right, and the second half of that sentence is the dangerous
 * one, because that is where the model is most confident and least entitled to
 * be.
 *
 * Three responses, in increasing order of how much they change:
 *
 *   • **robust standard errors** keep the same fit and recompute the
 *     uncertainty without assuming constant variance. Cheapest, and usually
 *     enough;
 *   • **transform the response**, typically to logs, when the spread grows
 *     proportionally to the level, which is the case here and is extremely
 *     common for money, counts and durations;
 *   • **model the variance**, with weighted least squares or a generalised
 *     linear model whose variance function matches the data.
 *
 * The thing not to do is nothing, and the thing that makes doing nothing
 * tempting is that the R-squared is unaffected and the fit looks healthy.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, normalSamples, rng } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Two residual plots from two fits. One is a horizontal band of constant width, which is what a healthy fit looks like; the other fans out with the fitted value, so the coefficients are still unbiased and every interval computed from them is wrong.";

const N = 220;
const u = rng(5_903);
const Z1 = normalSamples(N, 0, 1, 3_301);
const Z2 = normalSamples(N, 0, 1, 8_807);

const FITTED = Array.from({ length: N }, () => 10 + u() * 80);
const EVEN = FITTED.map((f, i) => ({ f, r: Z1[i] * 6 }));
const FANNED = FITTED.map((f, i) => ({ f, r: Z2[i] * (0.9 + f * 0.14) }));

/** Residual spread in the first and last fifth of the fitted range, so the
 *  fan can be quoted as a ratio rather than described. */
const spreadIn = (rows, lo, hi) => {
  const slice = rows.filter((d) => d.f >= lo && d.f <= hi).map((d) => d.r);
  const m = slice.reduce((s, v) => s + v, 0) / slice.length;
  return Math.sqrt(slice.reduce((s, v) => s + (v - m) ** 2, 0) / (slice.length - 1));
};
const FAN_LOW = spreadIn(FANNED, 10, 26);
const FAN_HIGH = spreadIn(FANNED, 74, 90);
const FAN_RATIO = (FAN_HIGH / FAN_LOW).toFixed(1);
const EVEN_RATIO = (spreadIn(EVEN, 74, 90) / spreadIn(EVEN, 10, 26)).toFixed(1);

const YD = [-16, 16];
const OK = panel(0, { x: [6, 94], y: YD });
const FAN = panel(1, { x: [6, 94], y: YD });

const pts = (p, rows) => rows.map((d) => ({ ...d, x: p.px(d.f), y: p.py(Math.max(YD[0], Math.min(YD[1], d.r))) }));

export const caption = `Two residual plots. On the left the spread at the top of the fitted range is ${EVEN_RATIO} times the spread at the bottom, which is to say the same; on the right it is ${FAN_RATIO} times.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 46,
    marginRight: 20,
    marginBottom: 50,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(OK, { ticks: [-15, 0, 15] }),
      ...panelAxis(FAN, { ticks: [-15, 0, 15] }),
      panelTitle(OK, "Constant variance", { fill: PRIMARY }),
      panelTitle(FAN, "The fan", { fill: ACCENT }),

      ...[OK, FAN].map((p) =>
        Plot.link([{}], {
          x1: p.left,
          x2: p.right,
          y1: p.py(0),
          y2: p.py(0),
          stroke: GUIDE,
          strokeWidth: 1.4,
        }),
      ),
      Plot.dot(pts(OK, EVEN), { x: "x", y: "y", r: 2.6, fill: PRIMARY, fillOpacity: 0.5 }),
      Plot.dot(pts(FAN, FANNED), { x: "x", y: "y", r: 2.6, fill: ACCENT, fillOpacity: 0.5 }),

      // The envelope, so "fans out" is a drawn claim rather than an impression.
      ...[1, -1].map((sign) =>
        Plot.line(
          Array.from({ length: 40 }, (_, i) => {
            const f = 6 + (88 * i) / 39;
            return { x: FAN.px(f), y: FAN.py(sign * 2 * (0.9 + f * 0.14)) };
          }),
          { x: "x", y: "y", stroke: ACCENT, strokeWidth: 1.2, strokeDasharray: "4,3", clip: true },
        ),
      ),
      ...[OK, FAN].map((p, k) =>
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: p.bottom,
          text: () => "fitted value",
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 20,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: OK.px(50),
        y: OK.py(14),
        text: () => `same width end to end (${EVEN_RATIO}×)`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: FAN.px(38),
        y: FAN.py(14),
        text: () => `${FAN_RATIO}× wider at the right`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: FAN.px(84),
        y: FAN.py(-13),
        text: () => "the intervals are too\nnarrow out here",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
