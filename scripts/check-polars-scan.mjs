/**
 * Counts the polars blocks that collect a `scan_*`-sourced LazyFrame, which
 * cannot run in the reader's browser.
 *
 * ── The measurement ─────────────────────────────────────────────────────
 * There are two independent walls, and it took swapping the dataset to tell
 * them apart:
 *
 *   1. **Size.** Polars memory-maps a file it is handed by *path*, and above
 *      exactly 1 MiB the mmap reader builds a Rayon pool (measured: 1,000,004
 *      bytes reads, 1,048,609 panics). wasm has no threads to give it, so it
 *      panics with `could not spawn threads`. `runtime/polarsWasm.ts` routes
 *      the *eager* readers around this by handing polars the bytes instead.
 *
 *   2. **The engine.** The Pyodide wheel is built without `new-streaming`, and
 *      a LazyFrame whose source is a `scan_*` needs it to execute *anything*.
 *      `scan_csv(...).select(pl.len()).collect()` works, because the optimizer
 *      answers that from CSV metadata without executing. Add a `filter`, a
 *      `head` or a `group_by` and it panics with `invalid build. Missing
 *      feature new-streaming` — on a 15 KB file as readily as on a 2.5 MB one.
 *      No `engine=` argument and no `POLARS_*_NEW_STREAMING` env var changes
 *      it.
 *
 * So this is **not** a dataset-size problem, and a smaller diamonds file does
 * not fix it. That was tried: with a 15,000-row sample the mmap panic goes
 * away entirely and the polars course goes from 165 to 168 runnable blocks,
 * because only the `explain()`-only ones come back. The other six still panic
 * on `collect()`.
 *
 * ── What does work ──────────────────────────────────────────────────────
 * `read_csv(...).lazy()` — an in-memory source needs no streaming engine, so
 * the same filter/group_by/sort/collect chain runs fine, and with the eager
 * shim it runs at any file size. What it costs is the plan: the source prints
 * as `DF [...]` instead of `Csv SCAN [diamonds.csv]`, and the filter stays a
 * node above it rather than becoming `SELECTION:` inside the scan. For a
 * lesson that is *about* predicate pushdown into a file reader, that is the
 * one thing that cannot be traded away, which is why these blocks are still
 * written with `scan_csv` and still counted here.
 *
 * The baseline is a ceiling, not a target: a pull request that adds another
 * one fails this check, and one that fixes some is told to lower it.
 *
 * Usage: node scripts/check-polars-scan.mjs [--list]
 */
import { extractBlocks, extractChallengeCards } from "./lib/mdx-blocks.mjs";

/** A LazyFrame built from a file scan. */
const SCAN = /\bscan_(?:csv|parquet|ipc|ndjson)\s*\(/;
/** …and executed. `collect_all` is the plural form `eager-vs-lazy` uses. */
const COLLECT = /\.collect\s*\(|\bcollect_all\s*\(/;

/**
 * How many exist today.
 *
 * Seven of these panic. The eighth, the misspelled-column demo in
 * `data-types-and-schemas`, resolves its (bad) schema before execution starts
 * and so raises the error the lesson is about rather than the engine's — it is
 * counted anyway, because the rule here is deliberately syntactic and a rule
 * that tried to guess which plans reach the engine would be the fragile part.
 */
const BASELINE = 8;

const listOnly = process.argv.includes("--list");

const units = [
  ...extractBlocks()
    .filter((b) => !b.unparsable)
    .map((b) => ({ file: b.file, line: b.line, kind: "block", code: b.code })),
  ...extractChallengeCards()
    .filter((c) => !c.unparsable)
    .map((c) => ({
      file: c.file,
      line: c.line,
      kind: "card",
      code: c.files.map((f) => `${f.initCode ?? ""}\n${f.solutionSource ?? ""}`).join("\n"),
    })),
];

const offenders = units.filter(
  (u) => SCAN.test(u.code ?? "") && COLLECT.test(u.code ?? ""),
);

if (listOnly || offenders.length !== BASELINE) {
  for (const o of offenders) console.log(`  ${o.file}:${o.line} (${o.kind})`);
}

if (listOnly) process.exit(0);

if (offenders.length > BASELINE) {
  console.error(
    `\n✗ check-polars-scan: ${offenders.length} block(s) collect a scan-sourced ` +
      `LazyFrame, up from ${BASELINE}. Those panic in the reader's browser at any ` +
      `file size. Use \`pl.read_csv(...).lazy()\`, which runs the same chain, unless ` +
      `the lesson is specifically about the \`Csv SCAN\` plan.`,
  );
  process.exit(1);
}

if (offenders.length < BASELINE) {
  console.error(
    `\n✗ check-polars-scan: only ${offenders.length} left, baseline says ${BASELINE}. ` +
      `Lower BASELINE in this file to lock the fix in.`,
  );
  process.exit(1);
}

console.log(
  `check-polars-scan: ${offenders.length} known block(s) collect a scan-sourced ` +
    `LazyFrame, which the Pyodide polars build cannot execute (unchanged from the ` +
    `baseline); run with --list to see them`,
);
