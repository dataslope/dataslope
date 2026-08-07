/**
 * The Poisson distribution across three rates, which is how you recognise it
 * in the wild.
 *
 * At a small λ it is a sharp spike at zero with a long right tail: most
 * intervals see nothing, occasionally one sees several. As λ grows it becomes
 * symmetric and, past about ten, close enough to a normal curve that people
 * stop bothering with the distinction. That progression is the whole practical
 * content of "counts are Poisson".
 *
 * Its defining property is drawn rather than stated: variance equals the mean,
 * so the spread widens as the square root of λ, which is why a busier queue is
 * absolutely more variable and relatively less so.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Poisson probability mass at rates of 0.8, 4 and 12, drawn as three panels: a spike at zero with a long tail, a visibly skewed hump, and a nearly symmetric bell.";

export const caption =
  "One distribution, three rates. Counts of rare events pile up at zero; as the rate rises the shape becomes symmetric and by about ten it is hard to tell from a normal curve. The spread grows as the square root of the mean, which is the Poisson's signature: variance equals mean.";

const RATES = [0.8, 4, 12];
const MAX_K = 24;

/** P(X = k) computed in log space: 12^24 and 24! both overflow the useful
 *  range of a double long before they cancel. */
function pmf(k, lambda) {
  let logFactorial = 0;
  for (let i = 2; i <= k; i++) logFactorial += Math.log(i);
  return Math.exp(-lambda + k * Math.log(lambda) - logFactorial);
}

const rows = RATES.flatMap((lambda) =>
  Array.from({ length: MAX_K + 1 }, (_, k) => ({
    panel: `λ = ${lambda}`,
    lambda,
    k,
    p: pmf(k, lambda),
  })),
);

export function render() {
  return plot({
    height: 290,
    marginTop: 32,
    marginLeft: 52,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: RATES.map((l) => `λ = ${l}`) },
    x: { label: "Count in one interval", labelAnchor: "center", domain: [-0.5, MAX_K], ticks: 4 },
    y: { label: "Probability", domain: [0, 0.5], ticks: 5 },
    marks: [
      // rectY, not barY: `barY` wants a band scale for x, and x here is a
      // count on a linear axis, so barY silently draws nothing at all.
      Plot.rectY(rows, {
        x1: (d) => d.k - 0.45,
        x2: (d) => d.k + 0.45,
        y: "p",
        fx: "panel",
        fill: PRIMARY,
        fillOpacity: 0.5,
      }),
      // The mean, which is also the variance: the two coincide by definition.
      Plot.ruleX(
        RATES.map((l) => ({ panel: `λ = ${l}`, lambda: l })),
        { x: "lambda", fx: "panel", stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" },
      ),
      Plot.text(
        RATES.map((l) => ({ panel: `λ = ${l}`, lambda: l })),
        {
          x: "lambda",
          y: 0.47,
          fx: "panel",
          text: (d) => `mean ${d.lambda}\nsd ${Math.sqrt(d.lambda).toFixed(1)}`,
          fill: ACCENT,
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 6,
          ...HALO,
        },
      ),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
