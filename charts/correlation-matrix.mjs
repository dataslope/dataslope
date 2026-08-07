/**
 * A correlation matrix as a heatmap, which is the one case where a heatmap is
 * clearly the right tool: the data is already a grid, and the question is
 * "where are the strong pairs?" rather than "what is cell (i, j)?".
 *
 * Two things the figure is careful about, because the lesson turns on both.
 * The scale is *diverging* and centred on zero, so the sign of a correlation
 * is a hue and its strength is a saturation; a sequential ramp here would make
 * −0.9 and 0 look equally pale and hide half the structure. And the variables
 * are ordered so that correlated ones sit together, which is what turns a
 * speckle into the visible block in the top-left.
 *
 * Correlations are the Palmer penguins measurements, which the course uses
 * throughout, so the block is a real fact about the birds: bill length,
 * flipper length and body mass move together, and bill depth moves against
 * them.
 */
import { Plot, plot } from "./_theme.mjs";

export const literalColorsAllowed =
  "A heatmap needs a continuous diverging ramp, and the --ds-chart-* roles are " +
  "a discrete categorical set with no continuous equivalent. The cells are " +
  "filled areas that carry their own colour on either page background, and the " +
  "numbers on them use the surface token so they stay legible in both themes.";

export const title =
  "A five by five correlation matrix drawn as a heatmap on a diverging scale. Bill length, flipper length and body mass form a strongly positive block; bill depth is strongly negative against all three.";

export const caption =
  "A correlation matrix is already a grid, which is what makes a heatmap right here. The scale diverges from zero so sign reads as hue and strength as saturation, and the variables are ordered so the correlated ones form a block instead of a speckle.";

const VARS = ["Bill length", "Flipper", "Body mass", "Bill depth"];

// Palmer penguins, all species pooled. Symmetric by construction below.
const R = {
  "Bill length|Flipper": 0.66,
  "Bill length|Body mass": 0.59,
  "Bill length|Bill depth": -0.24,
  "Flipper|Body mass": 0.87,
  "Flipper|Bill depth": -0.58,
  "Body mass|Bill depth": -0.47,
};

const corr = (a, b) => (a === b ? 1 : (R[`${a}|${b}`] ?? R[`${b}|${a}`]));

const cells = VARS.flatMap((row) => VARS.map((col) => ({ row, col, r: corr(row, col) })));

export function render() {
  return plot({
    height: 380,
    marginTop: 62,
    marginLeft: 96,
    marginRight: 30,
    marginBottom: 26,
    ariaLabel: title,
    // Diverging, anchored at zero: the sign of a correlation is the first
    // thing to read off, and a sequential ramp cannot show it.
    color: {
      type: "diverging",
      scheme: "BuRd",
      domain: [-1, 1],
      pivot: 0,
      reverse: true,
    },
    x: { label: null, domain: VARS, axis: "top", tickSize: 0 },
    y: { label: null, domain: VARS, tickSize: 0 },
    marks: [
      Plot.cell(cells, { x: "col", y: "row", fill: "r", inset: 1 }),
      Plot.text(cells, {
        x: "col",
        y: "row",
        text: (d) => d.r.toFixed(2),
        // The numbers are the point of a small matrix; the colour is the index
        // into them. The surface token on the saturated ends, the page
        // foreground on the pale middle — MUTED here was grey-on-salmon.
        fill: (d) => (Math.abs(d.r) > 0.5 ? "var(--ds-chart-surface)" : "currentColor"),
        fontSize: 12.5,
        fontWeight: 600,
      }),
    ],
  });
}
