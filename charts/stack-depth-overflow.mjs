/**
 * Where recursion runs out, and why the answer is a property of the frame
 * rather than of the algorithm.
 *
 * The stack is a fixed allocation, typically 8 MB for a main thread on Linux
 * and 1 MB for a Windows thread or a thread you spawn yourself. Every call
 * puts a frame on it: the return address, the saved registers, the parameters
 * and every local. Divide one by the other and you have the depth at which the
 * program dies, and the division is what makes this unintuitive, because a
 * function with a 4 KB buffer as a local runs out two hundred times sooner
 * than one with a couple of ints.
 *
 * The three lines are the same recursion with three frame sizes, and none of
 * them is doing anything unusual. The one that fails at a couple of thousand
 * calls is the one that declared a buffer.
 *
 * Each line stops where it meets the ceiling and is labelled at that point.
 */
import { Plot, plot, ACCENT, HALO, SERIES } from "./_theme.mjs";

export const title =
  "Stack used against recursion depth for three frame sizes, against an eight-megabyte limit. A small frame reaches a hundred thousand calls, while a frame holding a four-kilobyte buffer hits the limit before three thousand.";

const LIMIT_MB = 8;
const LIMIT = LIMIT_MB * 1024 * 1024;
const MIN_DEPTH = 100;
const MAX_DEPTH = 200_000;

const FRAMES = [
  { key: "48 bytes: a couple of locals", bytes: 48, color: SERIES[0] },
  { key: "512 bytes: a small struct", bytes: 512, color: SERIES[1] },
  { key: "4 KB: a buffer as a local", bytes: 4096, color: ACCENT },
];

/** Where each frame size exhausts the stack, capped at the frame's right edge
 *  so a line that never gets there is labelled at the edge instead. */
const limitAt = (f) => Math.floor(LIMIT / f.bytes);
const endOf = (f) => Math.min(limitAt(f), MAX_DEPTH);

// Two points per line: on log-log axes a proportional relationship is a
// straight segment, so there is nothing to sample in between.
const rows = FRAMES.flatMap((f) => [
  { key: f.key, color: f.color, d: MIN_DEPTH, used: MIN_DEPTH * f.bytes },
  { key: f.key, color: f.color, d: endOf(f), used: endOf(f) * f.bytes },
]);

const ENDS = FRAMES.map((f) => ({
  key: f.key,
  color: f.color,
  d: endOf(f),
  used: endOf(f) * f.bytes,
  crashes: limitAt(f) <= MAX_DEPTH,
}));

export const caption = `A stack is a fixed allocation: usually ${LIMIT_MB} MB for a main thread on Linux, and 1 MB for a thread you spawn. Each call puts a frame on it, so the depth at which a program dies is that budget divided by the frame size, and the frame size is set by the locals. The same recursion survives ${limitAt(FRAMES[0]).toLocaleString()} calls with a couple of ints and ${limitAt(FRAMES[2]).toLocaleString()} with a 4 KB buffer declared inside it. Nothing about the algorithm changed; a local did.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 68,
    marginRight: 158,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Recursion depth (calls)",
      labelAnchor: "center",
      type: "log",
      domain: [MIN_DEPTH, MAX_DEPTH],
      ticks: [100, 1000, 10_000, 100_000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: {
      label: "Stack used",
      type: "log",
      // Base 2: the ticks are powers of two, and a base-10 log scale labels
      // only the powers of ten among them, dropping 64 KB without a word.
      base: 2,
      domain: [1024, 32 * 1024 * 1024],
      ticks: [1024, 65_536, 1_048_576, 16_777_216],
      tickFormat: (d) => (d >= 1_048_576 ? `${d / 1_048_576} MB` : `${d / 1024} KB`),
    },
    marks: [
      Plot.line(rows, { x: "d", y: "used", z: "key", stroke: "color", strokeWidth: 2, clip: true }),
      Plot.ruleY([LIMIT], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "5 4" }),
      Plot.text([{}], {
        x: MIN_DEPTH,
        y: LIMIT,
        text: () => `${LIMIT_MB} MB: the stack runs out here`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        dy: -9,
        ...HALO,
      }),
      Plot.dot(ENDS, { x: "d", y: "used", fill: "color", r: 4.5 }),
      // All three lines end on the same rule, so the labels have to be
      // separated vertically rather than by anchor: one mark each, stepping
      // down a line at a time so three end-of-line labels can share a y.
      ...ENDS.map((d, i) =>
        Plot.text([d], {
          x: "d",
          y: "used",
          text: "key",
          fill: d.color,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "end",
          dx: -9,
          dy: 15 + i * 16,
          ...HALO,
        }),
      ),
    ],
  });
}
