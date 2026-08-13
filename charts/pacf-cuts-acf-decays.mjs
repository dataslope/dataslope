/**
 * Why the two correlation plots disagree, and why you need both.
 *
 * The series is an AR(2): each value is built from the two before it and
 * nothing else. Its two plots say different things, and the difference is the
 * whole reason both exist.
 *
 * The **ACF** at lag 3 asks: how related are values three steps apart? The
 * answer is "quite", but almost none of that is a direct link. There is no
 * term for lag 3 in the process at all. What there is instead is a chain:
 * today leans on yesterday, yesterday leaned on the day before, and the
 * correlation propagates down the line, decaying as it goes. So the ACF
 * decays smoothly for as long as the chain keeps carrying, which is forever
 * in principle and about a dozen lags in practice.
 *
 * The **PACF** at lag 3 asks a stricter question: once lags 1 and 2 have had
 * their say, is there anything left at lag 3? For this process the answer is
 * exactly no, and the PACF drops to noise after lag 2 and stays there. That
 * cut is the order of the process, readable straight off the plot.
 *
 * The reading rule everyone eventually memorises falls out of the two
 * questions:
 *
 *   • **PACF cuts off at lag p, ACF decays** means AR(p).
 *   • **ACF cuts off at lag q, PACF decays** means MA(q), the mirror image: a
 *     moving-average process has a finite memory of shocks, so beyond lag q
 *     there is no relationship at all, direct or otherwise.
 *   • **Both decay** means both parts are present, and the orders are not
 *     readable by eye.
 *
 * The bands are the rough ±1.96/√n envelope: bars inside them are the size
 * you would expect from noise alone. On a plot with twenty lags, one bar
 * poking out is not a discovery, it is arithmetic.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, normalSamples } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "The autocorrelation and partial autocorrelation of one AR(2) series. The ACF decays smoothly because correlation travels along a chain of lags; the PACF cuts to noise after lag 2, because the process has no direct term beyond it.";

const N = 400;
const PHI = [0.62, 0.28];
const LAGS = 14;

const SERIES_DATA = (() => {
  const e = normalSamples(N + 60, 0, 1, 9_021);
  const y = [0, 0];
  for (let t = 2; t < e.length; t++) y.push(PHI[0] * y[t - 1] + PHI[1] * y[t - 2] + e[t]);
  // Discard the burn-in so the start is not still settling.
  return y.slice(60);
})();

const MEAN = SERIES_DATA.reduce((s, v) => s + v, 0) / SERIES_DATA.length;
const C0 = SERIES_DATA.reduce((s, v) => s + (v - MEAN) ** 2, 0) / SERIES_DATA.length;

/** Sample autocorrelation at a lag, the usual biased estimator. */
function acf(k) {
  let c = 0;
  for (let t = k; t < SERIES_DATA.length; t++) c += (SERIES_DATA[t] - MEAN) * (SERIES_DATA[t - k] - MEAN);
  return c / SERIES_DATA.length / C0;
}

const ACF = Array.from({ length: LAGS + 1 }, (_, k) => acf(k));

/**
 * The PACF by Durbin-Levinson, which is the recursion that makes the meaning
 * plain: each step asks what is left at the next lag once every shorter lag
 * has already been fitted.
 */
const PACF = (() => {
  const out = [1];
  let prev = [];
  for (let k = 1; k <= LAGS; k++) {
    const num = ACF[k] - prev.reduce((s, p, j) => s + p * ACF[k - 1 - j], 0);
    const den = 1 - prev.reduce((s, p, j) => s + p * ACF[j + 1], 0);
    const kk = num / den;
    const next = prev.map((p, j) => p - kk * prev[prev.length - 1 - j]);
    next.push(kk);
    out.push(kk);
    prev = next;
  }
  return out;
})();

const BAND = 1.96 / Math.sqrt(SERIES_DATA.length);
/** Where the PACF cuts off: the run of lags outside the band starting at 1,
 *  which stops at the first lag that falls inside. Taking the *last* lag
 *  outside the band instead would report a stray bar further out as the order,
 *  and on fourteen lags at a 5% band there is usually one. */
const ORDER = (() => {
  let k = 1;
  while (k <= LAGS && Math.abs(PACF[k]) > BAND) k += 1;
  return k - 1;
})();
/** The strays: inside the cut-off nothing, past it the bars that poke out
 *  anyway, which is what a 5% envelope does on fourteen tries. */
const STRAYS = PACF.map((v, k) => ({ v, k }))
  .filter((d) => d.k > ORDER && Math.abs(d.v) > BAND)
  .map((d) => d.k);
