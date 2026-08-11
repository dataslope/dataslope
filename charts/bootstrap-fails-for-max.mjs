/**
 * The bootstrap, and the statistic it cannot do.
 *
 * The bootstrap works by resampling the sample with replacement and computing
 * the statistic on each resample. For a mean it is close to magic: the left
 * panel is a smooth, well-behaved distribution that gives an honest interval,
 * with no formula, no normality assumption and no algebra.
 *
 * The right panel is the same procedure applied to the maximum, and it is not
 * a distribution at all. It is a few spikes, because a resample can only
 * contain values that were in the original sample, so the bootstrapped maximum
 * is *always* one of the few largest observations. The most common answer is
 * simply the sample maximum, which appears in about 63% of resamples, that
 * being the chance that any particular observation survives a resample of size
 * n.
 *
 * The failure has a name and a shape. Statistics that depend on the *interior*
 * of the distribution, means, medians, quantiles away from the edges,
 * correlations, regression coefficients, bootstrap beautifully, because a
 * resample is a fair sample of the interior. Statistics that depend on the
 * *edge*, the maximum, the minimum, the range, the number of distinct values,
 * do not, because the edge of a resample is bounded by the edge of the sample
 * and the bootstrap can never sample beyond what it has seen.
 *
 * The practical rule: if the statistic's value would change when you draw one
 * more observation from the population *more often than* it changes when you
 * resample, the bootstrap is understating its uncertainty. Extremes are the
 * clear case, and the right tool for them is extreme value theory, which models
 * the tail rather than resampling it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean, normalSamples, rng } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Bootstrap distributions of the mean and of the maximum from one sample. The mean's is smooth and usable; the maximum's is a handful of spikes, because a resample can never contain a value the sample did not.";

const N = 40;
const SAMPLE = normalSamples(N, 60, 12, 4_409).map((v) => Math.round(v * 10) / 10);
const SORTED = [...SAMPLE].sort((a, b) => a - b);
const REPS = 3000;

const u = rng(9_137);
const boot = () => Array.from({ length: N }, () => SAMPLE[Math.floor(u() * N)]);
const MEANS = [];
const MAXES = [];
for (let r = 0; r < REPS; r++) {
  const s = boot();
  MEANS.push(mean(s));
  MAXES.push(Math.max(...s));
}

/** Share of resamples whose maximum is the sample maximum: 1 - (1-1/n)^n,
 *  which tends to 1 - 1/e. */
const TOP = SORTED.at(-1);
const AT_TOP = MAXES.filter((v) => v === TOP).length / REPS;
const DISTINCT = new Set(MAXES).size;

const M_DOMAIN = [52, 68];
const X_DOMAIN = [SORTED[N - 8] - 1, TOP + 1];
const MEAN_P = panel(0, { x: M_DOMAIN, y: [0, 0.2] });
const MAX_P = panel(1, { x: X_DOMAIN, y: [0, 0.75] });

const BINS = 36;
const histogram = (values, domain, bins) => {
  const w = (domain[1] - domain[0]) / bins;
  const c = new Array(bins).fill(0);
  for (const v of values) {
    const k = Math.floor((v - domain[0]) / w);
    if (k >= 0 && k < bins) c[k] += 1;
  }
  return c.map((n, k) => ({ from: domain[0] + k * w, to: domain[0] + (k + 1) * w, p: n / values.length }));
};

const meanBars = histogram(MEANS, M_DOMAIN, BINS)
  .filter((b) => b.p > 0)
  .map((b) => ({ ...b, x1: MEAN_P.px(b.from), x2: MEAN_P.px(b.to), y: MEAN_P.py(b.p) }));

/** The maximum's distribution is discrete by construction, so it is drawn as
 *  its actual atoms rather than binned. */
const maxAtoms = [...new Set(MAXES)]
  .sort((a, b) => a - b)
  .map((v) => ({ v, p: MAXES.filter((m) => m === v).length / REPS }))
  .map((d) => ({ ...d, x: MAX_P.px(d.v), y: MAX_P.py(d.p) }));

export const caption = `The bootstrap resamples the sample with replacement and computes the statistic each time. For a mean it is close to magic: a smooth, well-behaved distribution and an honest interval, with no formula, no normality assumption and no algebra. Applied to the maximum it is not a distribution at all. It is ${DISTINCT} spikes, because a resample can only contain values the original sample contained, so the bootstrapped maximum is always one of the few largest observations, and ${(AT_TOP * 100).toFixed(0)}% of resamples return the sample maximum exactly, that being the chance any particular observation survives a resample of size n. The failure has a shape worth remembering. Statistics that depend on the interior of a distribution (means, medians, quantiles away from the edges, correlations, regression coefficients) bootstrap beautifully, because a resample is a fair sample of the interior. Statistics that depend on the edge (the maximum, the minimum, the range, the count of distinct values) do not, because the edge of a resample is bounded by the edge of the sample and the method can never look past what it has already seen. The practical test: if drawing one more observation from the population would move the statistic more often than resampling does, the bootstrap is understating its uncertainty. Extremes are the clear case, and the right tool for them is extreme value theory, which models the tail rather than resampling it.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 46,
    marginRight: 20,
    marginBottom: 50,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(MEAN_P, { ticks: [0, 0.1, 0.2], format: (v) => `${Math.round(v * 100)}%` }),
      ...panelAxis(MAX_P, { ticks: [0, 0.25, 0.5, 0.75], format: (v) => `${Math.round(v * 100)}%` }),
      panelTitle(MEAN_P, "Bootstrapping the mean", { fill: PRIMARY }),
      panelTitle(MAX_P, "Bootstrapping the maximum", { fill: ACCENT }),
      panelBaseline(MEAN_P),
      panelBaseline(MAX_P),

      Plot.rect(meanBars, {
        x1: "x1",
        x2: "x2",
        y1: MEAN_P.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.6,
      }),
      Plot.rect(maxAtoms, {
        x1: (d) => d.x - 0.012,
        x2: (d) => d.x + 0.012,
        y1: MAX_P.py(0),
        y2: "y",
        fill: ACCENT,
        fillOpacity: 0.75,
      }),
      ...[
        [MEAN_P, [54, 58, 62, 66]],
        [MAX_P, [Math.round(SORTED[N - 6]), Math.round(TOP)]],
      ].map(([p, ticks]) =>
        Plot.text(
          ticks.map((v) => ({ v, x: p.px(v) })),
          {
            x: "x",
            y: p.bottom,
            text: (d) => String(d.v),
            fill: "currentColor",
            fillOpacity: 0.55,
            fontSize: 10,
            textAnchor: "middle",
            dy: 14,
          },
        ),
      ),
      Plot.text([{}], {
        x: (MEAN_P.left + MEAN_P.right) / 2,
        y: MEAN_P.bottom,
        text: () => `${REPS.toLocaleString()} resamples, smooth and usable`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (MAX_P.left + MAX_P.right) / 2,
        y: MAX_P.bottom,
        text: () => `the same ${REPS.toLocaleString()} resamples, ${DISTINCT} possible answers`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
      Plot.text([{ x: MAX_P.px(TOP), y: MAX_P.py(AT_TOP) }], {
        x: "x",
        y: "y",
        text: () => `${(AT_TOP * 100).toFixed(0)}% of resamples\nreturn the sample max`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
    ],
  });
}
