/**
 * Where a sampling distribution comes from, in one figure: a skewed
 * population on the left, and the distribution of *its sample means* on the
 * right, at the same scale.
 *
 * The two panels share axes deliberately. Drawn separately, a reader takes the
 * bell on the right to be a rescaled version of the population; side by side
 * on one x-axis, the sampling distribution is visibly narrower *and* centred
 * on the same place, which is the whole distinction the lesson turns on. The
 * population's own mean is marked in both, so "unbiased" is something you can
 * see rather than something you are told.
 */
import { Plot, plot, linspace, mean, rng, ACCENT, GUIDE, HALO, PRIMARY } from "./_theme.mjs";

export const title =
  "Two histograms on a shared axis. The left shows a right-skewed population spread from zero to about eight; the right shows the distribution of means from samples of thirty, a narrow symmetric peak sitting over the same centre.";

export const caption =
  "One population, and the distribution of its sample means at n = 30. Same centre, far narrower, and symmetric even though the population is not: that gap is what every confidence interval and t-test is built on.";

const POP_N = 20000;
const SAMPLE_N = 30;
const REPLICATES = 6000;
const DOMAIN = [0, 8];
const BINS = linspace(DOMAIN[0], DOMAIN[1], 61);

// Exponential population, mean 2. Seeded, so the figure never churns.
const next = rng(555);
const draw = () => -2 * Math.log(1 - next());
const population = Array.from({ length: POP_N }, draw);
const POP_MEAN = mean(population);

const sampleMeans = Array.from({ length: REPLICATES }, () =>
  mean(Array.from({ length: SAMPLE_N }, draw)),
);

const rows = [
  ...population.map((v) => ({ panel: "The population", v })),
  ...sampleMeans.map((v) => ({ panel: `Means of samples of ${SAMPLE_N}`, v })),
];

export function render() {
  return plot({
    height: 300,
    marginTop: 32,
    marginLeft: 52,
    marginBottom: 44,
    ariaLabel: title,
    fx: { label: null, domain: ["The population", `Means of samples of ${SAMPLE_N}`] },
    x: { label: "Value", labelAnchor: "center", domain: DOMAIN, ticks: 5 },
    // Fixed, because the μ labels are positioned against it and an auto domain
    // would move under them the moment the seed or the bin count changes.
    y: { label: "Share of the data", domain: [0, 0.19], ticks: 4, tickFormat: "%" },
    marks: [
      Plot.rectY(
        rows,
        Plot.binX(
          { y: "proportion-facet" },
          {
            x: "v",
            fx: "panel",
            thresholds: BINS,
            fill: (d) => (d.panel === "The population" ? PRIMARY : ACCENT),
            fillOpacity: 0.42,
            clip: true,
          },
        ),
      ),
      Plot.ruleX([POP_MEAN], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text(
        [
          { panel: "The population", x: POP_MEAN },
          { panel: `Means of samples of ${SAMPLE_N}`, x: POP_MEAN },
        ],
        {
          x: "x",
          y: 0.168,
          fx: "panel",
          text: () => `μ = ${POP_MEAN.toFixed(2)}`,
          fill: GUIDE,
          fontSize: 12,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.ruleY([0], { fx: "panel", stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
