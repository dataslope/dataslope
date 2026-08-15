/**
 * Counts the polars blocks that collect a `scan_*`-sourced LazyFrame, which
 * cannot run in the reader's browser: the Pyodide wheel is built without
 * `new-streaming`, so executing anything beyond metadata-only queries on a
 * scan source panics at any file size (this is not a dataset-size problem —
 * that is the separate >1 MiB mmap panic `runtime/polarsWasm.ts` fixes).
 *
 * `read_csv(...).lazy()` runs the same chain fine, but its plan prints
 * `DF [...]` instead of `Csv SCAN [...]` with `SELECTION:` pushed into it —
 * lessons that are *about* predicate pushdown keep `scan_csv` and are counted
 * here. The baseline is a ceiling, not a target: adding one fails this check,
 * fixing some means lowering it.
 *
 * Usage: node scripts/check-polars-scan.mjs [--list]
 */
import { extractBlocks, extractChallengeCards } from "./lib/mdx-blocks.mjs";

/** A LazyFrame built from a file scan. */
const SCAN = /\bscan_(?:csv|parquet|ipc|ndjson)\s*\(/;
/** …and executed. `collect_all` is the plural form `eager-vs-lazy` uses. */
const COLLECT = /\.collect\s*\(|\bcollect_all\s*\(/;

/** How many exist today. One of the eight raises its lesson's own error
 *  before reaching the engine; it is counted anyway — the rule is
 *  deliberately syntactic, and guessing which plans reach the engine would be
 *  the fragile part. */
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
