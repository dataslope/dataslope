/**
 * The complexity classes, drawn to scale, on a log y-axis.
 *
 * A linear axis is the wrong tool here and is why most Big-O pictures teach
 * nothing: at n = 100, n² is 10,000 and log n is 7, so everything below n
 * flattens onto the axis and the only visible fact is "n² is big". On a log
 * scale each class is a straight line of its own slope, which is the actual
 * content — the *rate*, not the height. O(1) is flat, O(log n) is nearly flat,
 * O(n) climbs steadily, O(n log n) shadows it, O(n²) climbs twice as fast, and
 * O(2ⁿ) leaves the frame before n = 30.
 */
import { Plot, plot, linspace, sidedText, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Six complexity curves on a logarithmic vertical axis: constant, logarithmic, linear, linearithmic, quadratic and exponential. Each is a straight line of a different slope, with the exponential curve leaving the top of the chart before n reaches 30.";

export const caption =
  "Operations against input size, on a log scale so each class is a straight line and the slope is the growth rate. The exponential curve runs off the top before n = 30; that is the whole difference between a slow algorithm and an unusable one.";

const MAX_N = 100;
const CEILING = 1e6; // where the frame stops, so 2ⁿ visibly exits rather than compressing everything else

const CLASSES = [
  { label: "O(1)", f: () => 1, color: SERIES[4] },
  { label: "O(log n)", f: (n) => Math.log2(n), color: SERIES[2] },
  { label: "O(n)", f: (n) => n, color: SERIES[0] },
  { label: "O(n log n)", f: (n) => n * Math.log2(n), color: SERIES[3] },
  { label: "O(n²)", f: (n) => n * n, color: SERIES[1] },
  { label: "O(2ⁿ)", f: (n) => Math.pow(2, n), color: ACCENT },
];

const NS = linspace(1, MAX_N, 200);

const curves = CLASSES.flatMap((c) =>
  NS.map((n) => ({ label: c.label, n, ops: Math.max(c.f(n), 1) })).filter(
    (d) => d.ops <= CEILING,
  ),
);

/** Each line labelled where it leaves the frame, or at the right edge if it
 *  never does, so no label sits on another line. */
const LABELS = CLASSES.map((c) => {
  const inside = NS.filter((n) => Math.max(c.f(n), 1) <= CEILING);
  const at = inside[inside.length - 1];
  return { label: c.label, n: at, ops: Math.max(c.f(at), 1), color: c.color, exits: at < MAX_N };
});

export function render() {
  return plot({
    height: 360,
    marginTop: 24,
    marginLeft: 62,
    marginRight: 84,
    ariaLabel: title,
    x: { label: "Input size (n)", labelAnchor: "center", domain: [1, MAX_N], ticks: 6 },
    y: {
      label: "Operations",
      type: "log",
      domain: [1, CEILING],
      ticks: [1, 10, 100, 1000, 10000, 100000, 1000000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    marks: [
      Plot.lineY(curves, {
        x: "n",
        y: "ops",
        z: "label",
        stroke: (d) => CLASSES.find((c) => c.label === d.label).color,
        strokeWidth: 2,
        clip: true,
      }),
      // A curve that exits the top is labelled to its left, under the point
      // where it leaves; one that reaches the right edge is labelled beyond
      // it, in the margin kept clear for exactly this.
      ...sidedText(
        LABELS,
        {
          side: (d) => (d.exits ? "end" : "start"),
          x: "n",
          y: "ops",
          text: "label",
          fill: (d) => d.color,
          fontSize: 12,
          fontWeight: 600,
          ...HALO,
        },
        { start: { dx: 8 }, end: { dx: -8, dy: -8 } },
      ),
      Plot.text([{ n: MAX_N * 0.52, ops: CEILING * 0.55 }], {
        x: "n",
        y: "ops",
        text: () => "anything that exits here is unusable at scale",
        fill: MUTED,
        fontSize: 11.5,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
