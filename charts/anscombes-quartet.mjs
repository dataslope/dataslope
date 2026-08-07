/**
 * Anscombe's quartet: four datasets with the same mean, the same variance, the
 * same correlation and the same fitted line, and nothing else in common.
 *
 * The canonical argument for looking at your data before summarising it, and
 * the reason it belongs in an exploratory-analysis lesson rather than a
 * decorative one: three of these four would be reported identically by any
 * script that prints `.describe()` and a regression coefficient.
 *
 * The numbers are Anscombe's own (1973), not simulated, so the identical
 * summary statistics are exact rather than approximate.
 */
import { Plot, plot, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Four scatter plots sharing the same fitted line: a normal-looking linear relationship, a clean curve, a perfect line with one outlier pulling it off, and a vertical stack of points with one far-off point. All four have identical means, variances and correlation.";

export const caption =
  "All four have the same means, the same variances, the same correlation (0.816) and the same fitted line. Only one of them is a linear relationship. Summary statistics cannot tell you which.";

const X1 = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
const SETS = [
  {
    key: "I",
    x: X1,
    y: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68],
  },
  {
    key: "II",
    x: X1,
    y: [9.14, 8.14, 8.74, 8.77, 9.26, 8.1, 6.13, 3.1, 9.13, 7.26, 4.74],
  },
  {
    key: "III",
    x: X1,
    y: [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73],
  },
  {
    key: "IV",
    x: [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8],
    y: [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.5, 5.56, 7.91, 6.89],
  },
];

const points = SETS.flatMap((s) => s.x.map((x, i) => ({ panel: s.key, x, y: s.y[i] })));

// The one fitted line, drawn identically in all four panels: y = 3 + 0.5x.
const FIT = SETS.flatMap((s) => [
  { panel: s.key, x: 3, y: 3 + 0.5 * 3 },
  { panel: s.key, x: 20, y: 3 + 0.5 * 20 },
]);

export function render() {
  return plot({
    height: 250,
    marginTop: 32,
    marginLeft: 34,
    marginBottom: 40,
    ariaLabel: title,
    fx: { label: null, domain: SETS.map((s) => s.key) },
    x: { label: null, domain: [2.5, 20.5], ticks: [] },
    y: { label: null, domain: [2, 13.5], ticks: [] },
    marks: [
      Plot.lineY(FIT, {
        x: "x",
        y: "y",
        fx: "panel",
        z: "panel",
        stroke: MUTED,
        strokeWidth: 1.5,
        strokeDasharray: "4,3",
        clip: true,
      }),
      Plot.dot(points, {
        x: "x",
        y: "y",
        fx: "panel",
        r: 3.2,
        fill: PRIMARY,
        fillOpacity: 0.75,
        stroke: null,
        clip: true,
      }),
      Plot.text(
        SETS.map((s) => ({ panel: s.key })),
        {
          x: 3,
          y: 13,
          fx: "panel",
          text: () => "r = 0.82",
          fill: MUTED,
          fontSize: 11.5,
          fontWeight: 600,
          textAnchor: "start",
          ...HALO,
        },
      ),
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
    ],
  });
}
