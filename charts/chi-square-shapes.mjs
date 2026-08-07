/**
 * The chi-square distribution across degrees of freedom, which is what makes
 * a chi-square statistic readable.
 *
 * At one degree of freedom it is a cliff at zero. As df rises the mass moves
 * right, the peak appears near df - 2, and the shape drifts toward normal. The
 * mean is exactly df, which is the fact worth carrying: a statistic near its
 * degrees of freedom is unremarkable, and one several times larger is not.
 *
 * The 95th percentile is marked on each curve so the reader can see the
 * critical value move with df rather than treating it as a number from a
 * table. Percentiles are found by integrating the drawn density, so the marker
 * really is the area cut off by the curve.
 */
import { Plot, plot, linspace, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Chi-square densities at one, three and eight degrees of freedom, each with its 95th percentile marked. The shape moves from a cliff at zero to a broad, nearly symmetric hump as the degrees of freedom rise.";

const DFS = [1, 3, 8];
const GRID = linspace(0.02, 24, 480);

/** Γ(x) by Lanczos: needed for the normalising constant, and a lookup table
 *  would only cover the df values this chart happens to draw today. */
function gamma(x) {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * t ** (x + 0.5) * Math.exp(-t) * a;
}

const density = (x, k) =>
  (x ** (k / 2 - 1) * Math.exp(-x / 2)) / (2 ** (k / 2) * gamma(k / 2));

const rows = DFS.flatMap((k, i) =>
  GRID.map((x) => ({ key: `df = ${k}`, color: SERIES[i % SERIES.length], k, x, y: density(x, k) })),
);

/** 95th percentile by integrating the same density the chart draws. */
function percentile95(k) {
  const step = GRID[1] - GRID[0];
  let acc = 0;
  for (const x of GRID) {
    acc += density(x, k) * step;
    if (acc >= 0.95) return x;
  }
  return GRID.at(-1);
}

const CRIT = DFS.map((k, i) => ({
  key: `df = ${k}`,
  color: SERIES[i % SERIES.length],
  k,
  x: percentile95(k),
}));

export const caption =
  `One family, three degrees of freedom. The mean is always df, so a statistic near its degrees of freedom is ordinary. The dots are the 95th percentile of each curve: the critical value moves with df, which is why a chi-square of ${CRIT[2].x.toFixed(1)} is significant at df = ${DFS[0]} and unremarkable at df = ${DFS[2]}.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 56,
    marginRight: 92,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Chi-square statistic", labelAnchor: "center", domain: [0, 24], ticks: 5 },
    y: { label: "Density", domain: [0, 0.35], ticks: 5 },
    marks: [
      Plot.line(rows, { x: "x", y: "y", stroke: "color", strokeWidth: 2, clip: true }),
      Plot.dot(
        CRIT.map((c) => ({ ...c, y: density(c.x, c.k) })),
        { x: "x", y: "y", fill: "color", r: 4 },
      ),
      // One mark per curve, each with its own dy: the three critical values sit
      // close together along the bottom, and a shared offset stacks the labels.
      ...CRIT.map((c, i) =>
        Plot.text([{ ...c, y: density(c.x, c.k) }], {
          x: "x",
          y: "y",
          text: (d) => `${d.key}: 95% at ${d.x.toFixed(1)}`,
          fill: c.color,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          dy: -10 - i * 17,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: 23.5,
        y: 0.33,
        text: () => "mean = df, always",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
