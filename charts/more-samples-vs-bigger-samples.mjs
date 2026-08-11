/**
 * Two things people mean by "more data", and only one of them is precision.
 *
 * A sampling distribution has two knobs. You can draw *more samples*, which
 * gives you more copies of the estimate, or you can make *each sample bigger*,
 * which makes every copy better. They look similar in a sentence and do
 * completely different things to the picture.
 *
 * Drawing more samples fills in the histogram. The shape gets smoother, the
 * bars get less ragged, and the width does not move at all, because the width
 * of a sampling distribution is the standard error and the standard error is
 * `σ/√n` where n is the size of *one* sample. A thousand samples of five and
 * fifty samples of five have the same spread; one is just drawn from more
 * pieces.
 *
 * Making each sample bigger narrows it, by exactly the square root of the
 * factor. Twenty times the n gives a distribution `√20`, about 4.5 times,
 * tighter, and that is the entire content of "more data helps".
 *
 * The reason this is worth separating is that only the second one is available
 * in most real situations, and it is the expensive one. If you already have
 * your data, you can bootstrap yourself as many samples as you like and the
 * confidence interval will not shrink by a millimetre, because resampling
 * cannot manufacture information the sample does not contain. Sampling error
 * is a fact about n.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean, normalSamples, rng } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Two sampling distributions of the mean from the same population. A thousand samples of five gives a smooth histogram of the same width; fifty samples of a hundred gives a ragged histogram about four and a half times narrower. Only the second is precision.";

const MU = 100;
const SIGMA = 15;

/** Means of `reps` samples of size `n`, drawn from one seeded stream so the
 *  two panels are comparable and the build stays deterministic. */
function sampleMeans(reps, n, seed) {
  const u = rng(seed);
  return Array.from({ length: reps }, () => {
    // Box-Muller from the shared stream, so each panel consumes its own draws.
    const xs = Array.from({ length: n }, () => {
      const a = Math.max(u(), Number.EPSILON);
      const b = u();
      return MU + SIGMA * Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
    });
    return mean(xs);
  });
}

const MANY = { reps: 1000, n: 5, means: sampleMeans(1000, 5, 4_401) };
const BIG = { reps: 50, n: 100, means: sampleMeans(50, 100, 9_113) };

const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
};
const SD_MANY = sd(MANY.means);
const SD_BIG = sd(BIG.means);
const NARROWER = (SD_MANY / SD_BIG).toFixed(1);
const THEORY = Math.sqrt(BIG.n / MANY.n).toFixed(1);

const DOMAIN = [80, 120];
const BINS = 40;
const binWidth = (DOMAIN[1] - DOMAIN[0]) / BINS;

/** Histogram as a share of the sample, so the two panels are comparable
 *  despite one having twenty times as many values. */
function histogram(values) {
  const counts = new Array(BINS).fill(0);
  for (const v of values) {
    const k = Math.min(BINS - 1, Math.max(0, Math.floor((v - DOMAIN[0]) / binWidth)));
    counts[k] += 1;
  }
  return counts.map((c, k) => ({
    from: DOMAIN[0] + k * binWidth,
    to: DOMAIN[0] + (k + 1) * binWidth,
    share: c / values.length,
  }));
}

const YMAX = 0.34;
const LEFT = panel(0, { x: DOMAIN, y: [0, YMAX] });
const RIGHT = panel(1, { x: DOMAIN, y: [0, YMAX] });

const bars = (p, values) =>
  histogram(values)
    .filter((b) => b.share > 0)
    .map((b) => ({ ...b, x1: p.px(b.from), x2: p.px(b.to), y: p.py(b.share) }));

export const caption = `Two sampling distributions of the mean from one population. ${BIG.n} is twenty times ${MANY.n}, so theory says √20 ≈ ${THEORY} times tighter and the simulation gives ${NARROWER}; drawing more samples changes the width not at all.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 40,
    marginRight: 18,
    marginBottom: 48,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(LEFT, { ticks: [0, 0.1, 0.2, 0.3], format: (v) => `${Math.round(v * 100)}%` }),
      ...panelAxis(RIGHT, { ticks: [0, 0.1, 0.2, 0.3], format: (v) => `${Math.round(v * 100)}%` }),
      panelTitle(LEFT, `${MANY.reps} samples of n = ${MANY.n}`, { fill: ACCENT }),
      panelTitle(RIGHT, `${BIG.reps} samples of n = ${BIG.n}`, { fill: PRIMARY }),
      panelBaseline(LEFT),
      panelBaseline(RIGHT),

      Plot.rect(bars(LEFT, MANY.means), {
        x1: "x1",
        x2: "x2",
        y1: LEFT.py(0),
        y2: "y",
        fill: ACCENT,
        fillOpacity: 0.55,
      }),
      Plot.rect(bars(RIGHT, BIG.means), {
        x1: "x1",
        x2: "x2",
        y1: RIGHT.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.6,
      }),

      ...[LEFT, RIGHT].map((p) =>
        Plot.text(
          [80, 90, 100, 110, 120].map((v) => ({ v, x: p.px(v) })),
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
      ...[
        [LEFT, SD_MANY, ACCENT],
        [RIGHT, SD_BIG, PRIMARY],
      ].map(([p, s, color]) =>
        Plot.link([{}], {
          x1: p.px(MU - s),
          x2: p.px(MU + s),
          y1: p.py(YMAX * 0.88),
          y2: p.py(YMAX * 0.88),
          stroke: color,
          strokeWidth: 3,
          strokeLinecap: "round",
        }),
      ),
      ...[
        [LEFT, SD_MANY, ACCENT],
        [RIGHT, SD_BIG, PRIMARY],
      ].map(([p, s, color]) =>
        Plot.text([{}], {
          x: p.px(MU),
          y: p.py(YMAX * 0.88),
          text: () => `standard error ${s.toFixed(1)}`,
          fill: color,
          fontSize: 10,
          fontWeight: 700,
          textAnchor: "middle",
          dy: -10,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: (LEFT.left + LEFT.right) / 2,
        y: LEFT.bottom,
        text: () => "smoother, and exactly as wide",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (RIGHT.left + RIGHT.right) / 2,
        y: RIGHT.bottom,
        text: () => `ragged, and ${NARROWER} times narrower`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
    ],
  });
}
