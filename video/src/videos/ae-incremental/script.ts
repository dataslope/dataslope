import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Incremental models" (16:9), Part 4 of the Analytics Engineer
 * interview prep videos
 * (agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "4, Incremental models"), after content/interview/analytics-engineer/: five
 * of dbt.mdx's questions, five of data-warehousing.mdx's and one of
 * advanced-sql.mdx's, eleven headings in all, paired as the plan pairs them
 * into seven questions, every one worked through and numbered aloud. There is
 * no rapid round: the shortest heading, `{{ this }}`, is answered inside the
 * filter's scene, where its answer is drawn, as Data Engineer Part 2 answers
 * all of its questions deep.
 *
 *   1. dbt's "When do you use an incremental model, and what's the catch?"
 *      ("when"), with data-warehousing's "When do you choose incremental over
 *      a full table rebuild?", read aloud as the follow-up ("when-not").
 *   2. dbt's "How does an incremental model actually filter new rows?"
 *      ("filter"), with data-warehousing's "How does an incremental build
 *      filter to new rows?" and advanced-sql's "How do you select new rows
 *      since the last load (incremental filtering)?": one question in three
 *      wordings, so the card reads dbt's, and the answer runs the
 *      warehousing page's block and takes advanced-sql's `>=` fix.
 *   3. dbt's "What is the `{{ this }}` variable in dbt?" ("this"), read 'the
 *      "this" variable'; the card keeps the braces.
 *   4. dbt's "What is the `unique_key` config on an incremental model, and
 *      what does it control?" ("key"), read "unique key".
 *   5. data-warehousing's "What is an idempotent rebuild, and why does it
 *      matter?" ("idem").
 *   6. data-warehousing's "How does a `MERGE` support idempotent upserts?"
 *      ("merge"), read "a merge".
 *   7. dbt's "What is the difference between `dbt run --full-refresh` and a
 *      normal incremental run?" ("refresh"), read "dbt run with the full
 *      refresh flag", with data-warehousing's "Why are periodic full refreshes
 *      still needed with incremental models?", read aloud as the follow-up
 *      ("refresh-why").
 *
 * Opening: the cost Part 3's bridge names (rebuilding a large table every
 * night), on the model table the dbt page draws, written fresh so the video
 * stands alone. Close: the plan's bridge into Part 5, the SQL inside the
 * models.
 *
 * On screen, scene by scene (what phase 2 builds; red the trap, green the
 * right answer, yellow what the narration points at, blue data). Code is on
 * screen only as evidence: the model's guard, the filter, the merge; short.
 *   - "hook": the page's chart (charts/incremental-vs-full-refresh.mjs, its
 *     data from COST): rows processed per run against days, the full-rebuild
 *     line drawing itself up to "6,040,000" at day 730 beside a flat "8,000"
 *     marker for one day's arrivals; the snail (the hero) at the foot of the
 *     flat line. "plan": seven numbered squares. Two spots: the envelope
 *     beside event 26 on "filter-arrive" (it arrived late), the brass key
 *     beside the config on "key".
 *   - "when": QuestionCard 1. "when-flat": the incremental line draws itself
 *     flat along 8,000, and "755x" between the two lines at day 730.
 *     "when-catch": three short lines inking in under the chart, "find the
 *     new rows", "late and changed rows", "a tested recovery". "when-spikes":
 *     the incremental line's twelve spikes highlighted (yellow), "full
 *     refresh every 60 days". "when-not": the data-warehousing card as a
 *     second line; "small, or changes broadly: a plain table" (green).
 *   - "filter": QuestionCard 2; dbt.mdx's model (its config and its
 *     is_incremental() guard) on the left, and beside it the SQL it compiles
 *     to, the warehousing page's block, with "{{ source(...) }} -> raw_events"
 *     and "{{ this }} -> fct_events" as two small notes. "filter-run": two
 *     tables of event ids as strips of cells: raw_events 1 to 24, fct_events 1
 *     to 14; the watermark, a yellow rule at 2024-01-14; cells 15 to 24 slide
 *     across: "10 rows". The rule moves to 2024-01-24.
 *     "filter-arrive": three new cells land in raw_events: 25 (2024-01-24
 *     00:00, on the rule), 26 (2024-01-22 12:00, behind it), 27 (2024-01-25).
 *     "filter-strict": `>`: only 27 crosses; 25 and 26 marked red, "never
 *     loaded, no error". "filter-gte": `>=` plus dedup: 24 re-read (grey,
 *     skipped), 25 crosses (green); 26 still red. "filter-overlap": the rule
 *     widens back three days into a band; seven cells re-read (21 to 27), the
 *     three new ones cross (green), "27 of 27". "filter-width": the band
 *     stretches wider (more grey re-reads) and a cell further back stays
 *     outside it, red. "filter-seq": a second line, "or: a change sequence
 *     that only grows". "filter-micro" (added in phase 2, when dbt.mdx's
 *     answer gained it): the microbatch strategy in a line, and its config
 *     keys, the step past the question.
 *   - "this": QuestionCard 3, under the same strips; `{{ this }}` in the
 *     listing ringed, an arrow to fct_events; the watermark at the table's
 *     own maximum. "this-ref" (added in review): "not ref(...): a model
 *     can't depend on itself" under the note. "this-first": fct_events
 *     emptied (dashed outline, "not there yet"); is_incremental() -> false;
 *     the guard's lines grey out; all of raw_events crosses.
 *   - "key": QuestionCard 4. "key-append": the overlap's seven re-read rows
 *     appended: fct_events grows to "31 rows for 27 events", the four
 *     doubles (21 to 24) red; the retry: "38". "key-merge": `unique_key=
 *     'event_id'` highlighted in the config; the same seven merged: 4
 *     matched (updated), 3 inserted, "27", retry "27"; then "delete, then
 *     insert" as a second line on its last sentence: "27", retry "27".
 *     "key-dup": the same merge from the page's table (events 1 to 24), with
 *     raw_events holding 27 twice: it inserts both (a red pair in fct_events,
 *     no error). "key-dup-fail": the next run's merge and Postgres's own error,
 *     "ERROR: MERGE command cannot affect row a second time". "key-test":
 *     "unique" on event_id, the test's query returning the one duplicate.
 *   - "idem": QuestionCard 5. "idem-blind": the page's customer_events (24
 *     events) into dim_customer by INSERT, run twice: "12" then "24" (red).
 *     "idem-rebuild": the page's block (BEGIN, DROP, CREATE ... AS SELECT,
 *     COMMIT) with its transaction highlighted; run twice, two 12-row
 *     results side by side with one fingerprint: "identical". "idem-fail":
 *     a run whose CREATE fails after its DROP, Postgres's error, ROLLBACK;
 *     dim_customer still there, 12 rows (green). "idem-two": two lines,
 *     "rebuild from source: small tables" and "merge on a key: large ones",
 *     the second leading into question 6's card.
 *   - "merge": QuestionCard 6; the page's MERGE listing, ON highlighted.
 *     "merge-run": dim_customer (Ada, Ben, Cy) and staged_customers
 *     (Benedict for 2, Dee new); after the first merge, Ben -> Benedict
 *     (matched, update) and Dee added (insert): 4 rows. "merge-rerun": the
 *     same batch again: both matched, nothing inserted, the same 4 rows; to
 *     the right, a blind insert of the batch twice: 7 rows, customer 2 three
 *     times, Dee twice (red). "merge-dbt": "merge-style strategy +
 *     unique_key" and "strategy depends on the adapter". "merge-delete"
 *     (reworded in review: a MERGE can delete, this one never sees the
 *     delete): "Cy, deleted at the source: not in the batch" under the
 *     batch; the target keeps it. "merge-delete-flag": deletes sent as
 *     flagged rows, or a full refresh.
 *   - "refresh": QuestionCard 7; two lines, "normal run: filter, merge in"
 *     and "--full-refresh: guard skipped, drop, rebuild from every row".
 *     "refresh-why": the data-warehousing card as a second line; the strict
 *     run's fct_events from question 2 (25 rows), event 3 struck from
 *     raw_events; the normal run finds nothing; three cells marked: 25 and 26
 *     missing, 3 extra (red). "refresh-fix": the full refresh: 26 rows, both
 *     EXCEPTs empty (green). "refresh-cost": the hook's chart again, the last
 *     spike highlighted, "5,960,000 rows at day 720", and a two-bar split of
 *     the incremental model's two-year total: refreshes 87%, daily runs 13%.
 *     "refresh-rule": the takeaway line, "incremental: an optimization over a
 *     correct full rebuild".
 *   - "next": NextLine "Next: Advanced SQL".
 *
 * Facts. dbt does not run here: the model and its config are shown as
 * dbt.mdx writes them, and what runs is the SQL they stand for, which the
 * warehousing page writes out as its block (`{{ this }}` is fct_events). Every
 * table, count and error ran on the site's Postgres (PGlite 0.5.16, PostgreSQL
 * 18.6) by check.mjs into results.json, which data.ts reads; check.mjs reads
 * the pages' blocks out of the pages at run time and fails if a quoted
 * sentence moves.
 *   - "hook", "when-flat", "when-spikes", "refresh-cost": the dbt page's
 *     chart, charts/incremental-vs-full-refresh.mjs (a model, and said as
 *     one: "a table that gains eight thousand rows a day"): 200,000 rows on
 *     day 0, 8,000 a day; a full rebuild at day 730 reprocesses 6,040,000
 *     rows, 755 times one day ("seven hundred fifty-five"); a refresh every 60
 *     days, the last at day 720, 5,960,000 rows ("almost six million").
 *     Summed over the 730 runs: the incremental model processes 45,584,000
 *     rows, of which its twelve refreshes are 39,840,000, 87%. Reused: Data
 *     Engineer Part 10 (de-orchestration, "bf-cost") gives the same 6,040,000
 *     and 755 from the same chart; check.mjs fails if they part. Not reused:
 *     Data Engineer Part 6's idempotency figure (de-pipelines, its own page's
 *     events: a blind insert 8 then 16, delete-then-insert 8 and 8, a failed
 *     insert rolled back to 8). Question 5 here runs this track's own page
 *     block instead (12 then 24, identical rebuilds, rolled back to 12), which
 *     agrees with it in every step.
 *   - "when", "when-catch", "when-not": dbt.mdx ("large and mostly appends",
 *     "a reliable way to identify new rows", "late-arriving/updated rows",
 *     "a tested recovery procedure") and data-warehousing ("large and mostly
 *     append-only (events, logs, page views)", "If a table is small or changes
 *     broadly every run, a plain table is simpler and safer").
 *   - "filter-run": the warehousing page's block as it runs: fct_events holds
 *     14 events, through 2024-01-14; raw_events 24; the filter returns events
 *     15 to 24, ten rows; the new watermark is 2024-01-24.
 *   - "filter-arrive" to "filter-overlap", the video's own three arrivals
 *     after that run (25 at 2024-01-24 00:00:00, 26 at 2024-01-22 12:00:00,
 *     27 at 2024-01-25): `>` returns 27 only; `>=` returns 24, 25 and 27,
 *     and with the loaded ones skipped, 25 and 27; a three-day overlap
 *     (the video's own width) re-reads 21 to 27, seven rows, of which 25, 26
 *     and 27 are new. Written each way and run: `>` appended leaves 25 of 27
 *     (25 and 26 missing), `>=` merged 26 of 27 (26 missing), the overlap
 *     merged 27 of 27. The fixes are the pages': advanced-sql's ">= plus
 *     deduplication if events can share the boundary timestamp", dbt.mdx's
 *     "re-read an overlap window and merge on a stable key"; "filter-seq" is
 *     the page's other way, "consume a source change sequence that is
 *     reliably monotonic". "filter-micro": dbt.mdx's microbatch paragraph
 *     ("the **microbatch** strategy (dbt 1.9 and later)", "one independent,
 *     idempotent batch per period", "re-processes `lookback` batches to
 *     catch late rows", a backfill run "with `--event-time-start` and
 *     `--event-time-end`"); the day is the page's own example batch_size.
 *   - "this", "this-first": dbt.mdx, "`{{ this }}` refers to the current
 *     model's table", and is_incremental() "returns true when the target
 *     relation exists, the model is configured as incremental, and the run is
 *     not a full refresh". "this-ref": a model that refs itself is a cycle
 *     dbt refuses to compile (dbt's own rule, not the page's).
 *   - "key": dbt.mdx's unique_key answer. Run: the overlap appended, 31 rows
 *     for 27 events (21 to 24 twice), 38 after a retry; merged on event_id, 27
 *     and 27; delete-then-insert on event_id, 27 and 27. "key-dup": the
 *     video's own second copy of event 27 in raw_events; the merge inserts
 *     both (28 rows, 27 distinct), with no error; the next merge fails,
 *     "ERROR: MERGE command cannot affect row a second time", as it does when
 *     27 was in the table once. The page: "It does not validate that the key
 *     is unique, so duplicate source keys can fail a warehouse MERGE or
 *     produce unexpected results. Add an explicit uniqueness test." Which
 *     statement a strategy runs is the page's "depend on the adapter and
 *     configured incremental_strategy"; the video names merge and
 *     delete-then-insert as "updates or replaces" (the page's words), and no
 *     adapter's default.
 *   - "idem": the warehousing page's block, run as written (split one
 *     statement to a step): 24 events, 12 customers; rebuilt twice, the two
 *     results have one md5 fingerprint. The same SELECT inserted blindly:
 *     12 rows, then 24. The rebuild with its CREATE failing after the DROP
 *     ("ERROR: relation "customer_events_missing" does not exist"), rolled
 *     back: dim_customer is back, the same fingerprint. "Postgres has no
 *     create or replace table" and the transactional DDL: the page.
 *   - "merge": the page's MERGE, run as written, on the video's own rows
 *     (Ada, Ben and Cy; staged, customer 2 as Benedict and Dee as 4): each
 *     run touches 2 rows; after the first and the second, the same 4 rows.
 *     The same batch inserted blindly, twice: 7 rows. "a merge-style
 *     strategy": dbt.mdx; data-warehousing's "This is how dbt handles
 *     incremental models with a unique_key" is narrower than dbt.mdx's
 *     answer, and the video follows dbt.mdx (reported). "merge-delete-flag":
 *     MERGE's own DELETE action (SQL standard; Postgres 15 and later,
 *     Snowflake, BigQuery) acts on deletes the source sends as rows; the
 *     page's answer, a full refresh, is the fallback.
 *   - "merge-delete", "refresh-why", "refresh-fix": the strict run from
 *     question 2 (25 rows), then event 3 deleted from raw_events (26 rows):
 *     a normal run returns nothing; 25 and 26 are missing and 3 is extra;
 *     the full refresh (the guard skipped: every source row) leaves 26 rows,
 *     and both EXCEPTs are empty. "hard deletes", "schema changes": the
 *     warehousing page; "drops and rebuilds the table from scratch, ignoring
 *     is_incremental() entirely": dbt.mdx.
 *   - "refresh-rule": data-warehousing's "Treat incremental as an
 *     optimization over a correct full rebuild", and dbt.mdx's "scheduling
 *     one is not a substitute for correct incremental logic and may be
 *     impractical for the largest models".
 *
 * Written for Drew's ear: SQL is said "sequel" by the lexicon; dbt is read
 * letter by letter (a test take, 2026-11-20); MERGE, INSERT and the
 * comparison operators are said as words ("a merge", "a blind insert",
 * "greater-than"); `{{ this }}` is 'the "this" variable' (worth a listen in
 * the first take); is_incremental() is
 * "the incremental check"; numbers as they are said; no sentence opens with
 * "A" before an initialism.
 */
export const script: NarrationScript = {
  id: "ae-incremental",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Take a table that gains eight thousand rows a day. Rebuild all of it every night, and two years in, each run reprocesses over six million rows to add eight thousand.",
      pauseAfter: 0.7,
    },
    { id: "hook-snail", text: "An incremental model processes only the new ones.", pauseAfter: 0.6 },
    {
      id: "plan",
      text: "Seven questions on how it does that and where it goes wrong: which rows count as new, what makes a rerun safe, and why the full rebuild never quite goes away.",
      pauseAfter: 0.7,
    },

    // ── 1. When, and the catch ────────────────────────────────────────────
    {
      id: "when",
      scene: true,
      text: "Question one. When do you use an incremental model, and what's the catch? When a table is large and mostly appends, like events, logs or page views, so a full rebuild is too slow or too expensive.",
      pauseAfter: 0.6,
    },
    {
      id: "when-flat",
      text: "An incremental run processes one day's arrivals, so its cost stays flat while the rebuild's climbs. By day seven hundred thirty, the rebuild does seven hundred fifty-five times the work.",
      pauseAfter: 0.8,
    },
    {
      id: "when-catch",
      text: "The catch is what that shortcut assumes: a reliable way to find the new rows, correct handling of rows that arrive late or change, and a tested way to recover when the table drifts.",
      pauseAfter: 0.6,
    },
    {
      id: "when-spikes",
      text: "Recovery means a full rebuild, and its cost grows too. Each spike here is a scheduled full refresh, every sixty days.",
      pauseAfter: 0.7,
    },
    {
      id: "when-not",
      text: "So when do you choose incremental over a full table rebuild? Only when the table is big and append-mostly. If it's small, or changes broadly every run, a plain table is simpler and safer.",
      pauseAfter: 0.8,
    },

    // ── 2, 3. The filter, and this ────────────────────────────────────────
    {
      id: "filter",
      scene: true,
      text: "Question two. How does an incremental model actually filter new rows? With a watermark: the latest timestamp already loaded. On an incremental run, a guard adds one condition to the model: only source rows newer than the maximum in the model's own table.",
      pauseAfter: 0.6,
    },
    {
      id: "filter-run",
      text: "On the page's tables, the model holds events through January fourteenth, and the source has twenty-four. The filter loads the ten after the watermark.",
      pauseAfter: 0.8,
    },
    {
      id: "filter-arrive",
      text: "Then three more land. Event twenty-five has the same timestamp as the new watermark. Twenty-six happened on the twenty-second and arrived late. Twenty-seven is simply new.",
      pauseAfter: 0.6,
    },
    {
      id: "filter-strict",
      text: "A strict greater-than finds only twenty-seven. The other two are never loaded, and nothing errors.",
      pauseAfter: 0.8,
    },
    {
      id: "filter-gte",
      text: "Greater-than-or-equal, plus deduplication, catches the tie: twenty-five comes in, and twenty-four, read again, is skipped. But twenty-six is older than the watermark, so it's still missed.",
      pauseAfter: 0.7,
    },
    {
      id: "filter-overlap",
      text: "So production models re-read an overlap window, here the last three days, and merge on a stable key. The window reads seven rows, and all three new ones land.",
      pauseAfter: 0.7,
    },
    {
      id: "filter-width",
      text: "Make the window as wide as your data arrives late. A wider one re-reads more on every run, and an event later than the window still slips past.",
      pauseAfter: 1.0,
    },
    {
      id: "filter-seq",
      text: "The other way out is a change sequence the source guarantees only ever grows, so nothing can land behind the watermark.",
      pauseAfter: 0.7,
    },
    {
      id: "filter-micro",
      text: "Since dbt one point nine, the microbatch strategy takes the filter out of your hands: set an event time and a batch size, and dbt builds one idempotent batch per day, re-processes lookback batches for late rows, and backfills any date range.",
      pauseAfter: 0.8,
    },
    {
      id: "this",
      text: "Question three. What is the \"this\" variable in dbt? It's the model's own table in the warehouse, the one the filter takes its maximum from.",
      pauseAfter: 0.6,
    },
    { id: "this-ref", text: "It isn't a ref, because a model can't depend on itself.", pauseAfter: 0.6 },
    {
      id: "this-first",
      text: "On the very first run that table doesn't exist yet, so the incremental check returns false, the guard is skipped, and the model loads everything.",
      pauseAfter: 0.8,
    },

    // ── 4. unique_key ─────────────────────────────────────────────────────
    {
      id: "key",
      scene: true,
      text: "Question four. What is the unique key config on an incremental model, and what does it control? It tells a strategy that updates or replaces rows how to match an incoming row to the one already in the table.",
      pauseAfter: 0.6,
    },
    {
      id: "key-append",
      text: "Without it, rows are appended. The overlap window read seven events, four of them already loaded, so the table now holds thirty-one rows for twenty-seven events. Retry the run, and it's thirty-eight.",
      pauseAfter: 0.7,
    },
    {
      id: "key-merge",
      text: "Set the unique key to the event ID, and a merge updates the four it already has and inserts the three it doesn't: twenty-seven rows, and twenty-seven again on a retry. Delete, then insert, on the same key, gets there too.",
      pauseAfter: 0.8,
    },
    {
      id: "key-dup",
      text: "But the key isn't checked. Had the source sent event twenty-seven twice, the same merge would insert both copies, without an error.",
      pauseAfter: 0.6,
    },
    {
      id: "key-dup-fail",
      text: "On the next run, Postgres refuses the merge outright: one row can't be updated twice.",
      pauseAfter: 0.7,
    },
    { id: "key-test", text: "So put a uniqueness test on the key.", pauseAfter: 0.8 },

    // ── 5. Idempotent rebuilds ────────────────────────────────────────────
    {
      id: "idem",
      scene: true,
      text: "Question five. What is an idempotent rebuild, and why does it matter? Idempotent means running the build again produces the same result. It matters because pipelines retry: a job that crashes after writing will run again.",
      pauseAfter: 0.6,
    },
    {
      id: "idem-blind",
      text: "Load the page's customer dimension with a blind insert, and a retry doubles it: twelve customers become twenty-four rows.",
      pauseAfter: 1.6,
    },
    {
      id: "idem-rebuild",
      text: "Rebuild it from the source instead. Postgres has no create or replace table, so the page drops and recreates it inside one transaction. Run it twice, and the twelve rows are identical.",
      pauseAfter: 0.7,
    },
    {
      id: "idem-fail",
      text: "And if a rebuild fails after the drop, the transaction rolls back, and the old table is still there, all twelve rows.",
      pauseAfter: 0.7,
    },
    {
      id: "idem-two",
      text: "Those are the two routes. Rebuild from the source while the table is small enough, and once it isn't, merge on a key.",
      pauseAfter: 0.8,
    },

    // ── 6. MERGE ──────────────────────────────────────────────────────────
    {
      id: "merge",
      scene: true,
      text: "Question six. How does a merge support idempotent upserts? It matches each staged row to the target on a key. A match updates, and no match inserts.",
      pauseAfter: 0.6,
    },
    {
      id: "merge-run",
      text: "Here Ben has a new name, and Dee is new. The first merge updates Ben and inserts Dee: four customers.",
      pauseAfter: 0.6,
    },
    {
      id: "merge-rerun",
      text: "Run the same batch again, and it matches both, writes the values they already hold, and inserts nothing: still four. A blind insert of that batch into the original three, twice, leaves seven rows.",
      pauseAfter: 0.8,
    },
    {
      id: "merge-dbt",
      text: "It's the statement a merge-style incremental strategy runs, keyed on the unique key, though which strategy you get depends on the adapter and on your config.",
      pauseAfter: 0.6,
    },
    { id: "merge-delete", text: "What this merge never sees is a delete.", pauseAfter: 0.6 },
    {
      id: "merge-delete-batch",
      text: "A row removed from the source never reaches the batch, so the target keeps it.",
      pauseAfter: 0.7,
    },
    {
      id: "merge-delete-flag",
      text: "To catch one, the source has to send each delete as a row, flagged, for the merge to act on. Otherwise, it takes a full refresh.",
      pauseAfter: 0.8,
    },

    // ── 7. Full refresh ───────────────────────────────────────────────────
    {
      id: "refresh",
      scene: true,
      text: "Question seven. What is the difference between dbt run with the full refresh flag, and a normal incremental run? A normal run filters to new rows and merges them in. A full refresh ignores the incremental check, and rebuilds the table from every source row.",
      pauseAfter: 0.6,
    },
    {
      id: "refresh-why",
      text: "So why are periodic full refreshes still needed? Because incremental logic only sees what passes its filter.",
      pauseAfter: 0.6,
    },
    {
      id: "refresh-drift",
      text: "Take the strict filter's table from question two, and delete event three upstream. The next normal run finds nothing, and the table is wrong in three rows: two events missing, and one that no longer exists.",
      pauseAfter: 0.7,
    },
    {
      id: "refresh-fix",
      text: "A full refresh reads all twenty-six and matches the source exactly. It's also how a schema change gets applied.",
      pauseAfter: 0.7,
    },
    {
      id: "refresh-cost",
      text: "But it's the expensive run. On the chart's table, the last refresh reprocesses almost six million rows, and over two years, the twelve refreshes are eighty-seven percent of everything the incremental model processed.",
      pauseAfter: 0.7,
    },
    {
      id: "refresh-rule",
      text: "So treat incremental as an optimization over a correct full rebuild. And don't let a refresh schedule stand in for a correct filter: for the largest models, a full refresh may not be practical at all.",
      pauseAfter: 0.8,
    },

    // ── Bridge ────────────────────────────────────────────────────────────
    {
      id: "next",
      text: "Every fix here came down to a query: a filter, a deduplication, a merge on a key. Next: advanced SQL, the queries inside the models.",
    },
  ],
};
