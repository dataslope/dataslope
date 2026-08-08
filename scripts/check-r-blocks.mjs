/**
 * Runs every R `<CodeBlock>` in `content/`, and every R `<ChallengeCard>`'s
 * reference solution.
 *
 * 287 blocks and 43 cards, checked by nothing until now.
 *
 * ── The runtime ────────────────────────────────────────────────────────────
 *
 * webR is the same package the site loads, and it runs under Node unchanged.
 * `baseUrl` points at the installed `node_modules/webr/dist` rather than the
 * CDN, so the sweep uses the exact build the `webr` dependency pins and needs
 * no network to boot. It must be a plain filesystem path: webR's Node channel
 * hands it straight to `new Worker`, which rejects a `file://` string.
 *
 * The wrapper around each block mirrors `WebRRuntime.run` in `r.tsx` — code
 * written to a VFS temp file, evaluated through `withVisible(eval(parse(...)))`
 * with `withAutoprint: false` — because that wrapper is what decides whether a
 * top-level expression prints, and running the source any other way would test
 * something the reader never executes.
 *
 * ── On detecting failure ───────────────────────────────────────────────────
 *
 * `captureR` throws on an R *error* and does not throw on a warning or a
 * `message()`. Measured, not assumed:
 *
 *   print(1+1)              -> no throw
 *   as.numeric("abc")       -> no throw   (warning: NAs introduced)
 *   message("hi")           -> no throw
 *   stop("boom")            -> throws
 *   print(no_such_object)   -> throws
 *
 * So failure is "captureR threw", which asks exactly the question the Python
 * sweep asks: does this raise? Keying on stderr instead would have failed
 * every lesson that deliberately demonstrates a warning — the trap that keeps
 * `check:sql` out of CI — and R lessons demonstrate coercion warnings often.
 *
 * Usage:
 *   node scripts/check-r-blocks.mjs [--filter <substr>[,<substr>…]]
 *                                   [--list] [--json <path>]
 */
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

import {
  extractBlocks,
  extractChallengeCards,
  matchesFilter,
  parseFilter,
} from "./lib/mdx-blocks.mjs";
import { fetchDatasetBytes } from "./lib/datasets.mjs";

const { extractLibraryCalls } = await import("../app/_components/runtime/rPackages.ts");

const WEB_USER_HOME = "/home/web_user";
const TMP_PATH = `${WEB_USER_HOME}/.pg_run_code.R`;
/** Generous: a webR package install can pull a large dependency closure. */
const BLOCK_TIMEOUT_MS = Number(process.env.R_BLOCK_TIMEOUT_MS ?? 120_000);

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};

const filter = parseFilter(flag("--filter"));
const keep = (x) => (filter ? matchesFilter(filter, x.file, x.title) : true);

const items = [];
for (const b of extractBlocks(undefined, "r")) {
  if (!b.unparsable && keep(b)) items.push({ ...b, kind: "block", source: b.code });
}
for (const c of extractChallengeCards(undefined, "r")) {
  if (!c.unparsable && keep(c)) items.push({ ...c, kind: "card", source: c.solution });
}

if (args.includes("--list")) {
  for (const x of items) console.log(`${x.kind}  ${x.file}:${x.line}`);
  console.log(`\n${items.length} r item(s)`);
  process.exit(0);
}

// A card with no solution has nothing to verify; counted, never dropped.
const unsolved = items.filter((x) => x.kind === "card" && !x.source);
const runnable = items.filter((x) => x.source);

if (filter) {
  console.log(
    `check-r-blocks: --filter selected ${items.length} item(s) from ${filter.length} path(s)`,
  );
}

const { WebR } = await import("webr");
console.log("check-r-blocks: booting webR…");
const bootStart = Date.now();
const webR = new WebR({ baseUrl: resolve("node_modules/webr/dist") + "/" });
await webR.init();
console.log(
  `check-r-blocks: webR ready in ${((Date.now() - bootStart) / 1000).toFixed(1)}s, ` +
    `${runnable.length} item(s)`,
);

const encoder = new TextEncoder();
const installed = new Set();
const failures = [];
const installFailures = [];
/** Absolute VFS paths written for the current item, removed before the next. */
const stagedPaths = new Set();
/** Datasets already written; they are read-only inputs, so staging each once
 *  is enough and re-fetching per block would be pure waste. */
const stagedDatasets = new Set();
let slowest = { ms: 0 };

/** Install the packages a block names, once per session. Mirrors
 *  `ensurePackages` in r.tsx; a failure here is reported separately from a
 *  content failure because it is the network's fault, not the lesson's. */
async function ensurePackages(code) {
  const needed = extractLibraryCalls(code).filter((p) => !installed.has(p));
  if (needed.length === 0) return null;
  for (const p of needed) installed.add(p);
  try {
    await webR.installPackages(needed);
    return null;
  } catch (err) {
    return `could not install [${needed.join(", ")}]: ${String(err?.message ?? err).split("\n")[0]}`;
  }
}

