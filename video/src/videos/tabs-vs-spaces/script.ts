import type { NarrationScript } from "../../narration/types";

/**
 * Tabs vs spaces, as a vertical short. One idea per beat; every animation in
 * Video.tsx is cued to a word below, so editing a beat re-times its scene
 * (and a cue naming a word a beat no longer says throws in the Studio).
 *
 * Facts checked: Python 3.13 prints "TabError: inconsistent use of tabs and
 * spaces in indentation"; PEP 8 says "Use 4 spaces per indentation level";
 * gofmt indents with tabs. All three agree with
 * content/courses/python-basics/syntax-and-indentation.mdx.
 */
export const script: NarrationScript = {
  id: "tabs-vs-spaces",
  leadIn: 0.4,
  tail: 2.2,
  beats: [
    {
      id: "hook",
      text: "Tabs or spaces? Programmers have argued for decades, and on screen they can look identical.",
      pauseAfter: 0.3,
    },
    {
      id: "tab-char",
      text: "But a tab is one character, and each editor decides how wide to draw it.",
      pauseAfter: 0.25,
    },
    {
      id: "widths",
      text: "Change the tab width, and tab-indented code moves. Spaces stay put.",
      pauseAfter: 0.4,
    },
    {
      id: "tabs-case",
      text: "Team tabs: one character per level, and every reader picks their own width, which helps people with low vision.",
      pauseAfter: 0.4,
    },
    {
      id: "spaces-case",
      text: "Team spaces: the file looks the same everywhere, in diffs, terminals and reviews, and wrapped lines align exactly.",
      pauseAfter: 0.45,
    },
    {
      id: "python",
      text: "In Python, PEP 8 says four spaces per level, and inconsistent mixing raises a TabError.",
      pauseAfter: 0.3,
    },
    {
      id: "go",
      text: "In Go, the formatter uses tabs.",
      pauseAfter: 0.45,
    },
    {
      id: "answer",
      text: "The real answer: pick one per project, and let a formatter and EditorConfig enforce it.",
      pauseAfter: 0.3,
    },
    {
      id: "mixing",
      text: "The only wrong answer is mixing them.",
      pauseAfter: 0.5,
    },
    {
      id: "outro",
      text: "Learn how Python reads indentation on Dataslope.",
    },
  ],
};
