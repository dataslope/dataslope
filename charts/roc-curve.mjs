/**
 * Three ROC curves and the diagonal, so "AUC = 0.5 is worthless and 1.0 is
 * perfect" becomes a shape rather than a pair of numbers to memorise.
 *
 * A reader who has only seen one ROC curve cannot tell a good one from a
 * mediocre one, because every ROC curve bows the same way. Three at once, with
 * the no-skill diagonal underneath, gives the scale: the difference between
 * AUC 0.97 and AUC 0.80 is the difference between a curve that hugs the
 * corner and one that is only halfway there.
 *
 * The curves are binormal, the standard parametric ROC: TPR = Φ(Φ⁻¹(FPR) + d)
 * with d = √2·Φ⁻¹(AUC), so each curve's area is exactly the number on its
 * label rather than approximately it.
 */
import { Plot, plot, linspace, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Three ROC curves plotted from the bottom-left to the top-right corner, over a diagonal reference line. The strongest bows tightly into the top-left corner, the middling one bows about halfway, and the third lies on the diagonal.";

export const caption =
  "The same axes, three models. The diagonal is a coin flip, and the area between a curve and that diagonal is what AUC measures. A curve is only meaningful next to the diagonal and next to other curves.";

/** Φ, Zelen & Severo's approximation. */
function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - (Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)) * d;
  return x >= 0 ? p : 1 - p;
}

/** Φ⁻¹, bisection on Φ. Called a few hundred times at build time, so the
 *  simplest correct method is the right one. */
function probit(p) {
  let lo = -8;
  let hi = 8;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const MODELS = [
  { auc: 0.97, label: "a strong model", color: SERIES[0] },
  { auc: 0.8, label: "a middling one", color: SERIES[1] },
  { auc: 0.5, label: "no better than a coin", color: MUTED },
];

const FPRS = linspace(0.0005, 0.9995, 200);

const curves = MODELS.flatMap((m) => {
  const d = Math.SQRT2 * probit(m.auc);
  return [
    { label: m.label, color: m.color, fpr: 0, tpr: 0 },
    ...FPRS.map((fpr) => ({
      label: m.label,
      color: m.color,
      fpr,
      tpr: normalCdf(probit(fpr) + d),
    })),
    { label: m.label, color: m.color, fpr: 1, tpr: 1 },
  ];
});

// Labelled where each curve is furthest from the diagonal, which is both the
// clearest gap and the point the label is about.
const LABELS = MODELS.map((m) => {
  const own = curves.filter((c) => c.label === m.label);
  const best = own.reduce((a, b) => (b.tpr - b.fpr > a.tpr - a.fpr ? b : a));
  return { ...m, fpr: m.auc === 0.5 ? 0.62 : best.fpr, tpr: m.auc === 0.5 ? 0.62 : best.tpr };
});

export function render() {
  return plot({
    height: 380,
    marginTop: 26,
    marginLeft: 58,
    marginRight: 26,
    ariaLabel: title,
    x: {
      label: "False positive rate",
      labelAnchor: "center",
      domain: [0, 1],
      ticks: 5,
      tickFormat: "%",
    },
    y: { label: "True positive rate", domain: [0, 1], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.link([{}], {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
        stroke: MUTED,
        strokeWidth: 1.5,
        strokeDasharray: "4,3",
      }),
      Plot.lineY(curves, {
        x: "fpr",
        y: "tpr",
        z: "label",
        stroke: (d) => d.color,
        strokeWidth: 2,
        clip: true,
      }),
      Plot.text(LABELS, {
        x: "fpr",
        y: "tpr",
        text: (d) => `${d.label}\nAUC ${d.auc.toFixed(2)}`,
        fill: (d) => d.color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 12,
        dy: 10,
        ...HALO,
      }),
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
    ],
  });
}
