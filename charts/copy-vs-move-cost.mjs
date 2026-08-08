/**
 * What a move actually moves.
 *
 * A copy constructor duplicates what the object owns: a `std::vector` of a
 * million ints allocates a second buffer and copies four megabytes into it. A
 * move constructor takes the pointer, the size and the capacity, leaves the
 * source empty, and is done. Three machine words, whatever the vector holds.
 *
 * That is why the copy line rises with the payload and the move line is
 * horizontal, and why the horizontal line is the interesting one: the cost of
 * a move is a property of the *object header*, not of the data, so returning a
 * huge container by value is free in a way that has nothing to do with how
 * huge it is. It is also the reason moving a `std::array<int, N>` saves
 * nothing at all: there is no pointer to steal, so the move is a copy.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Bytes touched to transfer a vector against the number of elements it holds, on log axes. Copying rises in proportion to the payload; moving is a horizontal line at twenty-four bytes, the pointer, size and capacity.";

const ELEM = 4; // int
/** pointer + size + capacity on a 64-bit target. */
const HEADER = 24;
const AT = 1_000_000;

const sizes = Array.from({ length: 61 }, (_, i) => Math.round(Math.pow(10, 1 + (i * 6) / 60)));

const rows = sizes.flatMap((n) => [
  { key: "Copy: duplicate the buffer", n, bytes: n * ELEM },
  { key: "Move: take the pointer", n, bytes: HEADER },
]);

export const caption = `A copy constructor duplicates what the object owns: a vector of ${AT.toLocaleString()} ints allocates a second buffer and copies ${((AT * ELEM) / 1e6).toFixed(0)} MB into it. A move constructor takes the pointer, the size and the capacity, leaves the source empty and is finished: ${HEADER} bytes, whatever the vector holds. The flat line is the interesting one, because it means returning a huge container by value costs nothing *related to its size*. It also says exactly when a move buys nothing: \`std::array<int, N>\` stores its elements inline, so there is no pointer to steal and the move is a copy.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 72,
    marginRight: 158,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Elements in the vector",
      labelAnchor: "center",
      type: "log",
      domain: [10, 1e7],
      ticks: [10, 1000, 100_000, 1e7],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: {
      label: "Bytes touched",
      type: "log",
      domain: [10, 1e8],
      ticks: [10, 1000, 100_000, 1e7],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6} MB` : d >= 1000 ? `${d / 1000} KB` : `${d} B`),
    },
    marks: [
      Plot.line(rows.filter((d) => d.key.startsWith("Copy")), {
        x: "n",
        y: "bytes",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => !d.key.startsWith("Copy")), {
        x: "n",
        y: "bytes",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.ruleX([AT], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: 1e7,
        y: 1e7 * ELEM,
        text: () => "Copy: duplicate\nthe buffer",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1e7,
        y: HEADER,
        text: () => "Move: take the\npointer",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: AT,
        y: 5e6,
        text: () => `a million ints:\n${((AT * ELEM) / 1e6).toFixed(0)} MB against ${HEADER} bytes`,
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
