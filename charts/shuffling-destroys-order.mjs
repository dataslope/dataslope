/**
 * A series and its shuffle, with every summary statistic identical.
 *
 * Shuffling rows is so standard that most libraries do it by default, and for
 * cross-sectional data it is correct: the rows are exchangeable, so the order
 * carries no information and removing it removes nothing.
 *
 * A time series is the case where the order *is* the information, and the
 * histograms here prove it in the strongest way available. The two samples
 * contain exactly the same values, so they have the same mean, the same
 * standard deviation, the same minimum, maximum, median and quantiles, the same
 * histogram, and the same result from every distribution test. Every summary a
 * pipeline computes agrees that nothing has happened.
 *
 * The autocorrelation function underneath is where the difference lives. The
 * original has a lag-1 correlation near 0.9 and a slow decay, which is the
 * signature of a series with momentum. The shuffle has correlations near zero
 * at every lag, because that is what independent draws look like, and every
 * forecast a model could have made from the past is now impossible.
 *
 * Two practical places this sneaks in, both of them defaults:
 *
 *   • `train_test_split` shuffles unless you pass `shuffle=False`;
 *   • `cross_val_score` and `KFold` shuffle unless you pass a `TimeSeriesSplit`.
 *
 * Neither raises a warning, and both produce a model that scores well and
 * cannot forecast, because the score was earned on a task (interpolate a hole)
 * that is not the task (extend the end).
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean, rng } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One autocorrelated series and the same values shuffled. The two have identical means, standard deviations and histograms; the autocorrelation plots underneath show a slow decay in one and nothing at all in the other.";

const N = 160;
const PHI = 0.9;
const noise = rng(2_711);
const ORIGINAL = (() => {
  let x = 0;
  return Array.from({ length: N }, () => {
    x = PHI * x + (noise() - 0.5) * 6;
    return 50 + x;
  });
})();

/** Fisher-Yates from a seeded stream, so the shuffle is the same every build
 *  and the two panels really are the same multiset. */
const SHUFFLED = (() => {
  const u = rng(8_819);
  const a = [...ORIGINAL];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(u() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
})();

const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
};

/** Sample autocorrelation at lag k. */
const acf = (xs, k) => {
  const m = mean(xs);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    den += (xs[i] - m) ** 2;
    if (i + k < xs.length) num += (xs[i] - m) * (xs[i + k] - m);
  }
  return num / den;
};

const LAGS = Array.from({ length: 16 }, (_, k) => k + 1);
const ACF_A = LAGS.map((k) => ({ k, r: acf(ORIGINAL, k) }));
const ACF_B = LAGS.map((k) => ({ k, r: acf(SHUFFLED, k) }));
const BAND = 1.96 / Math.sqrt(N);

const YS = [Math.min(...ORIGINAL) - 3, Math.max(...ORIGINAL) + 3];
const SERIES_PANELS = [0, 1].map((k) => panel(k, { x: [0, N - 1], y: YS }));

/** The two rows share one unit square: series on top, ACF below. */
const band = (bottom, top, domain) => ({
  bottom,
  top,
  py: (v) => bottom + ((top - bottom) * (v - domain[0])) / (domain[1] - domain[0]),
});
const TOP_ROW = band(0.56, 0.9, YS);
const ACF_ROW = band(0.1, 0.4, [-0.35, 1]);

const line = (p, values) => values.map((v, i) => ({ x: p.px(i), y: TOP_ROW.py(v) }));

export const caption = `Shuffling rows is the default in most libraries, and for cross-sectional data it is correct: the rows are exchangeable, so the order carries nothing and removing it removes nothing. A time series is the case where the order *is* the information, and the two panels prove it as strongly as it can be proved. They contain exactly the same values, so they share a mean of ${mean(ORIGINAL).toFixed(1)}, a standard deviation of ${sd(ORIGINAL).toFixed(1)}, the same minimum and maximum, the same median, the same histogram and the same answer from every distribution test. Every summary a pipeline computes agrees that nothing has happened. The autocorrelations underneath are where the difference lives: the original starts at ${ACF_A[0].r.toFixed(2)} at lag 1 and decays slowly, which is the signature of a series with momentum, and the shuffle sits inside the noise band at every lag, because that is what independent draws look like. Two places this arrives as a default rather than a decision: train_test_split shuffles unless you pass shuffle=False, and KFold shuffles unless you reach for TimeSeriesSplit. Neither warns you, and both produce a model that scores well and cannot forecast, because the score was earned on interpolating a hole rather than on extending the end.`;

export function render() {
  return plot({
    height: 380,
    marginTop: 26,
    marginLeft: 44,
    marginRight: 20,
    marginBottom: 34,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...SERIES_PANELS.flatMap((p, k) => {
        const values = k === 0 ? ORIGINAL : SHUFFLED;
        const acfRows = k === 0 ? ACF_A : ACF_B;
        const color = k === 0 ? PRIMARY : ACCENT;
        return [
          panelTitle(p, k === 0 ? "The series" : "The same values, shuffled", { fill: color }),
          Plot.line(line(p, values), { x: "x", y: "y", stroke: color, strokeWidth: 1.4 }),
          Plot.text([{}], {
            x: p.left,
            y: 0.5,
            text: () => `mean ${mean(values).toFixed(1)}   SD ${sd(values).toFixed(1)}   n ${N}`,
            fill: MUTED,
            fontSize: 10.5,
            fontWeight: 600,
            textAnchor: "start",
            ...HALO,
          }),
          // The ACF row.
          Plot.rect([{}], {
            x1: p.left,
            x2: p.right,
            y1: ACF_ROW.py(-BAND),
            y2: ACF_ROW.py(BAND),
            fill: MUTED,
            fillOpacity: 0.12,
          }),
          Plot.link([{}], {
            x1: p.left,
            x2: p.right,
            y1: ACF_ROW.py(0),
            y2: ACF_ROW.py(0),
            stroke: "currentColor",
            strokeOpacity: 0.35,
          }),
          Plot.rect(
            acfRows.map((d) => {
              const w = (p.right - p.left) / (LAGS.length * 2.6);
              const cx = p.left + ((p.right - p.left) * (d.k - 0.5)) / LAGS.length;
              return { ...d, x1: cx - w / 2, x2: cx + w / 2, y: ACF_ROW.py(d.r) };
            }),
            {
              x1: "x1",
              x2: "x2",
              y1: ACF_ROW.py(0),
              y2: "y",
              fill: color,
              fillOpacity: 0.75,
            },
          ),
          Plot.text([{}], {
            x: p.left,
            y: ACF_ROW.top,
            text: () => "autocorrelation, lags 1 to 16",
            fill: MUTED,
            fontSize: 10,
            fontWeight: 600,
            textAnchor: "start",
            dy: -6,
            ...HALO,
          }),
          Plot.text([{}], {
            x: p.left,
            y: ACF_ROW.bottom,
            text: () =>
              k === 0
                ? `lag 1 is ${acfRows[0].r.toFixed(2)}: yesterday predicts today`
                : "every lag inside the noise band: nothing predicts anything",
            fill: color,
            fontSize: 10,
            fontWeight: 700,
            textAnchor: "start",
            dy: 18,
            ...HALO,
          }),
        ];
      }),
    ],
  });
}
