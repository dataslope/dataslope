import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Distributed processing" (16:9), Part 7 of the Data Engineer
 * interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/distributed-processing.mdx. It answers all
 * seventeen of the page's questions, none moved in from another page:
 * fourteen worked through, numbered aloud in the page's words, then three
 * quick ones (numbered 15 to 17 on screen only).
 *
 *   1. What is the MapReduce mental model? ("mr").
 *   2. How is Spark different from classic Hadoop MapReduce? ("hadoop").
 *   3. What is the difference between a transformation and an action in
 *      Spark? 4. Why does Spark use lazy evaluation? ("lazy").
 *   5. What is a partition in Spark, and why does partition count matter?
 *      ("partitions").
 *   6. What is the difference between narrow and wide dependencies?
 *      ("narrow").
 *   7. What is a shuffle, and why is it expensive? ("shuffle").
 *   8. What is a stage and a task in Spark's execution model? ("stage").
 *   9. What is data skew, and how do you fix it? ("skew").
 *   10. What is a broadcast join and when should you use it? 11. What is a
 *       sort-merge join, and how does it differ from a broadcast join?
 *       ("broadcast").
 *   12. What is groupByKey vs reduceByKey, and why does it matter?
 *       ("reduce"; read "group by key versus reduce by key").
 *   13. How does Spark achieve fault tolerance? 14. What does
 *       caching/persisting do, and when is it worth it? ("lineage"; read
 *       "caching or persisting").
 *   Quick ("rapid-in"): 15. the difference between a Spark RDD and a
 *   DataFrame; 16. why avoid collect() on a large DataFrame; 17. predicate
 *   and projection pushdown.
 *
 * Reuse. Question 1's MapReduce runs on the course video PandasGroupby's
 * seven-row frame (its measurements.json), so its reduce is that video's
 * split, apply and combine, with the same three sums; the row cards, their
 * department colors and the card flight are copied from its kit.tsx into
 * parts.tsx. Question 12 comes back to the same seven rows. The page's charts
 * memory-latency-ladder (question 7) and tail-latency-fanout (question 8)
 * are redrawn from their own source, read by check.mjs. Nothing else in the
 * Data Analyst or Data Scientist series asks these questions.
 *
 * Opening and bridge. The video opens where Part 6's bridge leaves off (the
 * data outgrows one machine) without saying so, since it also plays on its
 * own, and promises the three things its answers turn on: how the work is
 * split, what crosses the network, and a machine that is slow or dies. It
 * ends on Part 8's subject, data that never stops arriving.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. No Spark runs here. check.mjs writes results.json, which data.ts
 * reads; every number is one of these, and the narration calls a model a
 * model:
 *   - "mr": PandasGroupby's frame (pandas 3.0.5), three input splits (rows
 *     0 to 2, 3 and 4, 5 and 6), mapped to (dept, salary) and reduced in
 *     Pyodide 314.0.7: engineering 388, ops 172, sales 205, PandasGroupby's
 *     own sums (check.mjs stops if they differ). Seven pairs cross the
 *     shuffle.
 *   - "reduce": the same splits with a map-side combine send six partial
 *     sums (split one adds its two engineering salaries). The model: a
 *     million clicks over a thousand products, four partitions of 250,000
 *     (seed 12): groupByKey shuffles 1,000,000 values, reduceByKey 4,000
 *     partial counts, 250 times fewer.
 *   - "partitions": arithmetic on the video's own sixteen gigabytes and
 *     sixteen cores: 4 partitions of 4 GB (12 cores idle), 100,000 of
 *     160 KB, 64 of 250 MB (four per core). The page's rule: a few hundred MB
 *     a partition, at least as many as cores, often two to four times.
 *   - "shuffle": charts/memory-latency-ladder.mjs: main memory 100 ns, an
 *     NVMe SSD read 100,000 ns (1,000 times), a network round trip 10 ms
 *     (100,000 times); with an L1 hit stretched to one second, the chart's
 *     own column says main memory 2 min and a round trip 116 days. (The page's
 *     prose says the SSD is four orders of magnitude from memory; its chart
 *     says three. The video follows the chart.)
 *   - "stage": charts/tail-latency-fanout.mjs, 1 - 0.99^n: 69 tasks are
 *     slow half the time (0.5002), 200 tasks 87% (0.866).
 *   - "skew": the model, seed 5: a million rows over 10,000 users in eight
 *     partitions by hash of the key, with "guest" on 30.0%: the guest's
 *     partition holds 387,836 rows, 3.1 times the 125,000 average; salted
 *     with a suffix 0 to 7, the largest holds 125,402 (1.0 times), and the
 *     two-step count adds eight partials of about 37,500 back to 300,079.
 *   - "broadcast": the page's concept check's 2 TB fact table and 20 MB
 *     lookup, on the video's own fifty executors: 1 GB broadcast against
 *     about 2 TB shuffled.
 *
 * Written for Drew's ear: SQL is said "sequel", RDD is expanded where it is
 * first said (resilient distributed dataset), and MapReduce, Hadoop, Spark
 * and Parquet each get a short gloss where they first matter. Method names
 * are said as words ("group by key", "collect"); the screen keeps the code.
 * Numbers as they are said.
 */
