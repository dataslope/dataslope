/**
 * Amdahl's law: the ceiling that the serial part of a program puts on every
 * core you can throw at it.
 *
 * Speedup with n cores is 1 / (s + (1-s)/n) where s is the fraction that
 * cannot be parallelised. The shape is the lesson: each curve flattens at 1/s
 * no matter how many cores arrive, so a program that is 5% serial can never
 * beat 20x and is within a few percent of that ceiling by a few hundred cores.
 *
 * The dashed asymptotes are drawn because the curves alone let a reader hope
 * the line keeps climbing off the right-hand edge. It does not, and the
 * horizontal line is where it stops.
 *
 * The ceilings are computed from the serial fractions, so the labels and the
 * lines cannot disagree.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Speedup against core count for programs that are 1, 5 and 25 percent serial, on a log core axis. Each curve rises and then flattens at its own ceiling: a hundred times, twenty times, and four times.";

const SERIAL = [0.01, 0.05, 0.25];
const CORES = linspace(0, 3, 90).map((e) => 10 ** e);

const rows = SERIAL.flatMap((s, i) =>
  CORES.map((n) => ({
    key: `${(s * 100).toFixed(0)}% serial`,
    color: SERIES[i % SERIES.length],
    ceiling: 1 / s,
    n,
    speedup: 1 / (s + (1 - s) / n),
  })),
);

const CEILINGS = SERIAL.map((s, i) => ({
  key: `${(s * 100).toFixed(0)}% serial`,
  color: SERIES[i % SERIES.length],
  ceiling: 1 / s,
}));

const MID = CEILINGS[1];

export const caption =
  `Speedup is 1 / (s + (1-s)/n), and it flattens at 1/s however many cores you add. A program that is ${MID.key} tops out at ${MID.ceiling.toFixed(0)}x and is most of the way there by a hundred cores; the next nine hundred buy almost nothing. Parallelism is bounded by the part you did not parallelise, not by the hardware.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 152,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Cores",
      labelAnchor: "center",
      domain: [1, 1000],
      ticks: [1, 10, 100, 1000],
      tickFormat: String,
    },
    y: { label: "Speedup", domain: [0, 108], ticks: 5, tickFormat: (d) => `${d}x` },
    marks: [
      Plot.ruleY(CEILINGS, {
        y: "ceiling",
        stroke: "color",
        strokeOpacity: 0.45,
        strokeDasharray: "4,3",
      }),
      Plot.line(rows, { x: "n", y: "speedup", stroke: "color", strokeWidth: 2 }),
      Plot.text(CEILINGS, {
        x: 1000,
        y: "ceiling",
        text: (d) => `${d.key}\ncaps at ${d.ceiling.toFixed(0)}x`,
        fill: "color",
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1.15,
        y: 100,
        text: () => "the dashed lines are where\neach one stops, forever",
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
