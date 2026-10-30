import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Python for data engineering" (16:9), Part 5 of the Data
 * Engineer interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/python.mdx. It answers all eighteen of the
 * page's questions, none moved in from another page: fourteen worked through
 * in Python, numbered aloud, then four quickly (numbered 15 to 18 on screen
 * only).
 *
 *   1. Why prefer a generator over a list when processing large data?
 *   2. How do generator pipelines compare to building intermediate lists?
 *      ("gen")
 *   3. How do you process a file too big to fit in memory?
 *   4. How do you process a large CSV with pandas without loading it all?
 *      ("file")
 *   5. What's the difference between an iterable and an iterator? ("iter")
 *   6. Why are dict and set lookups O(1), and when does that matter? ("hash")
 *   7. How do you deduplicate records in memory?
 *   8. How do you keep only the latest record per key in pandas? ("dedup")
 *   9. How do you join two datasets in memory without a database? ("join")
 *  10. How do you split a large stream into fixed-size batches? ("batch")
 *  11. How do you make a network call resilient with retries and backoff?
 *      ("retry")
 *  12. What makes a transform idempotent, and how do you write one in
 *      Python? ("idem")
 *  13. How do you clean messy delimited records defensively?
 *  14. How do you parse numbers or dates that might be malformed? ("clean")
 *  Quickly ("rapid-in"): 15. aggregating a stream without holding every row;
 *  16. when to reach for pandas instead of plain Python; 17. grouping and
 *  aggregating with pandas; 18. common performance pitfalls.
 *
 * Reused (the series rule from 2026-10-30): question 6 is the course video
 * ListVsSet's (list-vs-set) mechanism figure, copied into HashScene.tsx and
 * re-cued, with its measured numbers imported from list-vs-set/data.ts
 * (CPython 3.13: 5.53 ms against 22.8 ns on a million, 2,097,152 buckets).
 * Every listing, table, console and error box is DA Part 2's kit
 * (da-pandas/parts.tsx), as DS Part 9 uses it, and the measured bars are DS
 * Part 9's (ds-python-pandas/parts.tsx). Questions 8 and 17 (the latest row,
 * groupby) are asked on DA Part 2 and DS Part 9 too; this page has its own
 * blocks for both, so those are the tables here.
 *
 * The opening is written fresh: Part 4's bridge (loading the model takes
 * code), then the page's own fifty gigabyte log on an eight gigabyte machine
 * (its first concept check), and what the round checks, in the page's words:
 * memory, and code that is safe to re-run. The bridge out is the plan's:
 * one script becomes a pipeline that runs every day.
 *
 * Facts. Every snippet on screen ran in Pyodide 314.0.7 (Python 3.14.2) with
 * pandas 3.0.2, the runtime the page's blocks run in, by check.mjs into
 * results.json, which data.ts reads:
 *   - "gen", the page's parser and Counter ({'apple': 5, 'banana': 5,
 *     'cherry': 7}), then the video's own file of a million orders (8.2 MB,
 *     seeded): peak traced memory (tracemalloc) of the list 62.6 MB, of the
 *     generator 149 KB; at a hundred thousand rows 6.3 MB and 149 KB. The
 *     three-stage pipeline: 160.3 MB as lists, 150 KB as generators, the same
 *     total; a generator summed twice gives the total, then 0.
 *   - "file", the same file: read() 16.6 MB, readlines() 33.6 MB, a for loop
 *     149 KB. pandas: read_csv whole 54.2 MB, chunksize=100_000 7.5 MB, ten
 *     chunks, identical totals; on its first 250,000 rows the mean of the
 *     chunk means is 5.0061 and sum over count 5.0039, the true mean.
 *   - "iter", the page's four rows: a list read twice gives 4 and 4, a
 *     generator 4 and 0; counted then loaded, 4 and 0; iter(rows) is rows is
 *     True for the generator, False for the list (and True for a file).
 *   - "hash", the video's own count: deduplicating 10,000 distinct keys
 *     against a list makes 49,995,000 comparisons, 5,000 keys 12,497,500
 *     (four times fewer); against a set, none.
 *   - "dedup", the page's blocks: users [1, 2, 3]; latest per key id 1 'b'
 *     (ts 20), id 2 'c'; the challenge's dict answer the same.
 *   - "join", the page's block (Ada, Ada, Lin); an order for user 3 (the
 *     video's own): KeyError: 3, and .get() gives None.
 *   - "batch", the page's block ([0, 1, 2], [3, 4, 5], [6]),
 *     itertools.batched the same as tuples; a million rows in batches of
 *     1,000 is 1,000 batches.
 *   - "retry", the page's block (retry in 0.010s, 0.020s, then ok); a
 *     ValueError raised on its first call; the video's own model of six
 *     clients failing at once, with the page's doubling on a 1 s base: all
 *     retry at 1, 3, 7 and 15 s; with full jitter (random.Random(42)) their
 *     retries spread across 0.03 to 7.38 s.
 *   - "idem", the page's upsert run twice ({1: 'new', 2: 'new'}); an append
 *     run twice (four rows); a keyed add run twice ({1: 80, 2: 50}).
 *   - "clean", the page's block (Bob's age None, "bad row" dropped); a quoted
 *     name split into four fields by hand and three by csv; rejects kept with
 *     their reason; to_numeric coerces "n/a" and "1,200" to NaN (two); a
 *     day-first date and February 30 each raise ValueError.
 *   - quickly: the page's running dict ({'us': 9, 'eu': 6}) and groupby
 *     (eu 225, us 150); the pitfalls are the page's list, its "10-100x"
 *     its own rule of thumb.
 *
 * Memory in Pyodide is a 32-bit build's: a 64-bit laptop needs more bytes per
 * object. The screen says where it was measured, and the narration leans on
 * the ratios and the shapes, which do not move.
 *
 * Written for Drew's ear: "order one" for O(1) (math on screen), "sequel"
 * for SQL, "trace malloc", "i-slice" for islice, "chunk size", "read CSV".
 */
