/**
 * Bayesian updating, drawn as the only thing it is: a distribution over a
 * parameter that gets narrower and moves as evidence arrives.
 *
 * The prior is a weak belief that a conversion rate is somewhere around 20%.
 * Each panel adds data. Ten visitors barely move it, because ten visitors are
 * barely evidence. A hundred pull it toward the truth and narrow it. A thousand
 * leave a spike that the prior no longer meaningfully affects, which is the
 * usual reassurance about priors: they matter when you have little data, and
 * that is exactly when you want them to.
 *
 * The Beta-Binomial conjugacy makes each posterior exact rather than sampled,
 * so the curves are the arithmetic. The interval quoted in the caption is the
 * central 95% of the final posterior, found by integrating the drawn density.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A Beta prior over a conversion rate updated with ten, a hundred and a thousand visitors. The curve barely moves after ten, narrows and shifts after a hundred, and becomes a tight spike after a thousand.";

const TRUE_RATE = 0.32;
const PRIOR = { a: 2, b: 8 }; // weak, centred near 0.2
const STAGES = [10, 100, 1000];
const GRID = linspace(0.001, 0.999, 400);

function logBeta(a, b) {
  const lg = (x) => {
    // Stirling with a correction: adequate for the a, b this chart uses.
    const c = [76.18009173, -86.50532033, 24.01409822, -1.231739516, 0.00120858003, -5.36382e-6];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log((2.5066282746310005 * ser) / x);
  };
  return lg(a) + lg(b) - lg(a + b);
}

const betaPdf = (x, a, b) =>
  Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logBeta(a, b));

const posteriors = STAGES.map((n) => {
  const successes = Math.round(n * TRUE_RATE);
  return { n, a: PRIOR.a + successes, b: PRIOR.b + (n - successes) };
});

const rows = posteriors.flatMap((p) =>
  GRID.map((x) => ({ panel: `after ${p.n} visitors`, x, y: betaPdf(x, p.a, p.b) })),
);

const priorRows = posteriors.flatMap((p) =>
  GRID.map((x) => ({ panel: `after ${p.n} visitors`, x, y: betaPdf(x, PRIOR.a, PRIOR.b) })),
);

/** Central 95% of the final posterior, by integrating the same density. */
const FINAL = posteriors.at(-1);
const INTERVAL = (() => {
  const step = GRID[1] - GRID[0];
  let acc = 0;
  let lo = null;
  let hi = null;
  for (const x of GRID) {
    acc += betaPdf(x, FINAL.a, FINAL.b) * step;
    if (lo === null && acc >= 0.025) lo = x;
    if (hi === null && acc >= 0.975) hi = x;
  }
  return { lo, hi };
})();

export const caption =
  `The same weak prior, updated three times. Ten visitors move it barely at all; a thousand leave a posterior so tight that the prior no longer matters, with a 95% interval of ${(INTERVAL.lo * 100).toFixed(0)}% to ${(INTERVAL.hi * 100).toFixed(0)}%. That is the honest answer to "won't my prior bias the result": it will, while you have almost no data, which is when you want it to.`;

const YMAX = Math.max(...rows.map((d) => d.y));

export function render() {
  return plot({
    height: 290,
    marginTop: 32,
    marginLeft: 52,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: posteriors.map((p) => `after ${p.n} visitors`) },
    x: { label: "Conversion rate", labelAnchor: "center", domain: [0, 0.7], ticks: 3, tickFormat: "%" },
    y: { label: "Density", domain: [0, YMAX * 1.12], ticks: 4 },
    // The grid runs to 0.999 and the x domain stops at 0.7, so every density
    // mark has to clip: unclipped, the tail of the last panel is drawn 65px
    // past the right edge of the figure, and the earlier panels spill into
    // the panel beside them.
    marks: [
      Plot.line(priorRows, {
        x: "x",
        y: "y",
        fx: "panel",
        stroke: MUTED,
        strokeOpacity: 0.6,
        strokeWidth: 1.25,
        strokeDasharray: "4,3",
        clip: true,
      }),
      Plot.areaY(rows, { x: "x", y: "y", fx: "panel", fill: PRIMARY, fillOpacity: 0.16, clip: true }),
      Plot.line(rows, { x: "x", y: "y", fx: "panel", stroke: PRIMARY, strokeWidth: 2, clip: true }),
      Plot.ruleX([TRUE_RATE], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "3,3" }),
      Plot.text([{ panel: `after ${STAGES[0]} visitors` }], {
        x: 0.68,
        y: YMAX * 1.06,
        fx: "panel",
        text: () => "dashed grey: the prior",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.text([{ panel: `after ${STAGES.at(-1)} visitors` }], {
        x: TRUE_RATE,
        y: YMAX * 1.06,
        fx: "panel",
        text: () => "truth",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
