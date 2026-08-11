/**
 * The counterpoint to "sort bars by value, almost always".
 *
 * Sorting is the right default because a bar chart of unordered categories has
 * an arbitrary order, and an arbitrary order wastes the one thing the reader
 * gets for free, which is position. Alphabetical is arbitrary. Whatever order
 * the rows came out of the database in is arbitrary. Sorted by value is not,
 * and it turns "which is biggest" from a search into a glance.
 *
 * None of that applies when the categories already have an order.
 *
 * Days of the week are the clearest case. Sorted by value, the chart answers
 * "which day is busiest" and destroys the answer to every other question,
 * because Monday is no longer beside Tuesday and the run from Monday to Friday
 * is no longer a run. The natural order answers the same question nearly as
 * well, and also shows the shape: a working week that climbs, a weekend that
 * collapses, and one dip in the middle you would never have noticed in the
 * sorted version.
 *
 * The same goes for shirt sizes, age brackets, school years, survey scales
 * from "strongly disagree" to "strongly agree", months, and any variable a
 * statistician would call *ordinal*. In every one of them the sequence is
 * information somebody collected, and sorting throws it away.
 *
 * The test is one question: **if two adjacent categories swapped places, would
 * anything be wrong?** If yes, the order is data and you must not sort. If no,
 * sort by value.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Deliveries per day of the week, drawn sorted by value and in calendar order. Sorted, the chart answers which day is busiest and nothing else. In calendar order the same bars show a working week that climbs, a midweek dip and a weekend collapse.";

/** Deliveries per weekday, in hundreds. */
const DAYS = [
  { key: "Mon", v: 41 },
  { key: "Tue", v: 46 },
  { key: "Wed", v: 38 },
  { key: "Thu", v: 49 },
  { key: "Fri", v: 57 },
  { key: "Sat", v: 22 },
  { key: "Sun", v: 14 },
];

const N = DAYS.length;
const MAX = 64;
const sorted = [...DAYS].sort((a, b) => b.v - a.v);

const BUSIEST = sorted[0];
const DIP = DAYS.reduce((a, b, i) =>
  i > 0 && i < 5 && b.v < a.v ? b : a,
);
const WEEKEND = DAYS.slice(5);

const SORTED = panel(0, { y: [0, MAX] });
const NATURAL = panel(1, { y: [0, MAX] });

const BAR = 0.66;
const bars = (p, list) =>
  list.map((d, i) => ({
    ...d,
    weekend: d.key === "Sat" || d.key === "Sun",
    x1: p.band(i, N) - (p.bandWidth(N) * BAR) / 2,
    x2: p.band(i, N) + (p.bandWidth(N) * BAR) / 2,
    y: p.py(d.v),
  }));

export const caption = `The same seven bars sorted by value and in calendar order. Sorted, the chart answers "which day is busiest" (${BUSIEST.key}) and destroys the answer to everything else; in calendar order it answers that nearly as well and also shows the shape, including a dip on ${DIP.key}.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 36,
    marginRight: 18,
    marginBottom: 40,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(SORTED, { ticks: [0, 20, 40, 60] }),
      ...panelAxis(NATURAL, { ticks: [0, 20, 40, 60] }),
      panelTitle(SORTED, "Sorted by value", { fill: ACCENT }),
      panelTitle(NATURAL, "In calendar order", { fill: PRIMARY }),
      panelBaseline(SORTED),
      panelBaseline(NATURAL),

      Plot.rect(bars(SORTED, sorted), {
        x1: "x1",
        x2: "x2",
        y1: SORTED.py(0),
        y2: "y",
        fill: (d) => (d.weekend ? ACCENT : PRIMARY),
        fillOpacity: 0.55,
      }),
      Plot.rect(bars(NATURAL, DAYS), {
        x1: "x1",
        x2: "x2",
        y1: NATURAL.py(0),
        y2: "y",
        fill: (d) => (d.weekend ? ACCENT : PRIMARY),
        fillOpacity: 0.55,
      }),

      ...[
        [SORTED, sorted],
        [NATURAL, DAYS],
      ].map(([p, list]) =>
        Plot.text(
          list.map((d, i) => ({ key: d.key, x: p.band(i, N) })),
          {
            x: "x",
            y: p.py(0),
            text: "key",
            fill: "currentColor",
            fillOpacity: 0.6,
            fontSize: 10,
            textAnchor: "middle",
            dy: 13,
          },
        ),
      ),

      Plot.text([{}], {
        x: (SORTED.left + SORTED.right) / 2,
        y: SORTED.py(MAX),
        text: () => "the days are in no order,\nso there is no week to see",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: 4,
        ...HALO,
      }),
      Plot.text([{}], {
        x: NATURAL.band(2, N),
        y: NATURAL.py(DIP.v),
        text: () => `a ${DIP.key} dip`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: NATURAL.band(5.5, N),
        y: NATURAL.py(WEEKEND[0].v),
        text: () => "and the weekend\nfalls off a cliff",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -18,
        ...HALO,
      }),
    ],
  });
}
