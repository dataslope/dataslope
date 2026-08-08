/**
 * Runs every Python `<CodeBlock>` in `content/` and reports the ones that
 * raise.
 *
 * These blocks are the part of a lesson a reader actually executes, and
 * nothing else in the repo checks them: `check-prose` lints the words,
 * `check-mcq` lints the questions, and `check-challenge-cards` covers the
 * other half of the runnable content. A block that stopped working because a
 * library deprecated an argument therefore ships silently and fails in the
 * reader's browser, which is how `freq="H"` survived into pandas 3.
 *
 * The site executes these in Pyodide in a worker; this boots the same Pyodide
 * build once in Node and runs each block in a fresh namespace, which turns a
 * multi-hour browser sweep into a couple of minutes. The interpreter setup
 * that makes it a fair mirror lives in lib/pyodide-runner.mjs, and the MDX
 * parsing in lib/mdx-blocks.mjs; both are shared with the challenge-card
 * sweep.
 *
 * Usage:
 *   node scripts/check-code-blocks.mjs [--filter <substr>[,<substr>…]] [--list]
 *                                      [--json <path>]
 *
 * `--filter` takes a comma-separated list, which is how CI checks only the
 * lessons a pull request touched instead of all of them.
 */
import { writeFileSync } from "node:fs";

import { extractBlocks, matchesFilter, parseFilter } from "./lib/mdx-blocks.mjs";
import { bootPyodide, isEnvironmental } from "./lib/pyodide-runner.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};

const filter = parseFilter(flag("--filter"));
const allBlocks = extractBlocks();
const blocks = filter ? allBlocks.filter((b) => matchesFilter(filter, b.file)) : allBlocks;

// Say what was selected and what that leaves out. A filtered run reporting
// "✓ all blocks pass" without saying it looked at eleven of them is the same
// false comfort the sweeps exist to remove.
if (filter) {
  console.log(
    `check-code-blocks: --filter selected ${blocks.length} of ${allBlocks.length} block(s) ` +
      `from ${filter.length} path(s)`,
  );
  if (blocks.length === 0) {
    console.log("check-code-blocks: nothing to run (no python blocks in those files)");
  }
}

if (args.includes("--list")) {
  for (const b of blocks) console.log(`${b.file}:${b.line}  (${b.code.split("\n").length} lines)`);
  console.log(`\n${blocks.length} python block(s)`);
  process.exit(0);
}

const { run, stage } = await bootPyodide("check-code-blocks");

const failures = [];
let slowest = { ms: 0 };

for (const [i, b] of blocks.entries()) {
  const stageError = await stage(b);
  if (stageError) failures.push({ ...b, error: stageError });

  const { error, full, ms } = await run(b.code);
  if (error) failures.push({ ...b, error, full });

  if (ms > slowest.ms) slowest = { ms, file: b.file, line: b.line };
  // Named progress, so a stall points at the block that caused it rather
  // than at a bare counter.
  if ((i + 1) % 25 === 0) {
    console.log(`  …${i + 1}/${blocks.length}  (${b.file}:${b.line})`);
  }
}

const real = failures.filter((f) => !isEnvironmental(f));
const skipped = failures.filter(isEnvironmental);

const jsonPath = flag("--json");
if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ real, skipped }, null, 2));

console.log(
  `check-code-blocks: slowest block was ${(slowest.ms / 1000).toFixed(1)}s ` +
    `(${slowest.file}:${slowest.line})`,
);

// Counted, never hidden: a growing number here means the runner is drifting
// further from the browser and the sweep is covering less than it claims.
if (skipped.length > 0) {
  console.log(
    `check-code-blocks: ${skipped.length} block(s) could not run in Node ` +
      `(polars threads, network) and were not checked`,
  );
}

if (real.length === 0) {
  console.log(
    `✓ all ${blocks.length - skipped.length} checkable python code block(s) run without raising`,
  );
  process.exit(0);
}

console.error(`\n✗ ${real.length} of ${blocks.length} python code block(s) failed:\n`);
for (const f of real) console.error(`  ${f.file}:${f.line}\n      ${f.error}`);
process.exit(1);
