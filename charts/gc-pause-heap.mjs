/**
 * Why a bigger heap is not simply better, and why generational collection
 * exists.
 *
 * Two collectors on the same workload. A stop-the-world collector's pause is
 * proportional to the live set, so a larger heap means longer freezes and a
 * tail latency that nothing in the application can do anything about. A
 * generational collector's minor pauses depend on the nursery rather than the
 * whole heap, so they stay flat while the heap grows.
 *
 * That flatness is the entire design argument: most objects die young, so
 * collecting only the young generation touches a small, roughly constant amount
 * of live data however large the old generation gets.
 *
 * The figures are a model rather than a benchmark, and the caption says so; the
 * shapes are what generalise.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Pause time against heap size for a stop-the-world collector and a generational one. The stop-the-world pause grows with the heap to hundreds of milliseconds; the generational minor pause stays near a few milliseconds.";

const HEAPS = [0.5, 1, 2, 4, 8, 16, 32];
const NURSERY_MS = 2.4;

const rows = HEAPS.flatMap((gb) => [
  { gb, kind: "Stop-the-world (full heap)", ms: gb * 11 },
  // Minor collections scan the nursery, which does not grow with the heap.
  { gb, kind: "Generational (minor)", ms: NURSERY_MS + gb * 0.05 },
]);

const BIG = HEAPS.at(-1);
const stw = rows.find((r) => r.gb === BIG && r.kind.startsWith("Stop")).ms;
const gen = rows.find((r) => r.gb === BIG && r.kind.startsWith("Gen")).ms;

export const caption =
  `A full collection has to walk the live set, so its pause grows with the heap: ${stw.toFixed(0)}ms at ${BIG}GB, during which the application does nothing. A minor collection walks the nursery, which does not grow with the heap, so it stays near ${gen.toFixed(0)}ms. That is why most objects dying young is not a curiosity about programs but the assumption the collector is built on. These are model figures rather than a benchmark; the shapes are what generalise.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 62,
    marginRight: 122,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Heap size (GB)",
      labelAnchor: "center",
      domain: [0.5, BIG],
      ticks: HEAPS.length,
      tickFormat: (d) => String(d),
    },
    y: {
      type: "log",
      label: "Pause (ms)",
      domain: [1, 600],
      ticks: [1, 10, 100],
      tickFormat: String,
    },
    color: { domain: ["Stop-the-world (full heap)", "Generational (minor)"], range: [ACCENT, PRIMARY] },
    marks: [
      Plot.line(rows, { x: "gb", y: "ms", stroke: "kind", strokeWidth: 2 }),
      Plot.dot(rows, { x: "gb", y: "ms", fill: "kind", r: 3 }),
      Plot.ruleY([16], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: 0.55,
        y: 16,
        text: () => "one dropped frame",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: -9,
        ...HALO,
      }),
      Plot.text(
        [
          { gb: BIG, ms: stw, kind: "Stop-the-world (full heap)" },
          { gb: BIG, ms: gen, kind: "Generational (minor)" },
        ],
        {
          x: "gb",
          y: "ms",
          text: (d) => `${d.kind.split(" (")[0]}\n${d.ms.toFixed(0)} ms`,
          fill: "kind",
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
    ],
  });
}
