/**
 * Why the same number of operations can take fifteen times as long: the loop
 * that walks memory in order gets a whole cache line per miss, and the one that
 * strides gets one useful value per miss.
 *
 * Time per element against stride, for a walk over an array far larger than
 * the last-level cache. Up to a stride of one cache line the cost is flat,
 * because the values a miss brought in are all used. Past it the cost jumps to
 * one miss per element and stays there: striding further cannot make it worse,
 * because it is already as bad as it gets.
 *
 * The cache line is 64 bytes on every x86 and ARM core you will meet, so the
 * knee lands at 16 four-byte ints. Its position is computed from those two
 * numbers, which is the point: the shape of this curve is a fact about the
 * hardware rather than about the program.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Time per element against stride on log axes: flat while the stride fits inside a cache line, then a step up to a plateau once every access costs its own cache miss.";

const LINE_BYTES = 64;
const ELEM_BYTES = 4;
const KNEE = LINE_BYTES / ELEM_BYTES;
const STRIDES = [1, 2, 4, 8, 16, 32, 64, 128, 256];

const HIT_NS = 0.9;
const MISS_NS = 13.5;

/** Elements served per miss: a line holds KNEE of them, and a stride of s uses
 *  every s-th, so the useful share falls until one element costs one miss. */
const rows = STRIDES.map((stride) => {
  const perMiss = Math.max(1, KNEE / stride);
  return { stride, ns: HIT_NS + MISS_NS / perMiss, perMiss };
});

const FIRST = rows[0];
const PLATEAU = rows.at(-1);
const RATIO = PLATEAU.ns / FIRST.ns;

export const caption =
  `Same loop, same element count, different step. A ${LINE_BYTES}-byte cache line holds ${KNEE} four-byte ints, so a stride of ${KNEE} or more wastes the whole line on one value and the cost flattens at one miss per element: about ${RATIO.toFixed(0)} times the sequential walk. Everything past the knee costs the same, because it is already as bad as it gets.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 62,
    marginRight: 34,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Stride (elements)",
      labelAnchor: "center",
      domain: [1, 256],
      ticks: STRIDES,
      tickFormat: String,
    },
    y: { label: "Nanoseconds per element", domain: [0, MISS_NS + HIT_NS + 2], ticks: 5 },
    marks: [
      Plot.areaY(rows, { x: "stride", y: "ns", fill: PRIMARY, fillOpacity: 0.13 }),
      Plot.line(rows, { x: "stride", y: "ns", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(rows, { x: "stride", y: "ns", fill: PRIMARY, r: 3 }),
      Plot.ruleX([KNEE], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: KNEE,
        y: 2,
        text: () => `stride ${KNEE} = one cache line`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
      Plot.text([PLATEAU], {
        x: "stride",
        y: "ns",
        text: () => "one miss per element,\nand no worse",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dy: 24,
        ...HALO,
      }),
      Plot.text([FIRST], {
        x: "stride",
        y: "ns",
        text: () => "sequential: the line\nis fully used",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 10,
        dy: -26,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
