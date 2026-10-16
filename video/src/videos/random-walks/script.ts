import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Trends that are not there" (16:9), after
 * content/courses/time-series-analysis-python/stationarity.mdx (the random
 * walk and its Augmented Dickey-Fuller test, seed 0, 300 steps) and
 * content/courses/time-series-analysis-python/differencing.mdx.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, all from measure.py (numpy 2.5.3, statsmodels 0.15.0, seeded), whose
 * output is measurements.json; data.ts derives what the screen shows from it:
 *   - the featured walk is pair 0 of np.random.default_rng(0), the lesson's
 *     seed, so it is the first pair drawn rather than a chosen one; its first
 *     walk ends 26 steps up after 300 flips, its highest point;
 *   - the two walks of that pair correlate at r = 0.844; their differences at
 *     r = 0.038; 7.4% of all pairs are past 0.8, so it is a strong pair but
 *     far from a freak, and the narration asks rather than asserts;
 *   - across 10,000 independent pairs, 39.3% of walk correlations are beyond
 *     plus or minus 0.5 ("two in five"), and 70.2% beyond 0.25 ("seven in
 *     ten");
 *   - walks of 3,000 flips (10,000 more pairs, seed 1): 40.1% beyond 0.5, and
 *     a spread of 0.492 against 0.489 ("just as wide");
 *   - neighbouring points of the walk correlate at 0.988; neighbouring flips
 *     at 0.014; differencing a coin-flip walk returns exactly its flips
 *     (asserted);
 *   - the same 10,000 pairs, differenced: 2 of 10,000 beyond 0.25, none past
 *     0.27;
 *   - adfuller, as in the lesson: walk p = 0.45 (cannot reject a unit root,
 *     non-stationary), its differences p below 0.001 (stationary).
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "random-walks",
  leadIn: 0.5,
  tail: 2.6,
  sceneGap: 2.0,
  beats: [
    { id: "hook", text: "This line looks like it is going somewhere.", pauseAfter: 0.3 },
    {
      id: "coin",
      text: "It isn't. Each step is a coin flip, one up or one down, and nothing more.",
      pauseAfter: 0.3,
    },
    {
      id: "wander",
      text: "After three hundred flips it is twenty-six steps up. It looks like a trend.",
      pauseAfter: 0.6,
    },
    {
      id: "pair",
      scene: true,
      text: "Now flip a second coin for a second walk. The two have nothing to do with each other.",
      pauseAfter: 0.3,
    },
    { id: "corr", text: "Yet their correlation is zero point eight four.", pauseAfter: 0.6 },
    {
      id: "many",
      scene: true,
      text: "Was that a fluke? Here are ten thousand pairs of independent walks.",
      pauseAfter: 0.3,
    },
    {
      id: "spread",
      text: "Their correlations land all over the place. Two in five reach past one half, in one direction or the other.",
      pauseAfter: 0.35,
    },
    {
      id: "longer",
      text: "More data does not help. Walks ten times as long spread just as wide.",
      pauseAfter: 0.6,
    },
    {
      id: "why",
      scene: true,
      text: "Three hundred points feel like plenty of evidence. But each point of a walk is the last one plus one flip.",
      pauseAfter: 0.35,
    },
    {
      id: "diff",
      text: "Differencing undoes that. Subtract each value from the one after it, and the coin flips come back.",
      pauseAfter: 0.6,
    },
    {
      id: "collapse",
      scene: true,
      text: "Now the same pairs correlate at nearly zero. Before, seven in ten passed a quarter. Now, two in ten thousand do.",
      pauseAfter: 0.6,
    },
    {
      id: "rule",
      scene: true,
      text: "That is why time-series work tests for stationarity before trusting a correlation. This walk fails the test. Its differences pass.",
    },
  ],
};
