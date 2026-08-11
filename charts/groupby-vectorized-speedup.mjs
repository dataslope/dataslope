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
 *
 * ── Why lollipops and not bars ──────────────────────────────────────────────
 *
 * Nine milliseconds against 9.8 seconds is three orders of magnitude, so the
 * axis has to be logarithmic — and a bar on a log axis stops encoding its
 * value. A reader measures bar *length*, and on this scale the 9,800 bar was
 * about four times the 9 bar rather than a thousand times it, which reads as
 * "somewhat slower" for a difference that is not somewhat anything. A rule
 * running from the axis floor to a dot encodes *position* instead, which is
 * the channel a log scale is legible in, and the floor is drawn rather than
 * implied so nobody mistakes it for zero.
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

/** The axis floor, and the baseline every rule is drawn from. Drawn rather
 *  than implied: on a log scale there is no zero to anchor to. */
const FLOOR = 5;

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
      label: `Time for ${(ROWS / 1e6).toFixed(0)} million rows (each gridline is ten times the one before)`,
      labelAnchor: "center",
      type: "log",
      domain: [FLOOR, 30_000],
      ticks: [10, 100, 1000, 10_000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000} s` : `${d} ms`),
      grid: true,
    },
    y: { label: null, domain: METHODS.map((d) => d.key), padding: 0.3, grid: false },
    marks: [
      Plot.ruleY(METHODS, {
        y: "key",
        x1: FLOOR,
        x2: "ms",
        stroke: (d) => (d.ms === FAST ? PRIMARY : ACCENT),
        strokeWidth: 2,
        strokeOpacity: 0.4,
      }),
      Plot.dot(METHODS, {
        y: "key",
        x: "ms",
        fill: (d) => (d.ms === FAST ? PRIMARY : ACCENT),
        r: 5,
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
