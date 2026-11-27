import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "AI and the semantic layer" (16:9), Part 9 and the last of
 * the Analytics Engineer interview prep videos
 * (agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "9, AI and the semantic layer"), after
 * content/interview/analytics-engineer/ai-and-the-semantic-layer.mdx. It
 * answers the six of the page's seven questions the plan gives it (the
 * seventh, "How has the Analytics Engineer interview changed with AI?", is
 * Part 0's): five worked through and numbered aloud, in the page's order,
 * then one quick one. The series ends here, so there is no "Next:" bridge;
 * the close is a line for the series, then the track's practice.
 *
 *   1. "Why does text-to-SQL over raw tables give confident wrong answers?"
 *      ("t2s")
 *   2. "What does a semantic layer change for an AI assistant?" ("sem")
 *   3. "What makes a dbt project "AI-ready"?" ("ready"; the card keeps the
 *      page's quotation marks, the voice drops them)
 *   4. "How do you evaluate a natural-language analytics assistant?"
 *      ("eval")
 *   5. "How do you review a dbt model an assistant wrote?" ("review")
 *   Quick ("rapid-in"): 6. "How do AI assistants connect to the warehouse
 *   and to governed metrics?" ("r-connect"), read as "Question six." and the
 *   question, as the rapid rounds are read. It is the one quick question
 *   because its answer is a list of design points with no mechanism to run;
 *   the other five each have a trap the video can show on real rows.
 *
 * The opening takes up Part 8's bridge (the reader is now a language model)
 * in the page's own words, without naming Part 8, so it stands alone. The
 * close restates the series' two questions (what one row means, and what a
 * number means) as its last word.
 *
 * One thread runs through the video: the page's eight orders. Question 1
 * shows their three readings of "revenue" (1,450, 1,190, 440); Question 2
 * compiles the governed one (440) for every consumer; Question 3's YAML
 * describes them, and three words cut from its description give 1,190;
 * Question 4 scores three answers against the verified 440; Question 5's
 * duplicate metric is 1,190 beside 440. Its incremental figure is the
 * video's own seven orders.
 *
 * On screen, beat by beat (phase 2 builds these; every table, listing and
 * number is read from results.json through data.ts; no cards, diagram boxes
 * outlined in ink; red is the trap, green the right answer, yellow what the
 * narration points at, blue data):
 *   - "hook", "plan": the dolphin (the hero) on the right. On the left, a
 *     small lineage of three outlined model boxes (stg_orders,
 *     int_orders, fct_orders) with an outlined box "Assistant" above them
 *     and an arrow down into the models; "takes them literally" and
 *     "thousands of questions nobody reviews" ink in under it on their
 *     words. "plan": the
 *     six questions as a numbered list in short form, 1 to 5 under
 *     "Worked through", 6 under "Quick".
 *   - "t2s" to "t2s-past": the question card. "t2s-hard": two lines,
 *     "Syntax" and "Definitions", the second under the yellow highlighter
 *     (nothing struck: SQL syntax is not wrong, just not the hard part).
 *     "t2s-guess": the page's five guesses as a column of short questions
 *     inking in on their words (Net of refunds? Cancelled orders? Test
 *     accounts? Which of three tables? Which join path, and does it fan
 *     out?). "t2s-rows": the page's two tables, customers (5 rows,
 *     is_test) and orders (8 rows), customer 4's is_test marked. "t2s-run":
 *     the page's query, its three SUM lines highlighted in turn, and its
 *     one-row result filling cell by cell, 1450.00, 1190.00, 440.00; on
 *     "completed" the refunded and cancelled rows of orders dim, on "test
 *     account" customer 4's two orders dim too. No column is struck or red:
 *     each is a defensible reading. "t2s-valid": a bracket from 1450.00 to
 *     440.00 labelled "3.3×" (results.json), and "No error" under the
 *     listing. "t2s-name": the red kicker "A fluent, plausible, wrong
 *     number". "t2s-past": the line "Revenue is a decision, not a column",
 *     with an arrow pointing out of the frame toward Question 2.
 *   - "sem" to "sem-trade": the question card. "sem": Question 1's five
 *     guesses slide into an outlined box "Semantic layer", where they
 *     become "net_revenue: completed orders, test accounts excluded".
 *     "sem-declared": four rows inside the box, Metrics, Filters,
 *     Dimensions, Join paths, inking in on their words. "sem-job": the
 *     assistant's request as four slots (metric, dimensions, filters, time
 *     grain), only metric filled (net_revenue), and an arrow from the box to
 *     a short listing labelled "SQL the layer writes" (data.ts COMPILED,
 *     the video's own SQL, not any product's output). "sem-same": three
 *     outlined boxes, Assistant, Dashboards, Finance report, each showing
 *     440.00 in green. "sem-fail": a second request, for a metric the layer
 *     does not hold, and its answer "No metric matches" in green (the
 *     refusal is the right behavior), beside a small easel spot labelled
 *     "Board deck" with a red question mark (ae-ai-semantic-layer-easel).
 *     "sem-active": that request named, active_users in the metric slot,
 *     "last week" in filters and "week" as the time grain (review
 *     2026-11-26: "last week" drawn as the grain confused a range with a
 *     granularity), and the right reply as three lines (Not defined; Closest governed metrics; An
 *     exploratory query, labeled unverified). "sem-drift": "Let the LLM
 *     define it" struck through in red, "metric drift by design" beside it.
 *     "sem-trade": a fork: "Modeled: through the layer" (green) and
 *     "Exploratory: text-to-SQL, labeled" (neutral), under "Coverage".
 *   - "ready" to "ready-review": the question card. "ready-desc": the page's
 *     YAML listing (data.ts READY.yaml, read out of the page), "One row per
 *     order" highlighted on "grain", "use the net_revenue metric" on "how
 *     to use it". "ready-tests": "[unique, not_null]" and the
 *     accepted_values block highlighted in turn, each with a small "pass"
 *     badge (0 failing rows, results.json), and the three values set off on
 *     "completed, refunded and cancelled". "ready-access": a lineage, the
 *     assistant's role granted SELECT on the mart alone, its arrow to an
 *     intermediate model stopped by the grant; then staging and
 *     intermediate "private", "access: public" highlighted in the YAML, as
 *     the secondary point (it restricts ref(), not queries: a note under
 *     the private models says so). The padlock spot
 *     (ae-ai-semantic-layer-padlock) belongs to the grant, beside the
 *     assistant and the stopped arrow (review 2026-11-20: under a private
 *     model it read as "private locks the assistant out").
 *     "ready-rest": "Semantic layer: every disputed number" and the
 *     hourglass spot (ae-ai-semantic-layer-hourglass) with "as of" and
 *     "refuse stale data". "ready-caution" and "ready-input" (one beat
 *     until the review: the second sentence was re-voiced, the first is cut
 *     from the take): back on the YAML, "and test
 *     accounts" struck through on "Drop the words and test accounts" (here the
 *     strike is the edit being made, not a verdict on the words). The arrow
 *     from the description to "Net revenue, in SQL written from the
 *     description" and its green 440.00 (READY.asWritten) come in on
 *     "documentation is now an input", before the strike; the strike
 *     retires 440.00 to "As written, 440.00", and 1190.00 (READY.withoutCut)
 *     arrives in red on its words (review 2026-11-26: a green 440.00 beside
 *     the struck line read as "the cut changes nothing").
 *     "ready-review": "Review descriptions like code" under the listing.
 *   - "eval" to "eval-regress": the question card. "eval": the golden set
 *     as a small two-column table, question and verified result, and the
 *     golden-cards spot (ae-ai-semantic-layer-golden). "eval-mix": three
 *     tags, easy lookup, multi-step comparison, ambiguous phrasing.
 *     "eval-store": "Verified result" kept, "reference query" below it in
 *     grey. "eval-run": three short listings side by side (data.ts
 *     EVAL.candidates: the reference, a different join and aliases,
 *     completed only), each result arriving under it on its words: 440.00,
 *     440.00, 1190.00. "eval-score": a grid under them, rows A, B, C,
 *     columns "Same text", "Runs", "Same result", filled column by column
 *     as each is said (results.json): B's "Same text" cell a red cross (a
 *     right answer failed) and C's "Runs" a red tick (a wrong one passed);
 *     then the "Same result" column lit green, headed "Execution accuracy".
 *     "eval-luck" (added in the review): under C, its result on the same
 *     orders without the test account's, the same as A's, "a match by
 *     luck", and "Test on data where the readings differ".
 *     "eval-decline": three more rows in the golden set, expected answer
 *     "Decline" (an unmodeled metric, data the user may not see, nonsense),
 *     and "refusal rate" beside them. "eval-slice": "By difficulty × domain"
 *     as words, no chart (no scores are invented). "eval-regress": a loop,
 *     Change (models, semantic layer, prompt, LLM) → Run the golden set →
 *     Compare, with "Production questions that went wrong" feeding back in.
 *   - "review" to "review-tests": the question card, the magnifying-glass
 *     spot (ae-ai-semantic-layer-magnifier). The assistant's model as a
 *     short listing (data.ts REVIEW.asWritten): a config with no unique_key,
 *     `from analytics.raw_orders`, and `where order_date > (select
 *     max(order_date) from {{ this }})`. A checklist beside it ticks as each
 *     item is read: "review-grain" (no unique test: a red mark), "review-refs"
 *     (the hard-coded name underlined red, `{{ source('shop', 'orders') }}`
 *     written beside it in green), "review-incr" (the filter line, then the
 *     fixed one, `- interval '3 days'`, and `unique_key='order_id'` added to
 *     the config, green). "review-pair", "review-strict", "review-look"
 *     (one beat until the review split it at its sentences, so the miss
 *     holds before the lookback replaces it): a strip of days, October 30 to
 *     November 4, the five loaded orders as dots; order 6 (November 4) and
 *     late order 7 (November 1) drop in; the strict window (after November
 *     3) shaded, catching 6 and missing 7 (red); the three-day window (after
 *     October 31) shaded, catching 3 to 7; then two counts from results.json:
 *     "Append: 10 rows, 7 orders" (the three repeats red) and "Merge on
 *     order_id: 7 rows" (green). "review-dup": two metric chips, net_revenue
 *     440.00 (governed) and the assistant's revenue 1190.00, "already
 *     exists" between them in red. "review-tests": "A test that fails
 *     without the change".
 *   - "rapid-in" to "r-connect-design": RapidFire, item 6 (the screen
 *     numbers it), with a small path: Assistant → MCP → Semantic layer API
 *     and Catalog → Warehouse, outlined boxes, MCP expanded under its box;
 *     then four badges along the path on their words: "as the user",
 *     "read-only", "cost and timeout limits", "logged".
 *   - "close", "close-practice": the series' ten heroes in a row, from Part
 *     0's platypus to the dolphin (the ids are each folder's
 *     `<folder>-<creature>`, as ae-interview/data.ts PARTS lists them), and
 *     the two questions as the headline in the serif; then the track's
 *     practice, counted (results.json): concept checks on every topic page,
 *     challenges on three, and the bank of 110.
 *
 * Facts. check.mjs reads the page's tables, query and YAML out of the page,
 * runs every statement on the site's Postgres (PGlite, PostgreSQL 18,
 * through video/scripts/lib/pg-figure.mjs over scripts/lib/sql-engines.mjs'
 * package), and writes results.json, which data.ts reads; it fails if the
 * page stops saying a fact below in its own words, or a beat stops saying a
 * number it computes:
 *   - "t2s" to "t2s-past": the page's answer and its block, run as written:
 *     every_order 1450.00, completed_orders 1190.00, governed_net_revenue
 *     440.00; 1450 / 440 = 3.3, the page's "a factor of more than three".
 *     Eight orders, five customers, one test account (customer 4), counted.
 *     The five guesses and "not an error, but a fluent, plausible, wrong
 *     number" are the page's. "t2s-past" is argued from the page's "knowing
 *     the definitions the SQL has to encode": the rows hold no definition.
 *     The page's "dollars" are not stated; the narration says dollars, as
 *     the other interview videos say amounts.
 *   - "sem" to "sem-trade": the page's answer, its three consequences in its
 *     words. "sem-same": the governed definition compiled to SQL by the
 *     video (COMPILED), run here: 440.00. No semantic layer, MetricFlow or
 *     assistant runs; the request, the refusal and the three consumers are
 *     drawn. "sem-active" and "sem-drift" are the page's first concept
 *     check (the executive's "active users last week"), its right answer
 *     and its fourth option's explanation.
 *   - "ready" to "ready-review": the page's answer and its YAML. The tests
 *     run as the SQL dbt's generic tests compile to (the unique, not_null
 *     and accepted_values macros' shape), on fct_orders built from the
 *     page's orders: 0 failing rows each; the statuses are exactly
 *     completed, refunded and cancelled. "ready-access" is the page's access
 *     boundary as #746 rewrote it: the assistant's warehouse role granted
 *     SELECT on the public marts only (dbt's grants config), and marking
 *     staging and intermediate models private restricts ref(), not queries;
 *     "ready-access-why" is the page's third concept check ("Removing the
 *     option at the warehouse beats hoping the model chooses well"). The two
 *     were one beat until the page changed; the second sentence is cut from
 *     the take it was voiced in. "ready-input": the page's caution, made
 *     concrete: the description as written ("excludes refunded and
 *     cancelled orders and test accounts") encodes to 440.00; without its
 *     last three words, "and test accounts", to 1190.00. The beat says "an
 *     assistant writing its own SQL from it": one that follows the
 *     description to the letter calls the net_revenue metric and still gets
 *     440 (the review's finding; the description is an input to SQL written
 *     from it, as in the text-to-SQL fallback).
 *   - "eval" to "eval-regress": the page's six steps, in its words, and its
 *     second concept check (string comparison marks right answers wrong; a
 *     query that runs can return the wrong number). The three candidates are
 *     the video's own SQL on the page's tables: the reference (440.00), the
 *     join turned round with its filter in the ON clause and other aliases
 *     (440.00), completed orders only (1190.00).
 *     The grid is computed: text equal after collapsing whitespace and case
 *     (A only), ran without error (all three), same result set (A and B).
 *     No assistant is evaluated and no accuracy figure is given.
 *     "eval-luck" is past the page: A and C run again on the same orders
 *     with the test account's deleted, both 440.00, so execution accuracy
 *     passes C there; the golden set's data has to tell readings apart.
 *   - "review" to "review-tests": the page's checklist in its order and
 *     words. "review-pair" is the video's own run, past the page (which
 *     lists the lookback and the unique_key as two items): seven orders, five
 *     loaded (October 30 to November 3), then order 6 (November 4) and the
 *     late order 7 (November 1, two days before the newest row loaded). The
 *     incremental select, as the model compiles with is_incremental() true:
 *     after the newest date, it selects 1 row and misses order 7; with a
 *     three-day lookback, 5 rows (orders 3 to 7), three of them already
 *     loaded. Appended, as dbt does with no unique_key: 10 rows, 7 distinct
 *     orders. Merged on order_id (Postgres's MERGE), or deleted and
 *     re-inserted, as dbt does with one: 7 rows. "review-dup" is Question
 *     1's completed reading beside its governed one.
 *   - "r-connect": the page's answer, its interfaces, MCP, the MCP server
 *     dbt publishes (said "dbt Labs", the company, as voiced before the page
 *     said "dbt"), and its three design points, in its words.
 *   - "close-practice": counted by check.mjs over the track's pages:
 *     concept checks on all 7 topic pages, runnable challenges on 3
 *     (SqlChallengeCards), and a bank of 110 multiple-choice questions.
 *
 * Reuse: no earlier video answers these questions. The nearest, Data
 * Analyst Part 8 (da-ai-assisted), checks one generated query by hand; it
 * shares no table or number with this page, so nothing is imported, and
 * nothing here refers to it.
 *
 * Written for Drew's ear: AI, SQL, API and MCP as people write them (SQL
 * is "sequel" by the lexicon; MCP and API letter by letter); MCP is
 * expanded once, where it is said; LLM is never said ("a language model"),
 * though the screen may write it; "BI" is never said ("dashboard
 * tools"); dbt identifiers as words ("ref and source", "unique key", "net
 * revenue metric"); money as it is said ("fourteen hundred fifty dollars",
 * "eleven hundred ninety"); no sentence opens with "A" before an
 * initialism. "Model" alone means a dbt model; the other kind is always
 * "a language model" or "the assistant".
 */
export const script: NarrationScript = {
  id: "ae-ai-semantic-layer",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every model in a dbt project now has one more reader: a language model, behind an ask-your-data assistant. It reads the same tables and definitions an analyst does, but it takes them literally, and it answers thousands of questions nobody reviews.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Six questions on making that safe, and on knowing when it isn't. Five are worked through, and one quick one comes last.",
      pauseAfter: 0.7,
    },

    // ── 1. Text-to-SQL over raw tables ────────────────────────────────────
    {
      id: "t2s",
      scene: true,
      text: "Question one. Why does text-to-SQL over raw tables give confident wrong answers?",
      pauseAfter: 0.6,
    },
    {
      id: "t2s-hard",
      text: "Because the hard part of a business question isn't the SQL. It's the definitions the SQL has to encode.",
      pauseAfter: 0.7,
    },
    {
      id: "t2s-guess",
      text: "Ask for revenue, and an assistant writing SQL against raw tables has to guess. Net of refunds? Cancelled orders? Test accounts? Which of three similar tables, which join path, and does it fan out?",
      pauseAfter: 0.6,
    },
    {
      id: "t2s-rows",
      text: "Here are eight orders from five customers, and one customer is a test account.",
      pauseAfter: 1.0,
    },
    {
      id: "t2s-run",
      text: "Sum every order: fourteen hundred fifty dollars. Only the completed ones: eleven hundred ninety. Completed, and not from the test account: four hundred forty.",
      pauseAfter: 0.8,
    },
    {
      id: "t2s-valid",
      text: "Each guess is a valid query with a plausible number, and the biggest is more than three times the smallest. Nothing in the SQL would look wrong to the person who asked.",
      pauseAfter: 0.6,
    },
    {
      id: "t2s-name",
      text: "That's the failure to name: not an error, but a fluent, plausible, wrong number.",
      pauseAfter: 0.6,
    },
    {
      id: "t2s-past",
      text: "And no query can find the right one in the rows.",
      pauseAfter: 0.6,
    },
    {
      id: "t2s-decision",
      text: "Which reading counts as revenue is a company decision, so it has to be written down where the assistant reads it.",
      pauseAfter: 0.8,
    },

    // ── 2. What a semantic layer changes ──────────────────────────────────
    {
      id: "sem",
      scene: true,
      text: "Question two. What does a semantic layer change for an AI assistant? It moves the definitions out of the guess and into code.",
      pauseAfter: 0.6,
    },
    {
      id: "sem-declared",
      text: "Metrics, their filters, the dimensions they can be sliced by, and the join paths between entities are declared once.",
      pauseAfter: 0.5,
    },
    {
      id: "sem-job",
      text: "The assistant's job shrinks from writing SQL to choosing: a metric, dimensions, filters and a time grain. The layer compiles the SQL.",
      pauseAfter: 0.6,
    },
    {
      id: "sem-same",
      text: "Ask for net revenue, and the assistant, the dashboards and the finance report all get four hundred forty, computed the same way.",
      pauseAfter: 0.6,
    },
    {
      id: "sem-fail",
      text: "And a question the layer doesn't model returns an error saying no metric matches, not an invented query. A refusal is far cheaper than a wrong number in a board deck.",
      pauseAfter: 0.7,
    },
    {
      id: "sem-active",
      text: "So if an executive asks for active users last week, and nobody has defined active, the right answer says so, and offers the closest governed metrics, or an exploratory query labeled as unverified.",
      pauseAfter: 0.5,
    },
    {
      id: "sem-drift",
      text: "Having the language model define it on the spot is metric drift by design: its version won't match the dashboards or finance.",
      pauseAfter: 0.6,
    },
    {
      id: "sem-trade",
      text: "The price is coverage: the assistant can only answer what's been modeled. So many teams route modeled questions through the layer, and fall back to text-to-SQL, clearly labeled, for exploratory ones.",
      pauseAfter: 0.8,
    },

    // ── 3. An AI-ready dbt project ────────────────────────────────────────
    {
      id: "ready",
      scene: true,
      text: "Question three. What makes a dbt project AI-ready? Everything that helps a new analyst helps an assistant, with less tolerance for gaps, because an assistant won't ask.",
      pauseAfter: 0.6,
    },
    {
      id: "ready-desc",
      text: "Describe every public model and column, including the grain, one row per order, and how to use it: for revenue, the net revenue metric.",
      pauseAfter: 0.5,
    },
    {
      id: "ready-tests",
      text: "Test what the descriptions claim: the key unique and not null, relationships for foreign keys, and accepted values, so the assistant knows the real statuses are completed, refunded and cancelled.",
      // The real statuses hold about 2 s before access replaces them
      // (review 2026-11-26: under a second at 0.6).
      pauseAfter: 1.3,
    },
    {
      id: "ready-access",
      text: "Grant the assistant's warehouse role the public marts only. Marking staging models private stops other models building on them, not queries.",
      pauseAfter: 0.5,
    },
    { id: "ready-access-why", text: "That removes the wrong choice, rather than hoping it makes the right one.", pauseAfter: 0.6 },
    {
      id: "ready-rest",
      text: "Put every number the business argues about in the semantic layer. And check source freshness, so an answer can say as of when, and the assistant can refuse to answer from stale data.",
      pauseAfter: 0.7,
    },
    {
      id: "ready-caution",
      text: "One caution: documentation is now an input.",
      pauseAfter: 0.5,
    },
    {
      id: "ready-input",
      text: "Drop the words and test accounts from the end of this description, and an assistant writing its own SQL from it reports eleven hundred ninety.",
      pauseAfter: 0.6,
    },
    {
      id: "ready-review",
      text: "So if an assistant drafts the descriptions from the SQL, review them like code.",
      pauseAfter: 0.8,
    },

    // ── 4. Evaluating an assistant ────────────────────────────────────────
    {
      id: "eval",
      scene: true,
      text: "Question four. How do you evaluate a natural-language analytics assistant? With a golden set: real questions from the people who'll use it, each with an answer you've verified.",
      pauseAfter: 0.6,
    },
    { id: "eval-mix", text: "Mix easy lookups, multi-step comparisons and ambiguous phrasings.", pauseAfter: 0.5 },
    {
      id: "eval-store",
      text: "Store the verified result, not only a reference query, because many different queries are correct.",
      pauseAfter: 0.5,
    },
    {
      id: "eval-run",
      text: "Here are three answers to one question: what was net revenue? The first is the reference. The second uses a different join and different aliases, and also returns four hundred forty. The third runs without an error, and returns eleven hundred ninety.",
      pauseAfter: 0.6,
    },
    {
      id: "eval-score",
      text: "Compare the query text, and the second, which is right, fails. Count whatever runs, and the third, which is wrong, passes. Compare result sets, which is called execution accuracy, and both are scored correctly.",
      pauseAfter: 0.7,
    },
    {
      id: "eval-luck",
      text: "One catch: a wrong query can match by luck. Without the test account's orders, the third returns four hundred forty too, so test on data where the readings differ.",
      pauseAfter: 0.8,
    },
    {
      id: "eval-decline",
      text: "Include questions it should decline: metrics nobody has modeled, data the user may not see, and nonsense. Measure how often it refuses those as carefully as accuracy on the rest.",
      pauseAfter: 0.6,
    },
    {
      id: "eval-slice",
      text: "Slice the scores by difficulty and domain, because an average hides the category that fails every time.",
      pauseAfter: 0.6,
    },
    {
      id: "eval-regress",
      text: "Then run the set as a regression suite on every change to the models, the semantic layer, the prompt or the language model, and grow it from the production questions that went wrong.",
      pauseAfter: 0.8,
    },

    // ── 5. Reviewing a model an assistant wrote ───────────────────────────
    {
      id: "review",
      scene: true,
      text: "Question five. How do you review a dbt model an assistant wrote? With the checklist you'd use for a junior colleague, aimed at what assistants tend to get wrong.",
      pauseAfter: 0.6,
    },
    { id: "review-grain", text: "Grain: what is one row, and is there a unique test proving it?", pauseAfter: 0.5 },
    {
      id: "review-refs",
      text: "References: ref and source, never a hard-coded schema name, which breaks in another environment and hides the lineage.",
      pauseAfter: 0.5,
    },
    {
      id: "review-incr",
      text: "Incremental logic: a lookback window in the filter, so late rows are caught, and a unique key, so a rerun updates rows instead of duplicating them.",
      pauseAfter: 0.6,
    },
    {
      id: "review-pair",
      text: "The two only work as a pair. Here, one order arrives late, dated two days before the newest row loaded.",
      pauseAfter: 0.5,
    },
    { id: "review-strict", text: "A filter for dates after the newest one loaded misses it.", pauseAfter: 0.9 },
    {
      id: "review-look",
      text: "A three-day lookback catches it, but reads three orders it already loaded, and without a unique key appends them a second time: ten rows for seven orders. With the key, seven.",
      pauseAfter: 0.8,
    },
    {
      id: "review-dup",
      text: "Duplication: does this number already exist under another name? Assistants are good at writing a second, slightly different revenue, like completed orders at eleven hundred ninety, next to the governed four hundred forty.",
      pauseAfter: 0.6,
    },
    {
      id: "review-tests",
      text: "And tests and docs come with the model, including a test that would fail without the change.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "One more, quickly.", pauseAfter: 0.5 },
    {
      id: "r-connect",
      text: "Question six. How do AI assistants connect to the warehouse and to governed metrics? Through the interfaces dashboard tools use: a semantic layer API that takes metric and dimension names, and catalog metadata for discovery. The Model Context Protocol, or MCP, is a common way to expose them, and dbt Labs publishes an MCP server.",
      pauseAfter: 0.6,
    },
    {
      id: "r-connect-design",
      text: "Run the assistant as the user, with that user's row and column permissions, never as a superuser. Give it read-only credentials and limits on cost and time, since it writes an expensive cross join as easily as a cheap lookup. And log every question, query and result, for audit and for the golden set.",
      pauseAfter: 1.0,
    },

    // ── Close ─────────────────────────────────────────────────────────────
    {
      id: "close",
      scene: true,
      text: "Under every round in this series sit two questions: what does one row mean, and what does this number mean? An assistant can't decide either. It can only read what you wrote down, and it reads it literally.",
      pauseAfter: 0.8,
    },
    {
      id: "close-practice",
      text: "That closes the series. Every topic page has concept checks, three have challenges that run in the browser, and a bank of a hundred and ten multiple-choice questions covers the whole track.",
    },
  ],
};
