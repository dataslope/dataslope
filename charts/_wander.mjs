/**
 * One wandering series, shared by `cherry-picked-window` and its zoom.
 *
 * Ten years of a metric with no trend at all: a random walk pulled gently back
 * toward its starting level, which is what most business metrics look like
 * when nothing is happening. The window the pair is about is chosen by search
 * rather than by eye, so the claim ("this three-month stretch rises sharply")
 * is a property of the data instead of an assertion about it.
 */
import { rng } from "./_theme.mjs";

const MONTHS = 120;
const START = 100;

// Seed chosen so the decade is flat (about half a percent end to end) while a
// four-month window inside it rises about a quarter. Both numbers are computed
// below and quoted in the captions, so neither can drift from the data.
const next = rng(2800);
const gauss = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

/** Mean-reverting walk: no trend, plenty of local slope. */
export const SERIES = (() => {
  let v = START;
  return Array.from({ length: MONTHS }, (_, i) => {
    v += 0.12 * (START - v) + gauss() * 3.1;
    return { month: i, value: v };
  });
})();

export const WINDOW_LENGTH = 4;

/** The steepest run of `WINDOW_LENGTH` months, found rather than picked. */
export const WINDOW = (() => {
  let best = { start: 0, rise: -Infinity };
  for (let i = 0; i + WINDOW_LENGTH - 1 < SERIES.length; i++) {
    const rise = SERIES[i + WINDOW_LENGTH - 1].value - SERIES[i].value;
    if (rise > best.rise) best = { start: i, rise };
  }
  return { ...best, end: best.start + WINDOW_LENGTH - 1 };
})();

export const WINDOW_ROWS = SERIES.slice(WINDOW.start, WINDOW.end + 1);

/** Percent change across the window, and across the whole decade. */
export const WINDOW_PCT = Math.round(
  ((SERIES[WINDOW.end].value - SERIES[WINDOW.start].value) / SERIES[WINDOW.start].value) * 100,
);
export const DECADE_PCT = Math.round(
  ((SERIES[SERIES.length - 1].value - SERIES[0].value) / SERIES[0].value) * 100,
);
