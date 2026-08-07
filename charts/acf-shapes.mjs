/**
 * Three autocorrelation functions, which is how you read a series' memory off
 * a plot.
 *
 * White noise has none: every bar sits inside the significance band, because
 * knowing yesterday tells you nothing about today. An AR(1) decays smoothly,
 * each lag a constant fraction of the one before, which is the geometric tail
 * the cheat-sheet names. A seasonal series spikes at the season and its
 * multiples and is quiet in between, which is the pattern that tells you the
 * period without your having to know it in advance.
 *
 * The band is ±1.96/√n, the usual approximate 95% interval for an ACF under
 * the null that the series is white noise. Bars inside it are indistinguishable
 * from nothing.
 *
 * Faceted legitimately: all three plot a correlation against a lag, in the
 * same units on the same axes.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Three autocorrelation plots against lag. White noise has every bar inside the significance band; an AR(1) series decays smoothly from a tall first lag; a seasonal series spikes at lag 12 and 24 and is quiet between them.";

export const caption =
  "The ACF is a series' memory, drawn. Inside the shaded band a bar is indistinguishable from noise. A smooth decay means each value carries the last one forward; regular spikes tell you the season, and where they land tells you its length.";

const N = 480;
const MAX_LAG = 30;
const BAND = 1.96 / Math.sqrt(N);

/** Sample autocorrelation at each lag, the same estimator statsmodels plots. */
function acf(series, maxLag) {
  const mean = series.reduce((s, v) => s + v, 0) / series.length;
  const dev = series.map((v) => v - mean);
  const c0 = dev.reduce((s, v) => s + v * v, 0);
  return Array.from({ length: maxLag + 1 }, (_, lag) => {
    let c = 0;
    for (let t = lag; t < series.length; t++) c += dev[t] * dev[t - lag];
    return { lag, r: c / c0 };
  });
}

const gauss = (next) => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

function whiteNoise(seed) {
  const next = rng(seed);
  return Array.from({ length: N }, () => gauss(next));
}

function ar1(phi, seed) {
  const next = rng(seed);
  let prev = 0;
  return Array.from({ length: N }, () => {
    prev = phi * prev + gauss(next);
    return prev;
  });
}

function seasonal(period, seed) {
  const next = rng(seed);
  return Array.from({ length: N }, (_, t) => 3 * Math.sin((2 * Math.PI * t) / period) + gauss(next));
}

const PANELS = [
  { key: "White noise", series: whiteNoise(31) },
  { key: "AR(1), φ = 0.8", series: ar1(0.8, 32) },
  { key: "Seasonal, period 12", series: seasonal(12, 33) },
];

// Lag 0 is always exactly 1 and carries no information; statsmodels plots it,
// but it costs a third of the vertical range to show a constant.
const bars = PANELS.flatMap((p) =>
  acf(p.series, MAX_LAG)
    .filter((d) => d.lag > 0)
    .map((d) => ({ ...d, panel: p.key, real: Math.abs(d.r) > BAND })),
);

export function render() {
  return plot({
    height: 280,
    marginTop: 32,
    marginLeft: 44,
    marginBottom: 44,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: "Lag", labelAnchor: "center", domain: [0, MAX_LAG], ticks: 4 },
    // Deep enough for the seasonal panel's negative troughs, which a sine
    // drives to about -0.8 at half the period; a tighter domain clipped them.
    y: { label: "Correlation", domain: [-0.95, 1], ticks: 5 },
    marks: [
      // Anything inside this band is indistinguishable from white noise.
      Plot.rectY([{}], { y1: -BAND, y2: BAND, fill: GUIDE, fillOpacity: 0.16 }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
      Plot.ruleX(bars, {
        x: "lag",
        y1: 0,
        y2: "r",
        fx: "panel",
        stroke: (d) => (d.real ? PRIMARY : MUTED),
        strokeWidth: 2.5,
        clip: true,
      }),
      Plot.text([{ panel: "Seasonal, period 12" }], {
        x: 12,
        y: 0.85,
        fx: "panel",
        text: () => "spikes at 12 and 24",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        ...HALO,
      }),
      Plot.text([{ panel: "White noise" }], {
        x: 1,
        y: 0.85,
        fx: "panel",
        text: () => "nothing outside the band",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
