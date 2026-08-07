/**
 * Why averaging models works, and the assumption it quietly rests on.
 *
 * The variance of an average of n models is σ²/n only when their errors are
 * independent. Real models trained on the same data are correlated, and the
 * variance floor is ρσ²: correlation, not count, sets how far averaging can
 * take you. The three curves are three correlations, and the flat sections are
 * the floors.
 *
 * This is the whole design argument for random forests. Bagging alone leaves
 * trees highly correlated, because they all pick the same strong splits;
 * sampling features at each split is there specifically to push ρ down, which
 * lowers the floor rather than adding more trees against it.
 *
 * The floors are computed from the correlations rather than drawn.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Variance of an averaged prediction against the number of models, for error correlations of zero, 0.3 and 0.6. Each curve falls and then flattens at a floor set by the correlation.";

const N = Array.from({ length: 40 }, (_, i) => i + 1);
const RHOS = [0, 0.3, 0.6];

const rows = RHOS.flatMap((rho, i) =>
  N.map((n) => ({
    key: `ρ = ${rho}`,
    color: SERIES[i % SERIES.length],
    rho,
    n,
    // Variance of the mean of n equicorrelated unit-variance errors.
    variance: rho + (1 - rho) / n,
  })),
);

const FLOORS = RHOS.map((rho, i) => ({
  key: `ρ = ${rho}`,
  color: SERIES[i % SERIES.length],
  rho,
}));

const CORRELATED = FLOORS.at(-1);

export const caption =
  `Averaging n models divides variance by n only if their errors are independent. At a correlation of ${CORRELATED.rho} the floor is ${CORRELATED.rho}, and the fortieth model buys essentially nothing the tenth did not. That is the argument for feature sampling in a random forest: it lowers the correlation, which lowers the floor. Adding trees against a high floor is buying compute rather than accuracy.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 100,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Models averaged", labelAnchor: "center", domain: [1, 40], ticks: 5 },
    y: { label: "Variance of the average", domain: [0, 1.05], ticks: 5 },
    marks: [
      Plot.ruleY(FLOORS.filter((f) => f.rho > 0), {
        y: "rho",
        stroke: "color",
        strokeOpacity: 0.4,
        strokeDasharray: "4,3",
      }),
      Plot.line(rows, { x: "n", y: "variance", stroke: "color", strokeWidth: 2 }),
      Plot.text(
        FLOORS.map((f) => ({ ...f, variance: f.rho + (1 - f.rho) / 40 })),
        {
          x: 40,
          y: "variance",
          text: (d) => `${d.key}, floor ${d.rho}`,
          fill: "color",
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 39,
        y: 1.0,
        text: () => "correlation sets the floor;\nthe model count only gets you to it",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
