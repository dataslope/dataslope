import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Overfitting" (16:9), after
 * content/courses/machine-learning-scikit-learn/generalization-and-overfitting.mdx,
 * "Seeing both failures with one example" and "The complexity–error curve":
 * polynomials of rising degree fitted to noisy points from sin(1.5 x), scored
 * on the training points and on held-out data.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each measured with scikit-learn 1.9.1 and NumPy 2.5.3 by measure.py
 * (measurements.json; every number and curve on screen comes from data.ts,
 * which reads it):
 *   - twelve training points from y = sin(1.5 x) plus noise with a standard
 *     deviation of 0.25, x in [0, 4], seed 0;
 *   - the degree-eleven fit passes through all twelve: training error 0 (to
 *     floating point), and it leaves the chart before the first point and
 *     after the last (it reaches -15.4 at x = 0 and 45.1 at x = 4);
 *   - training error never rises as the degree goes from one to eleven
 *     (0.152 at degree one, 0.0195 at three, 0 at eleven; measure.py asserts
 *     it);
 *   - on 1,000 new points from the same source, error falls to its lowest at
 *     degree three (0.107) and climbs after it, to 26.4 at degree eleven,
 *     247.8 times the degree-three error: "nearly two hundred and fifty";
 *   - five-fold cross-validation on the twelve training points alone gives
 *     its lowest average error at degree three too (0.052).
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "overfitting",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "A model can score perfectly on the data it learned from, and still fail on new data. That is overfitting.",
      pauseAfter: 0.5,
    },
    { id: "sample", text: "Take twelve points from a smooth curve, with some noise added.", pauseAfter: 0.3 },
    { id: "line", text: "A straight line is too stiff to follow the bend.", pauseAfter: 0.2 },
    { id: "cubic", text: "Degree three follows it well.", pauseAfter: 0.3 },
    {
      id: "eleven",
      text: "Degree eleven threads all twelve points, so its training error is zero. But between them it wobbles, and past the ends it flies off.",
      pauseAfter: 0.6,
    },
    { id: "sweep", text: "Now fit every degree from one to eleven, and measure the error twice.", pauseAfter: 0.3 },
    { id: "train", text: "On the twelve training points, it falls all the way to zero.", pauseAfter: 0.3 },
    {
      id: "test",
      text: "On a thousand new points from the same curve, it falls until degree three, then climbs.",
      pauseAfter: 0.2,
    },
    { id: "worse", text: "At degree eleven, it is nearly two hundred and fifty times worse.", pauseAfter: 0.5 },
    { id: "blind", text: "So the training error cannot warn you. It only ever improves.", pauseAfter: 0.6 },
    { id: "holdout", text: "Keep some data back, and score the model on that.", pauseAfter: 0.3 },
    {
      id: "cv",
      text: "Or cross-validate. Split the training points into five folds. Train on four, score on the fifth, and rotate.",
      pauseAfter: 0.3,
    },
    {
      id: "cvresult",
      text: "Averaged over the five rounds, the error is lowest at degree three again.",
      pauseAfter: 0.6,
    },
    { id: "rule", text: "Judge a model by data it has never seen." },
  ],
};
