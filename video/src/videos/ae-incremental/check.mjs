// Runs every statement the ae-incremental video shows or quotes, on the site's
// Postgres engine (PGlite, PostgreSQL 18, through video/scripts/lib/pg-figure.mjs,
// the engine content/interview/analytics-engineer/data-warehousing.mdx's
// <SqlCodeBlock dialect="postgres"> blocks run in the reader's browser), and
// writes what came back to results.json, which data.ts reads. From the repo
// root:
//
//   node video/src/videos/ae-incremental/check.mjs
//
// dbt does not run here. An incremental model's SQL is shown the way dbt.mdx
// writes it, and what runs is the SQL it compiles to, which the warehousing
// page writes out as its runnable block: `{{ source('raw', 'events') }}` is
// raw_events, `{{ this }}` is fct_events. Each strategy (append, merge on a
// key, delete then insert, full refresh) is written as the plain statement it
// stands for, and the video says so; no output is presented as dbt's.
//
// Data:
//   - "filter", "late", "key", "refresh": the warehousing page's own two
//     tables, read out of its "How does an incremental build filter to new
//     rows?" block at run time (fct_events, 14 events loaded through January
//     14; raw_events, 24 events), so the video and the page start from the same
//     rows. What arrives after the page's run (events 25 to 27, a duplicate of
//     27, the delete of event 3) is the video's own, and script.ts says so.
//   - "rebuild": the page's "What is an idempotent rebuild" block, its
//     customer_events (24 events, 12 customers) and its rebuild statements,
//     split one statement to a step.
//   - "merge": the page's MERGE, as written, on the video's own four
//     customers and two staged changes (the page gives the statement, not the
//     rows).
//   - "cost": the full-rebuild model the dbt page draws
//     (charts/incremental-vs-full-refresh.mjs), copied and checked against the
//     caption the spec exports, as de-orchestration's check.mjs checks it, and
//     against de-orchestration's results.json, so the two series give one
//     answer to the same question.
//
// The script fails if a page stops saying what the narration quotes.
/* global console */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { figure } from "../../../scripts/lib/pg-figure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const page = (name) => readFileSync(join(root, "content/interview/analytics-engineer", `${name}.mdx`), "utf8");

const check = (ok, what) => {
  if (!ok) throw new Error(`ae-incremental check failed: ${what}`);
};

/** The section of a page under one `### ` heading, up to the next. */
function section(name, heading) {
  const text = page(name);
  const at = text.indexOf(`### ${heading}`);
  check(at >= 0, `${name}.mdx has no heading "${heading}"`);
  const next = text.indexOf("\n### ", at + 4);
  return text.slice(at, next < 0 ? undefined : next);
}

/** A template-literal prop (initSql={`...`}) inside a section, verbatim. */
function prop(sectionText, name) {
  const open = sectionText.indexOf(`${name}={\``);
  check(open >= 0, `no ${name} in the section`);
  const start = open + name.length + 3;
  const end = sectionText.indexOf("`}", start);
  return sectionText.slice(start, end);
}

/** A fenced block of the given language inside a section, verbatim. */
function fence(sectionText, lang) {
  const m = sectionText.match(new RegExp("```" + lang + "\\n([\\s\\S]*?)```"));
  check(m, `no ${lang} fence in the section`);
  return m[1].trimEnd();
}

/** Strips leading `--` comment lines, which the harness's one-statement steps
 *  do not need (the page's starter opens with one). */
const bare = (sql) =>
  sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .trim()
    .replace(/;$/, "");

// ── The pages' own SQL ──────────────────────────────────────────────────────

const FILTER = section("data-warehousing", "How does an incremental build filter to new rows?");
const PAGE_TABLES = prop(FILTER, "initSql");
const PAGE_WATERMARK = bare(prop(FILTER, "starterCode"));
check(PAGE_WATERMARK.includes("WHERE event_at > (SELECT MAX(event_at) FROM fct_events)"), "the page's watermark filter");

