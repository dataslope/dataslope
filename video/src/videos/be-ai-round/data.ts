import results from "./results.json" with { type: "json" };

// Every table, listing and number the video shows, read from results.json:
// what check.mjs read out of the page (ai-assisted-coding.mdx: the 60-minute
// plan, the two prompts, the LLM feature's flowchart, the cost block), what
// the cost block printed when Pyodide 314.0.7 (Python 3.14) ran it as
// written, the arithmetic one step past it, a seeded retry simulation, and
// the track's practice, counted. Nothing here is a real system's output: the
// prices are the page's illustrative ones, and the retry waves are a
// simulation, labelled so on screen. Pure (no Remotion, no DOM).

export const VIDEO = "be-ai-round";

/** Whether public/images/be-ai-round/ holds the watercolors from
 *  illustrations.json. Phase 2 generates them; every frame is laid out with
 *  room for them either way. */
export const ILLUSTRATIONS = false;

export const RUNTIME: string = results.runtime;

/** Question 2: the page's four phases, each with its minutes as the page
 *  writes them ("5–10 min", "~30 min") and as numbers (lo, hi); they add
 *  to 50 to 55 of the 60, and Build's 30 is half. */
export type Phase = { phase: string; time: string; what: string; lo: number; hi: number; approx: boolean };
export const HOUR = results.hour as { phases: Phase[]; lo: number; hi: number; build: number; buildShare: number };

/** Question 3: the page's prompts. `fence` is the block as the page prints
 *  it, line by line; `better` is the better prompt joined into one line. */
export const PROMPT = results.prompt;

/** The better prompt's four ingredients, as the spans of `PROMPT.better`
 *  each highlight covers. Each must be found in the prompt as written. */
export const INGREDIENTS = [
  { role: "context", spans: ["In limiter.py", "a sliding-window limit of 100 requests per 60 seconds per user"] },
  { role: "interface", spans: ["allow(user_id: str, now: float) -> bool"] },
  { role: "constraints", spans: ["Keep state in memory, keyed by user.", "Do not change the public interface of Server.handle()."] },
  {
    role: "check",
    spans: [
      "Add pytest cases for: the 100th and 101st request in one window, a request exactly 60 seconds after the first (allowed: the first has left the window), and two users who do not affect each other.",
    ],
  },
] as const;
for (const { spans } of INGREDIENTS) {
  for (const span of spans) {
    if (!PROMPT.better.includes(span)) throw new Error(`the better prompt no longer says "${span}"`);
  }
}

/** Question 4: the page's flowchart, its nodes by id and its edges. */
export const DESIGN = results.design as {
  nodes: Record<string, string>;
  edges: { from: string; to: string; label: string | null }[];
};

/** Question 5: the page's block, its source line by line, what it printed,
 *  and the arithmetic past it (each side's share, and what halving each
 *  saves a day). */
export const COST = results.cost;

/** Question 4's step past: the seeded simulation of one thousand requests
 *  retrying, with no jitter (`plain`) and full jitter, wave by wave, each
 *  with its histogram in tenths of a second and its busiest tenth. */
export type Wave = { backoff: number; busiest: number; histogram: number[] };
export const RETRY = results.retry as {
  n: number;
  base: number;
  attempts: number;
  bin: number;
  seed: number;
  plain: Wave[];
  jitter: Wave[];
};

/** The close: concept checks on every topic page, code that runs on most,
 *  and the bank. */
export const PRACTICE = results.practice;

/** "2,000". */
export const thousands = (n: number) => n.toLocaleString("en-US");
