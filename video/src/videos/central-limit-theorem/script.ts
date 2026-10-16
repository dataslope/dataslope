import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "The Central Limit Theorem" (16:9), after
 * content/courses/statistics-for-data-science-python/central-limit-theorem.mdx.
 *
 * Every animation in Video.tsx is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, checked in python3/numpy against the theory and against the seeded
 * simulation in data.ts (which is what every number on screen comes from):
 *   - an exponential population with mean 10 has standard deviation 10, and
 *     P(wait >= 30) = e^-3 = 5.0%, "about one in twenty";
 *   - the spread of the mean is sigma / root n: 4.47, 1.83 and 1.00 minutes
 *     at n = 5, 30 and 100 (simulated: see data.ts);
 *   - the lesson's log-normal (sigma 1.3) has skewness 15.6, so its mean is
 *     still skewed at n = 30 (theory 2.85) and needs n in the hundreds.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses. It is
 * also written the way a person talks, for a voice that reads it in one take
 * (scripts/narrate.mjs): contractions, a question the next sentence answers,
 * an ellipsis where a speaker would hold, and capitals on the two words the
 * argument turns on. Cues match either case.
 */
export const script: NarrationScript = {
  id: "central-limit-theorem",
  voice: "hope",
  leadIn: 0.5,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      text: "These are ten thousand coffee shop wait times... and they're lopsided.",
      pauseAfter: 0.3,
    },
    {
      id: "shape",
      text: "Most people wait a few minutes. But about one in twenty waits half an hour or more.",
      pauseAfter: 0.35,
    },
    {
      id: "center",
      text: "The average wait is ten minutes, and the spread is about ten minutes too.",
      pauseAfter: 0.5,
    },
    { id: "sample", text: "Now pick thirty people at random, and average their waits." },
    {
      id: "drop",
      text: "That one average becomes one block in a new chart.",
      pauseAfter: 0.3,
    },
    { id: "repeat", text: "Pick thirty more... and thirty more. After two thousand samples,", pauseAfter: 0.15 },
    { id: "bell", text: "the averages have piled up into a bell, centered on ten.", pauseAfter: 0.45 },
    {
      id: "clt",
      text: "That's the Central Limit Theorem. The waits stay lopsided. Only their AVERAGES turn normal.",
      pauseAfter: 0.55,
    },
    {
      id: "any-shape",
      scene: true,
      text: "And it isn't about wait times. Die rolls are flat, and this population has two humps.",
      pauseAfter: 0.25,
    },
    { id: "any-bell", text: "Average thirty from either one... and the same bell appears.", pauseAfter: 0.55 },
    {
      id: "thumb",
      scene: true,
      text: "You'll hear that thirty is always enough. That's a rule of thumb, not a law.",
      pauseAfter: 0.3,
    },
    {
      id: "heavy",
      text: "A heavy tail, like incomes, is still lopsided at thirty. It can take HUNDREDS before the bell shows.",
      pauseAfter: 0.55,
    },
    {
      id: "spread",
      scene: true,
      text: "So what does sample size control? The spread. They all center on ten, but bigger samples pile up tighter.",
      pauseAfter: 0.3,
    },
    {
      id: "numbers",
      text: "Samples of five spread about four and a half minutes. Thirty, under two. And a hundred, about one.",
      pauseAfter: 0.45,
    },
    {
      id: "rule",
      text: "The spread is the population's spread over the square root of n. Four times the data halves it.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "That spread is the standard error. And it's not the standard deviation.",
    },
  ],
};
