/**
 * Expectation as a balance point, on the lesson's own weighted die.
 *
 * The trap this exists to close is "E[X] is the value you expect to see".
 * Drawn as a fulcrum under the pmf, E[X] is visibly *not* a bar — it sits in
 * the gap between 4 and 5 on a die that has no such face, and it is nowhere
 * near the tallest bar either. Both misreadings, "the typical value" and "the
 * most likely value", are refuted by the same picture.
 *
 * The pmf is the lesson's: values 1 to 6 with probabilities 0.1 each except a
 * 0.5 on the six, so E[X] = 4.5 and the mode is 6.
 */
import { Plot, plot, ACCENT, HALO, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "The probability mass function of a weighted die as six bars, five short and one tall at six. A triangular fulcrum sits under the axis at 4.5, between the four and five bars, marking the expected value.";

export const caption =
  "The expected value is where the pmf balances, not the value you expect to see. Here it is 4.5, which is not a face the die has, and it is not the most likely outcome either. That is the mode, out at 6.";

const VALUES = [1, 2, 3, 4, 5, 6];
const PROBS = [0.1, 0.1, 0.1, 0.1, 0.1, 0.5];

const bars = VALUES.map((v, i) => ({ v, p: PROBS[i] }));
const EV = bars.reduce((s, d) => s + d.v * d.p, 0);
const MODE = bars.reduce((a, b) => (b.p > a.p ? b : a)).v;

export function render() {
  return plot({
    height: 320,
    marginTop: 30,
    marginLeft: 52,
    marginBottom: 62,
    ariaLabel: title,
    x: {
      label: "Value on the die",
      labelAnchor: "center",
      domain: [0.3, 6.7],
      ticks: VALUES,
      tickFormat: (d) => String(d),
    },
    // Headroom above the tall bar for the mode label, and the domain starts
    // below zero so the fulcrum has somewhere to sit.
    y: { label: "Probability", domain: [-0.09, 0.6], ticks: [0, 0.2, 0.4, 0.6] },
    marks: [
      Plot.rectY(bars, {
        x1: (d) => d.v - 0.34,
        x2: (d) => d.v + 0.34,
        y: "p",
        fill: (d) => (d.v === MODE ? SERIES[1] : PRIMARY),
        fillOpacity: 0.55,
      }),
      Plot.text([{ v: MODE, p: PROBS[MODE - 1] }], {
        x: "v",
        y: "p",
        text: () => "mode: the likeliest\nsingle outcome",
        fill: SERIES[1],
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -16,
        dy: -22,
        ...HALO,
      }),

      // The fulcrum, drawn below the axis so it reads as something the bars
      // are resting on rather than another quantity plotted against them.
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
      Plot.dot([EV], {
        x: (d) => d,
        y: -0.014,
        symbol: "triangle",
        r: 7,
        fill: ACCENT,
        stroke: null,
      }),
      Plot.text([EV], {
        x: (d) => d,
        y: -0.045,
        text: (d) => `E[X] = ${d.toFixed(1)}, not a face on this die`,
        fill: ACCENT,
        fontSize: 12.5,
        fontWeight: 600,
        ...HALO,
      }),
    ],
  });
}
