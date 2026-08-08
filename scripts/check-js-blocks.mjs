/**
 * Runs every JavaScript and TypeScript `<CodeBlock>` in `content/`, and grades
 * every `<ChallengeCard>` in those languages against its own tests.
 *
 * These are the second-largest unchecked group after SQL: 203 JS and 338 TS
 * blocks, plus 32 and 48 cards.
 *
 * ── Why almostnode rather than node ────────────────────────────────────────
 *
 * The obvious implementation — hand the source to `node` — is wrong in the
 * direction that hides breakage. The site runs these in almostnode, a browser
 * shim with a VirtualFS and a partial Node API. Real Node is strictly *more*
 * capable, so a block using something almostnode lacks would pass a Node sweep
 * and fail for every reader. Running the same runner the browser runs is the
 * only version of this check worth having, and `almostnode` is an ordinary npm
 * dependency that works here unchanged.
 *
 * `AlmostNodeRunner` and `transpileTs` are imported from the modules the
 * workers themselves use, for the reason the rest of these sweeps import their
 * harnesses: a second copy drifts, and a drifted copy passes things it should
 * fail.
 *
 * ── On detecting failure ───────────────────────────────────────────────────
 *
 * A thrown error does NOT reject `runner.run()`. almostnode catches it and
 * writes it to the console sink, exactly as the UI renders an error cell. So
 * failure is "anything reached stderr", which is also how the Playwright
 * sweep decides (`[data-cell-type="stderr"]`). Keying on a rejected promise
 * instead would have reported every throwing block as passing.
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

// almostnode replaces the global `process.exit` with its own, which throws
// instead of exiting so that a lesson calling `process.exit()` cannot take the
// worker down. That patch lands when its module is imported, and a static
// import is hoisted above everything, so there is no point in the file where
// this script could still reach the real one: calling `process.exit(0)` threw
// "Error: Process exited with code 0" *after* printing a green tick and left
// the real exit code at 1 — CI seeing a failure it could not explain.
//
// So the runner is pulled in dynamically, below, and the genuine `exit` is
// captured first.
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
  if (stderr) {
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
