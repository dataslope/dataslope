/**
 * Why "it's only 300KB" is not a measurement: the cost of JavaScript is the
 * parsing and execution, and that depends on the device far more than on the
 * wire.
 *
 * Bytes on the x axis, main-thread time on the y, for a fast laptop and a
 * median phone. The two lines have very different slopes, so a bundle that is
 * imperceptible on the machine it was built on is seconds of frozen page on
 * the machine most people are holding. Download time is not in this chart at
 * all: this is what happens *after* the bytes have arrived.
 *
 * The per-byte rates are order-of-magnitude figures for parse plus compile plus
 * execute, and the figure says so. What is stable across every measurement of
 * this is the ratio between the devices, which is what the chart is for.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Main-thread time against JavaScript bundle size for a fast laptop and a median phone. At a megabyte the laptop spends about a second and the phone about five.";

/** Milliseconds per KB of uncompressed JS, parse + compile + execute. */
const DEVICES = [
  { key: "Fast laptop", msPerKb: 1.0, color: PRIMARY },
  { key: "Median phone", msPerKb: 5.2, color: ACCENT },
];

const KB = linspace(0, 1400, 60);
const rows = DEVICES.flatMap((d) =>
  KB.map((kb) => ({ key: d.key, color: d.color, kb, ms: kb * d.msPerKb })),
);

const AT = 1000;
const times = DEVICES.map((d) => ({ ...d, ms: AT * d.msPerKb }));
const RATIO = times[1].ms / times[0].ms;

export const caption =
  `A megabyte of JavaScript is about ${(times[0].ms / 1000).toFixed(1)}s of main-thread work on a fast laptop and ${(times[1].ms / 1000).toFixed(1)}s on a median phone: ${RATIO.toFixed(0)} times the cost, on the device most of your traffic uses. None of this is download time, which is a separate bill. It is what the page does with the bytes once it has them, and the page cannot do anything else while it does.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 29,
    marginRight: 110,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "JavaScript shipped (KB, uncompressed)", labelAnchor: "center", domain: [0, 1400], ticks: 5 },
    y: {
      label: "Main-thread time",
      domain: [0, 7400],
      ticks: 5,
      tickFormat: (d) => `${(d / 1000).toFixed(0)}s`,
    },
    marks: [
      Plot.line(rows, { x: "kb", y: "ms", stroke: "color", strokeWidth: 2 }),
      Plot.ruleX([AT], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.dot(times.map((t) => ({ ...t, kb: AT })), { x: "kb", y: "ms", fill: "color", r: 4 }),
      Plot.text(
        DEVICES.map((d) => ({ key: d.key, color: d.color, kb: 1400, ms: 1400 * d.msPerKb })),
        {
          x: "kb",
          y: "ms",
          text: "key",
          fill: "color",
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text(times.map((t) => ({ ...t, kb: AT })), {
        x: "kb",
        y: "ms",
        text: (d) => `${(d.ms / 1000).toFixed(1)}s`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 40,
        y: 7000,
        text: () => "download is a separate bill;\nthis is what happens after",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
