import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK_SOFT } from "../../editorial/style";

export const VIDEO = "base-rate";

/** Flip to true once public/images/base-rate/ holds both cut-outs. */
export const ILLUSTRATIONS = false;

/**
 * The lesson's own inputs (conditional-probability.mdx, "The centerpiece: a
 * 99% accurate test that's usually wrong"): a condition 1 in 1,000 people
 * have, and a test that is 99% accurate in both directions. Every number on
 * screen is derived from these four.
 */
export const PREVALENCE = 1 / 1000;
export const SENSITIVITY = 0.99;
export const SPECIFICITY = 0.99;
export const POPULATION = 10_000;
const FALSE_POSITIVE_RATE = 1 - SPECIFICITY;

/** Expected counts in the population: fractions of a person allowed. */
const sick = POPULATION * PREVALENCE;
const healthy = POPULATION - sick;
export const EXPECTED = {
  sick,
  healthy,
  tp: sick * SENSITIVITY,
  fn: sick * (1 - SENSITIVITY),
  fp: healthy * FALSE_POSITIVE_RATE,
  tn: healthy * SPECIFICITY,
};

/** P(has it | positive), counted: true positives over all positives. */
export const PPV = EXPECTED.tp / (EXPECTED.tp + EXPECTED.fp);
/** The same thing by Bayes' rule, which is the count divided through by the
 *  population. Kept separate so the two can be checked against each other. */
export const BAYES =
  (SENSITIVITY * PREVALENCE) / (SENSITIVITY * PREVALENCE + FALSE_POSITIVE_RATE * (1 - PREVALENCE));

/** A second, independent test on everyone who tested positive. */
export const RETEST = { tp: EXPECTED.tp * SENSITIVITY, fp: EXPECTED.fp * FALSE_POSITIVE_RATE };
export const PPV2 = RETEST.tp / (RETEST.tp + RETEST.fp);

/** How many healthy people there are for every one who has it. */
export const ODDS = healthy / sick;

/**
 * The icon array draws whole people, so it draws the expected counts rounded:
 * 10 have it, all 10 test positive (9.9 expected), 100 healthy people are
 * flagged (99.9 expected), and on a second test 10 and 1 stay positive (9.8
 * and 1.0 expected).
 */
const tp = Math.round(EXPECTED.tp);
const fp = Math.round(EXPECTED.fp);
const roundedSick = Math.round(EXPECTED.sick);
export const COUNT = {
  sick: roundedSick,
  healthy: POPULATION - roundedSick,
  tp,
  fn: roundedSick - tp,
  fp,
  tn: POPULATION - roundedSick - fp,
  positives: tp + fp,
  retestTp: Math.round(RETEST.tp),
  retestFp: Math.round(RETEST.fp),
};

/** "1 in 11": one positive in this many has it. */
export const ONE_IN = Math.round(1 / PPV);

/** The field: 10,000 people as 125 columns by 80 rows. */
export const FIELD_COLS = 125;
export const FIELD_ROWS = POPULATION / FIELD_COLS;

/** The pulled-out positives: one row per real case's width, so the people
 *  who have it fill the first row exactly and the false alarms the rest. */
export const BLOCK_COLS = COUNT.tp;
export const BLOCK_ROWS = Math.ceil(COUNT.positives / BLOCK_COLS);

/** A small seeded generator (mulberry32), so every render places the same
 *  people in the same seats. */
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Seats for `count` people, none closer than two seats to another marked
 *  one, so every highlighted mark stands on its own. */
const seats = (rand: () => number, count: number, taken: Set<number>) => {
  const out: number[] = [];
  const near = (i: number) => {
    const c = i % FIELD_COLS;
    const r = Math.floor(i / FIELD_COLS);
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= FIELD_ROWS || cc >= FIELD_COLS) continue;
        if (taken.has(rr * FIELD_COLS + cc)) return true;
      }
    }
    return false;
  };
  while (out.length < count) {
    const i = Math.floor(rand() * POPULATION);
    if (near(i)) continue;
    taken.add(i);
    out.push(i);
  }
  return out.sort((a, b) => a - b);
};

const rand = mulberry32(20261015);
const taken = new Set<number>();
const SICK_SEATS = seats(rand, COUNT.sick, taken);
const FP_SEATS = seats(rand, COUNT.fp, taken);

export type Person = {
  /** Seat in the field, row-major. */
  seat: number;
  col: number;
  row: number;
  /** Place in the pulled-out block, row-major. */
  slot: number;
  hasIt: boolean;
  /** Still positive on the second test. */
  retest: boolean;
  /** A per-person delay, in frames, so the marks do not move as one. */
  jitter: number;
};

/** The second test's one surviving false alarm, among the 100. */
const survivor = Math.floor(rand() * COUNT.fp);

/** Everyone who tests positive: the real cases first, then the false alarms,
 *  each in field order so the marks flow down into the block. */
export const POSITIVES: Person[] = [
  ...SICK_SEATS.map((seat, i) => ({ seat, hasIt: true, retest: i < COUNT.retestTp })),
  ...FP_SEATS.map((seat, i) => ({ seat, hasIt: false, retest: COUNT.retestFp > 0 && i === survivor })),
].map((p, slot) => ({
  ...p,
  col: p.seat % FIELD_COLS,
  row: Math.floor(p.seat / FIELD_COLS),
  slot,
  jitter: rand() * 12,
}));

/** Seats of the people who test negative: everyone else. */
const POSITIVE_SEATS = new Set(POSITIVES.map((p) => p.seat));
export const NEGATIVE_SEATS = Array.from({ length: POPULATION }, (_, i) => i).filter((i) => !POSITIVE_SEATS.has(i));

/** Has it, in the data blue; false alarms, in the page's red accent. */
export const COLOR = { hasIt: BAR, falseAlarm: ACCENT, crowd: `color-mix(in srgb, ${INK_SOFT} 42%, transparent)` };
export const COLOR_INK = { hasIt: BLUE_INK, falseAlarm: ACCENT_INK };

/** "9%", "0.1%" */
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
/** "9,990" */
export const num = (x: number) => Math.round(x).toLocaleString("en-US");
