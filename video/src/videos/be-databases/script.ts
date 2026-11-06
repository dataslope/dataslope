import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Databases" (16:9), Part 4 of the Backend / Software
 * Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md, "4, Databases"),
 * after content/interview/backend-engineer/databases.mdx. It answers all
 * sixteen of the page's questions, plus system-design.mdx's "SQL or NoSQL at
 * scale, how do you choose?", read and answered together with the page's
 * first question. Eleven are worked through, numbered aloud and read in the
 * page's words; five go quickly at the end, numbered on screen only.
 *
 *   1. "SQL vs NoSQL, when do you pick each?" with system design's "SQL or
 *      NoSQL at scale, how do you choose?" ("nosql").
 *   2. "What is a database index and how does it speed up queries?" ("index").
 *   3. "When does an index help, and when does it hurt?" ("hurt").
 *   4. "What is a composite index and why does column order matter?"
 *      ("composite").
 *   5. "How do you read a query plan?" ("plan-q").
 *   6. "Why can a join inflate a SUM, and how do you fix it?" ("fanout").
 *   7. "What is a transaction, and how do you use one?" ("txn").
 *   8. "What are the SQL isolation levels?" ("levels") and 9. "What
 *      anomalies do isolation levels prevent?" ("anomalies"), one scene.
 *   10. "What is an optimistic vs pessimistic locking strategy?" ("lock").
 *   11. "What is a deadlock, and how do you avoid it?" ("deadlock"),
 *       answered from the database's side, as the plan asks: lock order
 *       across two transactions, the detector that aborts one, the retry.
 *       Part 5 (Concurrency) takes the general conditions.
 *   Quick ("rapid-in"): 12. "What does ACID stand for?"; 13. "Normalization
 *   vs denormalization, what is the trade-off?"; 14. "Walk through the join
 *   types."; 15. "What is a primary key vs a foreign key?"; 16. "What is a
 *   covering index?"
 *
 * The opening takes up Part 3's bridge (behind the API, the data has to live
 * somewhere) without naming it, so it stands alone; the close bridges into
 * Part 5 (many requests arrive at once).
 *
 * On screen, beat by beat (what phase 2 builds; red the trap, green the right
 * answer, yellow what the narration points at, blue data):
 *   hook: an API box on the left, an arrow into a database cylinder; the
 *     arrow forks into "read: fast" and "write: right", a second write
 *     arriving beside the first. hook-run: the two big tables as row counts
 *     (users 1,000,000; orders 1,000,000, 50,000 customers), the small ones
 *     smaller beside them (two accounts, one item, the page's 24 customers
 *     and 24 orders), "PostgreSQL 18".
 *     plan: eleven numbered squares and five smaller ones.
 *   nosql: QuestionCard 1, the system-design question set under it as a
 *     second line. nosql-sql: two tables joined by a line, three rows of one
 *     ticked into a single transaction. nosql-no: three NoSQL shapes in a
 *     row, labelled key-value, document, wide-column, each with its one
 *     access pattern; "weaker consistency, limited joins" under them in the soft
 *     ink. nosql-both: one diagram, SQL box ("orders, payments") beside a
 *     NoSQL box ("logs, sessions, feeds"). nosql-next: a new query arrives as
 *     a dashed arrow; the relational side draws a join, the other side
 *     copies its data into a second arrangement for it.
 *   index: QuestionCard 2. index-scan: the users table as 7,360 small page
 *     squares, a sweep across all of them, one square lit; "Rows removed by
 *     filter: 999,999" from the plan. index-tree: a three-level B-tree drawn
 *     over the squares, a path root, branch, leaf in yellow, then one table
 *     page: "4 pages", against "7,360". index-log: "O(log n)" beside "O(n)".
 *     index-hash: a hash index box; an equality arrow lands on one bucket
 *     (green), then "BETWEEN" drawn as a range and the plan falling back to
 *     the Seq Scan (red).
 *   hurt: QuestionCard 3; a list of the four selective reads.
 *     hurt-half: the is_active column, half the cells filled, and the plan
 *     line "Seq Scan on users ... rows=500000" beside an index that goes
 *     unused (grey). hurt-writes: two bars, 10,001 and 40,187 WAL records.
 *     hurt-space: a bar of the table (58 MB) against its three indexes
 *     stacked (39 + 21 + 6.8 MB). hurt-rule: the rule in one line.
 *   composite: QuestionCard 4; a phone-book column sorted by last name, then
 *     first name. composite-prefix: "Lovelace" and "Ada Lovelace" found
 *     (green), "every Ada" scattered through the book (red).
 *     composite-run: the index (customer_id, created_at) as a sorted strip;
 *     customer 42's twenty entries in one run, the newest ten read in order:
 *     "13 pages, no sort". composite-day: one day across customers, the plan
 *     a Seq Scan. composite-swap: the strip re-sorted (created_at,
 *     customer_id), a backward walk through it: "1,837 pages".
 *     composite-rule: "equality first, then range or sort".
 *     composite-skip: an index on (status, created_at), four status runs,
 *     five short searches into them, "Heap Fetches: 0".
 *   plan-q: QuestionCard 5; a plan printed as a tree, the indented node
 *     marked as running first. plan-look: three labels pinned to it: scan,
 *     estimate vs actual, rows removed. plan-bad: the function filter's plan,
 *     "rows=5000" against "actual rows=2732" in yellow, "Rows Removed by
 *     Filter: 997268" in red. plan-why: the filter's cast circled.
 *     plan-fix: the range's plan, an Index Only Scan, both counts 2,732
 *     (green). plan-sarg: "sargable", and the other two fixes.
 *   fanout: QuestionCard 6. fanout-run: the page's 24 orders (the total
 *     2,661.50), then joined to order_items: 48 rows, each order repeated per
 *     item, the total 5,451.75 in red; Sara's two orders, three items each,
 *     304.00 becoming 912.00. fanout-fix: items counted per order first, one
 *     row per order, the total back to 2,661.50 (green). fanout-check: row
 *     counts beside each step.
 *   txn: QuestionCard 7; BEGIN, two statements, COMMIT or ROLLBACK as a
 *     bracket. txn-run: accounts 1 and 2 at 100; the debit takes 1 to 70;
 *     the transfer row fails its foreign key (the error, as Postgres printed
 *     it, in red). txn-abort: the next statement refused ("current
 *     transaction is aborted"); ROLLBACK; account 1 back at 100 (green);
 *     then one line, "catch, roll back, retry or report".
 *   levels: QuestionCard 8; the four levels as rows of a grid; on
 *     "defaults differ", "Postgres: read committed" from SHOW.
 *     anomalies: QuestionCard 9 replaces 8 over the same grid, whose three
 *     columns appear. anomalies-dirty: two timelines; the other transaction
 *     writes 50 and stays open; this one reads at each of the four levels,
 *     100 every time (the run, green); the cell "dirty read: possible" under
 *     read uncommitted is struck for Postgres. anomalies-nonrep: the two
 *     timelines again, drawn (not run): read 100, the other commits 50, read
 *     50. anomalies-phantom: a filter's result gaining a row between reruns,
 *     drawn; the repeatable read cell marked for Postgres.
 *     anomalies-serial: serializable's row; a transaction aborted with
 *     "serialization failure" and an arrow back to its start, "retry".
 *   lock: QuestionCard 10; pessimistic: a row with a padlock.
 *     lock-pess-run: the other transaction holds account 1 (padlock); the
 *     NOWAIT read refused (the error, red); account 2 granted (green).
 *     lock-opt: a row with "version 3" beside it. lock-opt-run: clients A
 *     and B both read v3; B writes, v4 (stock 4); A's write "where version =
 *     3" returns 0 rows (red); A rereads v4 and retries, v5, stock 3 (green).
 *     lock-choose: a dial from rare to frequent conflicts.
 *   deadlock: QuestionCard 11. deadlock-cycle: two transfers as two
 *     timelines, each taking one account's lock, then reaching for the
 *     other's: the two waits drawn as arrows closing a cycle (drawn, not
 *     run). deadlock-detect: a one-second clock (deadlock_timeout, read from
 *     the database), the cycle found, one transfer struck in red "deadlock
 *     detected", the other finishing (green), then the victim re-run.
 *     deadlock-order: both transfers taking account 1 first; the second
 *     simply waits, no cycle.
 *   rapid-in: the RapidFire list, 12 to 16. r-acid: four letters, each word
 *     under it. r-norm: one customer's email in one table against copied into
 *     every order, one copy changed and the others stale (red).
 *     r-joins: the page's Venn-style pair, inner 24 rows, left 30, the six
 *     names with no orders. r-keys: orders.customer_id pointing at
 *     customers.id; "accounts_pkey" listed, no index on the foreign key's
 *     column. r-cover: the index with amount inside it; "Index Only Scan,
 *     Heap Fetches: 0" against the plain index's 20 heap pages.
 *   next: the RapidFire list complete; NextLine "Next: concurrency".
 *
 * Facts. Every plan, count, size and error ran on the site's Postgres
 * (PGlite 0.5.8, PostgreSQL 18.3), by check.mjs into results.json, which
 * data.ts reads; two full runs of check.mjs write identical files. The tables
 * are the video's own, seeded with generate_series and fixed expressions:
 *   - "index": users, 1,000,000 rows, 7,360 pages (58 MB). Without an index,
 *     one email is a Seq Scan that reads all 7,360 pages (Buffers hit + read)
 *     and removes 999,999 rows. The B-tree on email has three levels
 *     (pageinspect's bt_metap: level 2, plus one); the lookup reads 4 pages
 *     (three index, one table). A hash index answers the equality; a BETWEEN
 *     on the same column is a Seq Scan (the page's hash-vs-tree chart).
 *   - "hurt": is_active is true on 500,000 rows; with an index on it,
 *     WHERE is_active is still a Seq Scan (the page's "boolean that is half
 *     true"). 10,000 inserts: 10,001 WAL records with no index, 40,187 with
 *     three (EXPLAIN (ANALYZE, WAL)). The users table is 58 MB; its three
 *     indexes are 39 MB, 21 MB and 6.8 MB, 67 MB together.
 *   - "composite": orders, 1,000,000 rows, 20 for each of 50,000 customers.
 *     On (customer_id, created_at), customer 42's ten latest are an Index
 *     Scan Backward with no Sort node, 13 pages; one day across customers
 *     (2,656 orders on 2024-12-31) is a Seq Scan. On (created_at,
 *     customer_id) the same ten read 1,837 pages. On (status, created_at),
 *     the day's count is an Index Only Scan with "Index Searches: 5" and
 *     "Heap Fetches: 0": Postgres 18's skip scan (the release notes: "Allow
 *     skip scans of btree indexes"), which the page allows for ("some engines
 *     can use skip scans").
 *   - "plan": WHERE created_at::date = '2024-06-01' beside an index on
 *     created_at is a Seq Scan, estimated 5,000 rows, actually 2,732, with
 *     997,268 removed by the filter; the range on the column is an Index
 *     Only Scan estimated and returning 2,732.
 *   - "fanout": the page's own 24 customers and 24 orders (its join blocks'
 *     initSql), with order_items of the video's own (1 + order_id % 3 an
 *     order, 48 in all). Revenue 2,661.50; joined to items, 48 rows and
 *     5,451.75; Sara (orders 116 and 122, three items each) 304.00 becomes
 *     912.00; counted per order first, 2,661.50 again.
 *   - "txn": the debit takes account 1 from 100 to 70; the transfer to
 *     account 99 fails: "insert or update on table "transfers" violates
 *     foreign key constraint "transfers_to_id_fkey""; the next statement:
 *     "current transaction is aborted, commands ignored until end of
 *     transaction block"; after ROLLBACK account 1 is 100.
 *   - "levels", "anomalies": SHOW default_transaction_isolation is "read
 *     committed". Another transaction sets the balance to 50 and is parked
 *     uncommitted (PREPARE TRANSACTION); reads at read uncommitted, read
 *     committed, repeatable read and serializable all return 100; after
 *     COMMIT PREPARED, 50. The non-repeatable read, the phantom and the
 *     serialization failure need two sessions at once, which PGlite (one
 *     connection) cannot run, so they are drawn: the anomalies as the page
 *     defines them, and Postgres's behaviour from its docs ("Transaction
 *     Isolation": Read Uncommitted behaves as Read Committed, Repeatable Read
 *     does not allow phantoms, Serializable applications must be prepared to
 *     retry on serialization failure).
 *   - "lock": another transaction holds account 1 FOR UPDATE (parked); FOR
 *     UPDATE NOWAIT is refused, "could not obtain lock on row in relation
 *     "accounts""; account 2 is granted. Optimistic: items row stock 5,
 *     version 3; B's write returns stock 4, version 4; A's write expecting
 *     version 3 returns no row; A rereads 4 and retries: stock 3, version 5.
 *     (Without NOWAIT the read would wait; PGlite has no timer to end a wait,
 *     so a waiting statement is never run.)
 *   - "deadlock": drawn, for the same reason. deadlock_timeout is "1s"
 *     (SHOW, from the same database); Postgres's detector, its victim and
 *     "deadlock detected" are from its docs ("Deadlocks", and
 *     deadlock_timeout: the wait before checking for a deadlock). A full
 *     connection pool, which the page adds as a look-alike failure, is left
 *     out for length: an aside to the question, not part of its answer.
 *   - "r-joins": the page's tables: inner join 24 rows, left join 30; Di,
 *     Hana, Leo, Pia, Theo and Yara have no orders. (The page's LEFT JOIN
 *     block comments "Cy has no orders"; run, Cy has two, 104 and 124, so
 *     the video names no one and says "the six who never ordered".
 *     Reported.) "r-keys": pg_indexes on
 *     accounts and transfers lists only the two primary keys
 *     (accounts_pkey, transfers_pkey), none on from_id or to_id. "r-cover":
 *     SUM(amount) for customer 42 on an index on customer_id is a Bitmap Heap
 *     Scan of 20 table pages; with INCLUDE (amount), after VACUUM, an Index
 *     Only Scan with "Heap Fetches: 0".
 *   - SQL vs NoSQL, ACID and normalization are the pages' own words, drawn,
 *     with no numbers; no NoSQL product is named, since the pages name none.
 *     "nosql-next" goes one step past them: a store laid out for one access
 *     pattern answers a new one by copying the data into a second layout,
 *     the denormalization "r-norm" describes, where relational adds a join.
 *
 * Written for Drew's ear: initialisms in plain caps (API, ID; SQL through
 * the lexicon; NoSQL, "no sequel", and ACID, "acid", reported for it, since
 * the lexicon's SQL entry does not match inside NoSQL), no sentence opening
 * on "A" before an initialism, numbers as they are said, Postgres glossed
 * once, Postgres keywords said as words ("explain analyze", "select for
 * update").
 */
export const script: NarrationScript = {
  id: "be-databases",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Behind an API, the data has to live somewhere, and usually that's a database. Its reads have to be fast, and its writes have to be right, even when another write lands at the same moment.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-run",
      text: "Every number here comes from a run in Postgres, the open-source relational database, on a million users, a million orders, and a few small tables.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Sixteen questions, plus one from system design. Eleven are worked through, and five go quickly at the end.",
      pauseAfter: 0.7,
    },

    // ── 1. SQL or NoSQL ───────────────────────────────────────────────────
    {
      id: "nosql",
      scene: true,
      text: "Question one. SQL versus NoSQL, when do you pick each? And from system design: SQL or NoSQL at scale, how do you choose?",
      pauseAfter: 0.5,
    },
    {
      id: "nosql-sql",
      text: "Pick relational when the data is structured and its relationships matter: joins, transactions across several rows, strong consistency. It's the safe default for most applications.",
      pauseAfter: 0.6,
    },
    {
      id: "nosql-no",
      text: "Pick NoSQL when writes must scale out across machines, when the schema keeps changing, which suits a document store, or when one access pattern, known in advance, runs at huge volume, which suits key-value or wide-column. The price: weaker consistency and limited joins.",
      pauseAfter: 0.6,
    },
    {
      id: "nosql-both",
      text: "At scale, many systems use both: SQL for the core transactions, NoSQL for high-volume logs, sessions or feeds.",
      pauseAfter: 0.6,
    },
    {
      id: "nosql-next",
      text: "So ask which queries you'll need next year. Relational answers a new one with a join; a store built around one access pattern may need the data copied again, arranged for the new one.",
      pauseAfter: 0.8,
    },

    // ── 2. What an index is ───────────────────────────────────────────────
    {
      id: "index",
      scene: true,
      text: "Question two. What is a database index, and how does it speed up queries?",
      pauseAfter: 0.4,
    },
    {
      id: "index-scan",
      text: "Find one email among a million users without an index, and Postgres reads all seven thousand three hundred sixty pages of the table to keep one row.",
      pauseAfter: 0.7,
    },
    {
      id: "index-tree",
      text: "An index is a separate structure mapping values to their rows, usually a B-tree, balanced and sorted. This one is three levels deep, so the lookup reads three index pages and one table page: four pages, not seven thousand.",
      pauseAfter: 0.7,
    },
    {
      id: "index-log",
      text: "That's log n against n, and because the tree is sorted, it answers ranges too.",
      pauseAfter: 0.6,
    },
    {
      id: "index-hash",
      text: "The kind matters. A hash index goes straight to one email, but ask it for a range, and Postgres reads the whole table again.",
      pauseAfter: 0.8,
    },

    // ── 3. When an index hurts ────────────────────────────────────────────
    {
      id: "hurt",
      scene: true,
      text: "Question three. When does an index help, and when does it hurt? It helps selective reads: equality, ranges, joins, and sorts on the column.",
      pauseAfter: 0.5,
    },
    {
      id: "hurt-half",
      text: "It does nothing when most rows match. Half the users are active, and even with an index on that column, Postgres scans the table: one pass beats half a million jumps.",
      pauseAfter: 0.7,
    },
    {
      id: "hurt-writes",
      text: "And every index costs writes. Ten thousand inserts wrote ten thousand log records with no index, and forty thousand with three, because each insert updates every index too.",
      pauseAfter: 0.6,
    },
    {
      id: "hurt-space",
      text: "They take space as well: together, the users table's three indexes are bigger than the table itself.",
      pauseAfter: 0.6,
    },
    {
      id: "hurt-rule",
      text: "So index the columns you filter and join on, not every column.",
      pauseAfter: 0.8,
    },

    // ── 4. Composite indexes ──────────────────────────────────────────────
    {
      id: "composite",
      scene: true,
      text: "Question four. What is a composite index, and why does column order matter? It sorts by its first column, then by the second within each value of the first, like a phone book: last name, then first name.",
      pauseAfter: 0.5,
    },
    {
      id: "composite-prefix",
      text: "So it serves a left prefix: every Lovelace, or Ada Lovelace, but not every Ada.",
      pauseAfter: 0.7,
    },
    {
      id: "composite-run",
      text: "An index on customer, then order time, finds customer forty-two's ten latest orders in thirteen pages, already newest first, with no sort.",
      pauseAfter: 0.6,
    },
    {
      id: "composite-day",
      text: "Ask it for one day across all customers, and Postgres reads the table instead.",
      pauseAfter: 0.6,
    },
    {
      id: "composite-swap",
      text: "Swap the two columns, and the same ten orders cost over eighteen hundred pages.",
      pauseAfter: 0.6,
    },
    {
      id: "composite-rule",
      text: "So order the columns by your queries: equality first, then the range or the sort.",
      pauseAfter: 0.6,
    },
    {
      id: "composite-skip",
      text: "Postgres eighteen added a skip scan, which uses an index without its first column when that column has few values. On status, then order time, one day took five index searches and never touched the table.",
      pauseAfter: 0.8,
    },

    // ── 5. Reading a plan ─────────────────────────────────────────────────
    {
      id: "plan-q",
      scene: true,
      text: "Question five. How do you read a query plan? Explain analyze runs the query and prints its plan as a tree: the indented step runs first and feeds the one above it.",
      pauseAfter: 0.5,
    },
    {
      id: "plan-look",
      text: "Read three things: the kind of scan, the estimated rows against the actual rows, and the rows a filter threw away.",
      pauseAfter: 0.6,
    },
    {
      id: "plan-bad",
      text: "This count of one day's orders scans the table, though order time has an index. It expected five thousand rows, found two thousand seven hundred thirty-two, and threw away nearly a million.",
      pauseAfter: 0.6,
    },
    {
      id: "plan-why",
      text: "The cause is the filter. It turns each timestamp into a date, and an index on a column can't search a function of it.",
      pauseAfter: 0.6,
    },
    {
      id: "plan-fix",
      text: "Write it as a range on the column itself, and the plan becomes an index-only scan, with an estimate that's exactly right.",
      pauseAfter: 0.6,
    },
    {
      id: "plan-sarg",
      text: "That's a sargable filter: one the index can search. The other usual fixes are a new index, and fresh statistics.",
      pauseAfter: 0.8,
    },

    // ── 6. A join that inflates a sum ─────────────────────────────────────
    {
      id: "fanout",
      scene: true,
      text: "Question six. Why can a join inflate a sum, and how do you fix it? Joining to a one-to-many table repeats each row once per match.",
      pauseAfter: 0.5,
    },
    {
      id: "fanout-run",
      text: "Join the page's twenty-four orders to their line items, to count those too, and each order repeats once per item: forty-eight rows, and the revenue more than doubles. Sara's three hundred four dollars becomes nine hundred twelve, since both her orders have three items.",
      pauseAfter: 0.7,
    },
    {
      id: "fanout-fix",
      text: "Fix it by aggregating the many side to the right grain first: count the items per order, then join. One row per order, and the revenue is right again.",
      pauseAfter: 0.6,
    },
    {
      id: "fanout-check",
      text: "The error multiplies, so a small sample can hide it. Check the row count before and after every join.",
      pauseAfter: 0.8,
    },

    // ── 7. Transactions ───────────────────────────────────────────────────
    {
      id: "txn",
      scene: true,
      text: "Question seven. What is a transaction, and how do you use one? It groups statements so they succeed or fail as one: begin, run them, then commit, or roll back.",
      pauseAfter: 0.5,
    },
    {
      id: "txn-run",
      text: "Here's a transfer of thirty. The debit takes account one to seventy. Then recording the transfer fails: account ninety-nine doesn't exist, and the foreign key refuses it.",
      pauseAfter: 0.6,
    },
    {
      id: "txn-abort",
      text: "Postgres now refuses every statement until the transaction ends. Roll back, and account one is at a hundred again. The application's job is to catch the error, roll back, and retry or report it, never carry on.",
      pauseAfter: 0.6,
    },

    // ── 8, 9. Isolation levels and anomalies ──────────────────────────────
    {
      id: "levels",
      scene: true,
      text: "Question eight. What are the SQL isolation levels? The standard names four: read uncommitted, read committed, repeatable read, and serializable. Each is defined by the anomalies it rules out, not by how it's built, and defaults differ: Postgres uses read committed.",
      pauseAfter: 0.5,
    },
    {
      id: "anomalies",
      text: "Question nine. What anomalies do isolation levels prevent? Three classic ones.",
      pauseAfter: 0.4,
    },
    {
      id: "anomalies-dirty",
      text: "A dirty read sees another transaction's change before it commits. Here another transaction set the balance to fifty, uncommitted. Postgres never shows it: at all four levels, even read uncommitted, the read says a hundred.",
      pauseAfter: 0.7,
    },
    {
      id: "anomalies-nonrep",
      text: "A non-repeatable read: read a row twice, another transaction commits a change in between, and the second read differs. Read committed allows it; repeatable read prevents it.",
      pauseAfter: 0.6,
    },
    {
      id: "anomalies-phantom",
      text: "A phantom: rerun a query, and new rows match, because another transaction inserted them. The standard stops phantoms only at serializable; Postgres's repeatable read already does.",
      pauseAfter: 0.6,
    },
    {
      id: "anomalies-serial",
      text: "Serializable promises an outcome some one-at-a-time order could give. In exchange, Postgres may abort a transaction with a serialization failure, to be retried.",
      pauseAfter: 0.8,
    },

    // ── 10. Optimistic and pessimistic locking ────────────────────────────
    {
      id: "lock",
      scene: true,
      text: "Question ten. What is an optimistic versus pessimistic locking strategy? Pessimistic locks first: select for update locks the row until commit, and any other transaction that wants to change or lock it waits.",
      pauseAfter: 0.5,
    },
    {
      id: "lock-pess-run",
      text: "Here another transaction holds account one. Asked not to wait, Postgres refuses: it could not obtain the lock. Account two is free.",
      pauseAfter: 0.6,
    },
    {
      id: "lock-opt",
      text: "Optimistic takes no lock. Read a version number with the row, and write only if it hasn't changed.",
      pauseAfter: 0.6,
    },
    {
      id: "lock-opt-run",
      text: "Two clients read version three. One writes, and the version becomes four. The other's write, still expecting three, changes nothing. It rereads, and retries.",
      pauseAfter: 0.6,
    },
    {
      id: "lock-choose",
      text: "Optimistic wins when conflicts are rare, since one costs only a retry. Pessimistic wins when they're frequent, and retries would pile up.",
      pauseAfter: 0.8,
    },

    // ── 11. Deadlocks, from the database's side ───────────────────────────
    {
      id: "deadlock",
      scene: true,
      text: "Question eleven. What is a deadlock, and how do you avoid it? A cycle of transactions, each holding a lock another one needs.",
      pauseAfter: 0.5,
    },
    {
      id: "deadlock-cycle",
      text: "Two transfers start together. One locks account one, then wants account two. The other locks account two, then wants account one. Neither can go on.",
      pauseAfter: 0.6,
    },
    {
      id: "deadlock-detect",
      text: "Postgres waits one second, its deadlock timeout, then looks for a cycle. It finds this one and aborts a transaction, the victim, with a deadlock error. The other finishes, and the application retries the victim.",
      pauseAfter: 0.6,
    },
    {
      id: "deadlock-order",
      text: "To avoid it, take locks in one global order, say the lowest account ID first: the second transfer then simply waits, and no cycle forms. Keep transactions short, and use the lowest isolation level that's correct.",
      pauseAfter: 0.6,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Five more, a sentence or two each.",
      pauseAfter: 0.5,
    },
    {
      id: "r-acid",
      text: "ACID: atomicity, all or nothing; consistency, every constraint holds; isolation, concurrent transactions don't corrupt each other; durability, a commit survives a crash.",
      pauseAfter: 0.6,
    },
    {
      id: "r-norm",
      text: "Normalization stores each fact once, so no update leaves copies disagreeing, which suits write-heavy systems. Denormalization repeats data to skip joins, buying read speed with storage and harder updates. Normalize first; denormalize where profiling blames a join.",
      pauseAfter: 0.6,
    },
    {
      id: "r-joins",
      text: "Joins differ in which unmatched rows survive. Inner keeps only matches: twenty-four rows. Left keeps every customer, with nulls where there's no order: thirty, for the six who never ordered. Right mirrors it, and full keeps both sides.",
      pauseAfter: 0.6,
    },
    {
      id: "r-keys",
      text: "A primary key identifies each row: unique, never null, and indexed automatically. A foreign key points at another table's primary key, so no order can name a missing customer. Postgres doesn't index the foreign key's column for you.",
      pauseAfter: 0.6,
    },
    {
      id: "r-cover",
      text: "A covering index holds every column a query needs, so Postgres answers from the index alone, with zero trips to the table, at the price of a wider index.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Isolation, locks and deadlocks are the database's side of one problem: many requests arriving at once. Next: concurrency.",
    },
  ],
};
