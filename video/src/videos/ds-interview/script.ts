import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "The Data Scientist interview" (16:9), Part 0 of the Data
 * Scientist interview prep videos
 * (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md), after
 * content/interview/data-scientist/index.mdx: the four kinds of round, the
 * five things interviewers probe across the loop, what AI has brought in, and
 * how the series runs, then the bridge into Part 1.
 *
 * Its own opening, unlike the Data Analyst overview's three cards: the loop
 * as a route with four stops, then the five things as columns, the AI
 * questions as four panels, and the eleven topic videos as a strip of their
 * own watercolor heroes, with the otter as this video's own.
 *
 * Facts: the page's own wording for the loop, the probes and the AI changes;
 * the eleven videos and their 158 questions from the plan's table, which the
 * built videos answer (data.ts); the practice, counted on the track's pages by
 * check.mjs (results.json): concept checks on all 9 topic pages, challenges
 * on 4 of them, and a bank of 110 multiple-choice questions.
 *
 * Written for Drew's ear: initialisms in plain caps, AI and LLM expanded the
 * first time, and no sentence opens with "A" before an initialism.
 */
export const script: NarrationScript = {
  id: "ds-interview",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    {
      id: "loop",
      scene: true,
      text: "Most data scientist loops run four kinds of round. Probability and statistics questions. A modeling case: how would you predict this? An experiment to design, usually an A B test. And a coding screen, in Python and pandas or in SQL.",
      pauseAfter: 0.8,
    },
    {
      id: "probe",
      scene: true,
      text: "Across the loop, interviewers probe five things.",
    },
    {
      id: "probe-list",
      text: "Statistics and probability: distributions, tests and intervals. Modeling: the bias and variance trade-off, regularization, validation, and the metric you pick. Experimentation: the design, its power, and the pitfalls. Coding, in pandas, NumPy and SQL. And communication: explaining a model and its caveats to someone who doesn't build them.",
      pauseAfter: 0.8,
    },
    {
      id: "ai",
      scene: true,
      text: "AI, artificial intelligence, has brought in new questions. Evaluating a feature built on a large language model, an LLM, is now treated as a measurement problem: an eval set, a confidence interval on its pass rate, and a check that an LLM judge agrees with experts.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-exp",
      text: "Experiments on AI features, where the output changes from one run to the next, and the provider can change the model in the middle of a test.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-check",
      text: "Checking code or an analysis an assistant wrote.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-rounds",
      text: "And some coding rounds allow an assistant and grade how you check its work. Others ban it, so ask the recruiter about each round.",
      pauseAfter: 0.8,
    },
    {
      id: "series",
      scene: true,
      text: "The series runs in the track's order: eleven videos, from statistics to LLM evaluation, and a hundred and fifty-eight questions. Machine learning and experimentation each get two videos. In every one, the questions worth a figure come first, and the one-line answers close it.",
      pauseAfter: 0.6,
    },
    {
      id: "practice",
      text: "Each page carries practice too. Every one has concept checks, four add challenges that run in your browser, and a bank of a hundred and ten multiple-choice questions covers the whole track.",
      pauseAfter: 0.8,
    },
    { id: "next", text: "Most loops open with probability and statistics questions, and so does this series. Next: Statistics." },
  ],
};
