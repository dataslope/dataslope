/**
 * The fact that makes p-hacking work: when the null is true, p-values are
 * *uniform*. Every value between 0 and 1 is equally likely, so one run in
 * twenty clears 0.05 on luck alone.
 *
 * Simulated rather than asserted, because "uniform" is the claim a reader is
 * least likely to believe on being told. Twenty thousand runs of a two-sample
 * test between two groups drawn from the same distribution: the histogram is
 * flat, and the bins below 0.05 are exactly one twentieth of it.
 *
 * The consequence — the chance that at least one of k tests comes in
 * significant — is `multiple-comparisons`, a separate chart. It was originally
 * a second facet here, which does not work: Plot facets share every scale, so
 * a panel keyed on k = 1…20 squeezed this histogram's 0-to-1 axis into the
 * leftmost 5% of its panel. See the note on plot() in _theme.mjs.
 */
import { Plot, plot, linspace, mean, normalSamples, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A histogram of 20,000 p-values from a null world, flat across the whole range, with the bins below 0.05 highlighted and a reference line showing the level a uniform distribution predicts.";

export const caption =
  "Under the null, a p-value is a uniform random number: no value is more likely than any other. That is why a single small p-value, pulled from a search over many tests, is arithmetic rather than evidence.";

const RUNS = 20000;
const GROUP = 30;
const ALPHA = 0.05;

// A two-sample z-test between two groups drawn from the *same* distribution:
// 20,000 runs of a null world. One seeded stream feeds every group, so the
// figure is identical on every build (see rng() in _theme.mjs).
const draws = normalSamples(RUNS * GROUP * 2, 0, 1, 31337);

/** Φ via the same rational approximation used elsewhere in these specs. */
const phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
function Phi(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - phi(x) * d;
  return x >= 0 ? p : 1 - p;
}

const pValues = Array.from({ length: RUNS }, (_, i) => {
  const base = i * GROUP * 2;
  const g1 = draws.slice(base, base + GROUP);
  const g2 = draws.slice(base + GROUP, base + GROUP * 2);
  const z = (mean(g1) - mean(g2)) / Math.sqrt(2 / GROUP);
  return { p: 2 * (1 - Phi(Math.abs(z))) };
});

const BINS = 20;
const THRESHOLDS = linspace(0, 1, BINS + 1);
const SHARE = 1 / BINS;

export function render() {
  return plot({
    height: 330,
    marginTop: 30,
    marginLeft: 54,
    ariaLabel: title,
    x: { label: "p-value", labelAnchor: "center", domain: [0, 1], ticks: 6 },
    y: { label: "Share of runs", ticks: 5, tickFormat: "%", domain: [0, SHARE * 1.7] },
    marks: [
      Plot.rectY(
        pValues,
        Plot.binX(
          { y: "proportion" },
          {
            x: "p",
            thresholds: THRESHOLDS,
            fill: (d) => (d.p < ALPHA ? ACCENT : PRIMARY),
            fillOpacity: 0.4,
          },
        ),
      ),
      // What "uniform" predicts: every bin at exactly 1/20 of the runs.
      Plot.ruleY([SHARE], { stroke: MUTED, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([SHARE], {
        x: 0.98,
        y: (d) => d,
        text: () => "what uniform predicts: 5% per bin",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "end",
        // Clear of both the dashed rule it names and the bar tops, which sit
        // within a few tenths of a point of it all the way across.
        dy: -24,
        ...HALO,
      }),
      Plot.text([ALPHA], {
        x: (d) => d,
        y: SHARE,
        text: () => "p < 0.05\none run in twenty",
        fill: ACCENT,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.25,
        textAnchor: "start",
        dx: 14,
        dy: 34,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
