import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "The box model and box-sizing" (16:9), after
 * content/courses/modern-css-layout/box-model-and-sizing.mdx: the four layers
 * of a box, why `width: 300px` with padding and a border draws a wider box
 * under the default `content-box`, the two 50% columns that stop fitting in
 * their row, and the `*, *::before, *::after { box-sizing: border-box }` fix.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each read from Chromium 141 with Playwright (measure.mjs writes
 * measurements.json, and every number on screen comes from data.ts, which
 * reads it):
 *   - with no box-sizing declared, the computed box-sizing is content-box;
 *   - `width: 300px; padding: 20px; border: 5px solid` lays out 350px wide
 *     (getBoundingClientRect), its content box 300px wide (a child's rect),
 *     starting 25px in from the border edge;
 *   - the content and the padding paint in the box's background, the 5px
 *     band in the border color, and the margin in the page's background
 *     (screenshot pixels); the 20px margin puts the box 20px from its
 *     container's edge and 20px from the next box;
 *   - in a 600px row with `display: flex; flex-wrap: wrap`, each
 *     `width: 50%` column computes `width: 300px` and lays out 350px wide, so
 *     the second column lands at x 0, y 90, on a second line, and the row is
 *     two columns tall; floats do the same;
 *   - with `box-sizing: border-box` each column is 300px wide with a 250px
 *     content box, the second sits at x 300 on the first line, and the two
 *     fill the 600px row exactly;
 *   - `*, *::before, *::after { box-sizing: border-box }` gives border-box to
 *     html, to a nested span and to both pseudo-elements.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "box-sizing",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    { id: "hook", text: "Every element on a web page is a box, built in four layers.", pauseAfter: 0.35 },
    {
      id: "layers",
      text: "The content sits in the middle. Around it is the padding, then the border. Outside the border is the margin, which keeps other boxes away.",
      pauseAfter: 0.6,
    },
    {
      id: "ask",
      scene: true,
      text: "Now give a box a width of three hundred pixels, twenty pixels of padding, and a five pixel border.",
      pauseAfter: 0.3,
    },
    {
      id: "default",
      text: "By default, box sizing is content box. The width covers only the content, and the padding and border are added on both sides.",
      pauseAfter: 0.3,
    },
    {
      id: "sum",
      text: "Five, plus twenty, plus three hundred, plus twenty, plus five. The box is three hundred and fifty pixels wide.",
      pauseAfter: 0.6,
    },
    { id: "columns", scene: true, text: "That is why two columns at fifty percent can break a row.", pauseAfter: 0.3 },
    {
      id: "overflow",
      text: "In a six hundred pixel row, fifty percent is three hundred. With padding and border, each column is three hundred and fifty. Together they need seven hundred, so the second one wraps to the next line.",
      pauseAfter: 0.6,
    },
    {
      id: "fix",
      scene: true,
      text: "Box sizing border box changes what width means. The width now includes the padding and the border.",
      pauseAfter: 0.3,
    },
    {
      id: "shrink",
      text: "The content shrinks to two hundred and fifty, each column is exactly three hundred, and both fit.",
      pauseAfter: 0.6,
    },
    {
      id: "rule",
      text: "Set it once on every element, at the top of your stylesheet, and a width is the width you see.",
    },
  ],
};
