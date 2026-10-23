import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "The Data Analyst interview" (16:9), Part 0 of the Data
 * Analyst interview prep videos
 * (agent-outputs/20261021-2314-data-analyst-interview-video-plan.md), after
 * content/interview/data-analyst/index.mdx: what the loop looks like, the four
 * things interviewers probe, what AI has changed, and how the series works,
 * then the bridge into Part 1.
 *
 * Its own opening, as every part has had since Part 4: three cards for the
 * three parts of the loop, then the eight topic videos as a grid of their own
 * watercolor heroes.
 *
 * Facts: the page's own wording for the loop, the probes and the AI changes;
 * the eight videos and their 156 questions from the plan's table, which the
 * built videos answer; 110 multiple-choice questions, counted in
 * multiple-choice-questions.mdx.
 *
 * Written for Drew's ear: "AI" and "BI" are spelled out the first time.
 */
export const script: NarrationScript = {
  id: "da-interview",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    {
      id: "loop",
      scene: true,
      text: "A data analyst interview usually comes in three parts. First, a SQL screen, live or as a take-home. A few questions on spreadsheets and statistics. And a conversation that starts with: how would you analyze this?",
      pauseAfter: 0.8,
    },
    {
      id: "probe",
      scene: true,
      text: "Under all three, interviewers check four things. SQL fluency. Framing: the right grain, nulls handled, nothing counted twice after a join. Communication: your assumptions, your caveats, and what you'd check next. And tools: a spreadsheet, and a BI tool, short for business intelligence, like Tableau, Power BI or Looker.",
      pauseAfter: 0.8,
    },
    {
      id: "ai",
      scene: true,
      text: "AI, artificial intelligence, has changed some of it. You're now as likely to check a query an assistant wrote as to write one. You'll be asked how you use these tools responsibly. BI tools answer questions in plain language, but only on top of clean metrics. And the live SQL round is usually AI-off, so ask the recruiter about each round.",
      pauseAfter: 0.8,
    },
    {
      id: "series",
      scene: true,
      text: "This series follows the track, one video per topic page, from SQL to AI-assisted analysis: a hundred and fifty-six questions in all. Each video works through the questions that need a figure, then takes the rest quickly.",
      pauseAfter: 0.6,
    },
    {
      id: "practice",
      text: "And every page has practice of its own: concept checks, runnable challenges, and a bank of a hundred and ten multiple-choice questions.",
      pauseAfter: 0.8,
    },
    { id: "next", text: "Almost every interview opens with the same screen. Next: SQL." },
  ],
};
