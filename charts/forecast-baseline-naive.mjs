/**
 * The number a forecast should always be quoted against.
 *
 * A forecast error means nothing on its own. "Our model gets 9 units of mean
 * absolute error" is neither an achievement nor a failure until you know what
 * doing almost nothing would have scored, and on a seasonal series doing
 * almost nothing scores surprisingly well.
 *
 * The baseline here is **seasonal naive**: the forecast for a Tuesday is last
 * Tuesday. It has no parameters, nothing to fit, and nothing to overfit,
 * because there is nothing to fit. On any series with a strong weekly or
 * yearly cycle it is a hard opponent, and a startling number of production
 * models never beat it.
 *
 * The model is a plain least-squares regression on the same training window: a
 * linear trend plus one term per day of the week. It is about the simplest
 * thing that can use *all* the history rather than only last week's, and the
 * gain it produces over the baseline is the honest measure of what the extra
 * machinery bought.
 *
 * The size of that gain is worth dwelling on, because it is mostly a fact
 * about the *series* rather than a grade for the model. This series has a
 * level that wanders, so a good deal of what happens in the holdout was never
 * forecastable from the training window by anything, and the model wins by a
 * modest margin. Freeze that wander, leaving a clean trend and a stable weekly
 * shape, and the identical model posts a far larger number against the
 * identical baseline. Neither model is better than the other. One of them was
 * handed an easier series.
 *
 * Three habits follow.
 *
 * Quote the baseline next to the model, always, in the same units on the same
 * holdout. A model reported alone is a number without a denominator.
 *
 * Split by time, never at random. The holdout here is the last stretch of the
 * series, which is the only split that answers the question a forecast is
 * asked.
 *
 * And treat a modest improvement as a real result rather than an
 * embarrassment. A few per cent off the error of a strong baseline is worth a
 * great deal in a business, and it is a far more trustworthy claim than a
 * model that appears to halve the error on a series nobody has checked for
 * leakage.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, mean, normalSamples } from "./_theme.mjs";

export const title =
  "A daily series split by time, with a seasonal-naive baseline and a trend-plus-weekday regression forecasting the same holdout. The model wins by a margin small enough to be believable, because the level of this series wanders.";

const WEEKS = 16;
const N = WEEKS * 7;
const HOLDOUT = 28;
const TRAIN = N - HOLDOUT;

/** Weekday effects: a strong, stable weekly cycle, which is what makes the
 *  seasonal-naive baseline hard to beat. */
const WEEKDAY = [18, 22, 21, 24, 30, -14, -26];
const DRIFT = 0.42;

/**
 * A daily volume series: a level that drifts and also wanders, the weekly
 * cycle, and a little measurement noise. `wander` is the only thing that
 * changes between the two scenarios below.
 */
function makeSeries(wander) {
  const steps = normalSamples(N, DRIFT, wander, 6_101);
  const noise = normalSamples(N, 0, 1.2, 6_878);
  let level = 180;
  return Array.from({ length: N }, (_, t) => {
    level += steps[t];
    return { t, day: t % 7, value: level + WEEKDAY[t % 7] + noise[t] };
  });
}

/**
 * Fit trend plus weekday dummies on the training window by least squares, and
 * score both it and the seasonal-naive baseline on the holdout. The normal
 * equations are solved with a small Gaussian elimination rather than a
 * library, so the whole comparison is visible in one file.
 */
function evaluate(rows) {
  const train = rows.slice(0, TRAIN);
  const test = rows.slice(TRAIN);

  // Columns: [1, t, Mon..Sat], with Sunday folded into the intercept.
  const design = (row) => [1, row.t, ...Array.from({ length: 6 }, (_, k) => (row.day === k ? 1 : 0))];
  const p = 8;
  const xtx = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty = new Array(p).fill(0);
  for (const row of train) {
    const z = design(row);
    for (let i = 0; i < p; i++) {
      xty[i] += z[i] * row.value;
      for (let j = 0; j < p; j++) xtx[i][j] += z[i] * z[j];
    }
  }
  const m = xtx.map((r, i) => [...r, xty[i]]);
  for (let c = 0; c < p; c++) {
    let best = c;
    for (let r = c + 1; r < p; r++) if (Math.abs(m[r][c]) > Math.abs(m[best][c])) best = r;
    [m[c], m[best]] = [m[best], m[c]];
    for (let r = 0; r < p; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= p; k++) m[r][k] -= f * m[c][k];
    }
  }
  // After full elimination each row is one pivot: m[i][i]·βᵢ = m[i][p].
  const beta = m.map((row, i) => row[p] / row[i]);
  const model = (row) => design(row).reduce((s, v, i) => s + v * beta[i], 0);

  // Seasonal naive: the same weekday from the last week of training data, so
  // the baseline never uses a value it would not have had.
  const naive = (t) => rows[TRAIN - 7 + ((t - TRAIN) % 7)].value;

  const scored = test.map((row) => ({ ...row, naive: naive(row.t), model: model(row) }));
  const maeNaive = mean(scored.map((d) => Math.abs(d.value - d.naive)));
  const maeModel = mean(scored.map((d) => Math.abs(d.value - d.model)));
  return {
    train,
    scored,
    maeNaive,
    maeModel,
    gain: Math.round(((maeNaive - maeModel) / maeNaive) * 100),
  };
}

