/**
 * Runs every Python `<CodeBlock>` in `content/` and reports the ones that
 * raise. Boots the same Pyodide build the site serves, once, in Node, and
 * runs each block in a fresh namespace; the interpreter setup lives in
 * lib/pyodide-runner.mjs and the MDX parsing in lib/mdx-blocks.mjs, both
 * shared with the challenge-card sweep.
 *
 * Usage:
 *   node scripts/check-code-blocks.mjs [--filter <substr>[,<substr>…]]
 *                                      [--list] [--json <path>]
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

// A filtered run has to say how much it left out, or its green tick claims
// more than it checked.
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
  // `expectError` asserts in both directions: a block whose lesson is the
  // failure must fail, and one that stops failing is a hidden regression.
  if (b.expectError && !error) {
    failures.push({ ...b, error: "expectError is set but the block succeeded" });
  } else if (!b.expectError && error) {
    failures.push({ ...b, error, full });
  }

  if (ms > slowest.ms) slowest = { ms, file: b.file, line: b.line };
  // Named progress, so a stall points at the block that caused it.
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

// Counted, never hidden: growth here means the sweep covers less than it
// claims.
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
