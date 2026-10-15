import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Simpson's paradox" (16:9), after the Berkeley example in
 * content/courses/statistics-for-data-science-python/statistical-fallacies.mdx.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, from R's UCBAdmissions table (Bickel, Hammel and O'Connell, Science,
 * 1975: the six largest departments, 4,526 applicants), computed in data.ts
 * and checked by hand:
 *   - men 1,198 of 2,691 admitted (44.5%), women 557 of 1,835 (30.4%);
 *   - women's rate is higher in A, B, D and F; men's is higher in C (by 2.9
 *     points) and E (by 3.8), "less than four points";
 *   - A: women 82.4%, men 62.1%;
 *   - 51.5% of men applied to A or B, which admitted 64.0% of applicants;
 *     92.8% of women applied to C to F, which admitted 26.1%;
 *   - women's own department rates, weighted by the men's application mix,
 *     come to 51.6%.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "simpsons-paradox",
  leadIn: 0.5,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      text: "In 1973, Berkeley's graduate school looked like it was turning women away.",
      pauseAfter: 0.3,
    },
    {
      id: "totals",
      text: "In its six largest departments, forty-five percent of the men who applied got in. For women, it was thirty percent.",
      pauseAfter: 0.6,
    },
    { id: "split", text: "Now take the departments one at a time.", pauseAfter: 0.35 },
    {
      id: "four",
      text: "In four of the six, women were admitted at a higher rate than men. In department A, eighty-two percent of women got in, against sixty-two percent of men.",
      pauseAfter: 0.3,
    },
    { id: "two", text: "In the other two, men were ahead by less than four points.", pauseAfter: 0.6 },
    {
      id: "question",
      text: "So how do women do better in most departments, and worse overall?",
      pauseAfter: 0.3,
    },
    { id: "where", text: "Look at where each group applied.", pauseAfter: 0.3 },
    {
      id: "men-mix",
      text: "Half of the men applied to A and B, which admitted nearly two in three applicants.",
      pauseAfter: 0.25,
    },
    {
      id: "women-mix",
      text: "Ninety-three percent of the women applied to the other four, which turned most applicants away.",
      pauseAfter: 0.6,
    },
    {
      id: "average",
      text: "An overall rate is an average of the department rates, weighted by where people applied.",
      pauseAfter: 0.25,
    },
    { id: "leaned", text: "The women's average leaned on the hardest departments.", pauseAfter: 0.4 },
    {
      id: "swap",
      text: "Give the women the men's mix of applications, keep their own department rates, and they come out at fifty-two percent. Ahead of the men.",
      pauseAfter: 0.6,
    },
    {
      id: "name",
      text: "This is Simpson's paradox. A comparison that holds inside the groups can reverse once the groups are pooled.",
      pauseAfter: 0.4,
    },
    { id: "rule", text: "So before you trust a total, ask what it is averaging over." },
  ],
};