const WANDERING = makeSeries(4.2);
const MAIN = evaluate(WANDERING);
/** The same model, the same baseline, the same code, on a series whose level
 *  holds still. The gap between the two gains is a property of the data. */
const STEADY_GAIN = evaluate(makeSeries(0)).gain;

const Y_DOMAIN = [130, 275];

export const caption = `A forecast error means nothing on its own. "${MAIN.maeModel.toFixed(1)} units of mean absolute error" is neither good nor bad until you know what doing almost nothing would have scored, and on a seasonal series doing almost nothing scores well. The baseline here is seasonal naive: the forecast for a Tuesday is last Tuesday. It has no parameters, nothing to fit and nothing to overfit, and on this holdout it lands at ${MAIN.maeNaive.toFixed(1)}. The model is a least-squares regression fitted on the training window, a linear trend plus one term per weekday, which is about the simplest thing that can use all the history rather than only last week's. It scores ${MAIN.maeModel.toFixed(1)}, an improvement of ${MAIN.gain}%. That margin is mostly a fact about the series rather than a grade for the model. This one has a level that wanders, so much of what happens in the holdout was never forecastable from the training window by anything at all. Freeze the wander, leaving the same trend, the same weekly shape and the same noise, and the identical model beats the identical baseline by ${STEADY_GAIN}%. Neither version of the model is better than the other; one of them was handed an easier series. Three habits follow. Quote the baseline beside the model, always, in the same units on the same holdout, because a model reported alone is a number with no denominator. Split by time and never at random: the holdout here is the last ${HOLDOUT} days, which is the only split that answers the question a forecast is actually asked. And treat a modest improvement as a result rather than an embarrassment, because a few per cent off a strong baseline is worth real money, and it is a far more trustworthy claim than a model that appears to halve the error on a series nobody has checked for leakage.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 30,
    marginLeft: 48,
    marginRight: 20,
    marginBottom: 52,
    ariaLabel: title,
    x: {
      label: "Day",
      labelAnchor: "center",
      domain: [0, N - 1],
      ticks: [0, 28, 56, 84, 112],
    },
    y: { label: "Daily volume", domain: Y_DOMAIN, ticks: [150, 200, 250] },
    marks: [
      Plot.rect([{}], {
        x1: TRAIN,
        x2: N - 1,
        y1: Y_DOMAIN[0],
        y2: Y_DOMAIN[1],
        fill: "currentColor",
        fillOpacity: 0.05,
      }),
      Plot.ruleX([TRAIN], { stroke: GUIDE, strokeWidth: 1.3, strokeDasharray: "4,3" }),

      Plot.line(MAIN.train, { x: "t", y: "value", stroke: MUTED, strokeWidth: 1.2 }),
      Plot.line(MAIN.scored, { x: "t", y: "value", stroke: "currentColor", strokeWidth: 1.8 }),
      Plot.line(MAIN.scored, {
        x: "t",
        y: "naive",
        stroke: ACCENT,
        strokeWidth: 1.6,
        strokeDasharray: "4,3",
      }),
      Plot.line(MAIN.scored, { x: "t", y: "model", stroke: PRIMARY, strokeWidth: 1.8 }),

      Plot.text([{}], {
        x: TRAIN - 3,
        y: Y_DOMAIN[1] - 6,
        text: () => `fitted on days 0 to ${TRAIN - 1}`,
        fill: "currentColor",
        fillOpacity: 0.55,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.text([{}], {
        x: TRAIN + 3,
        y: Y_DOMAIN[1] - 6,
        text: () => `holdout: the last ${HOLDOUT} days`,
        fill: "currentColor",
        fillOpacity: 0.55,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),

      // The scores, stacked in the training half where there is room.
      Plot.text([{}], {
        x: 2,
        y: 268,
        text: () => "what happened",
        fill: "currentColor",
        fillOpacity: 0.85,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 2,
        y: 258,
        text: () => `seasonal naive, last week repeated: MAE ${MAIN.maeNaive.toFixed(1)}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 2,
        y: 248,
        text: () => `trend plus weekday terms: MAE ${MAIN.maeModel.toFixed(1)}, ${MAIN.gain}% better`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: (TRAIN + N - 1) / 2,
        y: Y_DOMAIN[0] + 6,
        text: () => `${MAIN.gain}% over the baseline\nis the whole claim`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