/** The indirect path: how much of the lag-2 correlation a chain through lag 1
 *  accounts for on its own. */
const INDIRECT = ACF[1] * ACF[1];
const DIRECT = ACF[2] - INDIRECT;

const Y = [-0.25, 1.35];
const TICKS = [-0.25, 0, 0.25, 0.5, 0.75, 1];
const A = panel(0, { x: [-0.6, LAGS + 0.6], y: Y });
const P = panel(1, { x: [-0.6, LAGS + 0.6], y: Y });

const bars = (p, values) =>
  values.map((v, k) => ({
    k,
    v,
    x: p.px(k),
    y: p.py(v),
    y0: p.py(0),
    outside: k > 0 && Math.abs(v) > BAND,
  }));

const bandFor = (p) => ({ x1: p.left, x2: p.right, y1: p.py(-BAND), y2: p.py(BAND) });

export const caption = `The ACF and PACF of one AR(2) series. At lag 6 the ACF still reads ${ACF[6].toFixed(2)} although the process contains no lag-6 term at all, while the PACF cuts to noise after lag ${ORDER}.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 30,
    marginLeft: 44,
    marginRight: 18,
    marginBottom: 60,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...[A, P].flatMap((p) => [
        ...panelAxis(p, { ticks: TICKS, format: (v) => v.toFixed(2) }),
        Plot.rect([{}], { ...bandFor(p), fill: GUIDE, fillOpacity: 0.14 }),
        panelBaseline(p, 0),
      ]),
      panelTitle(A, "ACF: every path, direct or not", { fill: MUTED }),
      panelTitle(P, "PACF: only what is left over", { fill: PRIMARY }),

      Plot.ruleX(bars(A, ACF), {
        x: "x",
        y1: "y0",
        y2: "y",
        stroke: (d) => (d.k === 0 ? MUTED : d.outside ? MUTED : GUIDE),
        strokeWidth: 4,
        strokeLinecap: "round",
      }),
      Plot.ruleX(bars(P, PACF), {
        x: "x",
        y1: "y0",
        y2: "y",
        stroke: (d) => (d.k === 0 ? PRIMARY : d.k <= ORDER ? ACCENT : d.outside ? MUTED : GUIDE),
        strokeWidth: 4,
        strokeLinecap: "round",
      }),

      // The chain, drawn where the arithmetic is checkable: at lag 2 the total
      // correlation splits into a path through lag 1 and a direct part.
      Plot.link([{}], {
        x1: A.px(2),
        x2: A.px(2),
        y1: A.py(0),
        y2: A.py(INDIRECT),
        stroke: ACCENT,
        strokeWidth: 4,
        strokeLinecap: "round",
      }),
      Plot.text([{}], {
        x: A.px(2),
        y: A.py(ACF[2]),
        text: () => `lag 2 = ${ACF[2].toFixed(2)}`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        dx: 7,
        dy: -12,
        ...HALO,
      }),
      Plot.text([{}], {
        x: A.px(2),
        y: A.py(INDIRECT),
        text: () => `${INDIRECT.toFixed(2)} of it is the chain through lag 1`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: A.px(9.2),
        y: A.py(1.3),
        text: () => "the process has no term past lag 2,\nand the correlation still travels\na dozen lags along the chain",
        fill: "currentColor",
        fillOpacity: 0.62,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),

      Plot.text([{}], {
        x: P.px(ORDER + 0.5),
        y: P.py(0.72),
        text: () => `cuts off after lag ${ORDER},\nwhich is the order of the process`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: P.px(ORDER + 0.9),
        y: P.py(0.3),
        text: () =>
          STRAYS.length === 1
            ? `lag ${STRAYS[0]} pokes out too: one bar in ${LAGS}\nis what a 5% band does, not a finding`
            : `${STRAYS.length} bars poke out past the cut-off, which\nis about what a 5% band does on ${LAGS} lags`,
        fill: "currentColor",
        fillOpacity: 0.62,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),

      ...[A, P].map((p) =>
        Plot.text(
          [0, 5, 10, LAGS].map((k) => ({ k, x: p.px(k) })),
          {
            x: "x",
            y: p.py(Y[0]),
            text: (d) => String(d.k),
            fill: "currentColor",
            fillOpacity: 0.6,
            fontSize: 10,
            textAnchor: "middle",
            dy: 14,
          },
        ),
      ),
      Plot.text([{}], {
        x: 1,
        y: 0.15,
        text: () => "Lag",
        fill: "currentColor",
        fillOpacity: 0.6,
        fontSize: 10.5,
        textAnchor: "middle",
        dy: 34,
      }),
    ],
  });
}
