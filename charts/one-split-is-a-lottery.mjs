/**
 * Why one train/test split is not an evaluation: the same model, scored twenty
 * times, once per split.
 *
 * The lesson's code changes only the split's random seed and watches the
 * accuracy move by several points. This is that result as a picture, plus the
 * comparison that motivates cross-validation: the top strip is twenty single
 * splits, the bottom is twenty 5-fold estimates over the same data. Both are
 * unbiased and both centre on the same truth; only the second is precise
 * enough to compare two models with.
 *
 * The numbers are a model, not a measurement, and the caption says so. A test
 * score on `m` held-out rows is a binomial proportion, so its spread is fixed
 * by `m` alone — which is exactly the point. Five-fold cross-validation scores
 * every row once instead of 30% of them, so its estimate is built from about
 * three times as many judgements and lands about √3 times closer.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two horizontal strips of twenty dots each, both centred on 95%. The upper strip, one train/test split per dot, is scattered from about 89% to 100%. The lower strip, five-fold cross-validation per dot, is clustered tightly around 95%.";

export const caption =
  "The same model, evaluated twenty times each way. A single split holds out a few dozen rows, so its score is a small sample and swings by several points; cross-validation scores every row and lands far closer. Simulated from the binomial spread of an accuracy estimate, not measured.";

const TRUTH = 0.95;
const ROWS = 333; // the penguins dataset the lesson uses, after dropping nulls
const HOLDOUT = Math.round(ROWS * 0.3);
const REPEATS = 20;

const next = rng(20260807);

/** One accuracy estimate over `m` independent judgements, each right with
 *  probability `TRUTH`. */
const estimate = (m) => {
  let right = 0;
  for (let i = 0; i < m; i++) if (next() < TRUTH) right += 1;
  return right / m;
};

const STRIPS = [
  { key: `One 30% split (${HOLDOUT} rows)`, m: HOLDOUT, color: ACCENT },
  { key: `5-fold CV (all ${ROWS} rows)`, m: ROWS, color: PRIMARY },
];

// Accuracy on a hundred rows can only land on a multiple of 0.01, so repeats
// collide constantly. Each strip is therefore stacked by hand: ties pile up
// into a little column instead of hiding under one another, which also makes
// the shape of each method's spread visible. (Plot's `dy` is a constant option,
// not a channel, so it cannot do the offsetting.)
const STACK_STEP = 0.11;

const points = STRIPS.flatMap((s, row) => {
  const scores = Array.from({ length: REPEATS }, () => estimate(s.m));
  const seen = new Map();
  return scores.map((score) => {
    const key = score.toFixed(4);
    const rank = seen.get(key) ?? 0;
    seen.set(key, rank + 1);
    return { strip: s.key, color: s.color, score, row, y: row + rank * STACK_STEP };
  });
});

const spread = (key) => {
  const xs = points.filter((p) => p.strip === key).map((p) => p.score);
  return { lo: Math.min(...xs), hi: Math.max(...xs) };
};

const RANGES = STRIPS.map((s, row) => ({ strip: s.key, color: s.color, row, ...spread(s.key) }));

export function render() {
  return plot({
    height: 290,
    marginTop: 40,
    marginLeft: 186,
    marginRight: 124,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Measured accuracy",
      labelAnchor: "center",
      domain: [0.86, 1.005],
      ticks: 5,
      tickFormat: "%",
    },
    // Continuous rather than a band, because the stacking above needs a
    // per-point y. The two ticks are still the strip names.
    y: {
      label: null,
      domain: [-0.5, 1.62],
      ticks: [0, 1],
      tickFormat: (row) => STRIPS[row].key,
      grid: false,
      reverse: true,
    },
    marks: [
      Plot.ruleX([TRUTH], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: TRUTH,
        y: -0.42,
        text: () => "the model's true accuracy",
        fill: GUIDE,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      // The span each method's twenty answers cover, which is the comparison.
      Plot.ruleY(RANGES, {
        y: "row",
        x1: "lo",
        x2: "hi",
        stroke: (d) => d.color,
        strokeOpacity: 0.28,
        strokeWidth: 3,
      }),
      Plot.dot(points, {
        x: "score",
        y: "y",
        r: 3.4,
        fill: (d) => d.color,
        fillOpacity: 0.85,
        stroke: null,
      }),
      Plot.text(RANGES, {
        y: "row",
        x: "hi",
        text: (d) => `spans ${Math.round((d.hi - d.lo) * 100)} points`,
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 12,
        ...HALO,
      }),
    ],
  });
}