export const script: NarrationScript = {
  id: "de-distributed",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "The table no longer fits on one machine. So you cut it into pieces, give each machine one, and bring their answers back together.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-three",
      text: "The questions come down to three things: how the work is split, what has to cross the network, and what happens when a machine is slow, or dies.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Seventeen questions: fourteen worked through, then three quick ones.",
      pauseAfter: 0.7,
    },

    // ── 1. MapReduce ──────────────────────────────────────────────────────
    {
      id: "mr",
      scene: true,
      text: "Question one. What is the MapReduce mental model? MapReduce, a model for running one job across many machines, has two phases with a shuffle between them. Take seven salaries, spread over three machines.",
      pauseAfter: 0.5,
    },
    {
      id: "mr-map",
      text: "Map runs on every split at once, and turns each row into a key and a value: here, the department and the salary.",
      pauseAfter: 0.5,
    },
    {
      id: "mr-shuffle",
      text: "Then the shuffle sends every pair to the machine that owns its key, so all of engineering lands in one place.",
      pauseAfter: 0.5,
    },
    {
      id: "mr-reduce",
      text: "Reduce adds up each key's values: three hundred eighty-eight for engineering, a hundred seventy-two for ops, two hundred five for sales. It's a group by, spread across machines.",
      pauseAfter: 0.7,
    },
    {
      id: "mr-why",
      text: "It scales because map tasks are independent, and the framework handles failures. Its cost is the shuffle: moving data across the network.",
      pauseAfter: 0.7,
    },

    // ── 2. Spark against Hadoop MapReduce ─────────────────────────────────
    {
      id: "hadoop",
      scene: true,
      text: "Question two. How is Spark different from classic Hadoop MapReduce? Hadoop, the open-source MapReduce system, writes its results to disk between every map and reduce.",
      pauseAfter: 0.5,
    },
    {
      id: "hadoop-spark",
      text: "Spark, a newer cluster engine, keeps intermediate results in memory, spilling to disk only under pressure. Multi-step and iterative work, like machine learning, runs much faster.",
      pauseAfter: 0.5,
    },
    {
      id: "hadoop-api",
      text: "It also adds DataFrames, sequel and streaming, and optimizes whole queries.",
      pauseAfter: 0.7,
    },

    // ── 3, 4. Transformations, actions, laziness ──────────────────────────
    {
      id: "lazy",
      scene: true,
      text: "Question three. What is the difference between a transformation and an action in Spark? Transformations, like filter, group by and join, are lazy: each adds a step to a plan, and nothing runs.",
      pauseAfter: 0.5,
    },
    {
      id: "lazy-action",
      text: "Here only show is an action: it makes Spark compile the plan, schedule it and run it. Count, collect and write are actions too.",
      pauseAfter: 0.7,
    },
    {
      id: "lazy-why",
      text: "Question four. Why does Spark use lazy evaluation? So the optimizer sees the whole plan before anything runs, and can rewrite it.",
      pauseAfter: 0.4,
    },
    {
      id: "lazy-rewrite",
      text: "It pushes the filter into the scan, so less is read, prunes unused columns, fuses chained steps, and picks the join strategy. Run step by step, and none of that is possible.",
      pauseAfter: 0.7,
    },

    // ── 5. Partitions ─────────────────────────────────────────────────────
    {
      id: "partitions",
      scene: true,
      text: "Question five. What is a partition in Spark, and why does partition count matter? A partition is the unit of parallelism: one task works on one partition, on one core. Model it with sixteen gigabytes on sixteen cores.",
      pauseAfter: 0.5,
    },
    {
      id: "part-few",
      text: "In four partitions of four gigabytes, twelve cores sit idle, and a partition that big can run out of memory.",
      pauseAfter: 0.4,
    },
    {
      id: "part-many",
      text: "In a hundred thousand of a hundred sixty kilobytes, scheduling the tiny tasks costs more than their work.",
      pauseAfter: 0.5,
    },
    {
      id: "part-right",
      text: "The rough target: a few hundred megabytes a partition, and two to four times as many partitions as cores. Sixty-four of two hundred fifty megabytes meets both.",
      pauseAfter: 0.6,
    },
    {
      id: "part-change",
      text: "Repartition shuffles to any count. Coalesce only merges partitions, with no full shuffle: the cheap way to cut the count before writing.",
      pauseAfter: 0.7,
    },

    // ── 6. Narrow and wide ────────────────────────────────────────────────
    {
      id: "narrow",
      scene: true,
      text: "Question six. What is the difference between narrow and wide dependencies? In a narrow one, like map, filter or union, each parent partition feeds at most one child: rows stay put, and steps run back to back.",
      pauseAfter: 0.5,
    },
    {
      id: "narrow-wide",
      text: "In a wide one, a child needs rows from many parents, as in group by key, join and distinct. That forces a shuffle.",
      pauseAfter: 0.7,
    },

    // ── 7. The shuffle ────────────────────────────────────────────────────
    {
      id: "shuffle",
      scene: true,
      text: "Question seven. What is a shuffle, and why is it expensive? It moves rows so that every row with one key lands in one partition. Map tasks write their output to local disk, and reduce tasks fetch it over the network.",
      pauseAfter: 0.5,
    },
    {
      id: "shuffle-ladder",
      text: "From the page's latency chart: an SSD read takes a thousand times as long as memory, and a network round trip a hundred thousand times. If the fastest cache took one second, a round trip would take a hundred sixteen days.",
      pauseAfter: 0.6,
    },
    {
      id: "shuffle-tune",
      text: "So tuning Spark is mostly about fewer shuffles, with less data in each.",
      pauseAfter: 0.7,
    },

    // ── 8. Stages and tasks ───────────────────────────────────────────────
    {
      id: "stage",
      scene: true,
      text: "Question eight. What is a stage and a task in Spark's execution model? One action starts a job. Spark cuts it into stages at every wide dependency, so counting shuffles counts stages.",
      pauseAfter: 0.4,
    },
    {
      id: "stage-tasks",
      text: "Each stage is a set of tasks, one per partition, running the same narrow steps in parallel, and it ends only when its last task does.",
      pauseAfter: 0.5,
    },
    {
      id: "stage-tail",
      text: "From the page's fan-out chart: if each task has a one percent chance of being slow, a stage of sixty-nine tasks is slow half the time, and one of two hundred, eighty-seven percent of the time.",
      pauseAfter: 0.7,
    },

    // ── 9. Skew and salting ───────────────────────────────────────────────
    {
      id: "skew",
      scene: true,
      text: "Question nine. What is data skew, and how do you fix it? Skew is a few partitions holding far more data than the rest, usually because one key is common: a null, a guest user, one huge customer.",
      pauseAfter: 0.5,
    },
    {
      id: "skew-model",
      text: "Model it: a million rows in eight partitions, with a guest key on thirty percent. The average partition holds a hundred twenty-five thousand rows. The guest's holds three hundred eighty-eight thousand, three point one times as many, and every core waits for it.",
      pauseAfter: 0.6,
    },
    {
      id: "skew-salt",
      text: "The fix is salting: add a random suffix, zero to seven, to the hot key, so it spreads over all eight partitions. Now the largest holds about the average, which never moved. The stage waits for the largest.",
      pauseAfter: 0.5,
    },
    {
      id: "skew-steps",
      text: "Then aggregate in two steps, by the salted key and then by the key. Or handle nulls and stand-in keys separately, or let adaptive query execution split skewed partitions.",
      pauseAfter: 0.7,
    },

    // ── 10, 11. Broadcast and sort-merge joins ────────────────────────────
    {
      id: "broadcast",
      scene: true,
      text: "Question ten. What is a broadcast join and when should you use it? Ship the small table, whole, to every executor, and join the big one where it sits, with no shuffle. Use it when one side fits comfortably in memory, like a lookup table.",
      pauseAfter: 0.5,
    },
    {
      id: "bc-model",
      text: "The page's case: a two terabyte fact table and a twenty megabyte lookup. Broadcast to fifty executors, that's one gigabyte on the network. Below a size threshold, Spark broadcasts by itself, and a hint forces it.",
      pauseAfter: 0.7,
    },
    {
      id: "smj",
      text: "Question eleven. What is a sort-merge join, and how does it differ from a broadcast join? It's Spark's default for two large tables: shuffle both sides on the join key, sort each partition, then merge them in one pass.",
      pauseAfter: 0.5,
    },
    {
      id: "smj-cost",
      text: "It handles any size, but here it would shuffle about two terabytes, against one gigabyte. Broadcast when one side is small, and sort-merge when both are large.",
      pauseAfter: 0.7,
    },

    // ── 12. groupByKey against reduceByKey ────────────────────────────────
    {
      id: "reduce",
      scene: true,
      text: "Question twelve. What is group by key versus reduce by key, and why does it matter? Back to the seven salaries: group by key shuffles all seven pairs, and adds them up after.",
      pauseAfter: 0.5,
    },
    {
      id: "reduce-combine",
      text: "Reduce by key combines on each partition first: the first machine adds its two engineering salaries before anything moves, so six sums cross, not seven.",
      pauseAfter: 0.6,
    },
    {
      id: "reduce-model",
      text: "On seven rows that's small. Model a million clicks over a thousand products in four partitions: group by key shuffles a million values, reduce by key four thousand, two hundred fifty times fewer.",
      pauseAfter: 0.5,
    },
    {
      id: "reduce-prefer",
      text: "Group by key also piles every value of a hot key into one task's memory. Prefer reduce by key, or a DataFrame group by, which also combines locally, whenever the aggregation is associative.",
      pauseAfter: 0.7,
    },

    // ── 13, 14. Lineage and caching ───────────────────────────────────────
    {
      id: "lineage",
      scene: true,
      text: "Question thirteen. How does Spark achieve fault tolerance? Through lineage, the resilient in RDD, a resilient distributed dataset: each RDD or DataFrame records the steps that produced it, not the data.",
      pauseAfter: 0.5,
    },
    {
      id: "lineage-lost",
      text: "When an executor dies and a partition is lost, Spark replays those steps for that partition alone, instead of restarting the job. Checkpointing cuts a very long lineage short, by saving a copy to reliable storage.",
      pauseAfter: 0.7,
    },
    {
      id: "cache",
      text: "Question fourteen. What does caching or persisting do, and when is it worth it? It keeps a DataFrame's computed partitions in memory, so the next action reuses them instead of replaying the lineage.",
      pauseAfter: 0.5,
    },
    {
      id: "cache-when",
      text: "Two actions on one filtered table read the source twice without a cache, and once with one. It pays when a result feeds several actions, like an iterative algorithm. Used once, it wastes memory. And caching is lazy: it fills on the first action.",
      pauseAfter: 1.0,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Three quick ones to close.",
      pauseAfter: 0.5,
    },
    {
      id: "r-rdd",
      text: "An RDD is a low-level collection of objects Spark can't see inside. A DataFrame has a schema, so the Catalyst optimizer can push filters down, prune columns and generate code. Prefer DataFrames; use RDDs only for logic they can't express.",
    },
    {
      id: "r-collect",
      text: "Collect pulls every row to the driver, one machine, which runs out of memory and undoes the distributing. To look, use show or take. To save, write from the executors in parallel.",
    },
    {
      id: "r-push",
      text: "Predicate pushdown filters at the file scan: Parquet, a columnar file format, stores each row group's minimum and maximum, so the reader skips groups that can't match. Projection pushdown reads only the columns the query names. DataFrames get both for free.",
      pauseAfter: 1.2,
    },
    {
      id: "next",
      text: "Every answer here assumed the data had finished arriving. In streaming, it never does. Next: streaming and messaging.",
    },
  ],
};
