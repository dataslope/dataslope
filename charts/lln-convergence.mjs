/**
 * The law of large numbers, as it actually behaves: five independent runs of a
 * fair coin, each tracking its running proportion of heads.
 *
 * Five runs rather than one, because a single trace looks like a fact and five
 * look like a law. What converges is the *proportion*, and it converges slowly
 * and unevenly — the early wobble is enormous and every run is still visibly
 * off 0.5 at a hundred flips. That is the honest picture, and it is the one
 * that inoculates against "I flipped twenty times and got twelve heads, the
 * coin is biased".
 *
 * The flip count is logarithmic because the interesting behaviour is all in
 * the first fifty flips: on a linear axis those are a smear against the left
 * edge and the remaining nine tenths of the width is five near-flat lines. Log
 * spacing gives each order of magnitude the same room, which is also the right
 * frame for the law itself — the error shrinks with √n, so it is the *tenfold*
 * increases in n that are worth equal space.
 */
import { Plot, plot, rng, GUIDE, PRIMARY } from "./_theme.mjs";

export const title =
  "Five traces of the running proportion of heads over 400 coin flips. All five swing wildly in the first few dozen flips and settle toward one half, still visibly scattered at the end.";

export const caption =
  "Five runs of the same fair coin. The proportion converges on 0.5, but slowly and from wherever the early flips left it: at 20 flips anything between 0.3 and 0.7 is ordinary.";

const FLIPS = 400;
const RUNS = 5;

// Seeded, so the figure is byte-identical on every build (see rng()).
const traces = Array.from({ length: RUNS }, (_, r) => {
  const next = rng(90210 + r * 7);
  let heads = 0;
  return Array.from({ length: FLIPS }, (_, i) => {
    heads += next() < 0.5 ? 1 : 0;
    return { run: `run ${r + 1}`, n: i + 1, p: heads / (i + 1) };
  });
}).flat();

export function render() {
  return plot({
    height: 330,
    marginTop: 24,
    marginLeft: 54,
    // Room for the reference label, which sits *outside* the frame: five traces
    // converge on 0.5, so anywhere inside it would land on top of them.
    marginRight: 74,
    ariaLabel: title,
    x: {
      label: "Number of flips",
      labelAnchor: "center",
      type: "log",
      domain: [1, FLIPS],
      ticks: [1, 3, 10, 30, 100, 300],
      tickFormat: (d) => String(d),
    },
    y: { label: "Proportion heads", domain: [0, 1], ticks: 5 },
    marks: [
      Plot.ruleY([0.5], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.lineY(traces, {
        x: "n",
        y: "p",
        z: "run",
        stroke: PRIMARY,
        strokeOpacity: 0.55,
        strokeWidth: 1.5,
      }),
      Plot.text([0.5], {
        x: FLIPS,
        y: (d) => d,
        text: () => "truth\n0.5",
        fill: GUIDE,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.25,
        textAnchor: "start",
        dx: 10,
      }),
    ],
  });
}
