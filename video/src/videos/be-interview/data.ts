// The series this overview introduces: the nine topic videos of the Backend
// / Software Engineer track in series order, each with the page it answers
// from, the number of questions it answers, its watercolor hero and a short
// title that fits its column. The counts are the plan's table
// (agent-outputs/20261106-backend-interview-video-plan.md, "Which video
// answers which question"), kept here and nowhere else: a builder who moves
// a question changes one number, and the bars and the total follow.
// check.mjs fails when a page's question count stops matching the parts
// that answer it, or when the narration stops saying the total. The practice
// counts are the track's own pages, counted by check.mjs into results.json.
// Pure.

import results from "./results.json" with { type: "json" };

export const VIDEO = "be-interview";

/** Whether public/images/be-interview/ holds the capybara and the spots
 *  from illustrations.json. Not generated yet (phase 2). */
export const ILLUSTRATIONS = false;

export type Part = {
  n: number;
  title: string;
  questions: number;
  video: string;
  /** The hero's illustration id, `<folder>-<creature>` as every video's
   *  illustrations.json names it; the creature is the plan's. */
  hero: string;
  /** The page (file stem under content/interview/backend-engineer/) its
   *  questions come from. */
  page: string;
};

export const PARTS: readonly Part[] = [
  { n: 1, title: "System design", questions: 5, video: "be-system-design", hero: "be-system-design-crow", page: "system-design" },
  { n: 2, title: "Scaling", questions: 12, video: "be-scaling", hero: "be-scaling-bison", page: "system-design" },
  { n: 3, title: "API design", questions: 16, video: "be-api-design", hero: "be-api-design-puffin", page: "api-design" },
  { n: 4, title: "Databases", questions: 16, video: "be-databases", hero: "be-databases-chipmunk", page: "databases" },
  { n: 5, title: "Concurrency", questions: 16, video: "be-concurrency", hero: "be-concurrency-hummingbird", page: "concurrency" },
  { n: 6, title: "Objects", questions: 15, video: "be-object-design", hero: "be-object-design-armadillo", page: "object-oriented-design" },
  { n: 7, title: "Reading code", questions: 3, video: "be-code-review", hero: "be-code-review-lynx", page: "ai-assisted-coding" },
  { n: 8, title: "Algorithms", questions: 35, video: "be-algorithms", hero: "be-algorithms-pangolin", page: "algorithms" },
  { n: 9, title: "AI round", questions: 7, video: "be-ai-round", hero: "be-ai-round-lemur", page: "ai-assisted-coding" },
];

/** The questions the nine topic videos answer, each once: the sum of PARTS
 *  (125). */
export const QUESTIONS = PARTS.reduce((a, p) => a + p.questions, 0);

/** Answered outside PARTS: this overview answers the AI page's "How have
 *  coding interviews changed since AI assistants became standard?", and
 *  system design's "SQL or NoSQL at scale, how do you choose?" is answered
 *  together with databases' "SQL vs NoSQL, when do you pick each?" in Part
 *  4, so it adds no count of its own. */
export const ANSWERED_HERE = { page: "ai-assisted-coding", questions: 1 } as const;
export const ANSWERED_TOGETHER = { page: "system-design", questions: 1, in: 4 } as const;

/** The questions the seven kept pages ask (127), counted by check.mjs. */
export const PAGE_QUESTIONS: number = results.keptQuestions;

/** The page left out (python.mdx) and how many questions it asks. */
export const LEFT_OUT: { page: string; questions: number } = results.leftOut;

/** multiple-choice-questions.mdx, counted: 110 MultipleChoice blocks. */
export const BANK: number = results.bank;

/** The topic pages (8), those with concept checks (all 8), and those with
 *  runnable challenges (3: algorithms, object-oriented design, databases). */
export const TOPIC_PAGES: number = results.topicPages;
export const CHECK_PAGES: number = results.conceptCheckPages;
export const CHALLENGE_PAGES: number = results.challengePages;

/** Karat, Engineering Interview Trends 2026, as the AI page reports it. The
 *  page's footnote calls it one vendor's survey, and so does the screen. */
export const KARAT = { leaders: 400, harderToAssess: 71, stillProhibit: 62, year: 2026 } as const;
