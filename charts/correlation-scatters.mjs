/**
 * What r actually looks like, and the two things it does not measure.
 *
 * Four panels of 120 points each. The first three are what a reader expects
 * (no relationship, moderate, strong). The fourth is the one that matters: a
 * clean, perfect, obvious curve whose correlation is near zero, because r only
 * ever measures the *straight-line* part of a relationship.
 *
 * Every panel prints its own r, computed from the plotted points rather than
 * from the parameter used to generate them, so the number and the picture
 * cannot drift apart.
 */
import { Plot, plot, linspace, HALO, MUTED, PRIMARY, normalSamples } from "./_theme.mjs";

export const title =
  "Four scatter plots: one with no relationship, one moderately positive, one strongly negative, and one following a clear U-shaped curve. Each is labelled with its correlation coefficient, and the U-shaped panel's is near zero despite the obvious pattern.";

export const caption =
  "The fourth panel is the warning. r measures how close a relationship is to a straight line, not whether one exists, so a perfectly predictable curve can report a correlation of nearly zero.";

const N = 120;

/** Pearson's r for the plotted points, so the label cannot drift from the art. */
function pearson(points) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of points) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}

// Two independent seeded standard-normal streams, combined to hit a target
// correlation exactly the textbook way: y = ρx + √(1−ρ²)·z.
const xs = normalSamples(N, 0, 1, 4242);
const zs = normalSamples(N, 0, 1, 8484);

function linear(rho) {
  return xs.map((x, i) => ({ x, y: rho * x + Math.sqrt(1 - rho * rho) * zs[i] }));
}

// The curved panel: a parabola with a little noise. Its x values come from an
// evenly spaced grid rather than the seeded normal sample the other three use,
// and that is load-bearing — cov(x, x²) vanishes only when the x values are
// *exactly* symmetric about their mean, and any finite random sample is a
// little skewed. Drawn from the same sample as the others, this panel reported
// r = −0.32, which would have had the figure contradicting its own caption.
const grid = linspace(-2.6, 2.6, N);
const curved = grid.map((x, i) => ({ x, y: 0.85 * (x * x - 2.25) + 0.3 * zs[i] }));

const PANELS = [
  { key: "No relationship", points: linear(0) },
  { key: "Moderate, positive", points: linear(0.6) },
  { key: "Strong, negative", points: linear(-0.9) },
  { key: "Curved", points: curved },
];

const points = PANELS.flatMap((p) => p.points.map((d) => ({ ...d, panel: p.key })));
const labels = PANELS.map((p) => ({
  panel: p.key,
  text: `r = ${pearson(p.points).toFixed(2)}`,
  curved: p.key === "Curved",
}));

export function render() {
  return plot({
    height: 250,
    marginTop: 32,
    marginLeft: 34,
    marginBottom: 40,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: null, ticks: [], domain: [-3.2, 3.2] },
    y: { label: null, ticks: [], grid: false, domain: [-3.4, 3.4] },
    marks: [
      Plot.dot(points, {
        x: "x",
        y: "y",
        fx: "panel",
        r: 2,
        fill: PRIMARY,
        fillOpacity: 0.55,
        stroke: null,
        // Without this a point beyond the domain paints outside its panel,
        // over the facet titles.
        clip: true,
      }),
      // The curved panel's r is the point of the figure, so it is the one
      // label in the accent color.
      Plot.text(labels, {
        x: -3.1,
        y: 3.1,
        fx: "panel",
        text: "text",
        fill: (d) => (d.curved ? "var(--ds-chart-accent)" : MUTED),
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
    ],
  });
}
