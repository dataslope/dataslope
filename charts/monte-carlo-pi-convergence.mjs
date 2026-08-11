/**
 * The π estimate itself, converging — and converging at the rate that makes
 * Monte Carlo both usable and expensive.
 *
 * Drop points into the unit square and count the fraction inside the quarter
 * disk: four times that fraction estimates π. The estimator is a proportion, so
 * its standard error is 4·√(p(1−p)/N) with p = π/4, which is 1.64/√N. That is
 * the shaded band, drawn at ±1.96 of it, and the three runs stay inside it for
 * the same reason any sample mean stays inside its own interval.
 *
 * The rate is the lesson. √N means a hundred times the points buys ten times
 * the accuracy: one decimal place costs a hundredfold, and there is no
 * cleverness in the sampling that changes the exponent. Every honest Monte
 * Carlo estimate — an option price, a bootstrap interval, a path integral —
 * lives on this curve.
 *
 * Three runs rather than one, because a single trace looks like a story about
 * that trace. Three from different seeds, all inside the same envelope, is a
 * property of the method.
 */
import { Plot, plot, GUIDE, HALO, MUTED, PRIMARY, rng, SERIES } from "./_theme.mjs";

export const title =
  "Three independent Monte Carlo estimates of pi against the number of random points, on a logarithmic axis from twenty to a million. All three swing widely at first and close on 3.14159, staying inside a shaded band that narrows as one over the square root of the sample count: a hundred times the points for ten times the accuracy.";

const N_MAX = 1_000_000;
const N_MIN = 20;
const RUNS = 3;
const P = Math.PI / 4;
/** Standard error of 4·(fraction inside) after N points. */
const SE = (n) => (4 * Math.sqrt(P * (1 - P))) / Math.sqrt(n);

/** Log-spaced checkpoints: the estimate is recorded at these N rather than at
 *  every one, which is all a log axis can draw and a fraction of the bytes. */
const CHECKPOINTS = (() => {
  const out = [];
  for (let i = 0; i <= 150; i++) {
    const n = Math.round(N_MIN * Math.pow(N_MAX / N_MIN, i / 150));
    if (out.at(-1) !== n) out.push(n);
  }
  return out;
})();

const traces = Array.from({ length: RUNS }, (_, run) => {
  const next = rng(7 + run * 1013);
  let inside = 0;
  let drawn = 0;
  return CHECKPOINTS.map((n) => {
    while (drawn < n) {
      const x = next();
      const y = next();
      if (x * x + y * y <= 1) inside++;
      drawn++;
    }
    return { run: `run ${run + 1}`, n, estimate: (4 * inside) / drawn };
  });
});

const rows = traces.flat();
const band = CHECKPOINTS.map((n) => ({
  n,
  lo: Math.PI - 1.96 * SE(n),
  hi: Math.PI + 1.96 * SE(n),
}));

/** Two readings a hundredfold apart, to put a number on the exponent. */
const TEN_K = 10_000;
const ONE_M = 1_000_000;

export const caption = `Three runs of the estimator, replotted as they go, inside a ±1.96 standard-error band. At ${TEN_K.toLocaleString()} points the band is about ±${(1.96 * SE(TEN_K)).toFixed(3)}; at ${ONE_M.toLocaleString()}, a hundred times as many, it is about ±${(1.96 * SE(ONE_M)).toFixed(3)}.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 28,
    marginLeft: 58,
    marginRight: 128,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Random points dropped",
      labelAnchor: "center",
      domain: [N_MIN, N_MAX],
      ticks: [20, 100, 1e3, 1e4, 1e5, 1e6],
      tickFormat: (d) => (d >= 1e6 ? "1M" : d >= 1e3 ? `${d / 1e3}k` : String(d)),
    },
    y: { label: "Estimate of π", domain: [2.2, 4.05], ticks: 5 },
    marks: [
      Plot.areaY(band, {
        x: "n",
        y1: "lo",
        y2: "hi",
        fill: GUIDE,
        fillOpacity: 0.16,
        clip: true,
      }),
      Plot.ruleY([Math.PI], { stroke: MUTED, strokeWidth: 1.25, strokeDasharray: "4,3" }),
      Plot.line(rows, {
        x: "n",
        y: "estimate",
        z: "run",
        stroke: (d) => (d.run === "run 1" ? PRIMARY : SERIES[d.run === "run 2" ? 2 : 3]),
        strokeWidth: 1.6,
        strokeOpacity: 0.9,
        clip: true,
      }),
      Plot.text([{}], {
        x: N_MAX,
        y: Math.PI,
        text: () => "π",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: N_MAX,
        y: Math.PI + 1.96 * SE(N_MAX),
        text: () => `three runs, all within\n±${(1.96 * SE(N_MAX)).toFixed(3)} at a million`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 10,
        dy: -30,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 260,
        y: Math.PI + 1.96 * SE(260),
        text: () => "±1.96 standard errors,\nnarrowing as 1/√N",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 6,
        dy: -14,
        ...HALO,
      }),
    ],
  });
}
