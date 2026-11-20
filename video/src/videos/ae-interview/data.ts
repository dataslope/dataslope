// The series this overview introduces: the ten parts of the Analytics
// Engineer track in series order (this overview, then the nine topic
// videos), each with how many of the pages' questions it answers and from
// which page, its watercolor hero and a short title that fits its column.
// The counts are the plan's table
// (agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
// "Which video answers which question"), kept here and nowhere else: a
// builder who moves a question changes one number, and the bars and the
// total follow. check.mjs fails when a page's `###` headings stop matching
// the parts that answer from it, or when the narration stops saying the
// numbers these make. The practice counts are the track's own pages,
// counted by check.mjs into results.json. Pure.

import results from "./results.json" with { type: "json" };

export const VIDEO = "ae-interview";

/** The platypus and the small spots in illustrations.json, once generated
 *  into public/images/ae-interview/. Phase 2 sets this. */
export const ILLUSTRATIONS = false;

/** A topic page of the track, by its file stem under
 *  content/interview/analytics-engineer/. */
export type Page =
  | "dimensional-modeling"
  | "dbt"
  | "advanced-sql"
  | "data-warehousing"
  | "testing-and-data-quality"
  | "metrics-and-semantic-layer"
  | "ai-and-the-semantic-layer";

export type Part = {
  n: number;
  /** A short title that fits a column; the opener carries the full one. */
  title: string;
  /** The questions it answers (the pages' `###` headings), by page. A
   *  near-identical pair on two pages is answered together in one part, and
   *  both headings count to it, so the parts add up to every heading. */
  from: Partial<Record<Page, number>>;
  video: string;
  /** The hero's illustration id, `<folder>-<creature>` as every video's
   *  illustrations.json names it; the creature is the plan's. */
  hero: string;
};

export const PARTS: readonly Part[] = [
  { n: 0, title: "The interview", from: { "ai-and-the-semantic-layer": 1 }, video: "ae-interview", hero: "ae-interview-platypus" },
  { n: 1, title: "Facts and grain", from: { "dimensional-modeling": 22 }, video: "ae-facts-and-grain", hero: "ae-facts-and-grain-sparrow" },
  {
    n: 2,
    title: "Changing dimensions",
    from: { "dimensional-modeling": 8, dbt: 1 },
    video: "ae-changing-dimensions",
    hero: "ae-changing-dimensions-hermit-crab",
  },
  {
    n: 3,
    title: "dbt",
    from: { dbt: 18, "dimensional-modeling": 1, "data-warehousing": 1 },
    video: "ae-dbt",
    hero: "ae-dbt-weaver-bird",
  },
  {
    n: 4,
    title: "Incremental",
    from: { dbt: 5, "data-warehousing": 5, "advanced-sql": 1 },
    video: "ae-incremental",
    hero: "ae-incremental-snail",
  },
  { n: 5, title: "Advanced SQL", from: { "advanced-sql": 19 }, video: "ae-advanced-sql", hero: "ae-advanced-sql-giraffe" },
  {
    n: 6,
    title: "Warehousing",
    from: { "data-warehousing": 13, "dimensional-modeling": 1 },
    video: "ae-warehousing",
    hero: "ae-warehousing-camel",
  },
  {
    n: 7,
    title: "Testing",
    from: { "testing-and-data-quality": 19, dbt: 7 },
    video: "ae-testing",
    hero: "ae-testing-woodpecker",
  },
  { n: 8, title: "Metrics", from: { "metrics-and-semantic-layer": 18 }, video: "ae-metrics", hero: "ae-metrics-pelican" },
  {
    n: 9,
    title: "AI layer",
    from: { "ai-and-the-semantic-layer": 6 },
    video: "ae-ai-semantic-layer",
    hero: "ae-ai-semantic-layer-dolphin",
  },
];

/** How many questions a part answers, across its pages. */
export const questionsOf = (p: Part): number => Object.values(p.from).reduce((a, n) => a + (n ?? 0), 0);

/** The nine topic videos (every part but this overview): the bar chart. */
export const TOPIC_PARTS: readonly Part[] = PARTS.filter((p) => p.n > 0);

/** Every question the pages ask, each answered once: the sum of PARTS
 *  (146). */
export const ALL_QUESTIONS = PARTS.reduce((a, p) => a + questionsOf(p), 0);

/** The questions the nine topic videos answer, after the one this overview
 *  takes (145): what "series-parts" says. */
export const QUESTIONS = TOPIC_PARTS.reduce((a, p) => a + questionsOf(p), 0);

/** The part number of each video, by its folder, so a label that points at
 *  a part ("Part 9") follows PARTS if the order changes. */
export const partOf = (video: string): number => {
  const part = PARTS.find((p) => p.video === video);
  if (!part) throw new Error(`no part is the video ${video}`);
  return part.n;
};

/** The `###` headings the seven topic pages hold (146), counted by
 *  check.mjs. */
export const PAGE_QUESTIONS: number = results.pageQuestions;

/** multiple-choice-questions.mdx, counted: 110 MultipleChoice blocks. */
export const BANK: number = results.bank;

/** The topic pages (7), those with concept checks (all 7), and those with
 *  runnable challenges (3: dimensional modeling, advanced SQL, data
 *  warehousing; 4 challenges in all, every one a SqlChallengeCard). */
export const TOPIC_PAGES: number = results.topicPages;
export const CHECK_PAGES: number = results.conceptCheckPages;
export const CHALLENGE_PAGES: number = results.challengePages;
export const CHALLENGES: number = results.challenges;

/** The pages with runnable challenges, by file stem in track order, and how
 *  the practice line names them on screen. */
export const CHALLENGE_PAGE_NAMES: readonly string[] = results.challengePageNames;
export const CHALLENGE_LABELS: Readonly<Record<string, string>> = {
  "dimensional-modeling": "Dimensional modeling",
  "advanced-sql": "Advanced SQL",
  "data-warehousing": "Data warehousing",
};
