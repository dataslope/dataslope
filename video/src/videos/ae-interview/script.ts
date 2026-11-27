import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "The interview, now" (16:9), Part 0 of the Analytics
 * Engineer interview prep videos
 * (agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "0, The interview, now"), after content/interview/analytics-engineer/
 * index.mdx and ai-and-the-semantic-layer.mdx's "How has the Analytics
 * Engineer interview changed with AI?", which it answers ("ai" to
 * "ai-more"): what the role owns, what interviewers probe, how AI changed
 * the interview, the map of the series and the practice, then the bridge
 * into Part 1.
 *
 * An overview: no question cards. Its own opening, unlike the Backend
 * capybara's two follow-ups or the Data Engineer meerkat's prompt: the
 * layer the role owns, drawn as the place between two others, with the
 * platypus (half one animal and half another) sitting in it, because the
 * page opens on the role sitting "between data engineering and analytics".
 *
 * On screen, scene by scene (phase 2 builds these; no cards, the owner's
 * rule of 2026-11-06: plain text grouped by spacing and hairlines, diagram
 * boxes outlined in ink):
 *   - "hook" to "probe-tradeoffs": three outlined boxes in a row, "Raw
 *     tables", an empty middle, "Dashboard" (the easel spot,
 *     ae-interview-dashboard, beside it), inking in on "raw tables" and
 *     "dashboard"; on "layer of models" the middle box draws itself as a
 *     small stack of three model boxes, named over it with the page's term,
 *     "The transformation layer", and the platypus settles beside it on
 *     "owns it". "hook-more": the three words "clean", "tested",
 *     "documented" ink in under the stack, and a small "dbt" badge on "dbt";
 *     on "between data engineering and analytics" the two outer boxes take
 *     the captions "Data engineering" and "Analytics", which stay through
 *     the probes (the review of 2026-11-20). "probe": the row slides up, and the page's four probes come in as a ruled list, one per
 *     beat, each with its topics as a line of words in the page's order
 *     (the first capitalised, as a line on its own),
 *     the head words under the yellow highlighter as they are said: SQL and
 *     modeling (facts and dimensions, star schemas, grain, slowly changing
 *     dimensions); dbt (models, refs, sources, tests, materializations,
 *     documentation); Software practice (version control, CI, staging to
 *     marts, DRY SQL); Trade-offs (view, table or incremental; cost against
 *     freshness). Each row carries, small and right-aligned, the parts that
 *     answer it, read from PARTS through partOf: "Parts 1, 2, 5", "Parts 3,
 *     4, 7", "Parts 3, 7", "Parts 3, 4, 6".
 *   - "ai" to "ai-more": "Modeling, dbt, SQL" as one line under the label
 *     "Still the core", then a hairline and "Added on top". "ai-why": an
 *     assistant (the speech-bubble spot, ae-interview-assistant) drawn
 *     above the stack of models from the hook, a down arrow from it into
 *     "metric definitions", the phrase "an analytics engineer's work"
 *     inking in beside them. The four topics
 *     then come in as a numbered list, one per beat ("ai-sql" to
 *     "ai-review"), each short ("Text-to-SQL or a semantic layer", "AI-ready
 *     modeling", "Evaluating an assistant", "Reviewing AI-written models"),
 *     the words the beat dwells on below each ("confident wrong answers from
 *     raw tables"; "docs, tests, access rules for a language model";
 *     "verified answers, and ones to decline"; "grain, incremental logic,
 *     duplicate metrics"). "ai-ask":
 *     the line "Ask the recruiter, round by round" under the list.
 *     "ai-more": a bracket gathers the four and labels them "Part 9"
 *     (partOf("ae-ai-semantic-layer")).
 *   - "series" to "next": "Decisions, and how they fail" as the headline
 *     (with "Code only as evidence" under it); then the nine topic videos as
 *     a bar chart of the questions each answers (TOPIC_PARTS, questionsOf),
 *     each bar topped by its own small hero, in series order, rising as
 *     "series-list" names them; the total, 147, under the axis, and on the
 *     right "+1 here", for the question this overview answers (148 in all,
 *     the pages' headings, results.json). The practice line beneath:
 *     "Concept checks on every page", then the three challenge pages by name
 *     (CHALLENGE_LABELS), then "110 in the bank". <NextLine> on "Next", with
 *     Part 1's bar lit on "grain".
 *
 * Facts, all from the pages or counted (check.mjs into results.json, which
 * data.ts reads; check.mjs fails if a page stops saying what the narration
 * quotes, or the narration stops saying what was counted):
 *   - "hook", "hook-more": index.mdx's intro, "sits between data
 *     engineering and analytics: you own the transformation layer, turning
 *     raw warehouse tables into clean, tested, documented models (usually
 *     with dbt)". The raw tables a pipeline lands and the dashboard at the
 *     other end are the video's framing of "between".
 *   - "probe" to "probe-tradeoffs": index.mdx, "What interviewers probe",
 *     its four bullets in its order. "SQL that doesn't repeat itself" is the
 *     page's "DRY SQL"; CI is said in full, "continuous integration".
 *   - "ai": ai-and-the-semantic-layer.mdx's answer, "Dimensional modeling,
 *     dbt, and SQL are still the core. Added on top:". "ai-why": that page's
 *     intro and index.mdx's first AI bullet ("only as reliable as the metric
 *     definitions underneath them, and those are an analytics engineer's
 *     work"). "ai-sql" to "ai-review": the four added topics, in the AI
 *     page's order and words, with the index's details (evaluating "by
 *     comparing result sets with verified answers, including questions it
 *     should decline"; AI-written models "reviewed for grain, incremental
 *     logic, and duplicate metrics"). "ai-ask": the index's "some coding
 *     rounds allow an assistant. Ask the recruiter about each round."
 *     "ai-more": the index's "AI & the semantic layer covers these questions
 *     in depth", which is Part 9 (check.mjs reads the number from PARTS).
 *   - "series": the plan's "modeling decisions and their failure modes",
 *     with code on screen "short, and as evidence".
 *   - "series-parts", "series-list": nine videos after this one, 147
 *     questions, each answered once: the plan's table, held in data.ts
 *     (PARTS, by page), with the two questions the pages added on 2026-11-20
 *     (dbt v2 in Part 3, where else a semantic layer can live in Part 8). The
 *     seven topic pages ask 148 (check.mjs counts their `###` headings, and
 *     fails if any page's count stops matching the parts that answer it);
 *     this overview answers one. A near-identical pair on two pages (the
 *     materializations, the incremental filter, the full refresh, freshness,
 *     the four generic tests, and so on) is answered together in one part,
 *     and both headings count to it. The parts are named by the plan's
 *     titles, shortened where said.
 *   - "practice": counted by check.mjs: concept checks on all 7 topic pages,
 *     runnable challenges on 3 (dimensional modeling, advanced SQL, data
 *     warehousing; 4 SqlChallengeCards in all), and a bank of 110
 *     multiple-choice questions.
 *   - "next": the plan's bridge, 0 to 1: every round starts from the model,
 *     and every model from its grain.
 *
 * Written for Drew's ear: dbt and SQL as people write them (dbt is read
 * letter by letter, SQL "sequel" by the lexicon); CI is said in full and
 * "BI" is never said; "slowly changing dimensions" is said in full, so SCD
 * needs no expansion here; "refs" is the word dbt users say; no sentence
 * opens with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "ae-interview",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      scene: true,
      text: "A pipeline lands raw tables in the warehouse. A dashboard shows revenue. Between the two sits a layer of models, and an analytics engineer owns it.",
      pauseAfter: 0.7,
    },
    {
      id: "hook-more",
      text: "Raw tables go in; clean, tested, documented models come out, usually built with dbt. The role sits between data engineering and analytics.",
      pauseAfter: 0.8,
    },
    { id: "probe", text: "Interviews test four things.", pauseAfter: 0.5 },
    {
      id: "probe-model",
      text: "SQL and modeling: facts and dimensions, star schemas, the grain, and slowly changing dimensions.",
    },
    {
      id: "probe-dbt",
      text: "Then dbt itself: models, refs and sources, tests, materializations and documentation.",
    },
    {
      id: "probe-practice",
      text: "Software practice: version control, continuous integration, layers from staging to marts, and SQL that doesn't repeat itself.",
    },
    {
      id: "probe-tradeoffs",
      text: "And trade-offs: a view, a table or an incremental model, and cost against freshness.",
      pauseAfter: 0.8,
    },
    {
      id: "ai",
      scene: true,
      text: "AI has added to that core, not replaced it. Modeling, dbt and SQL still come first.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-why",
      text: "What's new is a reader. Companies put ask-your-data assistants in front of their warehouses, and an assistant is only as reliable as the metric definitions underneath it. Those are an analytics engineer's work.",
      pauseAfter: 0.7,
    },
    { id: "ai-four", text: "So expect four more topics." },
    {
      id: "ai-sql",
      text: "Why text-to-SQL over raw tables gives confident wrong answers, and how a semantic layer prevents them.",
    },
    {
      id: "ai-ready",
      text: "AI-ready modeling: documentation, tests and access rules written for a reader that is a language model.",
    },
    {
      id: "ai-eval",
      text: "Evaluating an assistant against answers you've verified, including questions it should decline.",
    },
    {
      id: "ai-review",
      text: "And reviewing a dbt model an assistant wrote, for its grain, its incremental logic and duplicate metrics.",
      pauseAfter: 0.6,
    },
    { id: "ai-ask", text: "Some coding rounds allow an assistant, so ask the recruiter about each round." },
    { id: "ai-more", text: "Part nine covers all four in depth.", pauseAfter: 0.8 },
    {
      id: "series",
      scene: true,
      text: "This series argues modeling decisions, and the ways they fail. Code comes on screen only as evidence.",
      pauseAfter: 0.6,
    },
    {
      id: "series-parts",
      text: "After this one, nine videos answer the track's other hundred and forty-seven questions, each once:",
    },
    {
      // Split from "series-parts" at its colon, so the list is still cut
      // from the take and only the count was voiced again.
      id: "series-list",
      text: "facts and grain, dimensions that change, how dbt builds a project, incremental models, advanced SQL, warehouses and what they cost, testing, metrics, and the assistants that read them.",
      pauseAfter: 0.6,
    },
    {
      id: "practice",
      text: "Every topic page has concept checks, three of them add challenges that run in the browser, and a bank of a hundred and ten multiple-choice questions covers the whole track.",
      pauseAfter: 0.8,
    },
    {
      id: "next",
      text: "Every round starts from a model, and every model from its grain. Next: facts, dimensions and grain.",
    },
  ],
};
