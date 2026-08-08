/**
 * The three lookup shapes, which is really the whole reason there is more than
 * one collection type.
 *
 * Scanning a list compares half its elements on average, so the work is the
 * size of the collection. A sorted structure halves the candidates each step,
 * so the work is the number of times you can halve it. A hash table computes
 * where the item would be and looks there, so the work does not depend on the
 * size at all.
 *
 * On a log-log plot those three become a diagonal, a nearly flat line and a
 * horizontal line, and the gap at a million elements is the answer to "does
 * the collection choice matter?": half a million comparisons, twenty, or one.
 * Choosing the wrong one is not a micro-optimisation, and it is invisible in
 * a test with fifty rows.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Comparisons needed to find one item against collection size, on log axes. Scanning a list is a rising diagonal, a sorted binary search is nearly flat, and a hash lookup is a horizontal line at about one.";

const AT = 1_000_000;

const SHAPES = [
  { key: "Scan a list", f: (n) => n / 2, color: ACCENT },
  { key: "Binary search, sorted", f: (n) => Math.log2(n), color: SERIES[1] },
  { key: "Hash lookup", f: () => 1.1, color: SERIES[0] },
];

const sizes = Array.from({ length: 51 }, (_, i) => Math.round(Math.pow(10, 1 + (i * 6) / 50)));

const rows = SHAPES.flatMap((s) =>
  sizes.map((n) => ({ key: s.key, color: s.color, n, work: Math.max(s.f(n), 1) })),
);

export const caption = `Scanning compares half the collection, a sorted search halves the candidates each step, and a hash lookup computes where the item would be and looks there. At ${AT.toLocaleString()} items that is ${(AT / 2).toLocaleString()} comparisons, ${Math.round(Math.log2(AT))}, and one. The choice is not a micro-optimisation, and it is completely invisible in a test with fifty rows, which is why it is usually discovered in production.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 150,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Items in the collection",
      labelAnchor: "center",
      type: "log",
      domain: [10, 1e7],
      ticks: [10, 1000, 100_000, 1e7],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: {
      label: "Comparisons to find one item",
      type: "log",
      domain: [0.9, 1e7],
      ticks: [1, 100, 10_000, 1e6],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    marks: [
      Plot.line(rows, { x: "n", y: "work", z: "key", stroke: "color", strokeWidth: 2 }),
      ...SHAPES.map((s) =>
        Plot.text([{}], {
          x: 1e7,
          y: Math.max(s.f(1e7), 1),
          text: () => s.key,
          fill: s.color,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        }),
      ),
      Plot.ruleX([AT], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: AT,
        y: 4_000_000,
        text: () => `at a million items:\n500k, ${Math.round(Math.log2(AT))}, or 1`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
    ],
  });
}
