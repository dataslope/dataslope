/**
 * Runs every `<SqlCodeBlock>` in `content/` and grades every
 * `<SqlChallengeCard>`'s reference solution against that card's own tests.
 * Grading goes through the same `evaluateSqlTest` in
 * `app/_components/sqlChallengeHarness.ts` that a reader's Check Answer runs
 * — a second copy of a grader drifts and passes cards it should fail.
 * Engines come from lib/sql-engines.mjs, one fresh instance per block, as the
 * browser gives every block its own.
 *
 * Usage:
 *   node scripts/check-sql-blocks.mjs [--filter <substr>[,<substr>…]]
 *                                     [--dialect sqlite|postgres]
 *                                     [--list] [--json <path>]
 */
import { writeFileSync } from "node:fs";

import { evaluateSqlTest } from "../app/_components/sqlChallengeHarness.ts";
import {
  extractSqlBlocks,
  extractSqlCards,
  matchesFilter,
  parseFilter,
} from "./lib/mdx-blocks.mjs";
import {
  SUPPORTED_DIALECTS,
  createEngine,
  fetchRemoteInitSql,
  preparePostgresScript,
  remoteUrlsIn,
} from "./lib/sql-engines.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};

const filter = parseFilter(flag("--filter"));
const onlyDialect = flag("--dialect");

const keep = (x) => (filter ? matchesFilter(filter, x.file, x.title) : true);
const allBlocks = extractSqlBlocks().filter(keep);
const allCards = extractSqlCards().filter(keep);

if (args.includes("--list")) {
  for (const b of allBlocks) console.log(`block  ${b.file}:${b.line}  [${b.dialect}]  ${b.title}`);
  for (const c of allCards) console.log(`card   ${c.file}:${c.line}  [${c.dialect}]  ${c.title}`);
  console.log(`\n${allBlocks.length} sql block(s), ${allCards.length} sql card(s)`);
  process.exit(0);
}

const runnableDialect = (d) =>
  SUPPORTED_DIALECTS.includes(d) && (!onlyDialect || d === onlyDialect);

// Counted, never hidden: an unprinted gap reads exactly like coverage.
const unsupportedBlocks = allBlocks.filter((b) => !b.unparsable && !runnableDialect(b.dialect));
const unsupportedCards = allCards.filter((c) => !c.unparsable && !runnableDialect(c.dialect));
const unparsable = [...allBlocks, ...allCards].filter((x) => x.unparsable);
// A card with no `solutionSql` has nothing to verify.
const unsolved = allCards.filter(
  (c) => !c.unparsable && runnableDialect(c.dialect) && !c.solutionSql,
);

const blocks = allBlocks.filter((b) => !b.unparsable && runnableDialect(b.dialect));
const cards = allCards.filter((c) => !c.unparsable && runnableDialect(c.dialect) && c.solutionSql);

if (filter) {
  console.log(
    `check-sql-blocks: --filter selected ${allBlocks.length} block(s) and ` +
      `${allCards.length} card(s) from ${filter.length} path(s)`,
  );
}

const failures = [];
let slowest = { ms: 0 };

/** Run `initSql` (remote first, if any) then hand back the engine. */
async function prepare(item) {
  const engine = await createEngine(item.dialect);
  // DuckDB lessons read parquet straight from a URL; give the engine those
  // bytes up front so the lesson's own SQL runs unmodified.
  if (engine.registerUrls) {
    const sql = [item.initSql, item.sql, item.solutionSql].filter(Boolean).join("\n");
    await engine.registerUrls(remoteUrlsIn(sql));
  }
  if (item.remoteInitSql) {
    const raw = await fetchRemoteInitSql(item.remoteInitSql);
    await engine.exec(item.dialect === "postgres" ? preparePostgresScript(raw) : raw);
  }
  if (item.initSql) await engine.exec(item.initSql);
  return engine;
}

console.log(`check-sql-blocks: ${blocks.length} block(s), ${cards.length} card(s)`);

