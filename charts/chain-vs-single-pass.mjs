/**
 * What a chain of array methods costs, and what it does not.
 *
 * `.filter().map().filter().map()` walks the array once per stage and
 * allocates a new array at each one, so four stages over a million rows is
 * four passes and three intermediates that exist only to be thrown away. A
 * hand-written loop is one pass and one allocation. That is a real difference
 * and it is a *constant factor*: both are linear, and on the array sizes most
 * code actually handles, the difference is microseconds.
 *
 * So this chart is not an argument against chaining. Chained stages are
 * separable, testable and readable in a way a fused loop is not, and the right
 * time to fuse them is when a profiler says so. The chart is there because the
 * intermediate arrays are the part people do not picture: what makes a chain
 * expensive at scale is rarely the extra passes, it is holding three copies of
 * a large array alive at once.
 *
 * ── Why the bars are ratios and not counts ──────────────────────────────────
 *
 * The two rows measure different things — element visits in the millions,
 * array allocations in single digits — and the first version of this figure
 * put both on one logarithmic axis, with the axis label apologising for it
 * ("the two rows are in different units"). Two defects came out of that. Plot
 * facets share every scale, so a single axis was the only option, and the
 * quantities do not belong on one; and a *bar* on a log axis stops meaning
 * anything, because the reader measures its length and length is no longer
 * proportional to the value. Four arrays against one drew as a bar roughly
 * two-thirds the length of the other rather than four times it.
 *
 * Expressing both rows against the single-pass loop fixes both at once. "Times
 * the loop" is one unit, so the shared scale is honest and linear, bars encode
 * it correctly, and the ratio was the comparison the figure wanted in the first
 * place. The absolute counts are still here, printed at the end of each bar,
 * where they cost nothing and mislead nobody.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Array element visits and intermediate array allocations for a four-stage method chain, each shown as a multiple of what one hand-written loop over the same million rows costs. The chain visits twice as many elements and allocates four times as many arrays.";

const N = 1_000_000;
const KEEP = 0.4;

/** filter → map → filter → map, with each stage narrowing as the filters bite. */
const STAGES = [
  { key: ".filter(inStock)", visits: N, out: N * KEEP },
  { key: ".map(toSummary)", visits: N * KEEP, out: N * KEEP },
  { key: ".filter(isCheap)", visits: N * KEEP, out: N * KEEP * 0.5 },
  { key: ".map(format)", visits: N * KEEP * 0.5, out: N * KEEP * 0.5 },
];

const CHAIN_VISITS = STAGES.reduce((s, d) => s + d.visits, 0);
const CHAIN_ARRAYS = STAGES.length;

const millions = (v) => `${(v / 1e6).toFixed(1)}M elements`;
const arrays = (v) => `${v} ${v === 1 ? "array" : "arrays"}`;

const CHAIN = "Chained methods";
const LOOP = "One for-of loop";
const VISITS = "Elements visited";
const ALLOCS = "Arrays allocated";

/** Every bar is a multiple of the loop's own cost, which is what makes one
 *  shared axis legitimate across two rows measuring different things. */
const rows = [
  { part: VISITS, key: CHAIN, times: CHAIN_VISITS / N, note: millions(CHAIN_VISITS) },
  { part: VISITS, key: LOOP, times: 1, note: millions(N) },
  { part: ALLOCS, key: CHAIN, times: CHAIN_ARRAYS, note: arrays(CHAIN_ARRAYS) },
  { part: ALLOCS, key: LOOP, times: 1, note: arrays(1) },
];

const XMAX = Math.max(...rows.map((d) => d.times)) + 1.4;

export const caption = `Each stage of a chain walks its input and allocates a new array, so four stages over ${(N / 1e6).toFixed(0)} million rows is ${(CHAIN_VISITS / 1e6).toFixed(1)} million element visits and ${CHAIN_ARRAYS} arrays against ${(N / 1e6).toFixed(0)} million and one: twice the walking and four times the allocating. Both are linear, and on the array sizes most code really handles the difference is microseconds, so this is not an argument against chaining: separable stages are easier to read, test and change than a fused loop. It is an argument about *scale*, and the part to picture is the allocations rather than the passes, because what hurts at a million rows is holding three throwaway copies alive at once.`;

export function render() {
  return plot({
    height: 280,
    marginTop: 30,
    marginLeft: 132,
    marginRight: 118,
    marginBottom: 46,
    ariaLabel: title,
    fy: { label: null, domain: [VISITS, ALLOCS] },
    x: {
      label: "Times what the single-pass loop costs",
      labelAnchor: "center",
      domain: [0, XMAX],
      ticks: [1, 2, 3, 4],
      tickFormat: (d) => `${d}×`,
    },
    y: { label: null, domain: [CHAIN, LOOP], padding: 0.26, grid: false },
    marks: [
      Plot.barX(rows, {
        fy: "part",
        y: "key",
        x1: 0,
        x2: "times",
        fill: (d) => (d.key === CHAIN ? ACCENT : PRIMARY),
        fillOpacity: 0.7,
      }),
      Plot.text(rows, {
        fy: "part",
        y: "key",
        x: "times",
        text: "note",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
