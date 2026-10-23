import results from "./results.json" with { type: "json" };

// Every number and every dot the video shows, read from results.json: what
// NumPy and SciPy in Pyodide 314.0.7 (the runtime the page's blocks run in)
// returned for the blocks in check.mjs, which wrote it. Random data is drawn
// there from seeded generators, so a rerun gives the same figures. Pure (no
// Remotion, no DOM).

export const VIDEO = "ds-statistics";

/**
 * Whether public/images/ds-statistics/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

const F = results.figures;

/** The two misread numbers of the opening: the page's interval block. */
export const HOOK = F.hook;

/** Questions 1 to 3: the page's skewed population and its 2,000 samples. */
export const SAMPLE = F.sample;

/** Questions 4 and 5: sample means at three sizes, and one running average. */
export const CLT = F.clt;

/** Question 6: the likelihood of 12 in 40 and 120 in 400 over every rate. */
export const MLE = F.mle;

/** Question 7: the two variance divisors, averaged over 10,000 samples. */
export const BESSEL = F.bessel;

/** Question 8: the course's 100 intervals, as [low, centre, high, covers]. */
export const CI = {
  covered: F.ci.covered,
  missed: F.ci.missed,
  intervals: F.ci.intervals as unknown as [number, number, number, boolean][],
};

/** Question 11: the course's coin; counts of heads from `from` upward. */
export const COIN = F.coin;

/** Question 12: the critical values and the curves. */
export const ZT = F.zt;

/** Question 13: the course's device and churn table. */
export const CHI = F.chi;

/** Question 14: the page's three groups and the course's pairwise block. */
export const ANOVA = F.anova;

/** Question 15: the course's 300,000 per group. */
export const EFFECT = F.effect;

/** Question 16: the course's twenty tests of nothing. */
export const HACK = F.hack;

/** Rapid fire: the page's A/B table, read the Bayesian way. */
export const BAYES = F.bayes;

/** Rapid fire: the course's two support queues. */
export const RANKS = F.ranks;
