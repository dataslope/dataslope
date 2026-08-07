/**
 * The two-sample t-test the lesson just ran, drawn: Adelie and Gentoo flipper
 * lengths from the Palmer penguins data, with each group's mean marked and the
 * 27 mm gap between them called out.
 *
 * This chart exists to make a printed result legible. The code block above it
 * prints `Welch t = -34.4, p = 3.19e-99`, which is a number so extreme that it
 * carries no intuition at all — a reader cannot tell whether it means "clearly
 * different" or "something is wrong". The picture answers that in one look:
 * the two distributions barely touch, so the gap is not a close call and the
 * enormous statistic is exactly what you would expect.
 *
 * The curves are normal densities at the dataset's published group means and
 * standard deviations (Adelie 190.0 ± 6.5 mm, n = 151; Gentoo 217.2 ± 6.5 mm,
 * n = 123), which is what the lesson's own output reports. They are a model of
 * the two groups, not a histogram of the rows, and the caption says so.
 */
import { Plot, plot, normalCurve, normalPdf, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Two normal curves for Adelie and Gentoo flipper lengths, centred 27 mm apart at 190.0 and 217.2 mm, overlapping only in their tails. A bracket between the two means labels the gap.";

export const caption =
  "The same comparison the test reports, as a picture: a 27 mm gap between groups that are each about 6.5 mm wide. Curves are normal models at the reported group means and standard deviations, not histograms of the rows.";

const GROUPS = [
  { label: "Adelie", mean: 190.0, sd: 6.5, n: 151, color: SERIES[0] },
  { label: "Gentoo", mean: 217.2, sd: 6.5, n: 123, color: SERIES[1] },
];

const DOMAIN = [168, 240];
const PEAK = normalPdf(0, 0, 6.5);
const BRACKET = PEAK * 1.2;

export function render() {
  return plot({
    height: 340,
    marginTop: 30,
    marginLeft: 30,
    ariaLabel: title,
    x: { label: "Flipper length (mm)", labelAnchor: "center", domain: DOMAIN, ticks: 7 },
    // Density units mean nothing to a reader here; the separation is the point.
    y: { label: null, ticks: [], grid: false, domain: [0, PEAK * 1.42] },
    marks: [
      ...GROUPS.map((g) =>
        Plot.areaY(normalCurve(DOMAIN[0], DOMAIN[1], g.mean, g.sd), {
          x: "x",
          y: "y",
          fill: g.color,
          fillOpacity: 0.15,
        }),
      ),
      ...GROUPS.map((g) =>
        Plot.lineY(normalCurve(DOMAIN[0], DOMAIN[1], g.mean, g.sd), {
          x: "x",
          y: "y",
          stroke: g.color,
          strokeWidth: 2,
        }),
      ),

      // Each group's mean, dropped to the axis so it can be read off directly.
      Plot.ruleX(GROUPS, {
        x: "mean",
        y1: 0,
        y2: (d) => normalPdf(d.mean, d.mean, d.sd),
        stroke: GUIDE,
        strokeWidth: 1,
        strokeDasharray: "3,3",
      }),
      Plot.text(GROUPS, {
        x: "mean",
        y: (d) => normalPdf(d.mean, d.mean, d.sd),
        text: (d) => `${d.label}\n${d.mean.toFixed(1)} mm  ·  n = ${d.n}`,
        fill: (d) => d.color,
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1.3,
        dy: -22,
        ...HALO,
      }),

      // The gap, as a span rather than a number: its width against the width
      // of the curves underneath it is the whole argument.
      Plot.ruleY([BRACKET], {
        x1: GROUPS[0].mean,
        x2: GROUPS[1].mean,
        stroke: MUTED,
        strokeWidth: 1,
      }),
      Plot.ruleX(GROUPS.map((g) => g.mean), {
        y1: BRACKET - PEAK * 0.022,
        y2: BRACKET + PEAK * 0.022,
        stroke: MUTED,
        strokeWidth: 1,
      }),
      Plot.text([(GROUPS[0].mean + GROUPS[1].mean) / 2], {
        x: (d) => d,
        y: BRACKET + PEAK * 0.06,
        text: () => "27 mm apart",
        fill: MUTED,
        fontSize: 12.5,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
