import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "The Data Engineer interview" (16:9), Part 0 of the Data
 * Engineer interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md, "0. The
 * Data Engineer interview"), after content/interview/data-engineer/index.mdx:
 * the page's "design a pipeline for X" prompt and the four things
 * interviewers probe, what AI has changed, and how the series runs, then the
 * bridge into Part 1.
 *
 * An overview: no question cards, and no question of its own is answered.
 * Reuse: none of another video's scenes. The headings, Drift, Mark and Mono
 * are the series' furniture from da-sql/parts.tsx (as ds-interview takes
 * them), and the eleven heroes are drawn from their own videos' folders.
 *
 * Its own opening, unlike the Data Analyst overview's three cards and the
 * Data Scientist overview's four-stop route: the page's "design a pipeline
 * for X" as the headline, with the meerkat standing lookout, then the four
 * things interviewers probe as a stack of four layers, from the query at the
 * top down to the files it reads. The prompt comes back once the four are
 * laid out ("probe-design"): a design question draws on all four at once,
 * each layer is labelled with the parts that build it, and Part 11 walks one
 * design through. The AI changes follow as a second pipeline (RAG ingestion:
 * parse, chunk, embed, index, fed only new and changed documents) over three
 * cards, ending on the page's pointer to Part 11 ("ai-more"), and the eleven
 * topic videos stand as a bar chart of their question counts, each topped by
 * its own watercolor hero.
 *
 * Facts, all from the page or counted:
 * - "a level deeper than analyst screens on SQL", "design a pipeline for X",
 *   the four probes and their contents, and the four AI changes: the page's
 *   own wording (index.mdx, intro, "What interviewers probe", "How AI has
 *   changed this interview"). The page lists partitioning under both
 *   pipelines and systems; it is said once, under systems, with file sizes.
 * - eleven videos and 157 questions, each answered once: the plan's table,
 *   held in data.ts (PARTS), one place for the counts. The pages ask 182
 *   (check.mjs counts their `###` headings); the plan answers a question two
 *   pages share once, which takes 182 to 157. The screen says so under the
 *   headline, with the 182 from results.json.
 * - "Part eleven walks one design through": Part 11's question 2, "Walk
 *   through the ingestion pipeline for a RAG assistant", the series' one
 *   design walked end to end; "Part eleven covers all four in depth" is the
 *   page's "Pipelines for AI covers these questions in depth". check.mjs
 *   fails if Pipelines for AI moves from Part 11 in PARTS.
 * - SQL and data modeling take two videos each: PARTS.
 * - "most end on a quick round": the plan gives a rapid round to 8 of the
 *   11 topic videos (not SQL II, Warehousing or Pipelines for AI), and the
 *   built scripts agree.
 * - the practice, counted by check.mjs (results.json): concept checks on all
 *   9 topic pages, runnable challenges on 3 (SQL, Python, Data warehousing,
 *   5 in all), and one bank of 110 multiple-choice questions for the track.
 * - the bridge: "nearly every loop has hard SQL" stands on the page's
 *   "expect hard SQL"; the series starts there because the track does
 *   (meta.json). It does not claim that loops open with SQL, which the page
 *   never says.
 *
 * Written for Drew's ear, to the Data Engineer series' rules: SQL is written
 * "sequel" (on screen it stays SQL), AI is said as it is, RAG is expanded
 * once, and no sentence opens with "A" before an initialism. No product name
 * needs a gloss here: Airflow and Dagster are named as what schedules a
 * pipeline, Parquet as a columnar file, and pgvector is said as "Postgres
 * with its vector extension" (the card writes "Postgres (pgvector)", Part
 * 11's word). What RAG does ("a model answers from documents it looks up")
 * is on screen only, under its expansion.
 */
export const script: NarrationScript = {
  id: "de-interview",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    { id: "prompt", scene: true, text: "Design a pipeline for X.", pauseAfter: 0.8 },
    { id: "expect", text: "Expect it in a data engineer interview.", pauseAfter: 0.5 },
    {
      id: "expect-sql",
      text: "Alongside it comes sequel, a level deeper than an analyst screen.",
      pauseAfter: 0.7,
    },
    {
      id: "probe",
      text: "Interviewers probe four things, from the query down to the files.",
      pauseAfter: 0.6,
    },
    {
      id: "probe-sql",
      text: "Advanced sequel: window functions, qualify, deduplication, gaps and islands, and incremental logic.",
    },
    {
      id: "probe-model",
      text: "Data modeling: star or snowflake schemas, facts and dimensions, normalization trade-offs, and slowly changing dimensions.",
    },
    {
      id: "probe-pipe",
      text: "Pipelines and orchestration: batch or streaming, idempotency, backfills, and scheduling in Airflow or Dagster.",
    },
    {
      id: "probe-store",
      text: "And systems and formats: columnar files like Parquet, partitioning and file sizes, warehouse or lakehouse, and cost.",
    },
    {
      id: "probe-design",
      text: "Designing a pipeline for X draws on all four layers at once. The series builds each layer, and Part eleven walks one design through, end to end.",
      pauseAfter: 0.8,
    },
    { id: "ai", scene: true, text: "AI has changed this interview in four ways.", pauseAfter: 0.6 },
    {
      id: "ai-rag",
      text: "Ingestion for retrieval-augmented generation, or RAG, is now a system design prompt: parse, chunk, embed, index, and keep it fresh incrementally, like any other pipeline.",
      pauseAfter: 0.6,
    },
    {
      id: "ai-vector",
      text: "Vector search trade-offs: exact or approximate, Postgres with its vector extension or a dedicated store, metadata filters, and hybrid keyword search.",
    },
    {
      id: "ai-gov",
      text: "Governance for AI data: permissions checked at query time, deletions that reach the vectors, and personal data kept from outside embedding APIs.",
    },
    {
      id: "ai-code",
      text: "And AI-written pipeline code needs review for idempotency, time zones and schema drift. Some coding rounds now allow an assistant, so ask the recruiter about each one.",
    },
    { id: "ai-more", text: "Part eleven covers all four in depth.", pauseAfter: 0.8 },
    {
      id: "series",
      scene: true,
      text: "This series follows the track: eleven videos and a hundred and fifty-seven questions, each answered once. Sequel and data modeling take two videos each.",
      pauseAfter: 0.6,
    },
    {
      id: "series-how",
      text: "Each video works through the harder questions in figures, and most end on a quick round of one-line answers.",
      pauseAfter: 0.6,
    },
    {
      id: "practice",
      text: "Every topic page has concept checks, three add challenges that run in the browser, and a bank of a hundred and ten multiple-choice questions covers the whole track.",
      pauseAfter: 0.8,
    },
    {
      id: "next",
      text: "Nearly every loop has hard sequel, so the series starts there. Next: sequel, window functions and query patterns.",
    },
  ],
};
