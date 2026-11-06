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
 * On screen, scene by scene, as built: plain text grouped by spacing and
 * hairlines, no cards (the owner's rule, 2026-11-06), and the capybara plus
 * one spot only (the envelope):
 *   - "hook" to "probe": the two questions inked in one after the other
 *     beside the capybara; then the page's five probes as a ruled list,
 *     the four everyone gets (data structures, algorithms, complexity,
 *     language fundamentals) and the backend one set apart below them, its
 *     name under the yellow highlighter and its topics as a line of words
 *     (system and API design, SQL, caching, concurrency). Each row carries,
 *     small and right-aligned, the part that answers it, so the map starts
 *     here: "Part 8" on the first three, "Parts 1 to 5" on the backend row,
 *     and "Python page: not in this series" in grey on language
 *     fundamentals (the series comes back to it on "series-python").
 *   - "ai" to "ai-ask": the heading "Coding round" forking into two
 *     columns, "AI allowed" and "AI banned", in neutral ink (neither is the
 *     right answer, so neither is green or red). The two formats are named,
 *     not the companies, so the video does not date: under allowed, on
 *     "ai-allowed-who", "Extend a multi-file project, assistant built in" and
 *     "Read, debug and speed up unfamiliar code", each inking in on its
 *     words, and "Part 9" under the column; under banned, "Unapproved AI can
 *     disqualify you" and "Some rounds back in person". Then the envelope
 *     spot for a take-home, faded ("ai-why"), beside two bars,
 *     71% and 62%, inked on "ai-survey-data" and sourced "Karat, Engineering
 *     Interview Trends 2026, 400 engineering leaders; one vendor's survey".
 *     Then where the time went: three blocks of text (extend a multi-file
 *     project, read and debug unfamiliar code, design discussion), with
 *     "Part 9", "Part 7" and "Parts 1 and 2" under them, and the four LLM
 *     topics as a line of words, labelled "Part 9". "ai-ask" writes "Ask the
 *     recruiter, for every round" across the fork.
 *   - "series" to "next": "Decisions, not syntax" as the headline; then the
 *     nine topic videos as a bar chart of the questions each answers (PARTS
 *     in data.ts), each bar topped by its own small hero, in series order,
 *     the bars rising as "series-parts" names them; the Python fundamentals
 *     page as two grey lines with an arrow into Part 5's bar on
 *     "series-python"; the practice line beneath, naming the three pages
 *     with challenges (CHALLENGE_LABELS: algorithms, object design,
 *     databases); <NextLine> on "Next", with Parts 1 and 2 lit on "design".
 *
 * Facts, all from the pages or counted (check.mjs into results.json, which
 * data.ts reads; check.mjs fails if a page stops saying what the narration
 * quotes, or the narration stops saying what was counted):
 *   - "probe": index.mdx, intro and "What interviewers probe".
 *   - "ai": ai-assisted-coding.mdx's intro, "Since 2025 the coding interview
 *     has split in two".
 *   - "ai-allowed": the index's "give you an assistant and grade how you
 *     drive and verify it". "ai-allowed-who", "ai-banned": the AI page's
 *     table, generalized to formats at the owner's request (2026-11-06) so
 *     the video does not date by naming companies. "An hour extending a
 *     multi-file project with the assistant built in" is Meta's round ("a
 *     60-minute AI-enabled round: a multi-file project in CoderPad with a
 *     built-in assistant"); "unfamiliar code to read, debug and speed up" is
 *     Google's pilot ("read, debug, and optimize existing code"). "Using
 *     one without permission can disqualify you" is Amazon's rule ("Using
 *     unapproved generative AI during an interview can disqualify a
 *     candidate") with Anthropic's ("No AI ... unless the interviewer says
 *     otherwise"); "some rounds are back in person" is Google's ("At least
 *     one round is back in person").
 *   - "ai-why": the AI page, "take-home projects and automated code tests
 *     have lost most of their signal, because an assistant can complete them
 *     and the reviewer cannot see how". "ai-survey", "ai-survey-data":
 *     Karat's 2026 survey of 400 engineering leaders, 71% and 62%, and the
 *     page's footnote, "Karat sells interviewing services, so read the
 *     figures as one vendor's survey", which is Karat's gloss and the
 *     caveat both.
 *   - "ai-moved": the AI page's live rounds and the index's "multi-file
 *     projects to extend". "ai-llm": the index, "LLM features in system
 *     design". "ai-ask": the AI page's bold line and "algorithm practice
 *     still matters for AI-off rounds and phone screens".
 *   - "series": the plan's "decisions and trade-offs, never coding syntax".
 *     "series-parts": nine videos after this one, 125 questions, each
 *     answered once: the plan's table, held in data.ts (PARTS). The seven
 *     pages kept ask 127 (check.mjs counts their `###` headings); this
 *     overview answers one, and two near-identical SQL or NoSQL questions
 *     are answered once, in Part 4. check.mjs fails if a page's count stops
 *     matching the parts that answer it.
 *   - "series-python": the plan leaves python.mdx (31 questions) out as the
 *     syntax page. Its design questions (the GIL, threading against
 *     multiprocessing, asyncio) have their counterparts on the concurrency
 *     page, which Part 5 answers in full; check.mjs holds both sets of
 *     headings.
 *   - "practice": counted by check.mjs: concept checks on all 8 topic pages,
 *     runnable challenges on 3 (algorithms, object-oriented design,
 *     databases), and a bank of 110 multiple-choice questions.
 *   - the bridge: the index's "Fewer take-homes ... and more live design
 *     discussion"; Part 1 opens on the same point.
 *
 * Written for Drew's ear: AI, API, SQL and LLM in plain caps (SQL is said
 * "sequel" by the lexicon; LLM is expanded once); the GIL is said in full,
 * "the global interpreter lock", so no initialism needs adding; Karat
 * glossed by the page's own footnote; company names as written; no sentence
 * opens with "A" before an initialism; years in digits, other numbers as
 * they are said.
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
      text: "Some rounds hand you an assistant and grade how you drive and check it.",
    },
    {
      id: "ai-allowed-who",
      text: "That can be an hour extending a multi-file project with the assistant built in, or a round that hands you unfamiliar code to read, debug and speed up.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-banned",
      text: "Others ban assistants. Using one without permission can disqualify you, and some rounds are back in person.",
      pauseAfter: 0.7,
    },
    {
      id: "ai-why",
      text: "Underneath is one problem: an assistant can finish a take-home, and nobody sees how.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-survey",
      text: "Karat, which sells interviewing services, asked four hundred engineering leaders in its 2026 survey, so read its figures as one vendor's.",
    },
    {
      id: "ai-survey-data",
      text: "Seventy-one percent said AI makes technical skills harder to assess. Sixty-two percent of organizations still banned it in technical interviews.",
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
    { id: "series", scene: true, text: "This series argues decisions, not syntax.", pauseAfter: 0.6 },
    {
      id: "series-parts",
      text: "After this one, nine videos answer a hundred and twenty-five of the track's questions, each once: system design in two parts, then API design, databases, concurrency, designing objects, reading code, algorithms, and the AI-allowed round.",
      pauseAfter: 0.6,
    },
    {
      id: "series-python",
      text: "The Python fundamentals page is left out, because it's syntax. Its design questions are covered under concurrency: threads, processes, async and the global interpreter lock.",
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
