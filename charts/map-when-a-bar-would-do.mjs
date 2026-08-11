/**
 * The map that got made because the data had a place column.
 *
 * Nine regions, one number each, and the question is "which regions are doing
 * badly". The map answers it slowly and the bar chart answers it instantly,
 * and the reason is not that maps are bad. It is that a map spends its two
 * strongest channels, the two dimensions of position, on *where things are*,
 * and then has only color left for the quantity. Color is a weak channel, so
 * ranking nine shades is a chore and reading a value off one is impossible
 * without the legend.
 *
 * A bar chart spends position on the quantity instead, and gives up geography
 * entirely. That is a straight trade, and which side of it you want depends on
 * one question: **is the answer geographic?**
 *
 * It is geographic when the finding is about adjacency (this cluster is
 * contiguous), about a boundary (it stops at the river), about distance (it
 * fades with range from the depot), or about a spatial pattern the reader
 * would recognise. In those cases the map is the only chart that can say it,
 * and a bar chart is not a substitute.
 *
 * It is not geographic when the finding is a ranking, and a ranking is what
 * most regional dashboards contain. Here the three worst regions are scattered
 * across the grid with nothing in common but their numbers, so the map's whole
 * contribution is telling you that they are not neighbours, which one sentence
 * would also have done.
 *
 * The tell, when you are unsure: write the finding out as a sentence. If the
 * sentence contains a direction, a border or a distance, keep the map.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Nine regional values as a shaded tile-grid map and as a sorted bar chart. The map spends both position channels on geography and leaves only color for the number; the bars spend position on the number and the ranking is immediate.";

/** Delivery success rate by region, laid out as a three-by-three tile grid. */
const REGIONS = [
  ["Northwest", "NW", 91, 0, 0], ["North", "N", 88, 1, 0], ["Northeast", "NE", 74, 2, 0],
  ["West", "W", 82, 0, 1], ["Central", "C", 95, 1, 1], ["East", "E", 69, 2, 1],
  ["Southwest", "SW", 71, 0, 2], ["South", "S", 86, 1, 2], ["Southeast", "SE", 93, 2, 2],
].map(([key, code, v, col, row]) => ({ key, code, v, col, row }));

const LO = Math.min(...REGIONS.map((d) => d.v));
const HI = Math.max(...REGIONS.map((d) => d.v));
const sorted = [...REGIONS].sort((a, b) => a.v - b.v);
const WORST = sorted.slice(0, 3);

/** Whether the three worst share an edge on the grid, which decides whether
 *  the map has anything to add. */
const ADJACENT = WORST.some((a) =>
  WORST.some((b) => a !== b && Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1),
);

const MAP = panel(0, { y: [0, 1] });
const BARS = panel(1, { y: [60, 100] });

const TILE = 0.2;
const GAP = 0.016;
const ORIGIN_X = (MAP.left + MAP.right) / 2 - (3 * TILE + 2 * GAP) / 2;
const ORIGIN_Y = 0.76;
const TILE_H = TILE * 0.62;

const tiles = REGIONS.map((d) => ({
  ...d,
  worst: WORST.includes(d),
  x1: ORIGIN_X + d.col * (TILE + GAP),
  x2: ORIGIN_X + d.col * (TILE + GAP) + TILE,
  y1: ORIGIN_Y - d.row * (TILE_H + GAP) - TILE_H,
  y2: ORIGIN_Y - d.row * (TILE_H + GAP),
}));

const N = REGIONS.length;
const BAR = 0.66;
const bars = sorted.map((d, i) => ({
  ...d,
  worst: WORST.includes(d),
  x1: BARS.band(i, N) - (BARS.bandWidth(N) * BAR) / 2,
  x2: BARS.band(i, N) + (BARS.bandWidth(N) * BAR) / 2,
  y: BARS.py(d.v),
}));

const shade = (v) => 0.12 + ((v - LO) / (HI - LO)) * 0.78;

export const caption = `Nine regions with one number each, as a choropleth and as bars. The three worst are ${WORST.map((d) => d.key).join(", ")}, which the bars answer at once.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 44,
    marginRight: 18,
    marginBottom: 52,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      panelTitle(MAP, "As a choropleth", { fill: ACCENT }),
      panelTitle(BARS, "As a sorted bar chart", { fill: PRIMARY }),

      Plot.rect(tiles, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: PRIMARY,
        fillOpacity: (d) => shade(d.v),
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1.6,
      }),
      Plot.text(tiles, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: (d) => (d.y1 + d.y2) / 2,
        text: "code",
        fill: (d) => (shade(d.v) > 0.55 ? "var(--ds-chart-surface)" : MUTED),
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
      }),
      Plot.text([{}], {
        x: (MAP.left + MAP.right) / 2,
        y: 0.1,
        text: () => "rank these nine shades",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),

      ...panelAxis(BARS, { ticks: [60, 70, 80, 90, 100], format: (v) => `${v}%` }),
      panelBaseline(BARS),
      Plot.rect(bars, {
        x1: "x1",
        x2: "x2",
        y1: BARS.py(60),
        y2: "y",
        fill: (d) => (d.worst ? ACCENT : PRIMARY),
        fillOpacity: 0.72,
      }),
      Plot.text(bars, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: BARS.py(60),
        text: "code",
        fill: "currentColor",
        fillOpacity: 0.6,
        fontSize: 10,
        textAnchor: "middle",
        dy: 13,
      }),
      Plot.text([{}], {
        x: (BARS.left + BARS.right) / 2,
        y: 0.025,
        text: () => "the three worst, in order, in one look",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
