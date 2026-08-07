/**
 * The same data, three bin widths: a histogram is a choice, not a measurement.
 *
 * Faceting is legitimate here because every panel plots the same variable on
 * the same axis; only the binning changes. Too wide and the two peaks fuse
 * into one lump; too narrow and every wobble looks like structure. The middle
 * panel is the one that shows what is actually there, and nothing about the
 * data tells you which panel that is — you have to look at more than one.
 *
 * The bars are *density* (share of the data per unit of x), not share per bin,
 * and the bins are counted here rather than by Plot's bin transform. Share per
 * bin is proportional to bin width, so on the shared vertical axis that facets
 * force, the narrow-bin panel would flatten to nothing and the comparison
 * would be about arithmetic rather than about shape. Density removes the width
 * from the height, which is what makes the three panels comparable at all.
 */
import { Plot, plot, normalSamples, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same bimodal dataset drawn as three histograms with wide, medium and narrow bins. The wide binning hides the two peaks, the medium shows them clearly, and the narrow one breaks the data into noisy spikes.";

export const caption =
  "One dataset, three bin widths. The bins are a knob you turn, and the wrong setting can hide a second peak or invent a dozen. Always look at more than one before believing a shape.";

// A clearly bimodal sample, seeded so the figure never churns.
const DATA = [...normalSamples(600, 8, 1.5, 314), ...normalSamples(400, 15, 1.8, 271)];

const DOMAIN = [2, 22];
const PANELS = [
  { key: "Too wide", width: 4 },
  { key: "About right", width: 1 },
  { key: "Too narrow", width: 0.25 },
];

/** Counts on a fixed grid, converted to density so height does not depend on
 *  the width of the bin it is drawn over. */
function histogram(values, width) {
  const bins = Math.round((DOMAIN[1] - DOMAIN[0]) / width);
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    const i = Math.floor((v - DOMAIN[0]) / width);
    if (i >= 0 && i < bins) counts[i] += 1;
  }
  return counts.map((c, i) => ({
    x1: DOMAIN[0] + i * width,
    x2: DOMAIN[0] + (i + 1) * width,
    density: c / (values.length * width),
  }));
}

const bars = PANELS.flatMap((p) =>
  histogram(DATA, p.width).map((b) => ({ ...b, panel: p.key })),
);

export function render() {
  return plot({
    height: 300,
    marginTop: 32,
    marginLeft: 52,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: "Value", labelAnchor: "center", domain: DOMAIN, ticks: 4 },
    y: { label: "Density", domain: [0, 0.26], ticks: 4 },
    marks: [
      Plot.rectY(bars, {
        x1: "x1",
        x2: "x2",
        y: "density",
        fx: "panel",
        fill: PRIMARY,
        fillOpacity: 0.45,
        clip: true,
      }),
      Plot.text(PANELS, {
        x: DOMAIN[0] + 0.5,
        y: 0.245,
        fx: "key",
        text: (d) => `bins of ${d.width}`,
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
