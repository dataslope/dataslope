import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Base-rate neglect" (16:9), after "The centerpiece: a 99%
 * accurate test that's usually wrong" in
 * content/courses/statistics-for-data-science-python/conditional-probability.mdx
 * and "Base-rate neglect" in statistical-fallacies.mdx in the same course.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, from the lesson's inputs (base rate 1 in 1,000, sensitivity 99%,
 * specificity 99%) and computed in data.ts, checked in python3 with exact
 * fractions and against a seeded numpy simulation of twenty million people:
 *   - in 10,000 people, 10 have it and 9,990 don't; the test catches 9.9 of
 *     the 10, "nearly all ten", and flags 99.9 of the 9,990, "about a hundred";
 *   - 109.8 positives, "about a hundred and ten", of whom 9.9 have it:
 *     11/122 = 9.0%, the lesson's "about 9%" (simulated 9.04%), and the
 *     rounded 10 of 110 is "one in eleven";
 *   - healthy people outnumber the sick 999 to 1, "nearly a thousand to one";
 *   - a second, independent test keeps 9.8 of the real cases and 1.0 of the
 *     false alarms, "about one": 363/400 = 90.75%, "ninety-one" (simulated
 *     90.7%), and the rounded 10 of 11.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "base-rate",
  voice: "hope",
  leadIn: 0.5,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      text: "A test that is ninety-nine percent accurate says you have a rare condition.",
      pauseAfter: 0.3,
    },
    {
      id: "odds",
      text: "What are the chances you really have it? Your gut says ninety-nine percent. The answer is about nine.",
      pauseAfter: 0.6,
    },
    {
      id: "crowd",
      scene: true,
      text: "Picture ten thousand people. One in a thousand has the condition, so about ten of them.",
      pauseAfter: 0.3,
    },
    {
      id: "sick",
      text: "The test catches ninety-nine percent of real cases, so nearly all ten test positive.",
      pauseAfter: 0.3,
    },
    {
      id: "healthy",
      text: "But it also flags one percent of healthy people by mistake. That is about a hundred false alarms.",
      pauseAfter: 0.5,
    },
    {
      id: "pull",
      text: "Now pull out everyone who tested positive. About a hundred and ten people, and only ten of them have it.",
      pauseAfter: 0.3,
    },
    { id: "share", text: "One in eleven. About nine percent.", pauseAfter: 0.6 },
    {
      id: "bayes",
      scene: true,
      text: "That is Bayes' rule. Of everyone who tests positive, what share really has it? The true positives, divided by all the positives.",
      pauseAfter: 0.4,
    },
    {
      id: "neglect",
      text: "The false alarms win because healthy people outnumber sick ones nearly a thousand to one. Forgetting that is base-rate neglect.",
      pauseAfter: 0.6,
    },
    {
      id: "again",
      scene: true,
      text: "So test the positives again, with a second, independent test.",
      pauseAfter: 0.3,
    },
    {
      id: "again-result",
      text: "The real cases test positive again. Of the hundred false alarms, only about one does.",
      pauseAfter: 0.4,
    },
    {
      id: "answer",
      text: "Now about ten in eleven have it. Two positives take you from nine percent to ninety-one.",
      pauseAfter: 0.6,
    },
    { id: "rule", text: "So before you trust a positive, ask how rare the thing is." },
  ],
};