const REBUILD = section("data-warehousing", "What is an idempotent rebuild, and why does it matter?");
const EVENTS_LOG = prop(REBUILD, "initSql");
const REBUILD_BLOCK = prop(REBUILD, "starterCode");
// The page's block, one statement to a step: BEGIN, DROP, CREATE, COMMIT.
const REBUILD_STEPS = REBUILD_BLOCK.split(/;\s*\n/)
  .map((s) => bare(s))
  .filter(Boolean);
check(REBUILD_STEPS.length === 5, "the rebuild block is BEGIN, DROP, CREATE, COMMIT, SELECT");
const [BEGIN, DROP, CREATE, COMMIT, SHOW_DIM] = REBUILD_STEPS;
check(BEGIN === "BEGIN" && DROP.startsWith("DROP TABLE IF EXISTS dim_customer") && COMMIT === "COMMIT", "the rebuild block's transaction");

const MERGE_SECTION = section("data-warehousing", "How does a `MERGE` support idempotent upserts?");
const PAGE_MERGE = bare(fence(MERGE_SECTION, "sql"));
check(PAGE_MERGE.startsWith("MERGE INTO dim_customer t"), "the page's MERGE");

// The dbt page's model, shown on screen beside the SQL it compiles to.
const DBT_FILTER = section("dbt", "How does an incremental model actually filter new rows?");
const DBT_MODEL = fence(DBT_FILTER, "sql");
check(DBT_MODEL.includes("WHERE event_at > (SELECT MAX(event_at) FROM {{ this }})"), "dbt.mdx's incremental model");
check(DBT_MODEL.includes("unique_key='event_id'"), "dbt.mdx's unique_key");

// Sentences the narration leans on, so the script fails if a page moves on.
const quoted = [
  ["data-warehousing", "large and mostly append-only"],
  ["data-warehousing", "If a table is small\nor changes broadly every run, a plain `table` is simpler and safer."],
  ["data-warehousing", "can miss **hard deletes**"],
  ["data-warehousing", "Postgres has no\n`CREATE OR REPLACE TABLE`, but its DDL is transactional"],
  ["advanced-sql", "Use `>=` plus deduplication\nif events can share the boundary timestamp"],
  ["dbt", "re-read an overlap window\nand merge on a stable key"],
  ["dbt", "consume a source change sequence that is reliably\nmonotonic"],
  ["dbt", "equal timestamps, late events, and corrections to older\nrecords can be missed"],
  ["dbt", "It does not validate that\nthe key is unique, so duplicate source keys can fail a warehouse `MERGE` or\nproduce unexpected results."],
  ["dbt", "the target relation exists"],
  ["dbt", "may be impractical for the largest models"],
  ["dbt", "`--full-refresh` drops and rebuilds the table from scratch, ignoring `is_incremental()` entirely"],
];
for (const [name, text] of quoted) check(page(name).includes(text), `${name}.mdx no longer says ${JSON.stringify(text.slice(0, 50))}`);

// ── The video's own arrivals, after the page's run ──────────────────────────

/** The run the page's block describes: load what passed the watermark. */
const APPEND_PAGE_RUN = `INSERT INTO fct_events\n${PAGE_WATERMARK}`;
const RUN_PAGE = APPEND_PAGE_RUN.replace(/\nORDER BY event_id$/, "");

/** Three events land after that run: 25 shares the watermark's own
 *  timestamp, 26 happened two days earlier and arrived late, 27 is new. */
const ARRIVALS = `INSERT INTO raw_events VALUES
  (25, TIMESTAMP '2024-01-24 00:00:00'),
  (26, TIMESTAMP '2024-01-22 12:00:00'),
  (27, TIMESTAMP '2024-01-25 00:00:00')`;

