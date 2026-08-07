/**
 * Alphabetical order against value order, on the same twelve categories.
 *
 * A bar chart's job is usually to rank, and alphabetical order actively
 * prevents it: the reader has to scan twelve bar ends and hold them in memory
 * to answer "which is biggest?", a question the sorted version answers before
 * they have finished reading the title. Alphabetical is the right choice only
 * when the reader arrives already knowing which category they want, which is a
 * lookup table rather than a chart.
 *
 * Faceted honestly: identical values on identical axes, with only the row
 * order changed. The category axis is deliberately *not* shared, since the
 * ordering is the variable, so each panel carries its own labels.
 */
import { Plot, plot, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Twelve categories as bars, drawn alphabetically and again sorted by value. In the alphabetical panel the largest bar is buried in the middle; in the sorted panel the ranking reads top to bottom.";

export const caption =
  "The same twelve numbers. Alphabetical order hides the ranking a bar chart exists to show; sorting by value hands it over for free. Sort alphabetically only when the reader already knows which row they came for.";

const DATA = [
  { key: "Argentina", value: 41 },
  { key: "Brazil", value: 78 },
  { key: "Canada", value: 33 },
  { key: "Denmark", value: 19 },
  { key: "Egypt", value: 55 },
  { key: "France", value: 62 },
  { key: "Germany", value: 71 },
  { key: "India", value: 88 },
  { key: "Japan", value: 47 },
  { key: "Kenya", value: 26 },
  { key: "Mexico", value: 59 },
  { key: "Norway", value: 14 },
];

const MAX = Math.max(...DATA.map((d) => d.value));
const TOP = DATA.reduce((a, b) => (b.value > a.value ? b : a)).key;

const ALPHA = [...DATA].sort((a, b) => a.key.localeCompare(b.key));
const SORTED = [...DATA].sort((a, b) => b.value - a.value);

// One row index per panel, since the ordering is the thing that differs.
const rows = [
  ...ALPHA.map((d, i) => ({ ...d, panel: "Alphabetical", row: i })),
  ...SORTED.map((d, i) => ({ ...d, panel: "Sorted by value", row: i })),
];

export function render() {
  return plot({
    height: 380,
    marginTop: 32,
    marginLeft: 24,
    marginRight: 24,
    marginBottom: 40,
    ariaLabel: title,
    fx: { label: null, domain: ["Alphabetical", "Sorted by value"] },
    x: { label: null, domain: [0, MAX * 1.55], ticks: [] },
    y: { label: null, domain: [-1.05, DATA.length - 0.3], ticks: [], grid: false, reverse: true },
    marks: [
      Plot.rect(rows, {
        x1: 0,
        x2: "value",
        y1: (d) => d.row - 0.34,
        y2: (d) => d.row + 0.34,
        fx: "panel",
        fill: (d) => (d.key === TOP ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.key === TOP ? 0.7 : 0.4),
      }),
      Plot.text(rows, {
        x: "value",
        y: "row",
        fx: "panel",
        text: "key",
        fill: MUTED,
        fontSize: 11,
        textAnchor: "start",
        dx: 7,
      }),
      Plot.text([{ panel: "Alphabetical" }], {
        x: MAX * 1.5,
        y: -0.85,
        fx: "panel",
        text: () => "which is biggest?",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
