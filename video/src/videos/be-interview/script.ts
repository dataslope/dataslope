import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "The interview, now" (16:9), Part 0 of the Backend / Software
 * Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md, "0, The
 * interview, now"), after content/interview/backend-engineer/index.mdx and
 * ai-assisted-coding.mdx's "How have coding interviews changed since AI
 * assistants became standard?", which it answers ("ai" to "ai-ask"): what
 * the rounds test, the two kinds of AI round, why take-homes lost their
 * signal, where the time went, and the map of the series, then the bridge
 * into Part 1.
 *
 * An overview: no question cards. Its own opening, unlike the Data Engineer
 * meerkat's prompt or the Data Scientist route: the two follow-ups the AI
 * page quotes, "Why this approach?" and "What breaks under load?", as the
 * headline in the serif, with the capybara sitting beside them, because they
 * are the questions every later part trains for.
 *
 * On screen, scene by scene:
 *   - "hook" to "probe": the two questions inked in one after the other;
 *     then the page's five probes as a stack of five labelled bands, the
 *     four everyone gets in blue (data structures, algorithms, complexity,
 *     language fundamentals) and the backend one below them, set apart in
 *     yellow (API and system design, SQL, caching, concurrency).
 *   - "ai" to "ai-ask": one band labelled "Coding round" forking into two
 *     columns, "AI allowed" and "AI banned", in neutral ink (neither is the
 *     right answer, so neither is green or red). Under allowed: Canva (June
 *     2025), Meta (60-minute round, piloted from October 2025), Google's
 *     comprehension pilot (second half of 2026), each card inking in on its
 *     name. Under banned: Amazon (2025), Anthropic (2025), Google's
 *     in-person round (2025). The laptop and padlock spots sit on the two
 *     column heads. Then the envelope spot for a take-home, faded, beside two
 *     bars, 71% and 62%, sourced "Karat, Engineering Interview Trends 2026,
 *     400 engineering leaders; one vendor's survey". Then where the time
 *     went: three cards (extend a multi-file project, read and debug
 *     unfamiliar code, design discussion) with the glasses and whiteboard
 *     spots, and the four LLM topics as chips under the design card. "ai-ask"
 *     writes "Ask the recruiter, for every round" across the fork.
 *   - "series" to "next": the nine topic videos as a bar chart of the
 *     questions each answers (PARTS in data.ts), each bar topped by its own
 *     hero, in series order; the Python fundamentals page shown as a grey
 *     outline with an arrow into Part 5's bar on "series-python"; the
 *     practice counts as a line beneath; <NextLine> on "Next".
 *
 * Facts, all from the pages or counted (check.mjs into results.json, which
 * data.ts reads; check.mjs fails if a page stops saying what the narration
 * quotes, or the narration stops saying what was counted):
 *   - "probe": index.mdx, intro and "What interviewers probe".
 *   - "ai": ai-assisted-coding.mdx's intro, "Since 2025 the coding interview
 *     has split in two".
 *   - "ai-allowed", "ai-banned": the AI page's table (Canva, June 2025; Meta,
 *     "One of the two onsite coding rounds became a 60-minute AI-enabled
 *     round", piloted from October 2025; Google's pilot, a code
 *     comprehension round, second half of 2026; Amazon, "Using unapproved
 *     generative AI during an interview can disqualify a candidate"; Anthropic,
 *     "No AI in take-homes or live interviews unless the interviewer says
 *     otherwise"; Google, "At least one round is back in person"). The index
 *     says "Amazon and Anthropic can disqualify candidates"; the narration
 *     takes the AI page's narrower wording for Anthropic (see the report).
 *   - "ai-why": the AI page, "take-home projects and automated code tests
 *     have lost most of their signal, because an assistant can complete them
 *     and the reviewer cannot see how". "ai-survey": Karat's 2026 survey of
 *     400 engineering leaders, 71% and 62% (the page's footnote: "Karat
 *     sells interviewing services, so read the figures as one vendor's
 *     survey", said as "one vendor's numbers").
 *   - "ai-moved": the AI page's live rounds and the index's "multi-file
 *     projects to extend". "ai-llm": the index, "LLM features in system
 *     design". "ai-ask": the AI page's bold line and "algorithm practice
 *     still matters for AI-off rounds and phone screens".
 *   - "series": nine videos after this one, 125 questions, each answered
 *     once: the plan's table, held in data.ts (PARTS). The seven pages kept
 *     ask 127 (check.mjs counts their `###` headings); this overview answers
 *     one, and two near-identical SQL or NoSQL questions are answered once,
 *     in Part 4. check.mjs fails if a page's count stops matching the parts
 *     that answer it.
 *   - "series-python": the plan leaves python.mdx (31 questions) out as the
 *     syntax page; its GIL question is in Part 5.
 *   - "practice": counted by check.mjs: concept checks on all 8 topic pages,
 *     runnable challenges on 3 (algorithms, object-oriented design,
 *     databases), and a bank of 110 multiple-choice questions.
 *   - the bridge: the index's "Fewer take-homes ... and more live design
 *     discussion".
 *
 * Written for Drew's ear: AI, API, SQL and LLM in plain caps (SQL is said
 * "sequel" by the lexicon); the GIL is said in full, "the global interpreter
 * lock", so no initialism needs adding; company names as written; no
 * sentence opens with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "be-interview",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    { id: "hook", scene: true, text: "Why this approach? And what breaks under load?", pauseAfter: 0.8 },
    {
      id: "hook-more",
      text: "Backend interviews ask those follow-ups more than they used to, and this series is about answering them.",
      pauseAfter: 0.7,
    },
    {
      id: "probe",
      text: "The ground is data structures and algorithms, complexity in Big-O, and your language's fundamentals, usually in live coding. Backend roles add system and API design, SQL, caching and concurrency.",
      pauseAfter: 0.8,
    },
    { id: "ai", scene: true, text: "What has changed is the coding round. Since 2025, it has split in two.", pauseAfter: 0.6 },
    {
      id: "ai-allowed",
      text: "Some rounds hand you an assistant and grade how you drive and check it. Canva's does. Meta made one of its two onsite coding rounds a sixty-minute AI-enabled round, and Google is piloting one for reading and debugging code.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-banned",
      text: "Others ban assistants. Amazon can disqualify a candidate who uses unapproved AI, Anthropic allows none in interviews unless the interviewer says so, and Google has brought back an in-person round.",
      pauseAfter: 0.7,
    },
    {
      id: "ai-why",
      text: "Underneath is one problem: an assistant can finish a take-home, and nobody sees how.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-survey",
      text: "In Karat's 2026 survey of four hundred engineering leaders, one vendor's numbers, seventy-one percent said AI makes technical skills harder to assess. Sixty-two percent of organizations still banned it in technical interviews.",
      pauseAfter: 0.7,
    },
    {
      id: "ai-moved",
      text: "So the time has moved to live rounds where the interviewer watches you reason: extending a multi-file project, reading and debugging unfamiliar code, and design discussions with follow-ups.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-llm",
      text: "And system design now takes in features that call a large language model, or LLM: streaming, retries, cost measured in tokens, and prompt injection.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-ask",
      text: "Ask the recruiter, round by round, whether AI is allowed, and prepare for both. Algorithm practice still matters where it isn't.",
      pauseAfter: 0.8,
    },
    {
      id: "series",
      scene: true,
      text: "This series argues decisions, not syntax. After this one, nine videos answer the track's questions, a hundred and twenty-five of them, each once: system design in two parts, then API design, databases, concurrency, designing objects, reading code, algorithms, and the AI-allowed round.",
      pauseAfter: 0.6,
    },
    {
      id: "series-python",
      text: "The Python fundamentals page is left out, because it's syntax. Its one design question, the global interpreter lock, is answered under concurrency.",
      pauseAfter: 0.6,
    },
    {
      id: "practice",
      text: "Every topic page has concept checks, three add challenges that run in the browser, and a bank of a hundred and ten multiple-choice questions covers the whole track.",
      pauseAfter: 0.8,
    },
    { id: "next", text: "As take-homes faded, the round that grew was design. Next: approaching system design." },
  ],
};