for (const [i, b] of blocks.entries()) {
  const startedAt = Date.now();
  let engine = null;
  let raised = null;
  try {
    engine = await prepare(b);
    await engine.exec(b.sql);
  } catch (err) {
    raised = String(err?.message ?? err);
  } finally {
    await engine?.destroy?.().catch(() => {});
  }
  // `expectError` asserts in both directions: a block whose lesson is the
  // failure must raise, and one that stops raising is a hidden regression.
  if (b.expectError && raised === null) {
    failures.push({
      ...b,
      kind: "block",
      error: "expectError is set but the SQL succeeded",
      full: "The lesson promises this fails. It no longer does, so either the "
        + "SQL changed or the engine stopped enforcing what it demonstrates.",
    });
  } else if (!b.expectError && raised !== null) {
    failures.push({ ...b, kind: "block", error: raised.split("\n")[0], full: raised });
  }

  const ms = Date.now() - startedAt;
  if (ms > slowest.ms) slowest = { ms, file: b.file, line: b.line };
  if ((i + 1) % 50 === 0) console.log(`  …${i + 1}/${blocks.length}  (${b.file}:${b.line})`);
}

for (const c of cards) {
  const startedAt = Date.now();
  let engine = null;
  try {
    engine = await prepare(c);

    // What Check Answer does: run the buffer (here, the reference solution),
    // keep its last result set, and evaluate the card's tests against it.
    const solutionResults = await engine.exec(c.solutionSql);
    const finalResult = solutionResults[solutionResults.length - 1] ?? null;

    const failed = [];
    for (const test of c.tests) {
      // `matchesSolution` compares the learner's result against the solution's.
      // With the solution *as* the buffer the two are the same query, so this
      // proves the test is well-formed rather than that the solution is right,
      // which is the same thing the Python sweep gets from a card whose tests
      // only restate the starter.
      const verdict = await evaluateSqlTest(test, {
        engine,
        finalResult,
        solutionResult: finalResult,
      });
      if (!verdict.pass) failed.push(`${test.name}: ${verdict.detail}`);
    }
    if (failed.length > 0) {
      failures.push({ ...c, kind: "card", error: failed.join("; ") });
    }
  } catch (err) {
    const message = String(err?.message ?? err);
    failures.push({
      ...c,
      kind: "card",
      error: `solution raised: ${message.split("\n")[0]}`,
      full: message,
    });
  } finally {
    await engine?.destroy?.().catch(() => {});
  }
  const ms = Date.now() - startedAt;
  if (ms > slowest.ms) slowest = { ms, file: c.file, line: c.line };
}

const jsonPath = flag("--json");
if (jsonPath) {
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        failures,
        unsupported: [...unsupportedBlocks, ...unsupportedCards],
        unparsable,
        unsolved,
      },
      null,
      2,
    ),
  );
}

if (slowest.file) {
  console.log(
    `check-sql-blocks: slowest item was ${(slowest.ms / 1000).toFixed(1)}s ` +
      `(${slowest.file}:${slowest.line})`,
  );
}
if (unsupportedBlocks.length + unsupportedCards.length > 0) {
  const dialects = [
    ...new Set([...unsupportedBlocks, ...unsupportedCards].map((x) => x.dialect)),
  ].sort();
  console.log(
    `check-sql-blocks: ${unsupportedBlocks.length} block(s) and ${unsupportedCards.length} ` +
      `card(s) use a dialect with no Node engine (${dialects.join(", ")}) and were not checked`,
  );
}
if (unsolved.length > 0) {
  console.log(`check-sql-blocks: ${unsolved.length} card(s) have no solutionSql to verify`);
}
const expected = blocks.filter((b) => b.expectError).length;
if (expected > 0) {
  console.log(
    `check-sql-blocks: ${expected} block(s) are marked expectError and were required to fail`,
  );
}
if (unparsable.length > 0) {
  console.error(`check-sql-blocks: ${unparsable.length} tag(s) could not be parsed:`);
  for (const x of unparsable) console.error(`  ${x.file}:${x.line}  ${x.unparsable}`);
}

if (failures.length === 0 && unparsable.length === 0) {
  console.log(
    `✓ ${blocks.length} sql block(s) run and ${cards.length} card(s) pass their own tests`,
  );
  process.exit(0);
}

console.error(`\n✗ ${failures.length} of ${blocks.length + cards.length} sql item(s) failed:\n`);
for (const f of failures) {
  console.error(`  ${f.kind}  ${f.file}:${f.line}  [${f.dialect}]  ${f.title}\n      ${f.error}`);
}
process.exit(1);
