/**
 * What L1 and L2 actually do to coefficients as the penalty rises, which is
 * the difference between "shrinks everything" and "selects features".
 *
 * Both panels start from the same fitted coefficients and increase the penalty
 * left to right. Under L2 every coefficient shrinks smoothly toward zero and
 * none of them arrives: the model keeps all its features and trusts each of
 * them less. Under L1 coefficients hit exactly zero, one after another, and
 * stay there, which is why L1 is described as doing feature selection and L2
 * is not.
 *
 * The paths are the closed-form solutions for an orthonormal design, where L2
 * is a constant rescaling and L1 is soft thresholding. Real designs are not
 * orthonormal and the paths are not quite this clean, which the caption says;
 * the qualitative difference is the same and is the whole point.
 */
import { Plot, plot, linspace, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Coefficient paths against penalty strength under L2 and L1. Under L2 five coefficients shrink smoothly and none reaches zero; under L1 they hit zero one by one and stay there.";

export const caption =
  "Same starting coefficients, same penalty axis. L2 shrinks everything proportionally and keeps every feature; L1 drives coefficients to exactly zero, one at a time, which is feature selection rather than shrinkage. Drawn for an orthonormal design, where the paths are exact; real ones wobble and do the same thing.";

const BETAS = [3.2, 2.1, -1.4, 0.9, -0.35];
const LAMBDAS = linspace(0, 3.4, 160);

const rows = LAMBDAS.flatMap((lambda) =>
  BETAS.flatMap((b, i) => [
    {
      panel: "L2 (ridge): everything shrinks",
      key: `β${i + 1}`,
      color: SERIES[i % SERIES.length],
      lambda,
      value: b / (1 + lambda),
    },
    {
      panel: "L1 (lasso): coefficients hit zero",
      key: `β${i + 1}`,
      color: SERIES[i % SERIES.length],
      lambda,
      // Soft thresholding: shrink toward zero, and stop there.
      value: Math.sign(b) * Math.max(Math.abs(b) - lambda, 0),
    },
  ]),
);

/** Where each coefficient dies under L1, which is the fact worth marking. */
const DEATHS = BETAS.map((b, i) => ({
  panel: "L1 (lasso): coefficients hit zero",
  key: `β${i + 1}`,
  color: SERIES[i % SERIES.length],
  lambda: Math.abs(b),
})).filter((d) => d.lambda <= LAMBDAS.at(-1));

export function render() {
  return plot({
    height: 300,
    marginTop: 32,
    marginLeft: 56,
    marginBottom: 48,
    ariaLabel: title,
    fx: {
      label: null,
      domain: ["L2 (ridge): everything shrinks", "L1 (lasso): coefficients hit zero"],
    },
    x: { label: "Penalty strength", labelAnchor: "center", domain: [0, 3.4], ticks: 4 },
    y: { label: "Coefficient", domain: [-2, 3.6], ticks: 5 },
    marks: [
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
      Plot.line(rows, {
        x: "lambda",
        y: "value",
        z: "key",
        fx: "panel",
        stroke: "color",
        strokeWidth: 2,
      }),
      Plot.dot(DEATHS, { x: "lambda", y: 0, fx: "panel", fill: ACCENT, r: 3.5 }),
      Plot.text([{ panel: "L1 (lasso): coefficients hit zero" }], {
        x: 3.3,
        y: 3.3,
        fx: "panel",
        text: () => "each dot is a feature\nleaving the model",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.text([{ panel: "L2 (ridge): everything shrinks" }], {
        x: 3.3,
        y: 3.3,
        fx: "panel",
        text: () => "none of them ever\nreaches zero",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