export const script: NarrationScript = {
  id: "de-python",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A data model is only a drawing until code loads it, and that code is usually Python. Say the input is a fifty gigabyte log, and the machine has eight gigabytes of memory.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-fit",
      text: "Read the whole file first, and it can't fit. Read it one line at a time, and memory only ever holds a line.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "That's what the Python round checks: code that moves data without running out of memory, and is safe to run twice. Eighteen questions: fourteen worked through, each run in Python, then four quickly.",
      pauseAfter: 0.7,
    },
    { id: "gen-in", text: "It starts with one choice: a list, or a generator." },

    // ── 1, 2. Generators ──────────────────────────────────────────────────
    {
      id: "gen",
      scene: true,
      text: "Question one. Why prefer a generator over a list when processing large data?",
      pauseAfter: 0.6,
    },
    {
      id: "gen-yield",
      text: "A list holds every element at once. A generator yields one at a time, on demand. The page's parser reads a line, splits it, and yields a name and a quantity.",
      pauseAfter: 0.6,
    },
    {
      id: "gen-million",
      text: "On a file of a million orders, collecting the rows in a list peaks at sixty-three megabytes. Summing straight from the generator peaks at about a hundred fifty kilobytes.",
      pauseAfter: 0.7,
    },
    {
      id: "gen-flat",
      text: "Cut the file to a tenth, and so does the list. The generator doesn't move: its memory doesn't depend on the input.",
      pauseAfter: 0.8,
    },
    {
      id: "pipe",
      text: "Question two. How do generator pipelines compare to building intermediate lists?",
      pauseAfter: 0.6,
    },
    {
      id: "pipe-swap",
      text: "Here's a three-stage pipeline, twice. With square brackets, each stage is a list, and all three are alive at once: a hundred sixty megabytes. With round brackets, each is a generator, and one row passes through all three before the next is read.",
      pauseAfter: 0.7,
    },
    {
      id: "pipe-trade",
      text: "Lists still earn their place: you can print one to debug it, and read it twice. A generator is spent after one pass; sum it again, and you get zero. Lists for small data you rescan, generators for large or endless data.",
      pauseAfter: 0.8,
    },
    { id: "file-in", text: "Which is how you read a file." },

    // ── 3, 4. A file too big for memory ───────────────────────────────────
    {
      id: "file",
      scene: true,
      text: "Question three. How do you process a file too big to fit in memory?",
      pauseAfter: 0.6,
    },
    {
      id: "file-read",
      text: "Don't call read or read lines. On the same eight megabyte file, read holds the whole text: seventeen megabytes. Read lines holds every line: thirty-four.",
      pauseAfter: 0.6,
    },
    {
      id: "file-loop",
      text: "A file object is already a lazy iterator over its lines, so a plain for loop streams it, in about a hundred fifty kilobytes. Chain generators on it, and nothing is read until the last one asks.",
      pauseAfter: 0.8,
    },
    {
      id: "csv",
      text: "Question four. How do you process a large CSV with pandas without loading it all?",
      pauseAfter: 0.6,
    },
    {
      id: "csv-chunks",
      text: "Pass chunk size to read CSV, and you get an iterator of data frames: ten chunks of a hundred thousand rows. Sum each chunk by group, and fold it into a counter.",
      pauseAfter: 0.6,
    },
    {
      id: "csv-same",
      text: "The totals match the whole-file read exactly, and memory peaks at one chunk: seven and a half megabytes, not fifty-four.",
      pauseAfter: 0.7,
    },
    {
      id: "csv-mean",
      text: "Sums add up across chunks. A mean doesn't: the mean of the chunks' means is off. Carry the sum and the count, and divide at the end.",
      pauseAfter: 0.8,
    },
    { id: "iter-in", text: "That one pass deserves a closer look." },

    // ── 5. Iterable and iterator ──────────────────────────────────────────
    {
      id: "iter",
      scene: true,
      text: "Question five. What's the difference between an iterable and an iterator?",
      pauseAfter: 0.6,
    },
    {
      id: "iter-def",
      text: "An iterable, like a list or a dict, hands out a fresh iterator each time you loop over it. An iterator keeps its place, and once it reaches the end, it's used up.",
      pauseAfter: 0.7,
    },
    {
      id: "iter-twice",
      text: "Read the list twice: four rows, then four again. Read the generator twice: four, then zero. A generator is an iterator, and so is an open file.",
      pauseAfter: 0.7,
    },
    {
      id: "iter-trap",
      text: "Here's how it bites: count the rows for the log, then load them. Four counted, zero loaded, and no error. For two passes, make a list, or create the generator again.",
      pauseAfter: 0.8,
    },
    { id: "hash-in", text: "Next, how a set answers without looking." },

    // ── 6. Hash lookups ───────────────────────────────────────────────────
    {
      id: "hash",
      scene: true,
      text: "Question six. Why are dict and set lookups order one, and when does that matter?",
      pauseAfter: 0.6,
    },
    {
      id: "hash-scan",
      text: "A list doesn't know where a value lives, so a membership test compares from the front: a million comparisons for the last of a million numbers.",
    },
    {
      id: "hash-jump",
      text: "Dicts and sets are hash tables. Hashing the value picks one bucket out of two million, and Python goes straight there: one comparison, at any size.",
    },
    {
      id: "hash-time",
      text: "Timed in CPython, that's five and a half milliseconds, against twenty-three nanoseconds.",
      pauseAfter: 0.7,
    },
    {
      id: "hash-loop",
      text: "It matters inside a loop. Deduplicate ten thousand records against a list of the ones you've seen: fifty million comparisons. Double the records, and it's four times as many, order n squared. A set makes it one lookup a record.",
      pauseAfter: 0.8,
    },
    { id: "dedup-in", text: "So, deduplicating." },

    // ── 7, 8. Deduplication ───────────────────────────────────────────────
    {
      id: "dedup",
      scene: true,
      text: "Question seven. How do you deduplicate records in memory?",
      pauseAfter: 0.6,
    },
    {
      id: "dedup-set",
      text: "One pass, with a set of the keys you've seen. User one's second record is skipped, and each user's first is kept, in order: one, two, three.",
      pauseAfter: 0.6,
    },
    {
      id: "dedup-dict",
      text: "To keep the latest instead, map each key to a record in a dict, and replace it when a later timestamp arrives.",
      pauseAfter: 0.7,
    },
    {
      id: "latest",
      text: "Question eight. How do you keep only the latest record per key in pandas?",
      pauseAfter: 0.6,
    },
    {
      id: "latest-sort",
      text: "Sort by timestamp, drop duplicates on the key, and keep the last. ID one keeps b, from time twenty: the pandas version of row number equals one in sequel.",
      pauseAfter: 0.6,
    },
    {
      id: "latest-tie",
      text: "If two rows can share a timestamp, add a tiebreaker to the sort, so which one you keep doesn't depend on arrival order.",
      pauseAfter: 0.8,
    },
    { id: "join-in", text: "A dict can do a join, too." },

    // ── 9. A join in memory ───────────────────────────────────────────────
    {
      id: "join",
      scene: true,
      text: "Question nine. How do you join two datasets in memory without a database?",
      pauseAfter: 0.6,
    },
    {
      id: "join-build",
      text: "Build a dict from the smaller side, keyed on the join column: user ID to name. Then scan the larger side, and look up each order's user.",
      pauseAfter: 0.6,
    },
    {
      id: "join-cost",
      text: "That's a hash join, order n plus m. Comparing every order with every user is order n times m.",
      pauseAfter: 0.7,
    },
    {
      id: "join-miss",
      text: "The follow-up: an order whose user isn't there. Square brackets raise a key error. Get returns none and keeps the order, as a left join would.",
      pauseAfter: 0.8,
    },
    { id: "batch-in", text: "Writing it out has its own pattern." },

    // ── 10. Batches ───────────────────────────────────────────────────────
    {
      id: "batch",
      scene: true,
      text: "Question ten. How do you split a large stream into fixed-size batches?",
      pauseAfter: 0.6,
    },
    {
      id: "batch-why",
      text: "An insert per row pays a round trip per row. A million rows in batches of a thousand is a thousand calls.",
      pauseAfter: 0.6,
    },
    {
      id: "batch-slice",
      text: "Pull n items at a time from the iterator with i-slice, until a pull comes back empty. Seven items in threes: three, three, and a last batch of one.",
      pauseAfter: 0.6,
    },
    {
      id: "batch-builtin",
      text: "Since Python three twelve, itertools batched does exactly this.",
      pauseAfter: 0.8,
    },
    { id: "retry-in", text: "And when a call fails, you retry it, carefully." },

    // ── 11. Retries ───────────────────────────────────────────────────────
    {
      id: "retry",
      scene: true,
      text: "Question eleven. How do you make a network call resilient with retries and backoff?",
      pauseAfter: 0.6,
    },
    {
      id: "retry-loop",
      text: "Catch transient errors, wait, and try again, doubling the wait each time. Here the call fails twice, waits ten milliseconds, then twenty, and succeeds on the third try.",
      pauseAfter: 0.6,
    },
    {
      id: "retry-herd",
      text: "Then add jitter. Model six clients failing in one outage: with plain backoff, they all come back together, at one, three, seven and fifteen seconds.",
    },
    {
      id: "retry-jitter",
      text: "Wait a random time up to each delay instead, and their retries spread out.",
      pauseAfter: 0.7,
    },
    {
      id: "retry-not",
      text: "Know what not to retry, too. A bad request fails the same way every time, so it's raised at once. Cap the attempts, and retry only what's safe to repeat: a retried payment can charge twice.",
      pauseAfter: 0.8,
    },
    { id: "idem-in", text: "Safe to repeat has a name." },

    // ── 12. Idempotency ───────────────────────────────────────────────────
    {
      id: "idem",
      scene: true,
      text: "Question twelve. What makes a transform idempotent, and how do you write one in Python?",
      pauseAfter: 0.6,
    },
    {
      id: "idem-def",
      text: "It ends in the same state however many times it runs, which makes retries and backfills safe.",
      pauseAfter: 0.6,
    },
    {
      id: "idem-append",
      text: "Append a batch, rerun it after a failure, and four rows record two events.",
    },
    {
      id: "idem-upsert",
      text: "Write by key instead. The page's upsert sets each ID's status, and the second run changes nothing.",
      pauseAfter: 0.7,
    },
    {
      id: "idem-add",
      text: "Keyed isn't enough on its own. Add each payment into its key, run it twice, and every total doubles. Set values; don't add to them.",
      pauseAfter: 0.8,
    },
    { id: "clean-in", text: "Last, data that arrives broken." },

    // ── 13, 14. Messy records ─────────────────────────────────────────────
    {
      id: "clean",
      scene: true,
      text: "Question thirteen. How do you clean messy delimited records defensively?",
      pauseAfter: 0.6,
    },
    {
      id: "clean-page",
      text: "Strip whitespace, check the field count, and convert types without letting one row crash the job. Bob's missing age becomes none; bad row is dropped.",
      pauseAfter: 0.6,
    },
    {
      id: "clean-csv",
      text: "Split on commas yourself, and a quoted name, Smith comma Jo, becomes four fields. The CSV module reads three.",
      pauseAfter: 0.6,
    },
    {
      id: "clean-reject",
      text: "And don't drop bad rows in silence. Send them to a reject list with the reason, and count them.",
      pauseAfter: 0.7,
    },
    {
      id: "parse",
      text: "Question fourteen. How do you parse numbers or dates that might be malformed?",
      pauseAfter: 0.6,
    },
    {
      id: "parse-num",
      text: "In pandas, to numeric with errors equals coerce turns what won't parse into not a number: n slash a, and twelve hundred with a comma. Count them, so they don't vanish into an average.",
      pauseAfter: 0.6,
    },
    {
      id: "parse-date",
      text: "For dates, parse with an explicit format, and catch the value error. A day-first date fails, and so does February thirtieth.",
      pauseAfter: 0.8,
    },

    // ── Quickly, 15 to 18 ─────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Fourteen down. Four more, quickly.",
      pauseAfter: 0.6,
    },
    {
      id: "r-stream",
      text: "To aggregate a stream without holding rows, fold each record into a running dict as it arrives. Memory grows with the groups, not the rows: here, two.",
    },
    {
      id: "r-pandas",
      text: "Reach for pandas when the data fits in memory and you want vectorized columns, group by and joins. Stay with generators when it streams, or won't fit.",
    },
    {
      id: "r-groupby",
      text: "Group by splits the rows by key, sums each group, and combines the answers. As index equals false keeps the region as a column: EU two twenty-five, US one fifty.",
    },
    {
      id: "r-pitfalls",
      text: "And the common pitfalls: membership tests against a list, strings built with plus in a loop, iter rows where a column operation exists, a data frame grown concat by concat, and a whole file read that could stream.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Put these together, run them every night on a schedule, and one script has become a pipeline. Next: pipelines and systems.",
    },
  ],
};
