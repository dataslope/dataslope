/**
 * A centred rolling mean, and the half of its window that has not happened.
 *
 * `rolling(7, center=True)` is the right default for *description*. It removes
 * noise without shifting the curve sideways, so a peak in the smoothed series
 * lands where the peak in the raw series is, which is what you want when the
 * chart's job is to show a shape.
 *
 * It is a leak for anything predictive, and the reason is drawn: at the instant
 * marked, the centred window reaches three days into the future. Every value in
 * the smoothed series is partly made of data that had not arrived when that
 * timestamp occurred. Fit a model on it and the model learns from tomorrow;
 * backtest the model and the backtest agrees, because the leak is in the
 * feature rather than in the split.
 *
 * The trailing window is the honest version. Its value at any instant is made
 * only of that instant and the ones before it, so it is computable in
 * production at the moment it is dated. What it costs is a *lag*: the smoothed
 * curve turns after the raw one does, by roughly half the window, which is why
 * the trailing line sits visibly to the right of the centred line at every
 * turning point.
 *
 * That lag is not a defect to be corrected. It is the true cost of only knowing
 * the past, and any smoother that appears to avoid it has stopped being causal.
 *
 * The rule: `center=True` for a chart, `center=False` for a feature. And when a
 * notebook does both, put them in different columns with different names,
 * because the two series look almost identical and only one of them can be
 * computed on the day.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "The same daily series smoothed by a centred seven-day mean and a trailing seven-day mean, with the window at one instant drawn. The centred window's right half has not happened yet, and the trailing curve lags by about half a window.";

const N = 70;
const u = rng(4_733);
const SERIES = Array.from({ length: N }, (_, i) => ({
  i,
  v: 50 + 16 * Math.sin(i / 7.5) + 7 * Math.sin(i / 2.6) + (u() - 0.5) * 9,
}));

const W = 7;
const HALF = (W - 1) / 2;
const roll = (center) =>
  SERIES.map((d, i) => {
    const from = center ? i - HALF : i - (W - 1);
    const to = center ? i + HALF : i;
    if (from < 0) return null;
    const slice = SERIES.slice(from, to + 1);
    return { i, v: slice.reduce((s, x) => s + x.v, 0) / slice.length };
  }).filter(Boolean);

const CENTRED = roll(true);
const TRAILING = roll(false);
const AT = 44;

export const caption = `A centred rolling mean and a trailing one over the same series. At the marked instant the centred window reaches ${HALF} days into the future, so every value in that series is partly made of data that had not arrived at its own timestamp.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 46,
    marginRight: 118,
    marginBottom: 50,
    ariaLabel: title,
    x: { label: "Day", labelAnchor: "center", domain: [0, N - 1], ticks: [0, 20, 40, 60] },
    y: { label: "Value", domain: [20, 82], ticks: [20, 40, 60, 80] },
    marks: [
      // The two windows at one instant, drawn as bands.
      Plot.rect([{}], {
        x1: AT - HALF,
        x2: AT + HALF,
        y1: 20,
        y2: 82,
        fill: ACCENT,
        fillOpacity: 0.1,
      }),
      Plot.rect([{}], {
        x1: AT,
        x2: AT + HALF,
        y1: 20,
        y2: 82,
        fill: ACCENT,
        fillOpacity: 0.16,
      }),
      Plot.ruleX([AT], { stroke: GUIDE, strokeWidth: 1.4 }),

      Plot.line(SERIES, { x: "i", y: "v", stroke: MUTED, strokeOpacity: 0.5, strokeWidth: 1.2, clip: true }),
      Plot.line(CENTRED, { x: "i", y: "v", stroke: ACCENT, strokeWidth: 2.2, clip: true }),
      Plot.line(TRAILING, { x: "i", y: "v", stroke: PRIMARY, strokeWidth: 2.2, clip: true }),

      Plot.text([CENTRED.at(-1)], {
        x: "i",
        y: "v",
        text: () => "centred\n(uses the future)",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([TRAILING.at(-1)], {
        x: "i",
        y: "v",
        text: () => "trailing\n(past only)",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: 18,
        ...HALO,
      }),
      Plot.text([{}], {
        x: AT + HALF / 2,
        y: 80,
        text: () => `${HALF} days that\nhave not happened`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: AT,
        y: 22,
        text: () => "today",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
