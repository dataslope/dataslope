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
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "Array elements visited and intermediate arrays allocated, for a four-stage method chain against one hand-written loop over the same million rows.";

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

const rows = [
  { key: "Chained methods", part: "Elements visited", value: CHAIN_VISITS, color: SERIES[0] },
  { key: "Chained methods", part: "Arrays allocated", value: CHAIN_ARRAYS, color: SERIES[1] },
  { key: "One for-of loop", part: "Elements visited", value: N, color: SERIES[0] },
  { key: "One for-of loop", part: "Arrays allocated", value: 1, color: SERIES[1] },
];

export const caption = `Each stage of a chain walks its input and allocates a new array, so four stages over ${(N / 1e6).toFixed(0)} million rows is ${(CHAIN_VISITS / 1e6).toFixed(1)} million element visits and ${CHAIN_ARRAYS} arrays against ${(N / 1e6).toFixed(0)} million and one. Both are linear, and on the array sizes most code really handles the difference is microseconds, so this is not an argument against chaining: separable stages are easier to read, test and change than a fused loop. It is an argument about *scale*, and the part to picture is the allocations rather than the passes, because what hurts at a million rows is holding three throwaway copies alive at once.`;

export function render() {
  return plot({
    height: 280,
    marginTop: 30,
    marginLeft: 140,
    marginRight: 128,
    marginBottom: 46,
    ariaLabel: title,
    fy: { label: null, domain: ["Elements visited", "Arrays allocated"] },
    x: {
      label: "Count (log scale: the two rows are in different units)",
      labelAnchor: "center",
      type: "log",
      domain: [0.8, 5e6],
      ticks: [1, 100, 10_000, 1e6],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: { label: null, domain: ["Chained methods", "One for-of loop"], padding: 0.26, grid: false },
    marks: [
      Plot.barX(rows, {
        fy: "part",
        y: "key",
        x1: 0.8,
        x2: "value",
        fill: (d) => (d.key === "Chained methods" ? ACCENT : PRIMARY),
        fillOpacity: 0.7,
      }),
      Plot.text(rows, {
        fy: "part",
        y: "key",
        x: "value",
        text: (d) => (d.value >= 1e6 ? `${(d.value / 1e6).toFixed(1)}M` : String(d.value)),
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
    ],
  });
}
