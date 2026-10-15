import type { NarrationScript } from "../../narration/types";

/**
 * Binary search as a vertical arcade short: "I can guess any number from 1 to
 * 100 in 7 tries." Every animation in Video.tsx is cued to a word below, so
 * editing a beat re-times its scene, and a cue naming a word a beat no longer
 * says throws in the Studio.
 *
 * Facts checked by running the search (scratch facts.py, Python 3):
 *   - Target 77 on 1..100 with mid = floor((lo + hi) / 2) guesses
 *     50 H, 75 H, 88 L, 81 L, 78 L, 76 H, 77, which is 7 guesses, and leaves
 *     100, 50, 25, 12, 5, 2, 1 numbers in play before each guess.
 *   - The worst case over all of 1..100 is 7 guesses (37 targets need all 7).
 *   - k guesses always suffice exactly when 2^k > n: 2^7 = 128 > 100 and
 *     2^6 = 64 < 100. A million needs 20 (2^20 = 1,048,576) and a billion 30
 *     (2^30 = 1,073,741,824).
 *   - One at a time, the worst case is all 100 guesses.
 * The lesson agrees: content/courses/mastering-dsa-cpp/searching.mdx says
 * "a million elements fall to a target in twenty steps" and "Binary search
 * only works on sorted data."
 */
export const script: NarrationScript = {
  id: "binary-search",
  leadIn: 0.3,
  tail: 2.2,
  beats: [
    {
      id: "hook",
      text: "I can guess any number from 1 to 100 in 7 tries.",
      pauseAfter: 0.35,
    },
    {
      id: "linear",
      text: "Guessing one at a time could take all 100.",
      pauseAfter: 0.3,
    },
    {
      id: "trick",
      text: "The trick: always guess the middle of what's left.",
      pauseAfter: 0.3,
    },
    {
      id: "pick",
      text: "Say you picked 77.",
      pauseAfter: 0.25,
    },
    {
      id: "first",
      text: "50? Higher. Half the numbers are gone.",
      pauseAfter: 0.25,
    },
    {
      id: "second",
      text: "75? Higher. 25 left.",
      pauseAfter: 0.2,
    },
    {
      id: "third",
      text: "88? Lower. 12 left.",
      pauseAfter: 0.2,
    },
    {
      id: "rest",
      text: "81, lower. 78, lower. 76, higher.",
      pauseAfter: 0.2,
    },
    {
      id: "win",
      text: "77. Got it, on try 7.",
      pauseAfter: 0.4,
    },
    {
      id: "why",
      text: "Why 7? Two to the seventh is 128, and that covers 100.",
      pauseAfter: 0.4,
    },
    {
      id: "scale",
      text: "A million numbers? 20 guesses, tops. A billion? Just 30.",
      pauseAfter: 0.4,
    },
    {
      id: "catch",
      text: "The catch: it only works on sorted data. Shuffled, higher or lower can point the wrong way.",
      pauseAfter: 0.45,
    },
    {
      id: "outro",
      text: "Learn binary search on Dataslope.",
    },
  ],
};
