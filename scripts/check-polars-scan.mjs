/**
 * Counts the polars blocks that scan a file too big to read in wasm.
 *
 * `pl.scan_csv("diamonds.csv")` panics in the reader's browser. Polars
 * memory-maps a file it is handed by path, and above a megabyte the mmap
 * reader builds a Rayon pool; the site is not cross-origin isolated, so there
 * are no threads for it and the `.unwrap()` panics — schema inference alone is
 * enough, so even `.explain()` fails. `app/_components/runtime/polarsWasm.ts`
 * fixes the eager readers by handing polars the bytes instead, and cannot fix
 * the lazy ones: the Pyodide wheel has no `new-streaming` feature, so
 * `scan_csv(BytesIO(...))` raises `invalid build`.
 *
 * Rewriting these as `read_csv(...).lazy()` would make them run and would make
 * them lie. The plan changes from
 *
 *     Csv SCAN [diamonds.csv] / PROJECT 2/8 COLUMNS / SELECTION: […]
 *
 * to a `DF [...]` source with the filter left sitting above it, and the lessons
 * that scan a big file are lessons *about* that plan. The real fix is a
 * dataset under the threshold in the `dataslope/datasets` repo, which is not
 * this repo.
 *
 * So they stay broken and counted. The baseline below is a ceiling, not a
 * target: a pull request that adds another one fails this check, and a pull
 * request that fixes some is told to lower it.
 *
 * Usage: node scripts/check-polars-scan.mjs [--list]
 */
import { fetchDatasetBytes } from "./lib/datasets.mjs";
import { extractBlocks, extractChallengeCards } from "./lib/mdx-blocks.mjs";

/** Bytes above which polars' mmap reader wants a thread pool. Measured on
 *  diamonds.csv: 0.91 MiB reads, 1.82 MiB panics. */
const MMAP_LIMIT = 1024 * 1024;

/** How many such blocks exist today, all of them in the three lessons about
 *  laziness and the optimizer. Lower it when one is fixed. */
const BASELINE = 12;

const listOnly = process.argv.includes("--list");

const units = [
  ...extractBlocks().filter((b) => !b.unparsable).map((b) => ({ ...b, kind: "block" })),
  ...extractChallengeCards()
    .filter((c) => !c.unparsable)
    .map((c) => ({
      ...c,
      kind: "card",
      code: c.files.map((f) => `${f.initCode ?? ""}\n${f.solutionSource ?? ""}`).join("\n"),
    })),
];

/** Sizes of the datasets a unit stages, keyed by the name code sees. */
const sizeCache = new Map();
async function stagedSizes(datasets) {
  const sizes = new Map();
  for (const d of datasets ?? []) {
    if (!sizeCache.has(d.path)) {
      try {
        sizeCache.set(d.path, (await fetchDatasetBytes(d.path)).length);
      } catch {
        sizeCache.set(d.path, 0);
      }
    }
    sizes.set(d.stageAs, sizeCache.get(d.path));
  }
  return sizes;
}

const offenders = [];
for (const u of units) {
  const scans = [...(u.code ?? "").matchAll(/\bscan_(?:csv|parquet|ipc|ndjson)\(\s*["']([^"']+)["']/g)];
  if (scans.length === 0) continue;
  const sizes = await stagedSizes(u.datasets);
  for (const m of scans) {
    const size = sizes.get(m[1]);
    if (size !== undefined && size > MMAP_LIMIT) {
      offenders.push({ file: u.file, line: u.line, kind: u.kind, dataset: m[1], size });
    }
  }
}

if (listOnly || offenders.length !== BASELINE) {
  for (const o of offenders) {
    console.log(
      `  ${o.file}:${o.line} (${o.kind}) scans ${o.dataset}, ${(o.size / 1048576).toFixed(2)} MiB`,
    );
  }
}

if (listOnly) process.exit(0);

if (offenders.length > BASELINE) {
  console.error(
    `\n✗ check-polars-scan: ${offenders.length} block(s) scan a file over ` +
      `${MMAP_LIMIT / 1024} KiB by path, up from ${BASELINE}. Each of these panics in ` +
      `the reader's browser. Use an eager read (\`pl.read_csv(...).lazy()\`, which the ` +
      `wasm shim makes work at any size) or a smaller dataset.`,
  );
  process.exit(1);
}

if (offenders.length < BASELINE) {
  console.error(
    `\n✗ check-polars-scan: only ${offenders.length} offending block(s) left, ` +
      `baseline says ${BASELINE}. Lower BASELINE in this file to lock the fix in.`,
  );
  process.exit(1);
}

console.log(
  `check-polars-scan: ${offenders.length} known block(s) scan a file polars cannot ` +
    `mmap in wasm (unchanged from the baseline); run with --list to see them`,
);