const STRICT = "SELECT event_id, event_at\nFROM raw_events\nWHERE event_at > (SELECT MAX(event_at) FROM fct_events)\nORDER BY event_id";
const AT_LEAST = "SELECT event_id, event_at\nFROM raw_events\nWHERE event_at >= (SELECT MAX(event_at) FROM fct_events)\nORDER BY event_id";
/** `>=` plus deduplication: the boundary re-read, minus what is loaded. */
const AT_LEAST_NEW = `SELECT event_id, event_at
FROM raw_events r
WHERE event_at >= (SELECT MAX(event_at) FROM fct_events)
  AND NOT EXISTS (SELECT 1 FROM fct_events f WHERE f.event_id = r.event_id)
ORDER BY event_id`;
/** An overlap window of three days behind the watermark (the video's own
 *  width; the page names the technique, not a width). */
const OVERLAP = "SELECT event_id, event_at\nFROM raw_events\nWHERE event_at >= (SELECT MAX(event_at) FROM fct_events)\n                  - INTERVAL '3 days'\nORDER BY event_id";
const OVERLAP_NEW = `SELECT event_id, event_at
FROM raw_events r
WHERE event_at >= (SELECT MAX(event_at) FROM fct_events) - INTERVAL '3 days'
  AND NOT EXISTS (SELECT 1 FROM fct_events f WHERE f.event_id = r.event_id)
ORDER BY event_id`;

/** The batch a run reads, as a table, so each strategy below writes the
 *  same rows and a retry reads exactly what the first attempt read. */
const batch = (where) => `CREATE TABLE batch AS\nSELECT event_id, event_at\nFROM raw_events\n${where}`;
const STRICT_BATCH = batch("WHERE event_at > (SELECT MAX(event_at) FROM fct_events)");
const OVERLAP_BATCH = batch("WHERE event_at >= (SELECT MAX(event_at) FROM fct_events) - INTERVAL '3 days'");

/** The strategies, as the statements they stand for. */
const APPEND = "INSERT INTO fct_events\nSELECT event_id, event_at FROM batch";
const MERGE_KEY = `MERGE INTO fct_events t
USING batch s
  ON t.event_id = s.event_id
WHEN MATCHED THEN UPDATE SET event_at = s.event_at
WHEN NOT MATCHED THEN INSERT (event_id, event_at)
  VALUES (s.event_id, s.event_at)`;
const DELETE_KEYS = "DELETE FROM fct_events\nWHERE event_id IN (SELECT event_id FROM batch)";

const COUNTS = `SELECT
  (SELECT COUNT(*) FROM raw_events) AS source_rows,
  (SELECT COUNT(*) FROM fct_events) AS target_rows,
  (SELECT COUNT(DISTINCT event_id) FROM fct_events) AS distinct_ids`;
/** Source events the target lacks, and target events the source lacks. */
const MISSING = "SELECT event_id FROM raw_events\nEXCEPT\nSELECT event_id FROM fct_events\nORDER BY event_id";
const EXTRA = "SELECT event_id FROM fct_events\nEXCEPT\nSELECT event_id FROM raw_events\nORDER BY event_id";
const DUPES = "SELECT event_id, COUNT(*) AS copies\nFROM fct_events\nGROUP BY event_id\nHAVING COUNT(*) > 1\nORDER BY event_id";
const WATERMARK_NOW = "SELECT MAX(event_at) AS watermark FROM fct_events";

const AFTER_PAGE_RUN = `${PAGE_TABLES};
${RUN_PAGE};
${ARRIVALS};`;

const results = { figures: {} };

// 2. The page's block, as the page runs it, and its run.
results.figures.filter = await figure(`${PAGE_TABLES};`, {
  before: COUNTS,
  beforeWatermark: WATERMARK_NOW,
  watermark: PAGE_WATERMARK,
  run: RUN_PAGE,
  after: COUNTS,
  afterWatermark: WATERMARK_NOW,
});

// 2. What the next run's filter finds once 25, 26 and 27 have landed.
results.figures.late = await figure(AFTER_PAGE_RUN, {
  watermark: WATERMARK_NOW,
  arrived: "SELECT event_id, event_at FROM raw_events WHERE event_id > 24 ORDER BY event_id",
  strict: STRICT,
  atLeast: AT_LEAST,
  atLeastNew: AT_LEAST_NEW,
  overlap: OVERLAP,
  overlapNew: OVERLAP_NEW,
});

