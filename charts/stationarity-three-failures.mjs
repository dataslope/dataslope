/**
 * Three ways to fail stationarity, and one test that only notices one of them.
 *
 * "Stationary" is a claim about three things staying put: the mean, the
 * variance, and the way a value relates to the one before it. A series can
 * break any of them separately, and the augmented Dickey-Fuller test, which is
 * what everybody reaches for, is only looking for one.
 *
 * The panels, left to right:
 *
 *   • **A wandering mean.** A random walk: today is yesterday plus noise, so
 *     there is no level for it to return to. This is the failure the test was
 *     built for, it does not reject, and differencing once is the cure.
 *   • **A changing variance.** The mean never moves and the spread widens
 *     fourfold. There is no unit root to find, so the test rejects and hands
 *     back the word "stationary" for a series the eye rules out at a glance.
 *     Any interval, error bar or noise model fitted on the first half is wrong
 *     about the second, and the test had nothing to say about it.
 *   • **A repeating season.** A clean cycle around a fixed level, and the same
 *     verdict as the random walk: no rejection. Same verdict, different
 *     disease, different cure. Differencing once answers the first panel and
 *     not this one, which wants seasonal differencing or seasonal terms.
 *
 * The p-values here are not looked up in a table. The null distribution of the
 * test statistic is simulated directly, by generating random walks of the same
 * length and computing the same statistic on each, so the number under every
 * panel is the share of pure random walks that looked at least this
 * mean-reverting.
 *
 * None of this makes the test broken; it makes it narrow. Plot the series
 * first, decide from the picture which of the three things is moving, and use
 * the test to confirm the one thing it examines.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, normalSamples, rng } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Three series that are not stationary, each failing differently: a wandering mean, a variance that widens fourfold halfway, and a repeating season. The Dickey-Fuller test calls the middle one stationary, and gives the seasonal series the same verdict as the random walk.";

const N = 160;

const WALK = (() => {
  const e = normalSamples(N, 0, 1, 3_301);
  let v = 0;
  return e.map((z) => {
    v += z;
    return v;
  });
})();

const VARIANCE = (() => {
  const e = normalSamples(N, 0, 1, 8_819);
  return e.map((z, t) => 20 + z * (t < N / 2 ? 1.1 : 4.4));
})();

const SEASON = (() => {
  const e = normalSamples(N, 0, 0.9, 2_207);
  return e.map((z, t) => 50 + 9 * Math.sin((2 * Math.PI * t) / 52) + z);
})();

/**
 * The Dickey-Fuller t statistic with a constant: regress Δy on a constant and
 * the lagged level, and take the t ratio of the level coefficient. A value far
 * below zero is evidence against a unit root.
 */
function dfStat(y) {
  const n = y.length - 1;
  const x = y.slice(0, -1);
  const d = y.slice(1).map((v, i) => v - x[i]);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const md = d.reduce((s, v) => s + v, 0) / n;
  const sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const b = x.reduce((s, v, i) => s + (v - mx) * (d[i] - md), 0) / sxx;
  const a = md - b * mx;
  const rss = d.reduce((s, v, i) => s + (v - (a + b * x[i])) ** 2, 0);
  const se = Math.sqrt(rss / (n - 2) / sxx);
  return b / se;
}

/**
 * The null distribution, simulated rather than looked up: random walks of the
 * same length, the same statistic on each. The p-value is then the share of
 * pure random walks whose statistic was at least this far below zero.
 */
const NULL_STATS = (() => {
  const u = rng(4_631);
  const draw = () => {
    const a = Math.max(u(), Number.EPSILON);
    const b = u();
    return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
  };
  return Array.from({ length: 4_000 }, () => {
    let v = 0;
    const y = Array.from({ length: N }, () => {
      v += draw();
      return v;
    });
    return dfStat(y);
  }).sort((p, q) => p - q);
})();

const pValue = (stat) => {
  const below = NULL_STATS.filter((s) => s <= stat).length;
  return Math.max(1 / NULL_STATS.length, below / NULL_STATS.length);
};

const CASES = [
  {
    key: "The mean wanders",
    values: WALK,
    domain: [-12, 20],
    ticks: [-10, 0, 10, 20],
    note: "a random walk:\nno level to return to",
    verdict: "cannot reject a unit root,\nwhich is the right answer",
    alarm: false,
  },
  {
    key: "The variance changes",
    values: VARIANCE,
    domain: [4, 36],
    ticks: [10, 20, 30],
    note: "one mean throughout, four times\nthe spread after the halfway mark",
    verdict: "rejects: the test calls this\nstationary, and it is not",
    alarm: true,
  },
  {
    key: "The season repeats",
    values: SEASON,
    domain: [36, 64],
    ticks: [40, 50, 60],
    note: "one level, but the behaviour\ndepends on the time of year",
    verdict: "cannot reject either: the same\nverdict, a different cure",
    alarm: true,
  },
].map((c) => {
  const stat = dfStat(c.values);
  return { ...c, stat, p: pValue(stat) };
});

const PANELS = CASES.map((c, k) => panel(k, { x: [0, N - 1], y: c.domain }));
const fmtP = (p) => (p <= 1 / NULL_STATS.length ? "< 0.001" : `= ${p.toFixed(3)}`);


export const caption = `Three series that fail stationarity three different ways, with the Dickey-Fuller p-value each returns. The middle one is called stationary and obviously is not; the third gets the same verdict as the random walk and wants a different cure.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 30,
    marginLeft: 44,
    marginRight: 18,
    marginBottom: 76,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      ...PANELS.flatMap((p, k) => [
        ...panelAxis(p, { ticks: CASES[k].ticks }),
        panelTitle(p, CASES[k].key, { fill: CASES[k].alarm ? ACCENT : MUTED }),
      ]),

      ...CASES.map((c, k) =>
        Plot.line(
          c.values.map((v, t) => ({ x: PANELS[k].px(t), y: PANELS[k].py(v) })),
          { x: "x", y: "y", stroke: c.alarm ? PRIMARY : MUTED, strokeWidth: 1.2 },
        ),
      ),

      ...CASES.map((c, k) =>
        Plot.text([{}], {
          x: (PANELS[k].left + PANELS[k].right) / 2,
          y: PANELS[k].bottom,
          text: () => c.note,
          fill: "currentColor",
          fillOpacity: 0.6,
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "middle",
          dy: 20,
          ...HALO,
        }),
      ),
      ...CASES.map((c, k) =>
        Plot.text([{}], {
          x: (PANELS[k].left + PANELS[k].right) / 2,
          y: PANELS[k].bottom,
          text: () => `Dickey-Fuller p ${fmtP(c.p)}`,
          fill: c.alarm ? ACCENT : MUTED,
          fontSize: 10.5,
          fontWeight: 700,
          textAnchor: "middle",
          dy: 42,
          ...HALO,
        }),
      ),
      ...CASES.map((c, k) =>
        Plot.text([{}], {
          x: (PANELS[k].left + PANELS[k].right) / 2,
          y: PANELS[k].bottom,
          text: () => c.verdict,
          fill: c.alarm ? ACCENT : MUTED,
          fontSize: 10,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "middle",
          dy: 68,
          ...HALO,
        }),
      ),
    ],
  });
}
