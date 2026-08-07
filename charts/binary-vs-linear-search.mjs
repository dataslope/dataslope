/**
 * Linear search against binary search, in comparisons, on a log-log frame.
 *
 * "O(n) versus O(log n)" is a pair of symbols until you put a number on it.
 * At a thousand elements linear search is doing five hundred comparisons on
 * average and binary search is doing ten; at a million it is five hundred
 * thousand against twenty. Log-log is the right frame because binary search's
 * curve is otherwise indistinguishable from the axis: on a linear scale, the
 * whole of the interesting behaviour is a flat line at the bottom.
 *
 * Averages rather than worst cases for linear search (n/2), because that is
 * the honest comparison against binary search's ⌊log₂ n⌋ + 1, and the argument
 * does not need the pessimistic version to be overwhelming.
 */
import { Plot, plot, linspace, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Comparisons against array size on logarithmic axes. Linear search rises as a straight diagonal to half a million comparisons at a million elements; binary search stays almost flat, reaching twenty.";

export const caption =
  "The cost of finding one element. Sorting the array first buys you the lower line, and the gap between the two is the whole reason binary search exists: at a million elements it is twenty comparisons against half a million.";

const MIN_N = 10;
const MAX_N = 1e6;
const NS = linspace(Math.log10(MIN_N), Math.log10(MAX_N), 140).map((e) => Math.pow(10, e));

const METHODS = [
  { key: "Linear search", f: (n) => n / 2, color: SERIES[1] },
  { key: "Binary search", f: (n) => Math.floor(Math.log2(n)) + 1, color: SERIES[0] },
];

const curves = METHODS.flatMap((m) =>
  NS.map((n) => ({ key: m.key, color: m.color, n, comparisons: Math.max(m.f(n), 1) })),
);

// One worked size, called out on both curves, because a single concrete pair
// of numbers does more than the shape alone.
const AT = 1e6;
const CALLOUTS = METHODS.map((m) => ({
  key: m.key,
  color: m.color,
  n: AT,
  comparisons: m.f(AT),
}));

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 132,
    ariaLabel: title,
    x: {
      label: "Elements in the array",
      labelAnchor: "center",
      type: "log",
      domain: [MIN_N, MAX_N],
      ticks: [10, 100, 1000, 10000, 100000, 1000000],
      tickFormat: (d) => (d >= 1000000 ? "1M" : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: {
      label: "Comparisons",
      type: "log",
      domain: [1, 1e6],
      ticks: [1, 10, 100, 1000, 10000, 100000, 1000000],
      tickFormat: (d) => (d >= 1000000 ? "1M" : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    marks: [
      Plot.lineY(curves, {
        x: "n",
        y: "comparisons",
        z: "key",
        stroke: (d) => d.color,
        strokeWidth: 2,
        clip: true,
      }),
      Plot.dot(CALLOUTS, { x: "n", y: "comparisons", r: 4, fill: (d) => d.color, stroke: null }),
      Plot.text(CALLOUTS, {
        x: "n",
        y: "comparisons",
        text: (d) =>
          `${d.key}\n${d.comparisons >= 1000 ? `${Math.round(d.comparisons / 1000)}k` : d.comparisons} comparisons`,
        fill: (d) => d.color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 11,
      }),
      Plot.text([{}], {
        x: 3000,
        y: 30000,
        text: () => "at a million elements,\nthe gap is 25,000×",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