/** One strategy on one batch, run, then run again (the retry), counted after
 *  each. */
async function strategy(batchSql, writes) {
  const steps = { batch: batchSql, batchRows: "SELECT COUNT(*) AS batch_rows FROM batch" };
  writes.forEach((w, i) => (steps[`write${i + 1}`] = w));
  steps.counts1 = COUNTS;
  writes.forEach((w, i) => (steps[`retry${i + 1}`] = w));
  steps.counts2 = COUNTS;
  steps.missing = MISSING;
  steps.extra = EXTRA;
  steps.dupes = DUPES;
  return figure(AFTER_PAGE_RUN, steps);
}

// 2 and 4. Each filter, written each way, then retried.
results.figures.strictAppend = await strategy(STRICT_BATCH, [APPEND]);
results.figures.atLeastMerge = await strategy(
  batch("WHERE event_at >= (SELECT MAX(event_at) FROM fct_events)"),
  [MERGE_KEY],
);
results.figures.overlapAppend = await strategy(OVERLAP_BATCH, [APPEND]);
results.figures.overlapMerge = await strategy(OVERLAP_BATCH, [MERGE_KEY]);
results.figures.overlapDeleteInsert = await strategy(OVERLAP_BATCH, [DELETE_KEYS, APPEND]);

// 4. unique_key is not checked: the source sends event 27 twice.
results.figures.dupKey = await figure(
  `${AFTER_PAGE_RUN}
INSERT INTO raw_events VALUES (27, TIMESTAMP '2024-01-25 00:00:00');`,
  {
    sourceCopies: "SELECT event_id, COUNT(*) AS copies FROM raw_events WHERE event_id = 27 GROUP BY event_id",
    batch: OVERLAP_BATCH,
    // 27 is not in the target yet: both copies are inserted, without an error.
    merge1: MERGE_KEY,
    counts1: COUNTS,
    dupes1: DUPES,
    // The next run re-reads the window: 27 is in the target now, twice, and
    // the source still sends it twice.
    merge2: MERGE_KEY,
    // And had 27 been in the target once already, one copy matching it twice.
    reset: "DELETE FROM fct_events WHERE event_id = 27",
    seedOnce: "INSERT INTO fct_events VALUES (27, TIMESTAMP '2024-01-25 00:00:00')",
    merge3: MERGE_KEY,
    // The uniqueness test a dbt `unique` test compiles to, on the source batch.
    uniqueTest: "SELECT event_id, COUNT(*) AS copies\nFROM batch\nGROUP BY event_id\nHAVING COUNT(*) > 1",
  },
);

// 5. The page's idempotent rebuild, run as the page writes it, twice; a
//    blind insert of the same rows, twice; and the rebuild failing halfway.
const DIM_FINGERPRINT =
  "SELECT COUNT(*) AS customers,\n  md5(string_agg(customer_id || '|' || updated_at, ',' ORDER BY customer_id)) AS fingerprint\nFROM dim_customer";
results.figures.rebuild = await figure(`${EVENTS_LOG};`, {
  events: "SELECT COUNT(*) AS events, COUNT(DISTINCT customer_id) AS customers FROM customer_events",
  begin1: BEGIN,
  drop1: DROP,
  create1: CREATE,
  commit1: COMMIT,
  show1: SHOW_DIM,
  print1: DIM_FINGERPRINT,
  begin2: BEGIN,
  drop2: DROP,
  create2: CREATE,
  commit2: COMMIT,
  show2: SHOW_DIM,
  print2: DIM_FINGERPRINT,
  // A blind insert of the same SELECT into a table that is kept, run twice.
  blindTable: "CREATE TABLE dim_customer_appended (customer_id INTEGER, updated_at TIMESTAMP)",
  blind1: `INSERT INTO dim_customer_appended\n${CREATE.slice(CREATE.indexOf("SELECT"))}`,
  blindCount1: "SELECT COUNT(*) AS rows, COUNT(DISTINCT customer_id) AS customers FROM dim_customer_appended",
  blind2: `INSERT INTO dim_customer_appended\n${CREATE.slice(CREATE.indexOf("SELECT"))}`,
  blindCount2: "SELECT COUNT(*) AS rows, COUNT(DISTINCT customer_id) AS customers FROM dim_customer_appended",
  // The rebuild failing after its DROP: the CREATE reads a table that is not
  // there. Postgres aborts the transaction; the rollback brings the old
  // dimension back.
  failBegin: BEGIN,
  failDrop: DROP,
  failCreate: CREATE.replace("FROM customer_events", "FROM customer_events_missing"),
  failRollback: "ROLLBACK",
  afterFail: DIM_FINGERPRINT,
});

