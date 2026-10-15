import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Temperature" (16:9): what temperature does when a language
 * model picks its next token. After content/courses/how-llms-work/sampling.mdx,
 * whose own example (" cat", " dog", " bird", " rock" with logits 3.2, 2.1,
 * 1.5 and -0.4) is the one on screen. Those are illustrative scores, not a
 * real model's, and the page says so. The prompt on screen, "Her new pet is
 * a", is ours, picked so the lesson's four tokens are its candidates.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each computed by measure.py (numpy 2.5.3; measurements.json is its
 * output and data.ts reads it):
 *   - softmax of the scores: cat 64.8%, dog 21.6%, bird 11.8%, rock 1.77%
 *     ("sixty-five percent", "under two");
 *   - dividing by a positive temperature never reorders the tokens (asserted
 *     at every T from 0.01 to 2.00);
 *   - T = 0.2: cat 99.57% ("over ninety-nine percent"); the scores divided by
 *     T are 16, 10.5, 7.5 and -2, so every gap is five times wider;
 *   - T = 0 is argmax: softmax at T = 0.01 is already one-hot on cat;
 *   - T = 1.5: rock 4.79% ("almost five percent");
 *   - twenty draws per temperature with numpy's default_rng, every row from
 *     the same seed, so every row consumes the same twenty uniforms (numpy's
 *     choice is inverse-CDF sampling, re-done by hand and asserted). The seed,
 *     72, is the most typical of seeds 0 to 99, not a hand-picked one.
 *     Counts: T 0.2 cat 20; T 0.7 cat 15, dog 4, bird 1; T 1.0 cat 13, dog 5,
 *     bird 2; T 1.5 cat 11, dog 5, bird 3, rock 1;
 *   - top-p 0.9 at T = 1.5, the lesson's rule: cat 52.8%, then 78.2% with
 *     dog, then 95.2% with bird, which passes 0.9, so rock is dropped.
 *
 * The closing advice is the lesson's "Choosing settings" callout.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "llm-temperature",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "A language model has to finish this sentence. Which word comes next?",
      pauseAfter: 0.4,
    },
    {
      id: "logits",
      text: "First it gives every candidate a score, called a logit. Say cat scores three point two, and rock scores minus zero point four.",
      pauseAfter: 0.35,
    },
    {
      id: "softmax",
      text: "Softmax turns the scores into probabilities. It raises e to each score and divides by the total. Cat gets sixty-five percent. Rock gets under two.",
      pauseAfter: 0.6,
    },
    {
      id: "divide",
      text: "Temperature divides every score before the softmax. The order never changes. Only the shape does.",
      pauseAfter: 0.4,
    },
    {
      id: "low",
      text: "Below one, the gaps between the scores grow. At zero point two, cat takes over ninety-nine percent.",
      pauseAfter: 0.3,
    },
    {
      id: "greedy",
      text: "At zero, it always takes the top token. That is greedy decoding.",
      pauseAfter: 0.4,
    },
    {
      id: "high",
      text: "Above one, the gaps shrink and the bars even out. At one point five, rock rises to almost five percent.",
      pauseAfter: 0.6,
    },
    {
      id: "draw",
      text: "Now draw twenty tokens at each setting, from the same twenty random numbers.",
      pauseAfter: 0.3,
    },
    { id: "draw-low", text: "At zero point two, all twenty come out cat.", pauseAfter: 0.3 },
    {
      id: "draw-high",
      text: "At one point five, cat wins only eleven. Dog, bird, and even rock get a turn.",
      pauseAfter: 0.6,
    },
    {
      id: "topp",
      text: "Top p adds a guard. Keep the likeliest tokens until they cover ninety percent, and drop the rest.",
      pauseAfter: 0.3,
    },
    {
      id: "topp-cut",
      text: "At one point five, that keeps cat, dog and bird. Rock is cut before the draw.",
      pauseAfter: 0.6,
    },
    {
      id: "rule",
      text: "So turn temperature down when there is one right answer, like extraction or code. Turn it up when you want variety.",
    },
  ],
};
