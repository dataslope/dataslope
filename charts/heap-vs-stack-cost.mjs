/**
 * Why stack allocation is free and heap allocation is not.
 *
 * A stack allocation is one instruction: move the stack pointer. A heap
 * allocation is a call into an allocator that has to find a block, possibly
 * split it, update its own bookkeeping, and eventually give it back. The bars
 * are the rough cost of each, and the ratio is the reason a hot loop that
 * allocates is a hot loop that is mostly allocating.
 *
 * The second group is the part people forget: the free is a second cost, and
 * fragmentation makes both grow over a long-running process, which is why an
 * allocator's *average* cost is not its cost in your program.
 *
 * These are order-of-magnitude figures for a general-purpose allocator, and
 * the figure says so. What is stable is that the gap is two orders of
 * magnitude, not one.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Approximate cost in nanoseconds of a stack allocation, a heap allocation, a free, and a heap allocation in a fragmented process, on a log axis spanning two orders of magnitude.";

const OPS = [
  { key: "Stack: move the pointer", ns: 0.4, kind: "stack" },
  { key: "Heap: malloc, fresh", ns: 22, kind: "heap" },
  { key: "Heap: free", ns: 18, kind: "heap" },
  { key: "Heap: malloc, fragmented", ns: 95, kind: "heap" },
];

const STACK = OPS[0];
const HEAP = OPS[1];
const RATIO = HEAP.ns / STACK.ns;

export const caption =
  `A stack allocation is an add on the stack pointer, and the compiler often removes it entirely. A heap allocation is a function call that searches, splits, and records: about ${RATIO.toFixed(0)} times the cost, before the matching free and before fragmentation makes the search longer. These are order-of-magnitude figures for a general-purpose allocator; what is stable is that the gap is two orders of magnitude rather than one.`;

export function render() {
  return plot({
    height: 290,
    marginTop: 34,
    marginLeft: 196,
    marginRight: 82,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Nanoseconds",
      labelAnchor: "center",
      domain: [0.2, 200],
      ticks: [1, 10, 100],
      tickFormat: String,
    },
    y: { label: null, domain: OPS.map((o) => o.key), padding: 0.3 },
    marks: [
      Plot.barX(OPS, {
        y: "key",
        x1: 0.2,
        x2: "ns",
        fill: (d) => (d.kind === "stack" ? PRIMARY : ACCENT),
        fillOpacity: 0.5,
      }),
      Plot.text(OPS, {
        y: "key",
        x: "ns",
        text: (d) => `${d.ns} ns`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([STACK], {
        y: "key",
        x: 200,
        text: () => "often optimised away entirely",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleX([0.2], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