// 6. The page's MERGE, as written, on the video's own rows, run twice.
const DIM_ROWS = "SELECT customer_id, name, updated_at FROM dim_customer ORDER BY customer_id";
results.figures.merge = await figure(
  `CREATE TABLE dim_customer (customer_id INTEGER, name TEXT, updated_at TIMESTAMP);
INSERT INTO dim_customer VALUES
  (1, 'Ada', TIMESTAMP '2024-01-05 00:00:00'),
  (2, 'Ben', TIMESTAMP '2024-01-09 00:00:00'),
  (3, 'Cy',  TIMESTAMP '2024-01-12 00:00:00');
CREATE TABLE staged_customers (customer_id INTEGER, name TEXT, updated_at TIMESTAMP);
INSERT INTO staged_customers VALUES
  (2, 'Benedict', TIMESTAMP '2024-02-01 00:00:00'),
  (4, 'Dee',      TIMESTAMP '2024-02-01 00:00:00');
CREATE TABLE dim_customer_blind AS SELECT * FROM dim_customer;`,
  {
    before: DIM_ROWS,
    staged: "SELECT customer_id, name, updated_at FROM staged_customers ORDER BY customer_id",
    merge1: PAGE_MERGE,
    after1: DIM_ROWS,
    // The retry: the same staged batch, merged again.
    merge2: PAGE_MERGE,
    after2: DIM_ROWS,
    // The same batch with a blind insert instead, twice.
    blindBefore: "SELECT COUNT(*) AS rows FROM dim_customer_blind",
    blind1: "INSERT INTO dim_customer_blind SELECT * FROM staged_customers",
    blind2: "INSERT INTO dim_customer_blind SELECT * FROM staged_customers",
    blindAfter: "SELECT customer_id, name FROM dim_customer_blind ORDER BY customer_id, name",
  },
);

// 7. A full refresh against the strict filter's drift: the strict run from
//    question 2, then event 3 deleted upstream, then a normal run, then the
//    full refresh (the model's SQL with the guard skipped: every source row).
const FULL_REFRESH = "DROP TABLE fct_events";
const FULL_REBUILD = "CREATE TABLE fct_events AS\nSELECT event_id, event_at\nFROM raw_events";
results.figures.refresh = await figure(
  `${AFTER_PAGE_RUN}
${STRICT_BATCH};
${APPEND};
DROP TABLE batch;`,
  {
    afterStrict: COUNTS,
    hardDelete: "DELETE FROM raw_events WHERE event_id = 3",
    // A normal incremental run now: the strict filter, nothing new.
    normal: STRICT,
    drift: COUNTS,
    missing: MISSING,
    extra: EXTRA,
    // --full-refresh: the guard is skipped, so the model reads every row.
    drop: FULL_REFRESH,
    rebuild: FULL_REBUILD,
    refreshed: COUNTS,
    missingAfter: MISSING,
    extraAfter: EXTRA,
  },
);

