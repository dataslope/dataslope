/**
 * Runs every JavaScript and TypeScript `<CodeBlock>` in `content/`, and
 * grades every `<ChallengeCard>` in those languages against its own tests.
 *
 * Runs under almostnode, not real Node: the site runs these in the browser
 * shim, and real Node is strictly more capable, so a Node sweep would pass
 * blocks that fail for every reader. `AlmostNodeRunner` and `transpileTs` are
 * imported from the worker's own modules so nothing drifts.
 *
 * A thrown error does NOT reject `runner.run()` — almostnode writes it to the
 * console sink, as the UI renders an error cell. Failure is therefore
 * "anything reached stderr", the same rule the Playwright sweep uses.
 *
 * Usage:
 *   node scripts/check-js-blocks.mjs [--filter <substr>[,<substr>…]]
 *                                    [--adapter javascript|typescript]
 *                                    [--list] [--json <path>]
 */
import { writeFileSync } from "node:fs";

import {
  extractBlocks,
  extractChallengeCards,
  matchesFilter,
  parseFilter,
} from "./lib/mdx-blocks.mjs";

// almostnode replaces `process.exit` with one that throws (so a lesson cannot
// take the worker down), and a static import is hoisted above everything — so
// the runner is imported dynamically below and the genuine `exit` captured
// first, or this script could never exit cleanly.
const exitProcess = process.exit.bind(process);

const { AlmostNodeRunner, normalizeVfsPath } = await import(
  "../app/_components/runtime/almostnode-worker-shared.ts"
);
const { isTsPath, transpileTs, tsToJsPath } = await import(
  "../app/_components/runtime/tsTranspile.ts"
);

const ADAPTERS = ["javascript", "typescript"];

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};

const filter = parseFilter(flag("--filter"));
const onlyAdapter = flag("--adapter");
const adapters = onlyAdapter ? [onlyAdapter] : ADAPTERS;

const keep = (x) => (filter ? matchesFilter(filter, x.file, x.title) : true);

const items = [];
for (const adapter of adapters) {
  for (const b of extractBlocks(undefined, adapter)) {
    if (!b.unparsable && keep(b)) items.push({ ...b, adapter, kind: "block" });
  }
  for (const c of extractChallengeCards(undefined, adapter)) {
    if (!c.unparsable && keep(c)) items.push({ ...c, adapter, kind: "card" });
  }
}

if (args.includes("--list")) {
  for (const x of items) console.log(`${x.kind}  ${x.file}:${x.line}  [${x.adapter}]`);
  console.log(`\n${items.length} item(s)`);
  exitProcess(0);
}

// A card with no solution on any file has nothing to verify; counted, never
// dropped, same as the Python sweep.
const unsolved = items.filter((x) => x.kind === "card" && !x.solution);
const runnable = items.filter((x) => x.kind === "block" || x.solution);

if (filter) {
  console.log(
    `check-js-blocks: --filter selected ${items.length} item(s) from ${filter.length} path(s)`,
  );
}
console.log(`check-js-blocks: ${runnable.length} item(s) across ${adapters.join(", ")}`);

const runner = new AlmostNodeRunner();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** The bytes each file contributes to the VFS. Cards stage their solution
 *  buffers, matching what the Solution button leaves in the editor; blocks
 *  stage their starters, which is what Run executes. */
function fileBody(f, useSolution) {
  const body = useSolution ? (f.solutionSource ?? f.starterCode) : f.starterCode;
  return f.initCode ? `${f.initCode}\n${body}` : body;
}

/** Mirrors the TypeScript worker's prepare-fs transform: transpile each .ts
 *  file, write it under the .js path, and keep the .ts out of the VFS so the
 *  resolver never sees two copies of one module. */
function stageTransform(diagnostics) {
  return (path, bytes) => {
    if (!isTsPath(path)) return [[path, bytes]];
    const { outputText, diagnostics: diags } = transpileTs(decoder.decode(bytes), path);
    for (const d of diags) diagnostics.push(`TS (${path}): ${d}`);
    return [[tsToJsPath(path), encoder.encode(outputText)]];
  };
}

const failures = [];
let slowest = { ms: 0 };

for (const [i, item] of runnable.entries()) {
  const startedAt = Date.now();
  const isCard = item.kind === "card";
  const isTs = item.adapter === "typescript";
  const files = item.files ?? [];
  const entryName = item.entry ?? files[0]?.filename ?? (isTs ? "index.ts" : "index.js");
  const entryFile = files.find((f) => f.filename === entryName) ?? files[0];
  const entrySource = entryFile ? fileBody(entryFile, isCard) : (item.code ?? "");

  const out = [];
  const err = [];
  const diagnostics = [];
  try {
    // Multi-file blocks stage siblings; single-file ones get a fresh empty
    // VFS from the runner, which is what keeps one block's leftovers out of
    // the next.
    if (files.length > 1) {
      runner.stage(
        files.map((f) => [f.filename, encoder.encode(fileBody(f, isCard))]),
        isTs ? stageTransform(diagnostics) : undefined,
      );
    }

    const entryVfsPath = normalizeVfsPath(isTs ? tsToJsPath(entryName) : entryName);
    await runner.run(
      entryVfsPath,
      (vfs) => {
        if (!isTs) return entrySource;
        if (vfs.existsSync(entryVfsPath)) return decoder.decode(vfs.readFileSync(entryVfsPath));
        const { outputText, diagnostics: diags } = transpileTs(entrySource, entryName);
        for (const d of diags) diagnostics.push(`TS: ${d}`);
        return outputText;
      },
      { stdout: (c) => out.push(c), stderr: (c) => err.push(c) },
    );
  } catch (e) {
    err.push(String(e?.message ?? e));
  }

  const stderr = [...diagnostics, ...err].join("\n").trim();
  // Both directions: an `expectError` block must produce error output, and
  // one that stops producing it is a hidden regression.
  if (item.expectError && !stderr) {
    failures.push({
      file: item.file,
      line: item.line,
      adapter: item.adapter,
      kind: item.kind,
      title: item.title ?? null,
      error: "expectError is set but the block produced no error output",
      full: "The lesson promises this fails and it no longer does.",
    });
  } else if (!item.expectError && stderr) {
    failures.push({
      file: item.file,
      line: item.line,
      adapter: item.adapter,
      kind: item.kind,
      title: item.title ?? null,
      error: stderr.split("\n")[0],
      full: stderr,
    });
  }

  const ms = Date.now() - startedAt;
  if (ms > slowest.ms) slowest = { ms, file: item.file, line: item.line };
  if ((i + 1) % 100 === 0) {
    console.log(`  …${i + 1}/${runnable.length}  (${item.file}:${item.line})`);
  }
}

const jsonPath = flag("--json");
if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ failures, unsolved }, null, 2));

if (slowest.file) {
  console.log(
    `check-js-blocks: slowest item was ${(slowest.ms / 1000).toFixed(1)}s ` +
      `(${slowest.file}:${slowest.line})`,
  );
}
if (unsolved.length > 0) {
  console.log(`check-js-blocks: ${unsolved.length} card(s) have no solution to verify`);
}

if (failures.length === 0) {
  console.log(`✓ all ${runnable.length} javascript/typescript item(s) run without error output`);
  exitProcess(0);
} else {
  console.error(`\n✗ ${failures.length} of ${runnable.length} item(s) produced error output:\n`);
  for (const f of failures) {
    console.error(`  ${f.kind}  ${f.file}:${f.line}  [${f.adapter}]\n      ${f.error}`);
  }
  exitProcess(1);
}
