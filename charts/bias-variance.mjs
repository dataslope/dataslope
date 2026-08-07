/**
 * The bias-variance tradeoff: test error is a U, and the bottom of it is not
 * where training error is lowest.
 *
 * Drawn with the two components underneath the curve they sum to, because the
 * U on its own is a fact to memorise while the decomposition is the reason —
 * bias falls as the model gets flexible enough to fit the signal, variance
 * rises as it gets flexible enough to fit the noise, and total error turns
 * around where the second overtakes the first.
 *
 * Training error is drawn too, falling monotonically, because that divergence
 * is what overfitting looks like on a plot and what a reader will actually see
 * in their own logs.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Model complexity on the horizontal axis against error. Bias squared falls, variance rises, their sum is a U-shaped test error curve with a marked minimum, and training error falls steadily below it.";

export const caption =
  "Total error is bias plus variance, so the best model is not the one that fits the training data best. Past the marked minimum the model is learning the noise, and the two error curves come apart.";

const XS = linspace(0.2, 10, 200);

const bias2 = (c) => 9 / (1 + 1.6 * c);
const variance = (c) => 0.14 * c * c * 0.55;
const total = (c) => bias2(c) + variance(c) + 0.4;
const training = (c) => 8.4 / (1 + 2.2 * c) + 0.15;

const SERIESES = [
  { key: "Bias²", f: bias2, color: SERIES[3], dash: "4,3" },
  { key: "Variance", f: variance, color: SERIES[1], dash: "4,3" },
  { key: "Test error", f: total, color: ACCENT, dash: null },
  { key: "Training error", f: training, color: SERIES[0], dash: null },
];

const curves = SERIESES.flatMap((s) => XS.map((x) => ({ key: s.key, x, y: s.f(x) })));
const COLOR = Object.fromEntries(SERIESES.map((s) => [s.key, s.color]));
const DASH = Object.fromEntries(SERIESES.map((s) => [s.key, s.dash]));

// The bottom of the U, found on the same grid the curve is drawn from so the
// mark cannot sit anywhere but on it.
const best = XS.reduce((a, b) => (total(b) < total(a) ? b : a));

const LABELS = [
  { key: "Test error", at: 8.6 },
  { key: "Training error", at: 8.6 },
  { key: "Bias²", at: 1.5 },
  { key: "Variance", at: 8.6 },
].map((l) => ({ ...l, y: SERIESES.find((s) => s.key === l.key).f(l.at), color: COLOR[l.key] }));

export function render() {
  return plot({
    height: 350,
    marginTop: 30,
    marginLeft: 34,
    marginRight: 30,
    ariaLabel: title,
    x: { label: "Model complexity", labelAnchor: "center", domain: [0.2, 10], ticks: [] },
    y: { label: "Error", ticks: [], grid: false, domain: [0, 10.5] },
    marks: [
      Plot.lineY(curves, {
        x: "x",
        y: "y",
        z: "key",
        stroke: (d) => COLOR[d.key],
        strokeWidth: (d) => (DASH[d.key] ? 1.75 : 2),
        strokeDasharray: (d) => DASH[d.key],
        clip: true,
      }),

      // The sweet spot.
      Plot.ruleX([best], {
        y1: 0,
        y2: total(best),
        stroke: GUIDE,
        strokeWidth: 1,
        strokeDasharray: "3,3",
      }),
      Plot.dot([best], { x: (d) => d, y: (d) => total(d), r: 4, fill: ACCENT, stroke: null }),
      Plot.text([best], {
        x: (d) => d,
        y: (d) => total(d),
        text: () => "best generalisation",
        fill: ACCENT,
        fontSize: 12,
        fontWeight: 600,
        dy: -16,
        ...HALO,
      }),

      Plot.text([{ x: 0.5 }, { x: 9.6 }], {
        x: "x",
        y: 10.1,
        text: (d) => (d.x < 5 ? "underfitting" : "overfitting"),
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: (d) => (d.x < 5 ? "start" : "end"),
        ...HALO,
      }),

      Plot.text(LABELS, {
        x: "at",
        y: "y",
        text: "key",
        fill: (d) => d.color,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -12,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