// 1 and 7. The full-rebuild model the dbt page draws, copied from
//    charts/incremental-vs-full-refresh.mjs and checked against its caption
//    and against de-orchestration's results.json (the Data Engineer series'
//    answer to its backfill question).
{
  const DAYS = 730;
  const DAILY = 8_000;
  const SEED_ROWS = 200_000;
  const FULL_REFRESH_EVERY = 60;
  const full = (d) => SEED_ROWS + DAILY * d;
  const refreshDays = [];
  for (let d = 1; d <= DAYS; d++) if (d % FULL_REFRESH_EVERY === 0) refreshDays.push(d);
  const ratio = Math.round(full(DAYS) / DAILY);
  const { caption } = await import(pathToFileURL(join(root, "charts/incremental-vs-full-refresh.mjs")).href);
  check(caption.includes(`${DAILY.toLocaleString()} new rows a day`), "the chart's daily rows");
  check(caption.includes(`By day ${DAYS} that is a factor of about ${ratio}`), "the chart's ratio");
  const de = JSON.parse(readFileSync(join(here, "../de-orchestration/results.json"), "utf8")).refresh;
  check(de.fullAtEnd === full(DAYS) && de.ratio === ratio && de.daily === DAILY, "de-orchestration's full-rebuild numbers");
  // The rows processed over the two years, every run summed: rebuilding
  // nightly, against incremental with the chart's refresh every 60 days.
  let rebuildTotal = 0;
  let incrementalTotal = 0;
  let refreshTotal = 0;
  for (let d = 1; d <= DAYS; d++) {
    rebuildTotal += full(d);
    const refresh = d % FULL_REFRESH_EVERY === 0;
    incrementalTotal += refresh ? full(d) : DAILY;
    if (refresh) refreshTotal += full(d);
  }
  results.cost = {
    days: DAYS,
    daily: DAILY,
    seedRows: SEED_ROWS,
    every: FULL_REFRESH_EVERY,
    refreshDays,
    fullAtEnd: full(DAYS),
    ratio,
    lastRefresh: { day: refreshDays.at(-1), rows: full(refreshDays.at(-1)) },
    rebuildTotal,
    incrementalTotal,
    totalRatio: Math.round((rebuildTotal / incrementalTotal) * 10) / 10,
    // Of the incremental model's two-year total, the share its twelve
    // scheduled refreshes account for.
    refreshTotal,
    refreshShare: Math.round((refreshTotal / incrementalTotal) * 100),
  };
}

// ── What the narration says, held to what ran ───────────────────────────────

