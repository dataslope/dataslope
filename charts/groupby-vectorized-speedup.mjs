/**
 * The four ways to compute the same column in pandas, and why they are not
 * within an order of magnitude of each other.
 *
 * All four produce identical output. What separates them is how many times the
 * Python interpreter is entered: once per row for `iterrows` and `apply`, once
 * per *column* for the vectorised form, which hands the loop to compiled code
 * operating on contiguous NumPy buffers. `iterrows` is worst because it also
 * builds a fresh Series object per row, so a million rows means a million
 * short-lived objects for the garbage collector.
 *
 * The lesson is not "apply is slow". It is that the interpreter boundary is
 * the cost, so the useful question about any pandas expression is how many
 * times it crosses that boundary. Anything that can be phrased as an operation
 * on whole columns crosses it a handful of times whatever the row count.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Time to compute one derived column over a million rows, four ways, on a logarithmic scale: iterrows and apply take seconds, a list comprehension a fraction of one, and the vectorised expression milliseconds.";

const ROWS = 1_000_000;

const METHODS = [
  { key: "for … in df.iterrows()", ms: 9800, note: "a Series object per row" },
  { key: "df.apply(f, axis=1)", ms: 4200, note: "a Python call per row" },
  { key: "[f(x) for x in df.col]", ms: 340, note: "a Python call, no pandas object" },
  { key: "df.a * df.b - df.c", ms: 9, note: "one pass, in compiled code" },
];

const SLOW = METHODS[0].ms;
const FAST = METHODS.at(-1).ms;
const RATIO = Math.round(SLOW / FAST);

export const caption = `Four ways to compute the same column over ${(ROWS / 1e6).toFixed(0)} million rows, with identical output. What separates them is how many times the Python interpreter is entered: once per row for the first two, once per *column* for the last. \`iterrows\` is worst because it also builds a Series object per row, a million short-lived objects for the collector to clean up. That is a factor of ${RATIO.toLocaleString()} between the top and the bottom. The lesson is not "apply is slow" but that the interpreter boundary is the cost, so the question to ask of any pandas expression is how many times it crosses that boundary.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 144,
    marginRight: 196,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: `Time for ${(ROWS / 1e6).toFixed(0)} million rows`,
      labelAnchor: "center",
      type: "log",
      domain: [5, 30_000],
      ticks: [10, 100, 1000, 10_000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000} s` : `${d} ms`),
    },
    y: { label: null, domain: METHODS.map((d) => d.key), padding: 0.3, grid: false },
    marks: [
      Plot.barX(METHODS, {
        y: "key",
        x1: 5,
        x2: "ms",
        fill: (d) => (d.ms === FAST ? PRIMARY : ACCENT),
        fillOpacity: (d) => (d.ms === FAST ? 0.75 : 0.25 + 0.4 * (Math.log(d.ms) / Math.log(SLOW))),
      }),
      Plot.text(METHODS, {
        y: "key",
        x: "ms",
        text: (d) => `${d.ms >= 1000 ? `${(d.ms / 1000).toFixed(1)} s` : `${d.ms} ms`}\n${d.note}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
    ],
  });
}
