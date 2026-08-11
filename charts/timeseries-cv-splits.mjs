/**
 * A random k-fold split on a timeline, drawn so you can see it training on
 * next month to predict last month.
 *
 * Cross-validation assumes the rows are exchangeable: that any row could have
 * been any other, so holding out a random subset simulates holding out new
 * data. A time series breaks that assumption in the most direct way possible,
 * because the rows are ordered and the model's job is to predict the order.
 *
 * The top rows are a five-fold random split. In every fold, most of the
 * training data comes from *after* the test period. The model gets to see the
 * future, and it does not need to be clever to exploit that: any autocorrelated
 * series will let a model interpolate a held-out month from its neighbours,
 * which is a much easier problem than forecasting and produces a score that
 * will not survive deployment.
 *
 * The bottom rows are an expanding-window backtest. Every fold trains on a
 * prefix and tests on the block that comes next, which is the shape of the real
 * problem. It costs two things and both are worth naming: the earliest folds
 * train on very little data, and the total training data varies across folds,
 * so the fold scores are not identically distributed and averaging them is a
 * rougher summary than in ordinary CV.
 *
 * The third option, a rolling window of fixed length, drops the oldest data
 * instead of accumulating it, and is the right choice when the process itself
 * changes and old data is actively misleading.
 *
 * The gap this figure does not show, and that also matters, is the one you need
 * between train and test when a feature is built from a window: a seven-day
 * rolling mean at the first test point has consumed six days of training data,
 * and without an embargo of at least the window length the leak survives the
 * split.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelSpace } from "./_panels.mjs";

export const title =
  "A five-fold random split and a five-fold expanding-window backtest drawn on the same twenty-four month timeline. In every random fold most of the training data comes from after the test block; in the backtest every fold trains only on the past.";

const MONTHS = 24;
const FOLDS = 5;

/** Random k-fold: each month gets a fold at random, so a fold's test months
 *  are scattered and its training months surround them. Deterministic. */
const ASSIGN = Array.from({ length: MONTHS }, (_, i) => (i * 7 + 3) % FOLDS);

const randomFolds = Array.from({ length: FOLDS }, (_, f) =>
  Array.from({ length: MONTHS }, (_, i) => (ASSIGN[i] === f ? "test" : "train")),
);

/** Expanding window: fold f trains on everything before its test block. */
const BLOCK = Math.floor(MONTHS / (FOLDS + 1));
const walkFolds = Array.from({ length: FOLDS }, (_, f) => {
  const testFrom = BLOCK * (f + 1);
  const testTo = testFrom + BLOCK;
  return Array.from({ length: MONTHS }, (_, i) =>
    i < testFrom ? "train" : i < testTo ? "test" : "unused",
  );
});

/** How much of each random fold's training data is in the future of its own
 *  earliest test month: the number the picture is about. */
const FUTURE_SHARE = Math.round(
  (randomFolds.reduce((s, fold) => {
    const firstTest = fold.indexOf("test");
    const after = fold.filter((r, i) => r === "train" && i > firstTest).length;
    return s + after / fold.filter((r) => r === "train").length;
  }, 0) /
    FOLDS) *
    100,
);

const TOP = panel(0, { y: [0, 1] });
const ROW_TOP = 0.9;
const STEP = 0.062;
const CELL_H = 0.042;

function cells(folds, offset) {
  return folds.flatMap((fold, f) =>
    fold.map((role, i) => ({
      role,
      x1: TOP.left + ((TOP.right - TOP.left) * i) / MONTHS + 0.002,
      x2: TOP.left + ((TOP.right - TOP.left) * (i + 1)) / MONTHS - 0.002,
      y1: offset - f * STEP - CELL_H,
      y2: offset - f * STEP,
    })),
  );
}

const randomCells = cells(randomFolds, ROW_TOP);
const walkCells = cells(walkFolds, 0.5);

const FILL = { train: PRIMARY, test: ACCENT, unused: MUTED };
const OPACITY = { train: 0.55, test: 0.85, unused: 0.09 };

export const caption = `Cross-validation assumes the rows are exchangeable: any row could have been any other, so holding out a random subset stands in for holding out new data. A time series breaks that in the most direct way there is, because the rows are ordered and the model's job is to predict the order. In the top block, an average of ${FUTURE_SHARE}% of each fold's training data comes from after its own first test month. The model gets to see the future, and it does not need to be clever to use it: any autocorrelated series lets a model interpolate a held-out month from its neighbours, which is a far easier problem than forecasting and produces a score that will not survive deployment. The bottom block trains on a prefix and tests on the block that comes next, which is the shape of the real problem. It costs two things worth naming: the earliest folds train on very little, and the training size varies across folds, so the fold scores are not identically distributed and averaging them is a rougher summary than usual. A rolling window of fixed length is the third option, dropping the oldest data rather than accumulating it, and is right when the process itself changes. One leak this figure does not show still matters: if a feature is a seven-day rolling mean, the first test point has already consumed six days of training data, and without an embargo of at least the window length the leak survives the split.`;

export function render() {
  return plot({
    height: 380,
    marginTop: 26,
    marginLeft: 22,
    marginRight: 22,
    marginBottom: 26,
    ariaLabel: title,
    ...panelSpace(1),
    marks: [
      Plot.text([{}], {
        x: TOP.left,
        y: 0.975,
        text: () => "Random 5-fold: every fold trains on the future",
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: TOP.left,
        y: 0.575,
        text: () => "Expanding window: every fold trains on the past",
        fill: PRIMARY,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "start",
        ...HALO,
      }),
      ...[randomCells, walkCells].map((cs) =>
        Plot.rect(cs, {
          x1: "x1",
          x2: "x2",
          y1: "y1",
          y2: "y2",
          fill: (d) => FILL[d.role],
          fillOpacity: (d) => OPACITY[d.role],
        }),
      ),
      ...[ROW_TOP, 0.5].map((offset) =>
        Plot.text(
          Array.from({ length: FOLDS }, (_, f) => ({ f, y: offset - f * STEP - CELL_H / 2 })),
          {
            x: TOP.left,
            y: "y",
            text: (d) => `fold ${d.f + 1}`,
            fill: MUTED,
            fontSize: 10,
            fontWeight: 600,
            textAnchor: "end",
            dx: -6,
          },
        ),
      ),
      Plot.link([{}], {
        x1: TOP.left,
        x2: TOP.right,
        y1: 0.175,
        y2: 0.175,
        stroke: "currentColor",
        strokeOpacity: 0.3,
      }),
      Plot.text(
        [0, 6, 12, 18, 24].map((m) => ({
          m,
          x: TOP.left + ((TOP.right - TOP.left) * m) / MONTHS,
        })),
        {
          x: "x",
          y: 0.175,
          text: (d) => `month ${d.m}`,
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 14,
        },
      ),
      Plot.dot(
        [
          { label: "train", role: "train", x: TOP.left + 0.02 },
          { label: "test", role: "test", x: TOP.left + 0.14 },
          { label: "unused", role: "unused", x: TOP.left + 0.26 },
        ],
        { x: "x", y: 0.05, fill: (d) => FILL[d.role], fillOpacity: (d) => OPACITY[d.role], r: 5, symbol: "square" },
      ),
      Plot.text(
        [
          { label: "train", x: TOP.left + 0.02 },
          { label: "test", x: TOP.left + 0.14 },
          { label: "unused", x: TOP.left + 0.26 },
        ],
        {
          x: "x",
          y: 0.05,
          text: "label",
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "start",
          dx: 9,
          ...HALO,
        },
      ),
    ],
  });
}
