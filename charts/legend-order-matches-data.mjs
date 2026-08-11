/**
 * A legend in alphabetical order is a lookup table. A legend in the data's
 * order is not needed at all.
 *
 * Both panels have the same five lines and the same five names. On the left
 * the legend is alphabetical, which is the default in every plotting library
 * because it is the default sort for a set of strings. To find out which line
 * is Northwind, a reader has to: find Northwind in the legend, note its
 * color, hold that color in memory, scan the chart for it, and check. Five
 * lines, five times, and the fifth one is hardest because by then three of the
 * colors look alike.
 *
 * On the right the legend labels sit at the right-hand end of the lines
 * themselves, in whatever order the lines happen to finish in. There is no
 * lookup, because there is nothing to look up: the name is where the line is.
 * The color is now redundant, which is the point. Redundant encoding is a
 * feature, and a chart that still works with the color removed is a chart
 * that works when printed, projected badly, or read by somebody who cannot
 * tell two of the hues apart.
 *
 * When a legend genuinely is needed, because the marks are too dense to label
 * in place, the rule survives in weaker form: order its entries to match the
 * order the reader will meet them in the chart. Top to bottom at the right
 * edge for lines, largest to smallest for a bar chart, and never alphabetical
 * unless the reader's actual question is alphabetical.
 */
import { Plot, plot, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "The same five-line chart twice. On the left a legend in alphabetical order, which forces a color lookup for each line; on the right the names printed at the end of the lines themselves, in the order the lines finish, so there is nothing to look up.";

/** Weekly active users by product, in thousands, over one year. */
const PRODUCTS = [
  { key: "Northwind", start: 34, end: 71 },
  { key: "Peartree", start: 52, end: 44 },
  { key: "Halcyon", start: 26, end: 58 },
  { key: "Brightside", start: 45, end: 30 },
  { key: "Cormorant", start: 18, end: 86 },
];

const N_POINTS = 13;
const MONTHS = Array.from({ length: N_POINTS }, (_, i) => i);
const WOBBLE = [0, 1.6, -1.2, 2.1, -0.6, 1.1, -1.9, 0.7, 1.4, -1.1, 0.4, -0.8, 0];

const series = PRODUCTS.map((p, si) => ({
  ...p,
  color: SERIES[si % SERIES.length],
  points: MONTHS.map((i) => ({
    i,
    v: p.start + ((p.end - p.start) * i) / (N_POINTS - 1) + WOBBLE[i] * (1 + si * 0.35),
  })),
}));

const DOMAIN = [10, 95];
const LOOKUP = panel(0, { x: [0, N_POINTS - 1], y: DOMAIN });
const DIRECT = panel(1, { x: [0, N_POINTS - 1], y: DOMAIN });

const alphabetical = [...series].sort((a, b) => a.key.localeCompare(b.key));
const byEnding = [...series].sort((a, b) => b.end - a.end);
/** How far the alphabetical order is from the order on the page. */
const MISMATCHES = alphabetical.filter((s, i) => byEnding[i].key !== s.key).length;

const rowsFor = (p) =>
  series.flatMap((s) => s.points.map((d) => ({ key: s.key, color: s.color, x: p.px(d.i), y: p.py(d.v) })));

export const caption = `The same five lines with an alphabetical legend, then with the names at the end of the lines. In the legend version ${MISMATCHES} of the five entries sit in a different place from the line they name.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 32,
    marginRight: 84,
    marginBottom: 34,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(LOOKUP, { ticks: [20, 40, 60, 80] }),
      ...panelAxis(DIRECT, { ticks: [20, 40, 60, 80] }),
      panelTitle(LOOKUP, "Legend, alphabetical", { fill: MUTED }),
      panelTitle(DIRECT, "Labels on the lines", { fill: PRIMARY }),

      Plot.line(rowsFor(LOOKUP), {
        x: "x",
        y: "y",
        z: "key",
        stroke: "color",
        strokeWidth: 2,
      }),
      Plot.line(rowsFor(DIRECT), {
        x: "x",
        y: "y",
        z: "key",
        stroke: "color",
        strokeWidth: 2,
      }),

      // The alphabetical legend, drawn as a legend: swatch, name, in a box of
      // its own, away from the marks it describes.
      Plot.dot(
        alphabetical.map((s, i) => ({ color: s.color, y: 0.79 - i * 0.058 })),
        { x: LOOKUP.left + 0.045, y: "y", fill: "color", r: 4.5, symbol: "square" },
      ),
      Plot.text(
        alphabetical.map((s, i) => ({ key: s.key, y: 0.79 - i * 0.058 })),
        {
          x: LOOKUP.left + 0.045,
          y: "y",
          text: "key",
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 10,
          ...HALO,
        },
      ),

      // Direct labels, at the end of each line.
      Plot.text(
        series.map((s) => ({ key: s.key, color: s.color, y: DIRECT.py(s.points.at(-1).v) })),
        {
          x: DIRECT.right,
          y: "y",
          text: "key",
          fill: "color",
          fontSize: 10.5,
          fontWeight: 700,
          textAnchor: "start",
          dx: 7,
          ...HALO,
        },
      ),
    ],
  });
}
