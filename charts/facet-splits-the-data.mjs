/**
 * One population, drawn whole and then cut into six panels, where every panel
 * tells a different story and none of the stories is real.
 *
 * Faceting is division. It is easy to think of it as a way of adding detail,
 * and the cost is not visible in the code: `facet_col="region"` takes no
 * longer to type for forty regions than for four. What it does is divide the
 * evidence, and a panel built from a seventh of the data has roughly a third
 * of the precision of the whole, so the slopes it draws are mostly sampling
 * noise given a frame and a title.
 *
 * The leftmost panel is all the data, and it is flat: there is no relationship
 * here to find. The six panels beside it are the same points dealt out at
 * random, so any difference between them comes from the dealing. One rises
 * steeply, one falls, and a reader shown only the grid would come away with a
 * regional story about a variable that does not vary by region.
 *
 * The rule is a floor rather than a ceiling on panel count: facet when every
 * panel still holds enough observations to support the claim being read off
 * it, and when the panels are meant to be compared rather than each read alone.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "The same points shown whole and then split at random into six panels. The whole is flat; the panels show slopes running in both directions, all of them produced by the split rather than by any real difference.";

const N = 66;
const GROUPS = ["A", "B", "C", "D", "E", "F"];
const ALL = `All ${N}`;

const u = rng(9284);

/** One population, no structure: x and y are independent by construction, so
 *  every slope any panel shows is noise. */
const points = Array.from({ length: N }, (_, i) => ({
  i,
  x: 5 + u() * 90,
  y: 30 + (u() + u() + u() - 1.5) * 26,
  g: GROUPS[i % GROUPS.length],
}));

const rows = [
  ...points.map((p) => ({ ...p, panel: ALL })),
  ...points.map((p) => ({ ...p, panel: p.g })),
];

/** Least squares per panel, so the lines in the picture are the lines the
 *  maths gives rather than ones drawn to make a point. */
function fitOf(pts) {
  const n = pts.length;
  const mx = pts.reduce((s, d) => s + d.x, 0) / n;
  const my = pts.reduce((s, d) => s + d.y, 0) / n;
  const denom = pts.reduce((s, d) => s + (d.x - mx) ** 2, 0);
  const slope = pts.reduce((s, d) => s + (d.x - mx) * (d.y - my), 0) / denom;
  return { slope, at: (x) => my + slope * (x - mx) };
}

const fits = [ALL, ...GROUPS].map((panel) => {
  const pts = panel === ALL ? points : points.filter((p) => p.g === panel);
  const f = fitOf(pts);
  return { panel, slope: f.slope, y1: f.at(0), y2: f.at(100), n: pts.length };
});

const panelFits = fits.filter((f) => f.panel !== ALL);
const STEEPEST = panelFits.reduce((a, b) => (Math.abs(a.slope) >= Math.abs(b.slope) ? a : b));
const WHOLE = fits[0];
const SPREAD = (
  Math.max(...panelFits.map((f) => f.slope)) - Math.min(...panelFits.map((f) => f.slope))
).toFixed(2);

export const caption = `Faceting is division, and the cost never shows up in the code: facet_col takes no longer to type for forty groups than for four. What it does is divide the evidence, so a panel built from a sixth of the data carries roughly a third of the precision of the whole, and the slope it draws is mostly sampling noise inside a frame with a title on it. The leftmost panel is all ${N} points and its slope is ${WHOLE.slope.toFixed(2)}, which is flat, because x and y here are independent by construction. The six beside it are the same points dealt out at random, so every difference between them comes from the dealing: the slopes run from ${Math.min(...panelFits.map((f) => f.slope)).toFixed(2)} to ${Math.max(...panelFits.map((f) => f.slope)).toFixed(2)}, a spread of ${SPREAD}, and panel ${STEEPEST.panel} on its own would support a confident story about a variable that does not vary. The rule is a floor rather than a ceiling on panel count: facet when every panel still holds enough observations to support what will be read off it.`;

export function render() {
  return plot({
    height: 280,
    marginTop: 32,
    marginLeft: 40,
    marginRight: 16,
    marginBottom: 44,
    ariaLabel: title,
    fx: { label: null, domain: [ALL, ...GROUPS] },
    x: { label: null, domain: [0, 100], ticks: [] },
    y: { label: null, domain: [-25, 90], ticks: 3 },
    marks: [
      Plot.dot(rows, {
        fx: "panel",
        x: "x",
        y: "y",
        r: 2.6,
        fill: PRIMARY,
        fillOpacity: (d) => (d.panel === ALL ? 0.5 : 0.85),
      }),
      Plot.link(fits, {
        fx: "panel",
        x1: 0,
        x2: 100,
        y1: "y1",
        y2: "y2",
        stroke: (d) =>
          d.panel === ALL ? GUIDE : d.panel === STEEPEST.panel ? ACCENT : MUTED,
        strokeWidth: (d) => (d.panel === ALL ? 2.2 : 1.8),
      }),
      Plot.text(fits, {
        fx: "panel",
        frameAnchor: "bottom",
        text: (d) => `slope ${d.slope.toFixed(2)}`,
        fill: (d) =>
          d.panel === ALL ? MUTED : d.panel === STEEPEST.panel ? ACCENT : MUTED,
        fontSize: 9,
        fontWeight: 600,
        dy: 18,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => ALL,
        frameAnchor: "top-left",
        text: () => "no effect here",
        fill: MUTED,
        fontSize: 9.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 3,
        dy: 2,
        ...HALO,
      }),
    ],
  });
}
