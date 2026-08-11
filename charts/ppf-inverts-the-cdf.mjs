/**
 * The CDF and the PPF are the same curve, read in the two possible directions.
 *
 * Two questions come up constantly and people reach for different functions
 * without noticing they are the same object:
 *
 *   • *"What fraction of values fall below 118?"* is the CDF. Go up from the
 *     value, across to the probability.
 *   • *"What value has 90% below it?"* is the PPF, also called the quantile
 *     function or the inverse CDF. Go across from the probability, down to the
 *     value.
 *
 * The right panel is the left one reflected about the diagonal, which is what
 * "inverse function" means geometrically, and drawing it that way is the
 * fastest route to never confusing `cdf` with `ppf` again.
 *
 * Two details are worth knowing, and both come from that reflection.
 *
 * The PPF gets *steep* at the ends. Near a probability of 0.99 a small change
 * in the probability moves the value a long way, which is the same fact as the
 * CDF being flat out there, and it is why extreme quantiles are hard to
 * estimate: the data is sparse exactly where the function is most sensitive.
 *
 * And for a *discrete* distribution the CDF is a staircase, so it has no true
 * inverse. The convention every library uses is the smallest value whose CDF is
 * at least p, which means `ppf(cdf(x))` returns x but `cdf(ppf(p))` usually
 * overshoots p. That asymmetry is the source of most off-by-one confusion with
 * binomial and Poisson quantiles.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, linspace } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "A normal CDF and its reflection about the diagonal, the PPF, with one question traced both ways: the fraction of values below 118, and the value with 90 per cent below it.";

const MU = 100;
const SD = 15;

/** Standard normal CDF by the Abramowitz and Stegun polynomial, which is
 *  accurate to about a millionth and needs no table. */
const phi = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const tail = (Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)) * poly;
  return z >= 0 ? 1 - tail : tail;
};
const cdf = (x) => phi((x - MU) / SD);
/** The inverse, found by bisection: the same curve, solved the other way. */
const ppf = (p) => {
  let lo = MU - 6 * SD;
  let hi = MU + 6 * SD;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

const XD = [55, 145];
const PD = [0, 1];
const CDF = panel(0, { x: XD, y: PD });
const PPF = panel(1, { x: PD, y: XD });

const CURVE = linspace(XD[0], XD[1], 181).map((x) => ({ x, p: cdf(x) }));
const cdfRow = CURVE.map((d) => ({ x: CDF.px(d.x), y: CDF.py(d.p) }));
const ppfRow = CURVE.map((d) => ({ x: PPF.px(d.p), y: PPF.py(d.x) }));

const Q_X = 118;
const Q_P = cdf(Q_X);
const P_TARGET = 0.9;
const P_X = ppf(P_TARGET);

export const caption = `Two questions that turn out to be one object. "What fraction of values fall below ${Q_X}?" is the CDF, and the answer is ${P_X.toFixed(0)}%; "what value has ${P_TARGET * 100}% below it?" is the PPF, and the answer is ${(Q_P * 100).toFixed(0)}. The right panel is the left one reflected about the diagonal.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 52,
    marginRight: 24,
    marginBottom: 52,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(CDF, { ticks: [0, 0.25, 0.5, 0.75, 1], format: (v) => v.toFixed(2) }),
      ...panelAxis(PPF, { ticks: [60, 80, 100, 120, 140] }),
      panelTitle(CDF, "cdf(x): value in, probability out", { fill: PRIMARY }),
      panelTitle(PPF, "ppf(p): probability in, value out", { fill: ACCENT }),

      Plot.line(cdfRow, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.2, clip: true }),
      Plot.line(ppfRow, { x: "x", y: "y", stroke: ACCENT, strokeWidth: 2.2, clip: true }),

      // The traced question, on both panels, in both directions.
      Plot.link([{}], {
        x1: CDF.px(Q_X),
        x2: CDF.px(Q_X),
        y1: CDF.py(0),
        y2: CDF.py(Q_P),
        stroke: GUIDE,
        strokeWidth: 1.4,
        strokeDasharray: "4,3",
      }),
      Plot.link([{}], {
        x1: CDF.px(Q_X),
        x2: CDF.left,
        y1: CDF.py(Q_P),
        y2: CDF.py(Q_P),
        stroke: GUIDE,
        strokeWidth: 1.4,
        strokeDasharray: "4,3",
      }),
      Plot.dot([{}], { x: CDF.px(Q_X), y: CDF.py(Q_P), r: 4.4, fill: PRIMARY }),
      Plot.text([{}], {
        x: CDF.px(Q_X),
        y: CDF.py(Q_P),
        text: () => `cdf(${Q_X}) = ${Q_P.toFixed(2)}`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 8,
        dy: 12,
        ...HALO,
      }),

      Plot.link([{}], {
        x1: PPF.px(P_TARGET),
        x2: PPF.px(P_TARGET),
        y1: PPF.py(XD[0]),
        y2: PPF.py(P_X),
        stroke: GUIDE,
        strokeWidth: 1.4,
        strokeDasharray: "4,3",
      }),
      Plot.link([{}], {
        x1: PPF.px(P_TARGET),
        x2: PPF.left,
        y1: PPF.py(P_X),
        y2: PPF.py(P_X),
        stroke: GUIDE,
        strokeWidth: 1.4,
        strokeDasharray: "4,3",
      }),
      Plot.dot([{}], { x: PPF.px(P_TARGET), y: PPF.py(P_X), r: 4.4, fill: ACCENT }),
      Plot.text([{}], {
        x: PPF.px(P_TARGET),
        y: PPF.py(P_X),
        text: () => `ppf(${P_TARGET}) = ${P_X.toFixed(0)}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "end",
        dx: -8,
        dy: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: PPF.px(0.96),
        y: PPF.py(138),
        text: () => "steep out here:\nextreme quantiles\nare hard to pin down",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        ...HALO,
      }),
      ...[
        [CDF, [60, 100, 140], (v) => String(v)],
        [PPF, [0, 0.5, 1], (v) => v.toFixed(1)],
      ].map(([p, ticks, fmt]) =>
        Plot.text(
          ticks.map((v) => ({ v, x: p.px(v) })),
          {
            x: "x",
            y: p.bottom,
            text: (d) => fmt(d.v),
            fill: "currentColor",
            fillOpacity: 0.55,
            fontSize: 10,
            textAnchor: "middle",
            dy: 14,
          },
        ),
      ),
      ...[CDF, PPF].map((p, k) =>
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: p.bottom,
          text: () => (k === 0 ? "value" : "probability"),
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 32,
          ...HALO,
        }),
      ),
    ],
  });
}
