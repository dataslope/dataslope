/**
 * Why buffered I/O exists, priced per call.
 *
 * A `write(2)` is not a function call. It traps into the kernel, switches
 * privilege level, copies the buffer across the boundary, and comes back, and
 * the mitigations for speculative-execution attacks made that crossing several
 * times more expensive than it used to be. The cost is per *call*, not per
 * byte, so writing a file one character at a time pays it once per character.
 *
 * A buffered stream (`FILE*`, `BufferedWriter`, a `bufio.Writer`) copies into
 * user memory until it has a page or so, then makes one syscall for the lot.
 * The curve is the total cost of writing a fixed 64 KB with the buffer size on
 * the x axis, and it flattens hard: almost all of the benefit is bought by the
 * first kilobyte, which is why the default is a few kilobytes and why tuning
 * it further is rarely worth measuring.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Time to write sixty-four kilobytes against the buffer size used, on log axes. Unbuffered single-byte writes cost milliseconds; the curve falls steeply through the first kilobyte and is essentially flat after four.";

const TOTAL_BYTES = 64 * 1024;
/** Microseconds. A round trip through the kernel, post-mitigations. */
const SYSCALL_US = 1.4;
/** Microseconds per byte of memcpy inside the process. */
const COPY_US = 0.00008;

const cost = (buf) => (TOTAL_BYTES / buf) * SYSCALL_US + TOTAL_BYTES * COPY_US;

const sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
const rows = sizes.map((buf) => ({ buf, us: cost(buf) }));

const DEFAULT_BUF = 4096;
const SAVED = Math.round(cost(1) / cost(DEFAULT_BUF));

export const caption = `A syscall is not a function call: it traps into the kernel, switches privilege level, copies across the boundary and returns, and the speculative-execution mitigations made that crossing several times more expensive than it was. The cost is per *call*, so writing ${TOTAL_BYTES / 1024} KB one byte at a time pays it ${TOTAL_BYTES.toLocaleString()} times, about ${(cost(1) / 1000).toFixed(0)} ms, against ${cost(DEFAULT_BUF).toFixed(0)} µs through a ${DEFAULT_BUF / 1024} KB buffer: ${SAVED}× for one line of setup. Note where the curve flattens. Almost all of it is bought by the first kilobyte, which is why library defaults sit where they do and why tuning past them is rarely worth measuring.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 76,
    marginRight: 128,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Buffer size (bytes)",
      labelAnchor: "center",
      type: "log",
      // Base 2, because the ticks are powers of two: on a base-10 log scale
      // d3 formats only the "nice" values and returns an empty string for the
      // rest, so 256, 4k and 64k would silently render as unlabelled ticks.
      base: 2,
      domain: [1, 65536],
      ticks: [1, 16, 256, 4096, 65536],
      tickFormat: (d) => (d >= 1024 ? `${d / 1024}k` : String(d)),
    },
    y: {
      label: `Time to write ${TOTAL_BYTES / 1024} KB`,
      type: "log",
      domain: [3, 200_000],
      ticks: [10, 100, 1000, 10_000, 100_000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000} ms` : `${d} µs`),
    },
    marks: [
      Plot.line(rows, { x: "buf", y: "us", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(rows, { x: "buf", y: "us", fill: PRIMARY, r: 2.6 }),
      Plot.ruleX([DEFAULT_BUF], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.dot([{}], { x: DEFAULT_BUF, y: cost(DEFAULT_BUF), fill: ACCENT, r: 4.5 }),
      Plot.text([{}], {
        x: DEFAULT_BUF,
        y: cost(DEFAULT_BUF),
        text: () => "a typical library default",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -10,
        dy: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1.3,
        y: cost(1),
        text: () => "one syscall per byte",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dy: -12,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 20,
        y: 8,
        text: () => "past a kilobyte the copying dominates\nand there is nothing left to save",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