for (const [i, item] of runnable.entries()) {
  const startedAt = Date.now();

  const installError = await ensurePackages(item.source);
  if (installError) {
    installFailures.push({ file: item.file, line: item.line, error: installError });
  }

  // A fresh global environment per item: the browser gives each block its own
  // session, so an object defined by one lesson must not be visible to the
  // next. Without this a block could pass only because an earlier one happened
  // to define its inputs.
  await webR.evalRVoid(
    "rm(list = ls(envir = .GlobalEnv, all.names = TRUE), envir = .GlobalEnv)",
  );

  // Stage sibling files where `source("helpers.R")` will find them, mirroring
  // `prepareFileSystem` in r.tsx, which writes each workspace file to
  // `${WEB_USER_HOME}/<name>`. Skipping this is not a smaller check: the entry
  // still runs, fails on the first `source()` with "cannot open the
  // connection", and the multi-file lesson is reported as broken content.
  // Stale files from the previous item are removed first, so one block's
  // helper cannot satisfy the next block's `source()`.
  for (const path of stagedPaths) {
    try {
      await webR.FS.unlink(path);
    } catch {
      /* already gone */
    }
  }
  stagedPaths.clear();

  // Datasets the block declares, staged under the name its code reads.
  // Cached on disk, so only the first sweep needs the network.
  for (const d of item.datasets ?? []) {
    const path = `${WEB_USER_HOME}/${d.stageAs}`;
    if (stagedDatasets.has(d.stageAs)) continue;
    try {
      await webR.FS.writeFile(path, await fetchDatasetBytes(d.path));
      stagedDatasets.add(d.stageAs);
    } catch (err) {
      installFailures.push({
        file: item.file,
        line: item.line,
        error: `dataset ${d.path}: ${String(err?.message ?? err).split("\n")[0]}`,
      });
    }
  }

  for (const f of item.files ?? []) {
    if (f.filename === item.entry) continue;
    const body = f.solutionSource ?? f.starterCode;
    const path = `${WEB_USER_HOME}/${f.filename}`;
    try {
      await webR.FS.writeFile(path, encoder.encode(f.initCode ? `${f.initCode}\n${body}` : body));
      stagedPaths.add(path);
    } catch {
      /* a name R cannot write is reported by the run itself */
    }
  }

  let raised = null;
  const shelter = await new webR.Shelter();
  try {
    await webR.FS.writeFile(TMP_PATH, encoder.encode(item.source));
    await Promise.race([
      shelter.captureR(
        `.pg_vr <- withVisible(eval(parse(file = "${TMP_PATH}"), envir = .GlobalEnv))
.pg_vr$value`,
        { withAutoprint: false },
      ),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`did not finish in ${BLOCK_TIMEOUT_MS / 1000}s`)),
          BLOCK_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (err) {
    raised = String(err?.message ?? err);
  } finally {
    await shelter.purge().catch(() => {});
  }

  // `expectError` asserts in both directions. "Errors are friendly (most of
  // the time)" quotes the very error its block triggers, and its paired "Fix
  // me!" starter is meant to fail until the reader repairs it. If either ever
  // stops failing, the prose is describing something the reader cannot see,
  // and nothing else would catch that.
  if (item.expectError && raised === null) {
    failures.push({
      file: item.file,
      line: item.line,
      kind: item.kind,
      title: item.title ?? null,
      error: "expectError is set but the code succeeded",
      full: "The lesson promises this fails and it no longer does.",
    });
  } else if (!item.expectError && raised !== null) {
    failures.push({
      file: item.file,
      line: item.line,
      kind: item.kind,
      title: item.title ?? null,
      error: raised.split("\n")[0],
      full: raised,
    });
  }

  const ms = Date.now() - startedAt;
  if (ms > slowest.ms) slowest = { ms, file: item.file, line: item.line };
  if ((i + 1) % 50 === 0) {
    console.log(`  …${i + 1}/${runnable.length}  (${item.file}:${item.line})`);
  }
}

// `close()` is synchronous in webr 0.6 and returns nothing, so it must not be
// awaited-and-caught like a promise.
try {
  webR.close();
} catch {
  /* the session is going away regardless */
}

const jsonPath = flag("--json");
if (jsonPath) {
  writeFileSync(jsonPath, JSON.stringify({ failures, installFailures, unsolved }, null, 2));
}

if (slowest.file) {
  console.log(
    `check-r-blocks: slowest item was ${(slowest.ms / 1000).toFixed(1)}s ` +
      `(${slowest.file}:${slowest.line})`,
  );
}
if (unsolved.length > 0) {
  console.log(`check-r-blocks: ${unsolved.length} card(s) have no solution to verify`);
}
const expected = runnable.filter((x) => x.expectError).length;
if (expected > 0) {
  console.log(
    `check-r-blocks: ${expected} item(s) are marked expectError and were required to fail`,
  );
}
if (installFailures.length > 0) {
  console.log(
    `check-r-blocks: ${installFailures.length} package install(s) failed; ` +
      "blocks needing them are reported below and are a network problem, not a lesson one",
  );
}

if (failures.length === 0) {
  console.log(`✓ all ${runnable.length} r item(s) run without raising`);
  process.exit(0);
}

console.error(`\n✗ ${failures.length} of ${runnable.length} r item(s) failed:\n`);
for (const f of failures) console.error(`  ${f.kind}  ${f.file}:${f.line}\n      ${f.error}`);
process.exit(1);
