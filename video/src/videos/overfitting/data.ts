import { ds, inkOf } from "../../theme/brand";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK } from "../../editorial/style";
import m from "./measurements.json";

// Every curve and number the video shows. Measured, not drawn: measure.py
// fits the polynomials with scikit-learn and measurements.json is its output,
// imported here as it is. Pure (no Remotion, no DOM).

export const VIDEO = "overfitting";

/**
 * Whether public/images/overfitting/ holds the two watercolors from
 * illustrations.json. Set it to true once `npm run illustrations --
 * overfitting` has written both WebPs. Every frame is laid out with room for
 * them either way.
 */
export const ILLUSTRATIONS = true;

export const N_TRAIN = m.meta.nTrain;
export const N_TEST = m.meta.nTest;
export const FOLDS = m.meta.folds;

/** The twelve training points, left to right, with the cross-validation fold
 *  each one is held out in and the noiseless curve's value at its x. */
export const POINTS = m.train.x.map((x, i) => ({
  x,
  y: m.train.y[i],
  truth: m.train.truth[i],
  fold: m.foldOf[i],
}));

/** x from 0 to 4 in steps of 0.01, and the curve the points were drawn from. */
export const GRID: readonly number[] = m.grid;
export const TRUTH: readonly number[] = m.truth;

/** The three fits Fig. 1 draws, evaluated on GRID. */
export const SHOWN = [1, 3, 11] as const;
export type Shown = (typeof SHOWN)[number];
export const FITS: Record<Shown, readonly number[]> = { 1: m.fits["1"], 3: m.fits["3"], 11: m.fits["11"] };

/** Mean squared error by degree, 1 to 11: on the twelve training points, on
 *  1,000 new points from the same source, and averaged over five folds. */
export type Row = { degree: number; train: number; test: number; cv: number };
export const SWEEP: readonly Row[] = m.sweep.map(({ degree, train, test, cv }) => ({ degree, train, test, cv }));
export const DEGREES = SWEEP.map((r) => r.degree);
export const MAX_DEGREE = DEGREES[DEGREES.length - 1];
export const row = (degree: number) => {
  const r = SWEEP.find((s) => s.degree === degree);
  if (!r) throw new Error(`No degree ${degree} in measurements.json`);
  return r;
};

/** The degree, between two measured ones, at which an error's line crosses
 *  `top` on its way up: where it leaves a chart that stops there. */
export const exitDegree = (key: "test" | "cv", top: number) => {
  const i = SWEEP.findIndex((r) => r[key] > top);
  if (i <= 0) return MAX_DEGREE;
  const a = SWEEP[i - 1];
  const b = SWEEP[i];
  return a.degree + ((top - a[key]) / (b[key] - a[key])) * (b.degree - a.degree);
};

/** Where each error is lowest, and how much worse new data does at eleven. */
export const BEST = m.best;
export const RATIO = m.ratio11to3;

/** The fits keep one color each: purple too stiff, green about right, the
 *  page's red accent for the one that memorized the points. */
export const FIT_COLOR: Record<Shown, string> = { 1: ds("purple", 500), 3: ds("green", 600), 11: ACCENT };
export const FIT_INK: Record<Shown, string> = { 1: inkOf.purple, 3: inkOf.green, 11: ACCENT_INK };

/** Blue is data a model trains on; orange is data it is scored on. */
export const TRAIN_COLOR = BAR;
export const TRAIN_INK = BLUE_INK;
export const NEW_COLOR = ds("orange", 500);
export const NEW_INK = inkOf.orange;

/** "−1": numbers on the page take a real minus sign. */
export const signed = (v: number, digits = 0) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

