import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "How dbt builds a project" (16:9), Part 3 of the Analytics
 * Engineer interview prep videos
 * (agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "3, How dbt builds a project"), after content/interview/analytics-engineer/
 * dbt.mdx's eighteen questions the plan gives this part, with
 * dimensional-modeling.mdx's "How do staging, intermediate, and mart layers
 * differ?" and data-warehousing.mdx's "Compare the materializations: view vs
 * table vs incremental.": twenty-one headings, twenty questions read aloud.
 * Ten are worked through, then ten go quickly; all twenty are numbered aloud,
 * "Question n." and then the question in the page's words. (Question 20, dbt
 * v2, was added on 2026-11-20 after the interview-prep review rewrote
 * dbt.mdx; it and the two beats that count the round, "plan" and
 * "rapid-in", were voiced on their own after the take.)
 *
 *   1. What is dbt, and what does it actually do? ("what")
 *   2. What do `ref()` and `source()` do? ("ref"), read "ref and source".
 *   3. What is the dbt lineage DAG, and how is it built? ("dag")
 *   4. How do staging, intermediate, and mart layers differ? ("layers";
 *      dimensional-modeling.mdx)
 *   5. Compare the materializations: view, table, incremental, ephemeral.
 *      ("mat"), which answers data-warehousing.mdx's "Compare the
 *      materializations: view vs table vs incremental." with it, as the plan
 *      pairs them: the card reads dbt's, the warehousing page's rule ("Choose
 *      by read frequency, compute cost, and data volume, not habit") closes it.
 *   6. What is an ephemeral model, and when should you use it? ("eph")
 *   7. What is the difference between `dbt run`, `dbt test`, and `dbt build`?
 *      ("build")
 *   8. How do you run only a subset of models in dbt? ("subset")
 *   9. What are environments and targets in dbt? ("env")
 *   10. How do you handle environment-specific schemas in dbt? ("schema")
 *   Quick ("rapid-in"): 11. What are seeds in dbt? 12. How do macros work in
 *   dbt? 13. What are dbt packages, and how do you add one? 14. How do you
 *   pass variables into dbt models? 15. What are exposures in dbt? 16. How
 *   does dbt manage documentation and lineage? 17. What is the
 *   `dbt_project.yml` file, and what does it control? (read "the dbt project
 *   YAML file"; the file is dbt_project.yml, as the answer itself spells it:
 *   the card should take the answer's spelling, reported) 18. How do you
 *   version a dbt model? 19. What is `dbt debug`, and when do you use it?
 *   20. What is dbt v2, and how does it relate to dbt Core? ("r-v2")
 *
 * The rest of dbt.mdx is answered elsewhere, by the plan: snapshots in Part 2;
 * the five incremental questions in Part 4; tests, freshness, contracts and CI
 * in Part 7.
 *
 * Opening: Part 2's bridge (the models have to be built in order, every day),
 * said fresh so the video stands alone, with the weaver bird on its nest.
 * Close: the plan's bridge into Part 4, the cost of rebuilding a large table
 * every night.
 *
 * On screen, scene by scene (what phase 2 builds; red the trap, green the
 * right answer, yellow what the narration points at, blue data). One graph
 * runs through the video: the page's lineage slice (dbt.mdx's mermaid block:
 * raw.orders -> stg_orders -> fct_orders; raw.customers -> stg_customers ->
 * dim_customer -> fct_orders) and the page's one exposure,
 * weekly_revenue_dashboard, fed by fct_orders and dim_customer (GRAPH in
 * data.ts). Its boxes are outlined, not filled, sources in a soft ink, the
 * exposure with the dashboard spot. Code is on screen only as evidence, and
 * short.
 *   - "hook": the graph's four models as outlined boxes, unordered, the
 *     weaver bird beside them; "hook-dbt": arrows draw in and the boxes slide
 *     into build order. "plan": ten numbered squares, then nine smaller.
 *   - "what": QuestionCard 1; "E, L, T" with T highlighted. "what-wrap": a
 *     model file (`SELECT ...`, the warehousing page's dim_customer SELECT)
 *     and, beside it, the same SELECT inside `CREATE VIEW dim_customer AS`
 *     and inside `CREATE TABLE dim_customer AS`, the wrapper highlighted.
 *     "what-not": an arrow from "source systems" into the warehouse labelled
 *     "extract and load tools", struck through under dbt's name (it is not
 *     dbt's); then four words inking in: version control, modules, tests, CI.
 *   - "ref": QuestionCard 2; the page's two lines, `SELECT * FROM {{
 *     source('raw', 'orders') }}` under stg_orders and `FROM {{
 *     ref('stg_orders') }}` under fct_orders (the page's own fct_orders
 *     listing, its FROM line). "ref-edges": each call draws its edge,
 *     raw.orders -> stg_orders -> fct_orders. "ref-hard": the ref line
 *     replaced by `FROM analytics.stg_orders` (the page's hardcoded name);
 *     the edge into fct_orders erases (red gap), and fct_orders slides to
 *     the front of the order, beside stg_orders.
 *   - "dag": QuestionCard 3; the whole slice draws itself, edge by edge, "2
 *     sources, 4 models, 5 edges". "dag-order": three columns, step 1
 *     stg_orders and stg_customers side by side (both lit), step 2
 *     dim_customer, step 3 fct_orders; "4 models, 3 steps". "dag-acyclic":
 *     a dashed edge back from fct_orders to stg_orders, a red loop, "no first
 *     model".
 *   - "layers": QuestionCard 4; the graph regrouped into three columns under
 *     hairlines: Staging (stg_orders, stg_customers), Intermediate (empty on
 *     the page's slice; the page's ephemeral int_orders_cleaned is drawn
 *     there, dashed), Marts (dim_customer, fct_orders); each column's one-line
 *     rule from the page under it (intermediate: "reusable business logic,
 *     joins, and reshaping"). "layers-dry": "small, testable, written
 *     once". "layers-cost": `stg_customers+` lights stg_customers,
 *     dim_customer and fct_orders and the dashboard: "3 of 4 models"; then
 *     `fct_orders+` lights fct_orders and the dashboard: "1 of 4".
 *     "layers-rule": "changes weekly" under intermediate and marts, "changes
 *     rarely" under staging.
 *   - "mat": QuestionCard 5. "mat-view": customer_events (24 rows) and the
 *     view's plan as Postgres printed it (HashAggregate over a Seq Scan on
 *     customer_events, 24 rows in, 12 out), "every read"; a 25th event,
 *     customer 13, lands and the view's count goes 12 -> 13 (green).
 *     "mat-table": the table's plan, one line, "Seq Scan on dim_customer (12
 *     rows)"; after the same event its count stays 12 (yellow, "until the
 *     next run"), then the next run's rebuild: 13. "mat-incr": a third row,
 *     "incremental: only new or changed rows". "mat-eph": a fourth,
 *     "ephemeral: not stored".
 *     "mat-pick": the warehousing page's rule as a line; the concept check's
 *     case ("expensive, read all day, source changes nightly") -> table
 *     (green).
 *   - "eph": QuestionCard 6; the page's int_orders_cleaned listing, its
 *     config line highlighted, then its SELECT moving inside a `WITH ... AS
 *     (...)` at the top of a downstream model, the warehouse drawn empty.
 *     "eph-when": two downstream models, each with its own copy of the CTE
 *     (the copy in red when a third and fourth are added); "can't query it,
 *     can't test it".
 *   - "build": QuestionCard 7; three rows, run, test, build, each over the
 *     graph. "build-why": run lights every model, then test turns stg_orders
 *     red after fct_orders is already built from it (red); build runs
 *     stg_orders, tests it, the test fails, and everything downstream greys
 *     out unbuilt (green for the stop). "build-ci": "dbt build: the CI
 *     command".
 *   - "subset": QuestionCard 8; the page's three selectors as a listing.
 *     "subset-alone": `--select fct_orders` lights fct_orders only, its
 *     parents dashed, "read as they stand", one of them empty, "not built
 *     yet" (red). "subset-plus": `+fct_orders` lights all four, in order;
 *     `fct_orders+` beside it lights fct_orders and the dashboard.
 *   - "env": QuestionCard 9; two targets as two short column blocks under a
 *     hairline, dev (schema dbt_alice) and prod (schema analytics), each with
 *     "database, schema, credentials". "env-profile" (voiced on its own after
 *     the independent review, 2026-11-20, which found the answer never said
 *     where targets live or what "environments" adds, the page's own
 *     distinction): both are targets in profiles.yml, picked with --target
 *     (the flag is dbt's, not the page's), and the dbt platform's name for
 *     the split is environments. "env-ref": `{{ ref('stg_orders') }}`
 *     compiling to `dbt_alice.stg_orders` under dev and
 *     `analytics.stg_orders` under prod (drawn from the page's two names, not
 *     compiled by dbt). "env-hard": `analytics.stg_orders` typed into Alice's
 *     model; her run's arrow reaches past her schema into prod's (red).
 *   - "schema": QuestionCard 10; `schema='staging'` in a config line, and
 *     `generate_schema_name` named. "schema-dev": "dbt_alice" + "staging" ->
 *     `dbt_alice_staging`, a second developer's `dbt_bob_staging` beside it.
 *     "schema-prod": under prod, the default `analytics_staging` struck
 *     through, and `staging` with "customized macro" under it. (Question 9's
 *     `dbt_alice.stg_orders` is a model with no custom schema; question 10
 *     adds one, which is why the schema name grows.)
 *   - "rapid-in": the RapidFire list, 11 to 19, one row each; the spots on
 *     their rows: the parcel on packages, the dashboard on exposures, the
 *     plug on dbt debug. "r-macros": the page's macro, and its two results
 *     from Postgres side by side, 19.99 (green) and 19 (red). "r-exposures":
 *     the graph's dashboard node, lit back along its two edges.
 *     "r-v2": the page's answer as key facts: the engine rewritten in Rust,
 *     generally available since September 2026, and on screen the name it
 *     first shipped under, the Fusion engine (read from the page by check.mjs;
 *     added after the review, on screen only, since "r-v2" was voiced on its
 *     own and a word changed there re-voices all of it); `dbt` the main distribution
 *     and `dbt Core` the Python 1.x line ending at 1.13; a misspelled column
 *     caught at compile time; `tests:` becoming `data_tests:`, the page's own
 *     first example of a 1.x deprecation a strict v2 refuses.
 *   - "next": the list complete; NextLine "Next: Incremental models".
 *
 * Facts (check.mjs into results.json, which data.ts reads; check.mjs reads
 * the page's graph, exposure, selectors, macro and the warehousing page's
 * block out of the pages at run time, and fails if a quoted sentence moves).
 * dbt does not run here: nothing is presented as dbt's output.
 *   - The graph: the page's mermaid slice, read from the page: 2 sources, 4
 *     models, 5 edges; the exposure adds 2 more. Worked out from those edges
 *     (arithmetic on the page's graph, and drawn as such): the build order
 *     is three steps, stg_orders and stg_customers together, then
 *     dim_customer, then fct_orders ("dag-order", "parallelize independent
 *     branches" is the page's); `+fct_orders` (the page's own selector) picks
 *     all 4 models; `stg_customers+` 3 models and the exposure; `fct_orders+`
 *     1 model and the exposure ("layers-cost"). The page's chart under the
 *     same answer, charts/dbt-blast-radius.mjs, draws a 120-model project
 *     whose counts are illustrative, so the video counts on the page's own
 *     slice instead and quotes none of them; its argument (staging changes
 *     rarely, marts weekly) is the chart's caption.
 *   - The materializations ("what-wrap", "mat-view", "mat-table"): the
 *     warehousing page's dim_customer SELECT over its customer_events (24
 *     events, 12 customers), created as a view and as a table on the site's
 *     Postgres (PGlite 0.5.16, PostgreSQL 18.6), read under EXPLAIN ANALYZE
 *     (costs, timings and buffers off): the view's plan is a HashAggregate,
 *     12 rows, over a Seq Scan on customer_events, 24 rows; the table's is a
 *     Seq Scan on dim_customer, 12 rows. After the video's own event for a
 *     13th customer: the view counts 13, the table 12; the table rebuilt
 *     counts 13. "cheap to build, slower reads", "recomputed fully each run",
 *     "inlined as a CTE ... not materialized or queryable": dbt.mdx; "Choose
 *     by read frequency, compute cost, and data volume, not habit": the
 *     warehousing page; "mat-pick" is dbt.mdx's first concept check.
 *   - "r-v2": dbt.mdx's "What is dbt v2" answer, quoted (check.mjs reads
 *     the engine's language, its general availability and the last dbt Core
 *     release out of the page, and fails if the sentences move): a rewrite
 *     in Rust, generally available since September 2026; "dbt" the main
 *     distribution, dbt Core the Python 1.x line, "still supported and ends
 *     at 1.13"; a misspelled column "caught at compile time"; every 1.x
 *     deprecation warning resolved first, "`data_tests:`" the page's first.
 *     The misspelled column on screen is the video's own example.
 *   - "r-macros": the page's cents_to_dollars, expanded as the page writes
 *     it, `(amount_cents / 100.0)`, on the video's own 1999 cents in
 *     Postgres: 19.99 (printed at two places); the same with `/ 100`: 19.
 *   - Quoted from the pages, not run: "the T in ELT", "it doesn't move data
 *     (that's EL tools)", the software practices; "Hardcoding table names
 *     breaks lineage and environment handling" (split between "ref-hard",
 *     lineage, and "env-hard", environments; `analytics.stg_orders` is the
 *     page's concept check's name); "Each call creates a directed edge";
 *     the three layers and "modular, testable, and DRY"; ephemeral's "the
 *     CTE is duplicated each time" and "test the intermediate result
 *     directly"; build's "runs the model, then immediately tests it before
 *     moving to downstream nodes" and "the preferred CI command" (that a
 *     failed test leaves its downstream models unbuilt is what that order
 *     means, and is how dbt build behaves); targets, dev and prod, and ref
 *     resolving per target; `dbt_alice_staging`, generate_schema_name, "In
 *     prod, the schema is the standard name", and "The default behavior uses
 *     the target.schema from the profile plus any model-level schema
 *     override" (so a prod schema with the plain name means the macro was
 *     customized, which "schema-prod" says); seeds, packages (dbt_utils,
 *     `dbt deps`, the pinned version), var() and --vars as JSON, exposures,
 *     docs generate and serve, dbt_project.yml and its cascade, versions
 *     (v1.5+, ref with a version), dbt debug and profiles.yml.
 *   - "subset-alone" (a model selected alone reads its parents as they stand
 *     in the target's schema) follows from the page's two statements that
 *     selection runs a subset and ref resolves to the active target's schema.
 *   - "hook-dbt" through "next": Part 4's "billion-row table" is the plan's
 *     bridge, a size for the argument, not a measurement.
 *
 * Reuse: none word for word. Data Engineer Part 6 (de-pipelines) answers
 * "What is dbt and where does it fit in an ELT pipeline?" in its quick round,
 * with no figure or number; this video's "what" agrees with it (select
 * statements, saved as a table or a view, ref for the order) in its own
 * words. No other video draws a dbt graph.
 *
 * Written for Drew's ear: dbt is read letter by letter (the plan's test take);
 * SQL ("sequel"), DAG ("dag"), YAML ("yammel") and JSON are said by the
 * lexicon; ELT, CTE, CI, CSV and ETL are letters, ELT, CTE and CI expanded
 * once where a beginner may not know them; "Jinja" is said as a word
 * (reported for the lexicon); file and macro names are said as words ("dbt
 * alice staging", "generate schema name", "packages dot YAML"); no sentence
 * opens with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "ae-dbt",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every night, a warehouse rebuilds its models: the cleaned staging tables, the joins, the facts and dimensions that dashboards read. Each one is built from others, so they have to run in the right order.",
      pauseAfter: 0.6,
    },
    { id: "hook-dbt", text: "Working out that order, and running it, is dbt's job.", pauseAfter: 0.7 },
    {
      id: "plan",
      text: "Twenty questions on how it builds a project: ten worked through on the page's own models, and ten quick ones to finish.",
      pauseAfter: 0.7,
    },

    // ── 1. What dbt does ──────────────────────────────────────────────────
    {
      id: "what",
      scene: true,
      text: "Question one. What is dbt, and what does it actually do? It's the T in ELT: extract, load, transform. You write each transformation as a select statement, called a model, and dbt builds the models in order, inside your warehouse.",
      pauseAfter: 0.6,
    },
    {
      id: "what-wrap",
      text: "It decides how each result is stored, by wrapping your select in a create view or a create table, and it runs your tests and writes your docs alongside.",
      pauseAfter: 0.7,
    },
    {
      id: "what-not",
      text: "It doesn't move data: loading raw tables is the job of extract and load tools. What it adds is software practice for SQL: version control, modular models, tests, and continuous integration, or CI.",
      pauseAfter: 0.8,
    },

    // ── 2, 3. ref, source and the DAG ─────────────────────────────────────
    {
      id: "ref",
      scene: true,
      text: "Question two. What do ref and source do? Source points at a raw table that something else loaded, declared once by name. Ref points at another model.",
      pauseAfter: 0.6,
    },
    {
      id: "ref-edges",
      text: "Here the staging model reads raw orders through source, and the orders fact reads the staging model through ref. Each call tells dbt that one thing depends on another.",
      pauseAfter: 0.7,
    },
    {
      id: "ref-hard",
      text: "Hardcode the table name instead, and dbt no longer sees that dependency. Nothing stops it building the fact before the model it reads, and the lineage graph has a gap where the edge was.",
      pauseAfter: 0.8,
    },
    {
      id: "dag",
      text: "Question three. What is the dbt lineage DAG, and how is it built? DAG is short for directed acyclic graph. dbt parses every ref and source call in the project, and each call becomes an edge, from the node it names to the model that names it.",
      pauseAfter: 0.6,
    },
    {
      id: "dag-order",
      text: "The page's slice has two sources, four models and five edges. Both staging models depend only on sources, so they build side by side. The customer dimension waits for its staging model, and the orders fact for both branches: four models in three steps.",
      pauseAfter: 0.8,
    },
    {
      id: "dag-acyclic",
      text: "Acyclic is what makes an order possible. If two models referenced each other, neither could go first.",
      pauseAfter: 0.8,
    },

    // ── 4. The layers ─────────────────────────────────────────────────────
    {
      id: "layers",
      scene: true,
      text: "Question four. How do staging, intermediate, and mart layers differ? Staging has one model per source table: renaming, typing and light cleaning, with no business logic. Intermediate holds reusable business logic: joins and reshaping. Marts are the finished facts and dimensions that dashboards read.",
      pauseAfter: 0.7,
    },
    { id: "layers-dry", text: "Each step stays small, testable, and written once.", pauseAfter: 0.6 },
    {
      id: "layers-cost",
      text: "The layers also decide what a change costs. Select a model with a plus after it, and dbt builds everything downstream. From the customers staging model, that's three of the four models, all the way to the revenue dashboard. From the orders fact, it's one.",
      pauseAfter: 0.7,
    },
    {
      id: "layers-rule",
      text: "So the business logic, which changes every week, sits downstream, in intermediate models and marts, where a change rebuilds less. Staging stays shaped like the source, which rarely changes.",
      pauseAfter: 0.8,
    },

    // ── 5, 6. Materializations, and ephemeral models ──────────────────────
    {
      id: "mat",
      scene: true,
      text: "Question five. Compare the materializations: view, table, incremental, ephemeral.",
      pauseAfter: 0.6,
    },
    {
      id: "mat-view",
      text: "Take the page's customer dimension: one row per customer, grouped from twenty-four events. As a view, only the query is stored, so every read regroups all twenty-four. It's cheap to build, slower to read, and always current: a new customer's event shows up at once.",
      pauseAfter: 0.7,
    },
    {
      id: "mat-table",
      text: "As a table, the result is computed once per run. A read is twelve stored rows, which is fast, but the table misses that new customer until the next run, and every run recomputes everything.",
      pauseAfter: 0.7,
    },
    {
      id: "mat-incr",
      text: "Incremental keeps the table, and processes only new or changed rows on each run, for large tables that mostly append.",
      pauseAfter: 0.6,
    },
    { id: "mat-eph", text: "And ephemeral isn't stored at all.", pauseAfter: 0.6 },
    {
      id: "mat-pick",
      text: "Choose by read frequency, compute cost and data volume, not habit. An expensive model that dashboards read all day, from a source that changes nightly, should be a table.",
      pauseAfter: 1.4,
    },
    {
      id: "eph",
      text: "Question six. What is an ephemeral model, and when should you use it? dbt compiles it as a CTE, a common table expression, inside every model that refs it. Nothing is created in the warehouse.",
      pauseAfter: 0.6,
    },
    {
      id: "eph-when",
      text: "Use one for intermediate logic referenced once or twice. Referenced by many models, the same CTE is copied into each. And since it isn't a table, you can't query it or test it on its own.",
      pauseAfter: 0.8,
    },

    // ── 7. run, test, build ───────────────────────────────────────────────
    {
      id: "build",
      scene: true,
      text: "Question seven. What is the difference between dbt run, dbt test, and dbt build? Run builds the models. Test runs the tests against models already built. Build does both, with seeds and snapshots too, in graph order: each model is tested as soon as it's built.",
      pauseAfter: 0.6,
    },
    {
      id: "build-why",
      text: "The order is the point. With run, then test, a broken staging model has already fed everything downstream before any test fails. Build tests a model before anything downstream of it is built, so a failure stops where it starts.",
      pauseAfter: 0.7,
    },
    { id: "build-ci", text: "That's why build is the command to run in CI.", pauseAfter: 0.8 },

    // ── 8. Selecting a subset ─────────────────────────────────────────────
    {
      id: "subset",
      scene: true,
      text: "Question eight. How do you run only a subset of models in dbt? With the select flag on dbt run, followed by a model's name, a folder like marts, or a tag like nightly.",
      pauseAfter: 0.6,
    },
    {
      id: "subset-alone",
      text: "A model selected alone is rebuilt alone. Its parents are read as they already stand in your schema, and in a fresh development schema, they may not exist yet.",
      pauseAfter: 0.7,
    },
    {
      id: "subset-plus",
      text: "A plus in front adds everything upstream: put one before the orders fact, and all four models build, in order. A plus after adds everything downstream, which is how question four counted a change.",
      pauseAfter: 0.8,
    },

    // ── 9, 10. Environments, targets and schemas ──────────────────────────
    {
      id: "env",
      scene: true,
      text: "Question nine. What are environments and targets in dbt? A target is a named warehouse connection: the database, the schema and the credentials. Teams usually have two environments: dev, where each developer builds into their own schema, and prod.",
      pauseAfter: 0.6,
    },
    {
      id: "env-profile",
      text: "Each is a target in your profile, picked with the target flag, and the hosted dbt platform sets up the same split as environments.",
      pauseAfter: 0.6,
    },
    {
      id: "env-ref",
      text: "Ref resolves to the active target's schema. The same reference to the staging model reads Alice's schema in development and the production schema in the nightly job, with no code change.",
      pauseAfter: 0.7,
    },
    {
      id: "env-hard",
      text: "That's the other half of hardcoding a name. Written as the production table, it makes Alice's development run read production, not the model she just changed.",
      pauseAfter: 0.8,
    },
    {
      id: "schema",
      text: "Question ten. How do you handle environment-specific schemas in dbt? With the schema config, and the macro that turns it into a name: generate schema name.",
      pauseAfter: 0.6,
    },
    {
      id: "schema-dev",
      text: "By default, dbt adds a model's custom schema to the target's own. Alice's staging models land in dbt alice staging, so two developers never overwrite each other.",
      pauseAfter: 0.7,
    },
    {
      id: "schema-prod",
      text: "Production usually wants the plain name, staging, so teams customize the macro to drop the prefix there.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Ten quick ones to finish.", pauseAfter: 0.6 },
    {
      id: "r-seeds",
      text: "Question eleven. What are seeds in dbt? CSV files kept in the repository and loaded as tables by dbt seed: small reference data with no source system, like country codes. Nothing large, and nothing that changes often.",
      pauseAfter: 0.8,
    },
    {
      id: "r-macros",
      text: "Question twelve. How do macros work in dbt? A macro is a reusable Jinja function that writes SQL: cents to dollars emits amount cents over a hundred point oh, wherever it's called. Written once, it's right everywhere. Typed by hand over a plain hundred, Postgres divides integers, and nineteen ninety-nine cents becomes nineteen dollars.",
      pauseAfter: 1.6,
    },
    {
      id: "r-packages",
      text: "Question thirteen. What are dbt packages, and how do you add one? Shared dbt projects of macros, models and tests. List one in packages dot YAML, pinned to a version, and run dbt deps. The most common is dbt utils.",
      pauseAfter: 0.8,
    },
    {
      id: "r-vars",
      text: "Question fourteen. How do you pass variables into dbt models? Read one with var in the model, give it a default in the project file, and override it on the command line as JSON.",
      pauseAfter: 0.8,
    },
    {
      id: "r-exposures",
      text: "Question fifteen. What are exposures in dbt? YAML entries for what reads your models: a dashboard, a machine learning model, a reverse ETL sync. They sit in the lineage graph, which is how question four's change reached the revenue dashboard.",
      pauseAfter: 0.8,
    },
    {
      id: "r-docs",
      text: "Question sixteen. How does dbt manage documentation and lineage? dbt docs generate builds a site from the descriptions in YAML and markdown doc blocks, and dbt docs serve opens it, with an interactive graph drawn from the same ref and source calls.",
      pauseAfter: 1.4,
    },
    {
      id: "r-project",
      text: "Question seventeen. What is the dbt project YAML file, and what does it control? The root configuration: the project's name, its folders, and default configs by folder, such as a materialization. A folder's setting overrides the project's, and a model's own config overrides both.",
      pauseAfter: 0.8,
    },
    {
      id: "r-version",
      text: "Question eighteen. How do you version a dbt model? Since dbt one point five, declare versions in YAML, each with its own SQL file. Consumers pin one with ref and a version number, so a breaking change rolls out without forcing everyone across at once.",
      pauseAfter: 1.4,
    },
    {
      id: "r-debug",
      text: "Question nineteen. What is dbt debug, and when do you use it? It checks your connection setup: that the profiles file is valid, and that dbt can reach the warehouse. Run it on a new environment, or on a connection error, before you debug any model.",
      pauseAfter: 0.8,
    },
    {
      id: "r-v2",
      text: "Question twenty. What is dbt v2, and how does it relate to dbt Core? It's the engine rewritten in Rust, generally available since September 2026: the main distribution is now just called dbt, and dbt Core names the Python one point x line, still supported, and ending at one point thirteen. It parses and type-checks your SQL, so a misspelled column is caught at compile time, and it validates YAML strictly, so every one point x deprecation warning has to be fixed first.",
      pauseAfter: 1.0,
    },

    // ── Bridge ────────────────────────────────────────────────────────────
    {
      id: "next",
      text: "A table materialization recomputes everything on every run. For a billion-row table, every night, that's the cost incremental models cut. Next: incremental models.",
    },
  ],
};
