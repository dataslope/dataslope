/**
 * What `approx_count_distinct` trades away, and what it buys.
 *
 * An exact distinct count has to remember every value it has seen, so its
 * memory is the cardinality: a hundred million distinct user ids is gigabytes
 * of hash table, and in a distributed engine that state has to be shuffled.
 * HyperLogLog remembers a fixed array of small registers instead, a few
 * kilobytes whatever the cardinality, and estimates the count from the longest
 * run of leading zeros it has seen.
 *
 * The error is the price and it is *bounded*, not "usually small": the
 * relative standard error is 1.04/√m for m registers, so it is a constant
 * fraction that does not degrade as the data grows. The chart is the memory of
 * both approaches with that error band drawn on the estimate, and the two axes
 * are the whole decision: exact counts cost memory proportional to the answer,
 * approximate counts cost a fixed few kilobytes and about 1% either way.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Memory used to count distinct values against the number of distinct values, on log axes. The exact count rises in proportion while a HyperLogLog sketch stays flat at a few kilobytes whatever the cardinality.";

/** 2^14 registers, the usual default: 16 KB and about 0.8% relative error. */
const REGISTERS = 16_384;
const SKETCH_BYTES = REGISTERS;
const ERROR = 1.04 / Math.sqrt(REGISTERS);
/** A hash-set entry: the value, a pointer and the table's slack. */
const BYTES_PER_VALUE = 48;

const sizes = Array.from({ length: 61 }, (_, i) => Math.round(Math.pow(10, 2 + (i * 6) / 60)));

const rows = sizes.flatMap((n) => [
  { key: "Exact: remember every value", n, bytes: n * BYTES_PER_VALUE },
  { key: "HyperLogLog sketch", n, bytes: SKETCH_BYTES },
]);

const AT = 100_000_000;

export const caption = `An exact distinct count has to remember every value, so its memory is the answer: ${(AT / 1e6).toFixed(0)} million distinct ids is about ${((AT * BYTES_PER_VALUE) / 1e9).toFixed(1)} GB of hash table, and in a distributed engine that state gets shuffled. HyperLogLog keeps ${REGISTERS.toLocaleString()} small registers instead, ${SKETCH_BYTES / 1024} KB flat, and estimates the count from the longest run of leading zeros it has seen. The error is the price and it is *bounded* rather than merely small: 1.04/√m, here ±${(ERROR * 100).toFixed(1)}%, a constant fraction that does not degrade as the data grows. Sketches also merge, so a daily one can answer a monthly question without rereading anything.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 74,
    marginRight: 166,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Distinct values",
      labelAnchor: "center",
      type: "log",
      domain: [100, 1e8],
      ticks: [100, 10_000, 1e6, 1e8],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: {
      label: "Memory",
      type: "log",
      domain: [1000, 2e10],
      ticks: [1e3, 1e6, 1e9],
      tickFormat: (d) => (d >= 1e9 ? `${d / 1e9} GB` : d >= 1e6 ? `${d / 1e6} MB` : `${d / 1e3} KB`),
    },
    marks: [
      Plot.line(rows.filter((d) => d.key.startsWith("Exact")), {
        x: "n",
        y: "bytes",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => !d.key.startsWith("Exact")), {
        x: "n",
        y: "bytes",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.text([{}], {
        x: 1e8,
        y: AT * BYTES_PER_VALUE,
        text: () => "Exact: remember\nevery value",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1e8,
        y: SKETCH_BYTES,
        text: () => `HyperLogLog:\n${SKETCH_BYTES / 1024} KB, ±${(ERROR * 100).toFixed(1)}%`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 140,
        y: 2e9,
        text: () => "the error does not grow with the data;\nthe memory does",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
