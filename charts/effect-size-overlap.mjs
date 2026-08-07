/**
 * What Cohen's d actually describes: how much two groups overlap.
 *
 * Three panels, each two distributions one standard deviation apart by a
 * different multiple. The conventional labels (small, medium, large) are
 * arbitrary and the lesson says so; what is not arbitrary is the picture, and
 * at d = 0.2 the two groups are so nearly the same distribution that a
 * "statistically significant" result there is a statement about sample size
 * rather than about the world.
 */
import { Plot, plot, linspace, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Three panels each showing two overlapping bell curves separated by Cohen's d of 0.2, 0.5 and 0.8. At 0.2 the curves are nearly on top of each other; at 0.8 they are clearly apart but still overlap substantially.";

export const caption =
  "Cohen's d in units of overlap. Even a \"large\" effect of 0.8 leaves the two groups sharing most of their range, which is why an effect size and a p-value answer different questions.";

const DOMAIN = [-3.6, 5.4];
const XS = linspace(DOMAIN[0], DOMAIN[1], 181);
const pdf = (x, m) => Math.exp(-0.5 * (x - m) ** 2) / Math.sqrt(2 * Math.PI);

const PANELS = [
  { key: "d = 0.2  (small)", d: 0.2 },
  { key: "d = 0.5  (medium)", d: 0.5 },
  { key: "d = 0.8  (large)", d: 0.8 },
];

// One dataset per group rather than one for both. An areaY carrying `fx` *and*
// a composite `z` closes its path across the facet boundary, so each group gets
// its own mark and `z` does nothing but separate the three panels.
const curvesFor = (mean) =>
  PANELS.flatMap(({ key, d }) => XS.map((x) => ({ panel: key, x, y: pdf(x, mean(d)) })));

const GROUP_A = curvesFor(() => 0);
const GROUP_B = curvesFor((d) => d);

export function render() {
  return plot({
    height: 280,
    marginTop: 30,
    marginLeft: 30,
    marginBottom: 42,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: "Standard deviations", labelAnchor: "center", domain: DOMAIN, ticks: 4 },
    y: { label: null, ticks: [], grid: false, domain: [0, 0.46] },
    marks: [
      ...[
        [GROUP_A, SERIES[0]],
        [GROUP_B, SERIES[1]],
      ].flatMap(([data, color]) => [
        Plot.areaY(data, {
          x: "x",
          y: "y",
          z: "panel",
          fx: "panel",
          fill: color,
          fillOpacity: 0.2,
          clip: true,
        }),
        Plot.lineY(data, {
          x: "x",
          y: "y",
          z: "panel",
          fx: "panel",
          stroke: color,
          strokeWidth: 1.75,
          clip: true,
        }),
      ]),
      Plot.text(
        PANELS.map((p) => ({ panel: p.key, d: p.d })),
        {
          x: DOMAIN[0] + 0.2,
          y: 0.43,
          fx: "panel",
          text: (d) => `${Math.round((1 - 2 * (1 - normalCdf(d.d / 2))) * 100)}% non-overlap`,
          fill: MUTED,
          fontSize: 11.5,
          fontWeight: 600,
          textAnchor: "start",
          ...HALO,
        },
      ),
      Plot.ruleY([0], { fx: "panel", stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}

/** Φ, for the non-overlap percentage printed in each panel. */
function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - (Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)) * d;
  return x >= 0 ? p : 1 - p;
}
