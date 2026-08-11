/**
 * The difference you should not have taken, and the tell that says so.
 *
 * Differencing removes a trend, and one difference removes a linear one, which
 * is what most series need. The temptation is to keep going when the ADF test
 * is still not quite significant, and a second difference on a series that only
 * needed one does something specific and bad.
 *
 * Watch the variance. Differencing a stationary series *adds* variance, because
 * subtracting two draws of the same noise gives you a quantity with twice the
 * variance of one. So the sequence of variances falls while you are removing
 * real structure and rises the moment you start removing noise. The turn is
 * the signal: **difference until the variance stops falling, and then stop.**
 *
 * The second tell is in the autocorrelation. Over-differencing introduces a
 * large *negative* correlation at lag 1, approaching −0.5, which is not a
 * property of the original process at all: it is an artefact of having
 * subtracted each value from its neighbour twice. A model fitted to it will
 * dutifully add a moving-average term to cancel the artefact, which is a
 * parameter spent undoing damage.
 *
 * The cost is real. An over-differenced series is noisier, so every forecast
 * interval built from it is wider, and the extra width is not uncertainty about
 * the world.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean, rng } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One series with a linear trend, differenced zero, once and twice, with the variance of each printed. The first difference removes the trend and cuts the variance; the second adds variance back and puts a large negative correlation at lag one that was never in the data.";

const N = 140;
const u = rng(3_557);
const LEVEL = (() => {
  let x = 0;
  return Array.from({ length: N }, (_, i) => {
    x += (u() - 0.5) * 3;
    return 20 + 0.42 * i + x;
  });
})();

const diff = (xs) => xs.slice(1).map((v, i) => v - xs[i]);
const D1 = diff(LEVEL);
const D2 = diff(D1);

const variance = (xs) => {
  const m = mean(xs);
  return xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1);
};
const acf1 = (xs) => {
  const m = mean(xs);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    den += (xs[i] - m) ** 2;
    if (i + 1 < xs.length) num += (xs[i] - m) * (xs[i + 1] - m);
  }
  return num / den;
};

const STAGES = [
  { key: "No differencing", values: LEVEL, color: MUTED },
  { key: "First difference", values: D1, color: PRIMARY },
  { key: "Second difference", values: D2, color: ACCENT },
].map((s) => ({ ...s, var: variance(s.values), r1: acf1(s.values) }));

const BEST = STAGES[1];
const WORST = STAGES[2];
const GROWTH = (WORST.var / BEST.var).toFixed(1);

const PANELS = STAGES.map((_, k) => panel(k, { x: [0, N - 2], y: [-12, 12] }));

/** The undifferenced series is on a different scale entirely, so it gets its
 *  own mapping and the two differenced panels share one. */
const LEVEL_PANEL = panel(0, { x: [0, N - 1], y: [10, 90] });
const rows = [
  LEVEL.map((v, i) => ({ x: LEVEL_PANEL.px(i), y: LEVEL_PANEL.py(v) })),
  D1.map((v, i) => ({ x: PANELS[1].px(i), y: PANELS[1].py(v) })),
  D2.map((v, i) => ({ x: PANELS[2].px(i), y: PANELS[2].py(v) })),
];

export const caption = `Differencing removes a trend, and one difference removes a linear one, which is what most series need. The temptation is to keep going while a stationarity test is still not quite significant, and a second difference on a series that needed one does something specific. Watch the variance: ${STAGES[0].var.toFixed(0)}, then ${BEST.var.toFixed(1)}, then ${WORST.var.toFixed(1)}. It falls while real structure is being removed and rises the moment noise is, because subtracting two draws of the same noise gives a quantity with twice the variance of one. The turn is the signal, and the rule is to difference until the variance stops falling and then stop. The second tell is at lag one. Over-differencing introduces a large negative correlation there, ${WORST.r1.toFixed(2)} against ${BEST.r1.toFixed(2)}, and it is not a property of the original process: it is the artefact of having subtracted each value from its neighbour twice. A model fitted to this will add a moving-average term to cancel the artefact, which is a parameter spent undoing self-inflicted damage. The cost is real, because the over-differenced series carries ${GROWTH} times the variance and every forecast interval built from it is wider by that much, and the extra width is not uncertainty about the world.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 30,
    marginRight: 18,
    marginBottom: 52,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      ...STAGES.flatMap((s, k) => [
        panelTitle(PANELS[k], s.key, { fill: s.color }),
        Plot.line(rows[k], { x: "x", y: "y", stroke: s.color, strokeWidth: 1.5, clip: true }),
        Plot.text([{}], {
          x: (PANELS[k].left + PANELS[k].right) / 2,
          y: PANELS[k].bottom,
          text: () => `variance ${s.var < 10 ? s.var.toFixed(1) : s.var.toFixed(0)}`,
          fill: s.color,
          fontSize: 11.5,
          fontWeight: 700,
          textAnchor: "middle",
          dy: 18,
          ...HALO,
        }),
        Plot.text([{}], {
          x: (PANELS[k].left + PANELS[k].right) / 2,
          y: PANELS[k].bottom,
          text: () => `lag-1 correlation ${s.r1.toFixed(2)}`,
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 36,
          ...HALO,
        }),
      ]),
      ...[1, 2].map((k) =>
        Plot.link([{}], {
          x1: PANELS[k].left,
          x2: PANELS[k].right,
          y1: PANELS[k].py(0),
          y2: PANELS[k].py(0),
          stroke: "currentColor",
          strokeOpacity: 0.3,
        }),
      ),
      Plot.text([{}], {
        x: (PANELS[1].left + PANELS[1].right) / 2,
        y: PANELS[1].top,
        text: () => "the variance stopped falling here",
        fill: PRIMARY,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -4,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (PANELS[2].left + PANELS[2].right) / 2,
        y: PANELS[2].top,
        text: () => `so this one added ${GROWTH}× of it back`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -4,
        ...HALO,
      }),
    ],
  });
}
