import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Dimensions that change" (16:9), Part 2 of the Analytics
 * Engineer interview prep videos
 * (agent-outputs/20261120-1200-analytics-engineer-interview-video-plan.md,
 * "2, Dimensions that change"), after
 * content/interview/analytics-engineer/dimensional-modeling.mdx and one
 * question of dbt.mdx. It answers the nine questions the plan gives this
 * video, by the pages' headings: seven worked through, then two in a rapid
 * round, every one read aloud as "Question n." and the question (the
 * brief's rule for this series; the card keeps the page's spelling, so
 * `dbt snapshot` is set in code there).
 *
 *   1. What is SCD Type 1, and when should you use it? ("t1")
 *   2. What is SCD Type 2, and how is it implemented? ("t2")
 *   3. What is SCD Type 3, and what is its main limitation? ("t3")
 *   4. What is `dbt snapshot`, and what SCD type does it implement? ("snap",
 *      dbt.mdx)
 *   5. How do you handle late-arriving dimension records? ("late")
 *   6. How do you handle late-arriving facts? ("late-fact")
 *   7. How do you handle a slowly changing measure in a fact table?
 *      ("measure")
 *   Rapid ("rapid-in"): 8 What is SCD Type 0?; 9 What is a mini-dimension?
 *
 * Type 3 is worked through rather than quick: it has a mechanism (the value
 * shifts into a second column) and a trap (the second move erases the
 * first), and the Type 1, 2 and 3 answers read as one sequence on Acme's row.
 *
 * Opening: the plan's 1 to 2 join, "the star is drawn; then a customer moves
 * house", on the page's own customer 42, Acme Corp, East until June 2023 and
 * West after: one order placed in the East, and which region owns it now.
 * Written fresh: the Data Engineer video opens on its own page's customer 42,
 * a different move. Bridge: the plan's 2 to 3, "those models have to be built
 * in order, every day: that is dbt".
 *
 * On screen, beat by beat (QuestionCard for each deep dive, RapidFire for the
 * round; every table and listing is the da-sql kit; red the trap, green the
 * right answer, yellow what the narration points at):
 *   - "hook" to "plan": the hermit crab beside a two-stop line, East to West,
 *     "2023-06-15" on the move, and a moving-box spot on it; order 5001
 *     (2022-05-10, 1,200.00) under East, and a question mark between the two
 *     regions on "Today". "hook-both" writes "as it was: East" and "as it is:
 *     West" under a hairline, in neutral ink (neither is the right answer).
 *     "plan" sets "slowly changing dimension (SCD)" as one line.
 *   - "t1" to "t1-mix": Acme's single row, East struck and West written in
 *     its place; orders 5001 and 5002 both reading West. "t1-history": 2022
 *     revenue by region as paired bars, Type 2 (as it was) beside Type 1 (as
 *     it is now), every pair different, East's drop of 1,200.00 labelled in
 *     red, South appearing at 195.00. "t1-when": "a typo" and "only now
 *     matters" as two lines, then "merge on the natural key" in mono.
 *     "t1-mix": customer 42's two versions with the video's typo "Acme Crop"
 *     on both; the UPDATE on customer_id, "2 rows", and both names fixed
 *     while the region column (East, West) stays as it was.
 *   - "t2" to "t2-current": the page's dim_customer, customer 42's two rows
 *     with customer_sk, region, valid_from, valid_to and is_current; the
 *     seam 2023-06-14 / 2023-06-15 in yellow, then 9999-12-31 in yellow on
 *     "far in the future". "t2-join": the page's point-in-time listing, the
 *     BETWEEN line in yellow, and its rows for 5001 (East) and 5002 (West);
 *     "24 orders, one version each" under them, on screen only. "t2-load": the close UPDATE
 *     and the INSERT as two listings, "1 row" each, and "= the page's table"
 *     in green; "only rows whose tracked columns changed" as a note under
 *     them. "t2-trap": the same join with the BETWEEN line taken out
 *     (never struck: the line is right, its absence is the bug), the gap
 *     marked in red, and the counts 24 rows to 44 and 17,930.00 to 31,580.00
 *     in red, then the fix
 *     as one line, "fact stores customer_sk at load time", in green.
 *     "t2-current": the page's is_current read, 15 rows, one per customer;
 *     then the page's growth chart (Type 1 flat at 50,000, Type 2 rising to
 *     122,000 over 36 months) with its model, "if 4% change a month", under
 *     it; the narration gives the idea and leaves the modelled numbers to
 *     the chart.
 *   - "t3" to "t3-limit": Acme's Type 3 row, region West and prev_region East;
 *     "t3-use": two columns of the same revenue, "old regions" and "new
 *     regions", with no join drawn between them. "t3-limit": the second
 *     UPDATE, the row now North and West, East struck in red as it leaves.
 *   - "snap" to "snap-model": the page's snapshots/snap_customers.yml (the
 *     YAML form dbt has used since 1.9), with strategy: timestamp and
 *     updated_at: updated_at in yellow; beside it a
 *     drawn snapshot table, columns dbt_valid_from and dbt_valid_to, rows
 *     labelled by run ("run 1", "run 2"), no dates or times (dbt does not run
 *     here); a camera spot. "snap-strategy": the two strategies as two short
 *     columns with a hairline between. "snap-gap": a timeline of three source
 *     states (East, West, North) and two run ticks; West, under no tick, drawn
 *     dashed and grey, labelled "never recorded" (not struck: it was true).
 *     "snap-delete": the row deleted at the source after North, a third run
 *     tick, its box "North stays open" in grey, then hard_deletes: invalidate
 *     and "North closed at run 3" in green. "snap-keep": the source box
 *     holding only "now" (no row for 42 any more), the snapshot box holding
 *     every version it recorded. "snap-model": an arrow
 *     from the snapshot to dim_customer, the two timestamp columns becoming
 *     valid_from and valid_to.
 *   - "late" to "late-watch": the three staged orders (201, 202, 203) and the
 *     dimension (customers 42 and 99, and the unknown member, -1);
 *     "late-drop": the inner-join load, 203 missing, "700.00 of 1,110.00" in
 *     red. "late-fix": the left-join load listing, 203 on -1 with
 *     customer_id 77 kept, 1,110.00 in green; the region report with an
 *     "Unknown 410.00" row. "late-correct": customer 77 lands (1025, South),
 *     the correction UPDATE, "1 row", the report now "South 410.00"; then
 *     "or hold the facts back" as a second path in grey. "late-watch": a
 *     count, "rows on -1", as a small line chart rising, labelled "broken
 *     feed" (drawn, no values).
 *   - "late-fact" to "late-fact-snap": order 5001 drawn arriving on a
 *     timeline at "now", its order date back in 2022. Two lookups side by
 *     side: is_current gives 1002, West (red); the version valid on
 *     2022-05-10 gives 1001, East (green). "late-fact-load": two load
 *     windows over the timeline, one on order date that misses 5001 (red)
 *     and one on arrival that catches it (green), drawn, no values.
 *     "late-fact-snap": a row of
 *     monthly snapshot cells with May 2022's lit for rebuild, and one
 *     accumulating-snapshot row updated in place.
 *   - "measure" to "measure-restate": the ledger for order 7001: the original
 *     900.00 (2024-03-01); "measure-reverse" adds -900.00 and 800.00
 *     (2024-04-02), today's sum 800.00 in green. "measure-why": March's
 *     report rerun, 900.00, beside the overwritten copy's March, 800.00, in
 *     red. "measure-restate": two short lines, "version the fact" and "a
 *     restated column".
 *   - "rapid-in" to "r-mini": RapidFire, items 8 and 9: a "fixed" badge on
 *     a signup channel column beside a versioned region; the
 *     mini-dimension, 5 age bands by 4 income tiers, "20 rows", and the fact
 *     carrying both keys.
 *   - "next": the order the tables are built in, snapshot, dimensions,
 *     facts, as three outlined boxes joined left to right; NextLine.
 *
 * Facts. Every table, listing and number ran in Postgres (PGlite 0.5.16,
 * PostgreSQL 18.6, the engine of the page's <SqlCodeBlock dialect="postgres">
 * blocks), by check.mjs into results.json, which data.ts reads; check.mjs
 * stops if a number below stops coming back:
 *   - The page's SCD Type 2 block, its initSql verbatim: customer 42, Acme
 *     Corp, 1001 East 2020-01-01 to 2023-06-14 and 1002 West from
 *     2023-06-15 to 9999-12-31; order 5001 (2022-05-10, 1,200.00) and 5002
 *     (2024-02-20, 850.00). The page's join attributes 5001 to East and 5002
 *     to West, as its prose says; all 24 orders match exactly one version
 *     (24 rows, 24 distinct orders, no overlap or gap between versions); the
 *     page's is_current read returns 15 rows, one per customer; 8 of the 15
 *     customers have changed at least once.
 *   - "t1-history": a Type 1 dimension is the page's current rows (the
 *     video's own derivation). 2022 revenue by region, Type 2 against Type
 *     1: East 2,730.00 to 1,530.00 (exactly Acme's 1,200.00), North 1,445.00
 *     to 2,690.00, West 2,860.00 to 2,620.00, South none to 195.00; all four
 *     change. "t1-mix": the video's own typo on both of 42's versions; one
 *     UPDATE on customer_id fixes 2 rows, regions untouched.
 *   - "t2-load": the close UPDATE and the INSERT, with the page's dates and
 *     its key 1002, run on the page's table with the West row removed and
 *     East reopened: one row each, and the result equals the page's table
 *     (EXCEPT ALL both ways: 0).
 *   - "t2-trap": joined on customer_id alone, the 24 orders become 44 rows
 *     and 17,930.00 becomes 31,580.00 (1.76 times: "grows by three
 *     quarters").
 *   - "t2-current": the page's chart scd2-row-growth, computed from its
 *     stated model (50,000 customers, 4% changing a month, 36 months):
 *     122,000 rows, 2.44 times. A model the page draws, not a measurement, so
 *     it is on screen with its stated model and not said aloud.
 *   - "t3": the video's own Type 3 row in the page's columns (region,
 *     prev_region): West with East, then, after a second move of the video's
 *     own, North with West.
 *   - "snap": dbt.mdx's answer (Type 2, dbt_valid_from and dbt_valid_to,
 *     the timestamp and check strategies, files under snapshots/) and its
 *     snap_customers listing, the YAML block as the page prints it, read
 *     from dbt.mdx by check.mjs into results.json. "snap-delete" is the
 *     page's "A row deleted at the source is ignored by default; set
 *     `hard_deletes` to `invalidate` to close its last version" (added to
 *     the page 2026-11-20, #746), which check.mjs quotes and checks with the
 *     rest. Not run: dbt does not run here. "snap-gap",
 *     "snap-keep" and "snap-model" follow from the page's mechanism (it
 *     "checks a source table for changed rows on each run"), with no
 *     numbers.
 *   - "late": de-modeling-history's three staged orders, re-run on this
 *     page's rows for 42 and 99 and compared with that video's results.json:
 *     the inner join loads 700.00 of 1,110.00. The page's fix: an unknown
 *     member (-1) and a correction job; all 1,110.00 load, and once customer
 *     77 lands (key 1025, the next after the page's 1024; its name and
 *     region, South, the video's own) the UPDATE re-keys 1 row and none is
 *     left on -1. "Never drop the fact" and "hold the facts" are the page's.
 *   - "late-fact": order 5001 looked up two ways on the page's table: by
 *     is_current, 1002 West; valid on 2022-05-10, 1001 East. The snapshot
 *     line is the page's; "late-fact-load" follows from the page's "loaded
 *     at their correct event time" and is drawn, not run (Part 4 runs
 *     incremental filters).
 *   - "measure": the video's own order 7001, 900.00 posted 2024-03-01,
 *     corrected to 800.00 on 2024-04-02: today 800.00; March's report,
 *     rerun, 900.00; the same correction made in place, 800.00. The
 *     reversing row and the restatement line are the page's.
 *   - Rapid: "r-t0" quotes the page's examples (date of birth, original
 *     channel attribution). "r-mini": de-modeling-history's count, 5 x 4 =
 *     20, re-run and compared.
 *
 * Written for Drew's ear: SCD expanded once, in "plan"; dbt in lower case,
 * read letter by letter, glossed once in "snap" ("the tool that builds
 * these models"); ID in plain caps; SQL keywords and column names as
 * lower case words ("merge", "between", "is current", "updated at", "dbt
 * valid from"); numbers as they are said; years in digits; no sentence opens
 * "A" before an initialism.
 */
export const script: NarrationScript = {
  id: "ae-changing-dimensions",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "In May 2022, Acme Corp, customer forty-two, placed a twelve hundred dollar order from the East. The next summer, it moved West. Today, which region does that order belong to?",
      pauseAfter: 0.7,
    },
    {
      id: "hook-both",
      text: "Both answers can be right: the East, as it was, or the West, as it is. What the warehouse says depends on how the customer's row took the move.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "That row is a slowly changing dimension, or SCD. Nine questions on dimensions that change, and on data that arrives late: seven worked through, then two quick ones.",
      pauseAfter: 0.7,
    },

    // ── 1. Type 1 ─────────────────────────────────────────────────────────
    {
      id: "t1",
      scene: true,
      text: "Question one. What is SCD Type one, and when should you use it? Type one overwrites. Acme's region becomes West, there's still one row, and no trace of the East.",
      pauseAfter: 0.6,
    },
    {
      id: "t1-history",
      text: "So the past moves with it. The 2022 order now reports as West. Overwrite every customer that way, and every region's 2022 revenue changes. East loses twelve hundred dollars, in a report that already went out.",
      pauseAfter: 0.7,
    },
    {
      id: "t1-when",
      text: "Use it when the old value was never true, like a typo in a name, or when the business only ever asks about now. In practice it's a merge on the natural key: update the row if it's there, insert it if not.",
      pauseAfter: 0.7,
    },
    {
      id: "t1-mix",
      text: "And types are chosen per column. A dimension that versions the region can still treat the name as Type one, so a fixed misspelling is fixed on every version.",
      pauseAfter: 0.8,
    },

    // ── 2. Type 2 ─────────────────────────────────────────────────────────
    {
      id: "t2",
      scene: true,
      text: "Question two. What is SCD Type two, and how is it implemented? Add a row instead. Each version gets its own surrogate key, a valid from, a valid to, and an is current flag.",
      pauseAfter: 0.6,
    },
    {
      id: "t2-rows",
      text: "Acme's East row closes on June fourteenth, 2023. The West row opens the next day, valid until a date far in the future. That date, rather than a null, lets one between test cover every version, closed or current.",
      pauseAfter: 0.6,
    },
    {
      id: "t2-join",
      text: "Join each order to the version whose window holds its date, and the 2022 order lands in the East, the 2024 order in the West.",
      pauseAfter: 0.7,
    },
    {
      id: "t2-load",
      text: "Each change is two statements, run together: close the current row, its end date the day before the move, then insert the new version.",
      pauseAfter: 0.7,
    },
    {
      id: "t2-trap",
      text: "The trap is joining on the customer ID alone. Each order repeats once per version of its customer: twenty-four rows become forty-four, revenue grows by three quarters, and nothing errors. Store the surrogate key on the fact at load time, and that join needs no date at all.",
      pauseAfter: 0.7,
    },
    {
      id: "t2-current",
      text: "So every query has to say which version it means: is current for today, the window for a point in time. And the table grows with every change, for as long as the warehouse runs.",
      pauseAfter: 0.8,
    },

    // ── 3. Type 3 ─────────────────────────────────────────────────────────
    {
      id: "t3",
      scene: true,
      text: "Question three. What is SCD Type three, and what is its main limitation? It adds a column for the previous value. Acme's row now reads West, with a previous region of East.",
      pauseAfter: 0.6,
    },
    {
      id: "t3-use",
      text: "That suits one change everybody wants to compare across, like sales territories redrawn: report this year under the old regions and the new, with no history join.",
      pauseAfter: 0.6,
    },
    {
      id: "t3-limit",
      text: "The limit is one step. Move Acme again, to the North, and the previous region becomes West. The East is gone, and a third column would only push the problem back a step.",
      pauseAfter: 0.8,
    },

    // ── 4. dbt snapshot ───────────────────────────────────────────────────
    {
      id: "snap",
      scene: true,
      text: "Question four. What is dbt snapshot, and what SCD type does it implement? Type two. On each run of dbt, the tool that builds these models, a snapshot compares the source with what it recorded, and for every changed row it closes the old version and inserts a new one, stamped with dbt valid from and dbt valid to.",
      pauseAfter: 0.6,
    },
    {
      id: "snap-strategy",
      text: "The timestamp strategy trusts an updated at column. The check strategy compares the columns you list, for sources with no timestamp to trust.",
      pauseAfter: 0.6,
    },
    {
      id: "snap-gap",
      text: "Either way, it only sees what's there when it runs. Change a row twice between runs, and the middle value is never recorded.",
      pauseAfter: 0.6,
    },
    {
      id: "snap-delete",
      text: "A row deleted at the source is ignored by default; set hard deletes to invalidate, and the snapshot closes its last version.",
      pauseAfter: 0.6,
    },
    {
      id: "snap-keep",
      text: "And the source keeps only the present, so the snapshot is the only copy of that history. It can't be rebuilt from the source, so protect it like source data.",
      pauseAfter: 0.6,
    },
    {
      id: "snap-model",
      text: "Downstream, the dimension model reads the snapshot, and its two timestamps become each version's window.",
      pauseAfter: 0.8,
    },

    // ── 5. Late-arriving dimension records ────────────────────────────────
    {
      id: "late",
      scene: true,
      text: "Question five. How do you handle late-arriving dimension records? Here an order for customer seventy-seven lands before customer seventy-seven does.",
      pauseAfter: 0.6,
    },
    {
      id: "late-drop",
      text: "Look up its key with an inner join, and the order vanishes: seven hundred dollars loaded, out of eleven hundred ten, and no error.",
      pauseAfter: 0.7,
    },
    {
      id: "late-fix",
      text: "Never drop the fact; the sale happened. Load it against an unknown member, key minus one, and keep the customer's own ID on the row.",
      pauseAfter: 0.6,
    },
    {
      id: "late-correct",
      text: "When seventy-seven arrives, a correction job re-keys those rows, and the four hundred ten dollars moves from unknown to the South. The other way is to hold the facts back until the customer lands: totals arrive later, but never short.",
      pauseAfter: 0.6,
    },
    {
      id: "late-watch",
      text: "Either way, count the rows still waiting. A count that keeps growing means a feed is broken, not late.",
      pauseAfter: 0.8,
    },

    // ── 6. Late-arriving facts ────────────────────────────────────────────
    {
      id: "late-fact",
      scene: true,
      text: "Question six. How do you handle late-arriving facts? Load them at their own event time. Say Acme's 2022 order only reaches the warehouse today.",
      pauseAfter: 0.6,
    },
    {
      id: "late-fact-trap",
      text: "Look up the customer's current row, and the order gets ten oh two: the West, a region Acme hadn't moved to yet. Look up the version valid on the order date, and it gets ten oh one, the East.",
      pauseAfter: 0.7,
    },
    {
      id: "late-fact-load",
      text: "And make sure it's picked up at all. A load that only takes recent order dates skips it, so select new rows by when they arrived, not when they happened.",
      pauseAfter: 0.6,
    },
    {
      id: "late-fact-snap",
      text: "Then rebuild any periodic snapshot for the period the order lands in. An accumulating snapshot just updates its row in place.",
      pauseAfter: 0.8,
    },

    // ── 7. A slowly changing measure ──────────────────────────────────────
    {
      id: "measure",
      scene: true,
      text: "Question seven. How do you handle a slowly changing measure in a fact table? A measure is fixed when the event happens. This order was booked at nine hundred dollars in March. In April, it turns out it was eight hundred.",
      pauseAfter: 0.6,
    },
    {
      id: "measure-reverse",
      text: "Don't update it in place. Insert a reversing row, minus nine hundred, and the corrected eight hundred. Today's total is eight hundred.",
      pauseAfter: 0.6,
    },
    {
      id: "measure-why",
      text: "And March's report, run again, still says nine hundred, as it did when it was published. Overwrite the row instead, and last month's number changes under everyone who quoted it.",
      pauseAfter: 0.7,
    },
    {
      id: "measure-restate",
      text: "When the rules change, like revenue recognized a new way, version the fact, or keep the restated amount in a column of its own.",
      pauseAfter: 0.8,
    },

    // ── Rapid round ───────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Two quick ones to finish.", pauseAfter: 0.6 },
    {
      id: "r-t0",
      text: "Question eight. What is SCD Type zero? A value that never changes once written, like a date of birth, or the channel a customer first came through. Load it once, and ignore whatever later loads say, even when the same row versions its region as Type two.",
      pauseAfter: 0.8,
    },
    {
      id: "r-mini",
      text: "Question nine. What is a mini-dimension? Fast-changing attributes, like age band and income band, moved out of a big customer dimension into a small table of every combination, twenty rows here, with its own key on the fact. The customer dimension stops adding a version every time a band changes, and each order still records the bands that were true when it was placed.",
      pauseAfter: 1.2,
    },
    {
      id: "next",
      text: "Every table here is rebuilt each day, in order: the snapshot first, then the dimensions, then the facts that look them up. Running that order is dbt's job. Next: how dbt builds a project.",
    },
  ],
};