const F = results.figures;
const step = (fig, id) => {
  const s = F[fig].steps[id];
  check(s, `no step ${fig}.${id}`);
  return s;
};
const ok = (fig, id) => {
  const s = step(fig, id);
  check(s.ok, `${fig}.${id} failed: ${s.error}`);
  return s;
};
const cell = (fig, id, col) => {
  const s = ok(fig, id);
  return s.rows[0][col ? s.columns.indexOf(col) : 0];
};
const ids = (fig, id) => ok(fig, id).rows.map((r) => Number(r[0]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

check(Number(cell("filter", "before", "source_rows")) === 24 && Number(cell("filter", "before", "target_rows")) === 14, "page: 24 source, 14 loaded");
check(same(ids("filter", "watermark"), [15, 16, 17, 18, 19, 20, 21, 22, 23, 24]), "page: the watermark finds events 15 to 24");
check(cell("filter", "afterWatermark") === "2024-01-24 00:00:00", "the watermark after the run");
check(same(ids("late", "strict"), [27]), "strict > finds only 27");
check(same(ids("late", "atLeast"), [24, 25, 27]), ">= re-reads 24 and finds 25 and 27");
check(same(ids("late", "atLeastNew"), [25, 27]), ">= with dedup adds 25 and 27");
check(same(ids("late", "overlap"), [21, 22, 23, 24, 25, 26, 27]), "the overlap window re-reads 21 to 27");
check(same(ids("late", "overlapNew"), [25, 26, 27]), "the overlap window finds 25, 26 and 27");

const counts = (fig, id) => ok(fig, id).rows[0].map(Number);
check(same(counts("strictAppend", "counts1"), [27, 25, 25]) && same(ids("strictAppend", "missing"), [25, 26]), "strict: 25 of 27, missing 25 and 26");
check(same(counts("atLeastMerge", "counts1"), [27, 26, 26]) && same(ids("atLeastMerge", "missing"), [26]), ">= and merge: 26 of 27, missing 26");
check(same(counts("overlapAppend", "counts1"), [27, 31, 27]), "overlap appended: 31 rows for 27 events");
check(same(counts("overlapAppend", "counts2"), [27, 38, 27]), "overlap appended, retried: 38");
check(same(counts("overlapMerge", "counts1"), [27, 27, 27]) && same(counts("overlapMerge", "counts2"), [27, 27, 27]), "overlap merged: 27, and 27 on retry");
check(same(counts("overlapDeleteInsert", "counts1"), [27, 27, 27]) && same(counts("overlapDeleteInsert", "counts2"), [27, 27, 27]), "delete then insert: 27, and 27 on retry");
check(same(counts("strictAppend", "counts2"), [27, 26, 25]), "strict appended, retried: 27 is loaded twice");

check(Number(cell("dupKey", "sourceCopies", "copies")) === 2, "the source sends 27 twice");
check(ok("dupKey", "merge1") && same(counts("dupKey", "counts1"), [28, 28, 27]), "merge inserts both copies of 27, silently");
check(same(ok("dupKey", "dupes1").rows.map((r) => r.map(Number)), [[27, 2]]), "27 twice in the target");
check(!step("dupKey", "merge2").ok && /MERGE command cannot affect row a second time/.test(step("dupKey", "merge2").error), "the next merge fails");
check(!step("dupKey", "merge3").ok && /MERGE command cannot affect row a second time/.test(step("dupKey", "merge3").error), "a duplicate matching one target row fails");
check(ok("dupKey", "uniqueTest").rows.length === 1, "the uniqueness test returns the duplicate");

check(same(ok("rebuild", "events").rows[0].map(Number), [24, 12]), "the page's log: 24 events, 12 customers");
check(Number(cell("rebuild", "print1", "customers")) === 12, "the rebuild: 12 rows");
check(cell("rebuild", "print1", "fingerprint") === cell("rebuild", "print2", "fingerprint"), "the rebuild, rerun: identical");
check(same(ok("rebuild", "blindCount1").rows[0].map(Number), [12, 12]) && same(ok("rebuild", "blindCount2").rows[0].map(Number), [24, 12]), "blind insert: 12, then 24");
check(!step("rebuild", "failCreate").ok && cell("rebuild", "afterFail", "fingerprint") === cell("rebuild", "print1", "fingerprint"), "a failed rebuild rolls back to the old table");

check(same(ok("merge", "merge1").rows, [[2]]) && same(ok("merge", "merge2").rows, [[2]]), "each merge touches two rows");
check(same(ok("merge", "after1").rows, ok("merge", "after2").rows) && ok("merge", "after1").rows.length === 4, "the merge, rerun: the same four rows");
check(ok("merge", "blindAfter").rows.length === 7, "a blind insert, twice: seven rows for four customers");

check(same(counts("refresh", "afterStrict"), [27, 25, 25]), "refresh: the strict run's table");
check(ok("refresh", "normal").rows.length === 0, "a normal run finds nothing");
check(same(counts("refresh", "drift"), [26, 25, 25]) && same(ids("refresh", "missing"), [25, 26]) && same(ids("refresh", "extra"), [3]), "drift: 25 and 26 missing, 3 still there");
check(same(counts("refresh", "refreshed"), [26, 26, 26]) && ok("refresh", "missingAfter").rows.length === 0 && ok("refresh", "extraAfter").rows.length === 0, "the full refresh matches the source");

results.postgres = [...new Set(Object.values(F).map((f) => f.version))];
results.page = {
  dbtModel: DBT_MODEL,
  watermark: PAGE_WATERMARK,
  merge: PAGE_MERGE,
};
results.statements = { STRICT, AT_LEAST, AT_LEAST_NEW, OVERLAP, APPEND, MERGE_KEY, DELETE_KEYS, FULL_REBUILD };

writeFileSync(join(here, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(`ae-incremental: ${Object.keys(F).length} figures on ${results.postgres.join(", ")}; every check passed.`);
