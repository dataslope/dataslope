/**
 * What "lazy" actually saves, stage by stage.
 *
 * An eager pipeline runs each stage to completion over the whole collection
 * and hands a finished intermediate to the next one, so a `take(10)` at the
 * end discards work that has already been paid for. A lazy pipeline is driven
 * from the *other* end: the consumer asks for one element, the request travels
 * back up the chain, and each stage does the least work that can satisfy it.
 * When ten elements are enough, the source is read about fifty times and
 * stops.
 *
 * The bars are on a log axis because the interesting comparison spans five
 * orders of magnitude, and the shape is the point: the eager pipeline's cost
 * is set by the size of the source, the lazy one's by the size of the answer.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Elements processed at each stage of a four-stage pipeline that ends in take ten, under eager and lazy evaluation, on a logarithmic scale. The eager bars are set by the size of the source; the lazy bars are set by the size of the answer.";

const SOURCE = 1_000_000;
const PASS_RATE = 0.2;
const WANTED = 10;

/** Rows the lazy pipeline has to pull to get `WANTED` past the filter. */
const PULLED = Math.round(WANTED / PASS_RATE);

const STAGES = [
  { key: "Read the source", eager: SOURCE, lazy: PULLED },
  { key: "Filter (20% pass)", eager: SOURCE, lazy: PULLED },
  { key: "Map", eager: SOURCE * PASS_RATE, lazy: WANTED },
  { key: "Take 10", eager: WANTED, lazy: WANTED },
];

const rows = STAGES.flatMap((s) => [
  { stage: s.key, mode: "Eager", n: s.eager },
  { stage: s.key, mode: "Lazy", n: s.lazy },
]);

const EAGER_TOTAL = STAGES.reduce((t, s) => t + s.eager, 0);
const LAZY_TOTAL = STAGES.reduce((t, s) => t + s.lazy, 0);

export const caption = `A million-row source, a filter that passes one row in five, a map, and \`take(${WANTED})\`. Eager evaluation runs every stage to completion and then throws away all but ten results: ${EAGER_TOTAL.toLocaleString()} element-visits. Lazy evaluation is driven from the consumer end, so each stage does only what the next one asks for and the source is read about ${PULLED} times: ${LAZY_TOTAL} visits. The eager pipeline's cost is set by the size of the input; the lazy one's by the size of the answer.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 30,
    marginLeft: 51,
    marginRight: 168,
    marginBottom: 46,
    ariaLabel: title,
    // The stage names hang off the right edge, in the same lane the bars'
    // value labels spill into: a bar reaching 1,000,000 of a 3,000,000 domain
    // ends near the frame edge and its label carries on past it. The pad puts
    // the names clear of the longest of those.
    fy: { label: null, tickPadding: 40, domain: STAGES.map((s) => s.key) },
    x: {
      label: "Elements processed",
      labelAnchor: "center",
      type: "log",
      domain: [1, 3_000_000],
      ticks: [1, 100, 10_000, 1_000_000],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: { label: null, domain: ["Eager", "Lazy"], padding: 0.24, grid: false },
    marks: [
      Plot.barX(rows, {
        fy: "stage",
        y: "mode",
        x1: 1,
        x2: "n",
        fill: (d) => (d.mode === "Eager" ? ACCENT : PRIMARY),
        fillOpacity: 0.7,
      }),
      Plot.text(rows, {
        fy: "stage",
        y: "mode",
        x: "n",
        text: (d) => d.n.toLocaleString(),
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 7,
        ...HALO,
      }),
    ],
  });
}
