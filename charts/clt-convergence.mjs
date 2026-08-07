/**
 * The central limit theorem, watched happening: the sampling distribution of
 * the mean drawn from a heavily right-skewed exponential population at n = 1,
 * n = 5 and n = 30.
 *
 * The sample means are **standardized** — each facet plots (x̄ − μ) / (σ/√n)
 * rather than x̄ itself. That is the one choice that makes this figure work.
 * On raw units the three facets must share an x-axis, so the n = 30
 * distribution (six times narrower) collapses into a spike beside n = 1 and the
 * shape convergence, which is the thing the lesson is actually about, becomes
 * unreadable. Standardizing divides out the σ/√n contraction and leaves shape
 * as the only variable. The contraction itself belongs to *Standard Error*.
 *
 * The standard normal is drawn over each histogram, so the claim is visibly
 * checkable rather than asserted: at n = 1 the bars ignore it completely, by
 * n = 30 they sit on it.
 */
import { Plot, plot, linspace, mean, normalPdf, rng, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Three histograms of standardized sample means drawn from a right-skewed exponential population at sample sizes 1, 5 and 30, each with the standard normal curve drawn over it. The histograms straighten from strongly skewed at n = 1 to matching the bell curve at n = 30.";

export const caption =
  "Sample means from a heavily skewed population, standardized so only shape varies. By n = 30 the histogram has settled onto the bell curve. Its raw spread is also six times narrower than at n = 1: that is the σ/√n half of the theorem.";

const SAMPLE_SIZES = [1, 5, 30];
const REPLICATES = 6000;
// Exponential population with rate 1: mean 1, sd 1, and about as un-normal as
// a distribution gets.
const POP_MEAN = 1;
const POP_SD = 1;

const DOMAIN = [-3, 4.6];
// Fixed-width bins declared explicitly (rather than a `thresholds` count) so
// every facet is binned identically and the panels are comparable, and so the
// predicted density below can be scaled into the histogram's units. They run
// past the visible domain to catch the n = 1 facet's long tail; the x scale
// clips the display.
const BIN_WIDTH = 0.2;
const THRESHOLDS = linspace(-4, 12, 81);

const facetOf = (n) => `n = ${n}`;
const FACETS = SAMPLE_SIZES.map(facetOf);

// One seeded stream for the whole chart, so the figure is byte-identical on
// every build (see the note on rng() in _theme.mjs).
const next = rng(20260807);
const exponential = () => -Math.log(1 - next());

const samples = SAMPLE_SIZES.flatMap((n) => {
  const se = POP_SD / Math.sqrt(n);
  return Array.from({ length: REPLICATES }, () => ({
    facet: facetOf(n),
    z: (mean(Array.from({ length: n }, exponential)) - POP_MEAN) / se,
  }));
});

// The standard normal, in the histogram's units (share of samples per bin)
// rather than density units. Repeated per facet so it draws in all three.
const normal = FACETS.flatMap((facet) =>
  linspace(DOMAIN[0], DOMAIN[1], 121).map((x) => ({
    facet,
    x,
    y: normalPdf(x) * BIN_WIDTH,
  })),
);

export function render() {
  return plot({
    height: 272,
    marginTop: 34,
    marginLeft: 50,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: FACETS },
    x: {
      label: "Standard errors from the population mean",
      labelAnchor: "center",
      domain: DOMAIN,
      ticks: 4,
    },
    y: { label: "Share of samples", ticks: 4, tickFormat: "%" },
    marks: [
      Plot.rectY(
        samples,
        Plot.binX(
          { y: "proportion-facet" },
          {
            x: "z",
            fx: "facet",
            thresholds: THRESHOLDS,
            fill: PRIMARY,
            fillOpacity: 0.32,
            clip: true,
          },
        ),
      ),
      Plot.lineY(normal, {
        x: "x",
        y: "y",
        fx: "facet",
        stroke: MUTED,
        strokeWidth: 1.75,
        clip: true,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
