/**
 * The p-value as an area: the null distribution of a difference in means, with
 * everything at least as extreme as the observed gap shaded.
 *
 * Deliberately the same setup as the simulation the lesson runs a few
 * paragraphs later (two groups of 50 with no real difference, an observed gap
 * of 0.45), so the reader meets the picture first and then reproduces it. Both
 * tails are shaded because the test is two-sided, which is exactly the detail
 * that gets lost when a p-value is described in words.
 *
 * The null curve is drawn in the muted role rather than the primary series:
 * it is the backdrop the claim is measured against, not the subject.
 */
import { Plot, plot, linspace, normalPdf, ACCENT, MUTED } from "./_theme.mjs";

export const title =
  "The null distribution of a difference in means, a bell curve centred on zero, with both tails beyond plus and minus the observed difference of 0.45 shaded to show the two-sided p-value.";

// Both shaded tails, by trapezoid over the density. Reported in the caption so
// the picture and the number a reader gets from scipy are visibly the same
// thing; a closed form would need an error function this file doesn't have.
function tailArea(from, sd) {
  const step = 0.0005;
  let area = 0;
  for (let x = from; x < from + 12 * sd; x += step) {
    area += ((normalPdf(x, 0, sd) + normalPdf(x + step, 0, sd)) / 2) * step;
  }
  return area;
}

export const caption =
  `The p-value is the shaded area (here ${(2 * tailArea(0.45, Math.sqrt(2 / 50))).toFixed(3)}), ` +
  "not the height of the curve at the observation. It answers one question: if there were no real " +
  "difference, how often would chance alone produce a gap at least this big?";

// Two groups of 50 drawn from the same unit-variance distribution, so the
// difference in means is normal with sd = √(1/50 + 1/50).
const NULL_SD = Math.sqrt(2 / 50);
const OBSERVED = 0.45;
const DOMAIN = [-0.75, 0.75];

const curve = linspace(DOMAIN[0], DOMAIN[1], 201).map((x) => ({
  x,
  y: normalPdf(x, 0, NULL_SD),
}));
const peak = normalPdf(0, 0, NULL_SD);

const tails = [
  curve.filter((d) => d.x >= OBSERVED),
  curve.filter((d) => d.x <= -OBSERVED),
];

export function render() {
  return plot({
    height: 340,
    marginTop: 34,
    marginLeft: 30,
    ariaLabel: title,
    x: {
      label: "Difference in group means, if the null is true",
      labelAnchor: "center",
      domain: DOMAIN,
    },
    y: { label: null, ticks: [], grid: false, domain: [0, peak * 1.18] },
    marks: [
      Plot.areaY(curve, { x: "x", y: "y", fill: MUTED, fillOpacity: 0.14 }),
      Plot.lineY(curve, { x: "x", y: "y", stroke: MUTED, strokeWidth: 1.75 }),
      ...tails.map((tail) =>
        Plot.areaY(tail, { x: "x", y: "y", fill: ACCENT, fillOpacity: 0.42 }),
      ),
      // The observed gap and its mirror image. The mirror is dashed to say
      // "this one wasn't measured, it's the other side of 'as extreme'".
      Plot.ruleX([OBSERVED], { y1: 0, y2: peak * 1.02, stroke: ACCENT, strokeWidth: 2 }),
      Plot.ruleX([-OBSERVED], {
        y1: 0,
        y2: peak * 1.02,
        stroke: ACCENT,
        strokeWidth: 2,
        strokeDasharray: "4,3",
      }),
      Plot.text([OBSERVED], {
        x: (d) => d,
        y: peak * 1.09,
        text: () => `observed  +${OBSERVED}`,
        fill: ACCENT,
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
      }),
      Plot.text([-OBSERVED], {
        x: (d) => d,
        y: peak * 1.09,
        text: () => `mirror  −${OBSERVED}`,
        fill: ACCENT,
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
