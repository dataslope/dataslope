/**
 * What the binomial's two parameters do to its shape: n sets how many trials
 * there are to count, p slides and skews the result.
 *
 * Three panels on shared axes, which is the case faceting is for: all three
 * plot a probability against a count of successes, so the panels are directly
 * comparable. The middle and right panels have the same n and differ only in
 * p, which is what shows that a binomial is symmetric at p = 0.5 and skewed
 * away from whichever end p sits near.
 */
import { Plot, plot, HALO, PRIMARY } from "./_theme.mjs";

export const title =
  "Three binomial probability mass functions as bar charts: ten trials at p = 0.5 (symmetric), thirty trials at p = 0.5 (symmetric and narrower relative to its range), and thirty trials at p = 0.15 (piled up near zero with a tail to the right).";

export const caption =
  "n sets how many trials there are to count; p sets where the mass piles up. At p = 0.5 the distribution is symmetric, and it skews as p moves toward either end.";

/** log n! via Lanczos-free Stirling with a correction, accurate enough for the
 *  small n here and dependency-free. */
function logFactorial(n) {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}

const binomPmf = (k, n, p) =>
  Math.exp(
    logFactorial(n) - logFactorial(k) - logFactorial(n - k) +
      k * Math.log(p) + (n - k) * Math.log(1 - p),
  );

const PANELS = [
  { key: "n = 10, p = 0.5", n: 10, p: 0.5 },
  { key: "n = 30, p = 0.5", n: 30, p: 0.5 },
  { key: "n = 30, p = 0.15", n: 30, p: 0.15 },
];

const bars = PANELS.flatMap(({ key, n, p }) =>
  Array.from({ length: 31 }, (_, k) => ({
    panel: key,
    k,
    prob: k <= n ? binomPmf(k, n, p) : 0,
  })).filter((d) => d.prob > 1e-4),
);

export function render() {
  return plot({
    height: 280,
    marginTop: 32,
    marginLeft: 50,
    marginBottom: 44,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: "Successes", labelAnchor: "center", domain: [-0.5, 30.5], ticks: 4 },
    y: { label: "Probability", ticks: 4 },
    marks: [
      Plot.rectY(bars, {
        x1: (d) => d.k - 0.45,
        x2: (d) => d.k + 0.45,
        y: "prob",
        fx: "panel",
        fill: PRIMARY,
        fillOpacity: 0.55,
      }),
      Plot.ruleY([0], { fx: "panel", stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
