/**
 * What an object costs before it holds anything, which is the answer to "why
 * is `int[]` not the same as `List<Integer>`?".
 *
 * On a 64-bit JVM every object carries a header: a mark word for the identity
 * hash, lock state and GC bits, plus a compressed class pointer, and the whole
 * thing is padded to an eight-byte boundary. That is 16 bytes for an object
 * whose entire content is one `int`. Reaching it through a collection costs a
 * reference as well, and `ArrayList` keeps spare capacity, so the same four
 * bytes of information arrives with about twenty-four bytes of packaging.
 *
 * A primitive array has none of it: one header for the whole array, then the
 * values end to end. The difference is a factor of six, and it is also a
 * locality difference, because the boxed version is a array of pointers into
 * scattered heap objects while the primitive one is a single contiguous run.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Bytes per element for one million integers under four layouts: a primitive array at four bytes, a boxed array at twenty, an ArrayList at about twenty-four, and a two-field object at thirty-two.";

const N = 1_000_000;

/** 12-byte header (mark word + compressed class pointer), padded to 8. */
const LAYOUTS = [
  { key: "int[]", bytes: 4, note: "value, end to end" },
  { key: "Integer[]", bytes: 20, note: "16-byte object + 4-byte reference" },
  { key: "ArrayList<Integer>", bytes: 24, note: "plus spare capacity" },
  { key: "A 2-field object", bytes: 32, note: "header, 2 fields, padding, reference" },
];

const BASE = LAYOUTS[0].bytes;
const RATIO = (LAYOUTS[2].bytes / BASE).toFixed(0);

export const caption = `Every object on a 64-bit JVM carries a 12-byte header (a mark word for identity hash, lock state and GC bits, plus a compressed class pointer) padded to an 8-byte boundary, so an object holding one \`int\` costs 16 bytes and a reference to it costs 4 more. A primitive array has one header for the whole array and then the values end to end. For a million integers that is ${((N * BASE) / 1e6).toFixed(0)} MB against ${((N * LAYOUTS[2].bytes) / 1e6).toFixed(0)} MB, a factor of ${RATIO}, and the boxed version is scattered across the heap while the primitive one is a single contiguous run.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 156,
    marginRight: 210,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Bytes per element", labelAnchor: "center", domain: [0, 34], ticks: 5 },
    y: { label: null, domain: LAYOUTS.map((d) => d.key), padding: 0.3, grid: false },
    marks: [
      Plot.barX(LAYOUTS, {
        y: "key",
        x: "bytes",
        fill: (d) => (d.bytes === BASE ? PRIMARY : ACCENT),
        fillOpacity: (d) => (d.bytes === BASE ? 0.7 : 0.3 + (0.4 * d.bytes) / 32),
      }),
      Plot.text(LAYOUTS, {
        y: "key",
        x: "bytes",
        text: (d) => `${d.bytes} bytes\n${d.note}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.ruleX([BASE], { stroke: PRIMARY, strokeDasharray: "4 3", strokeOpacity: 0.7 }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
