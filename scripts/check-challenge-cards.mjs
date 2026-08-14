/**
 * Loads every Python `<ChallengeCard>`'s reference solution and checks that
 * it passes the card's own tests. `app/_components/challengeHarness.ts` is
 * imported directly (Node strips the types), so the wrapping, sentinels,
 * parser and stdout-expectation evaluator are the same code the reader runs —
 * a reimplementation would be a second definition of "passing". Mirrors Check
 * Answer exactly: `combined = solutionCode + "\n" + buildHarness(adapter,
 * tests)`, then split output into user-visible text and `__DSTEST__:` result
 * lines.
 *
 * Usage:
 *   node scripts/check-challenge-cards.mjs [--filter <substr>[,<substr>…]]
 *                                          [--list] [--json <path>]
 */
import { writeFileSync } from "node:fs";

import {
  buildHarness,
  evaluateStdoutExpect,
  isStdoutTest,
  parseHarnessOutput,
} from "../app/_components/challengeHarness.ts";
import { extractChallengeCards, matchesFilter, parseFilter } from "./lib/mdx-blocks.mjs";
import { bootPyodide, isEnvironmental } from "./lib/pyodide-runner.mjs";

const ADAPTER = "python";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};

const filter = parseFilter(flag("--filter"));
const allCards = extractChallengeCards(undefined, ADAPTER);
const cards = filter
  ? allCards.filter((c) => matchesFilter(filter, c.file, c.title))
  : allCards;

// A filtered run has to say how much it left out, or its green tick claims
// more than it checked.
if (filter) {
  console.log(
    `check-challenge-cards: --filter selected ${cards.length} of ${allCards.length} card(s) ` +
      `from ${filter.length} path(s)`,
  );
  if (cards.length === 0) {
    console.log("check-challenge-cards: nothing to run (no python cards in those files)");
  }
}

if (args.includes("--list")) {
  for (const c of cards) {
    console.log(`${c.file}:${c.line}  ${c.title}  (${c.tests?.length ?? 0} test(s))`);
  }
  console.log(`\n${cards.length} python challenge card(s)`);
  process.exit(0);
}

// Cards outside what this can check are counted, not dropped — a silently
// skipped card reads like a passing one.
const unparsable = cards.filter((c) => c.unparsable);
const unsolved = cards.filter((c) => !c.unparsable && !c.solution);
const untested = cards.filter((c) => !c.unparsable && c.solution && c.tests.length === 0);
const runnable = cards.filter((c) => !c.unparsable && c.solution && c.tests.length > 0);

const { run, stage } = await bootPyodide("check-challenge-cards");

const failures = [];
let slowest = { ms: 0 };

for (const [i, card] of runnable.entries()) {
  const stageError = await stage(card);
  if (stageError) {
    failures.push({ ...card, error: stageError });
    continue;
  }

  // Exactly what ChallengeCard.check() assembles.
  const harness = buildHarness(ADAPTER, card.tests);
  const combined = harness ? `${card.solution}\n${harness}` : card.solution;

  const { error, full, stdout, stderr, truncated, ms } = await run(combined, { capture: true });
  if (ms > slowest.ms) slowest = { ms, file: card.file, line: card.line };

  if (error) {
    failures.push({ ...card, error: `solution raised: ${error}`, full });
    continue;
  }

  if (truncated) {
    // The harness prints its results last, so a clipped buffer loses the
    // verdicts.
    failures.push({ ...card, error: "printed too much output to check" });
    continue;
  }

  const { clean, results } = parseHarnessOutput(stdout);
  const byId = new Map(results.map((r) => [r.id, r]));

  const failed = [];
  for (const test of card.tests) {
    if (isStdoutTest(test)) {
      const verdict = evaluateStdoutExpect(test, clean, stderr);
      if (!verdict.pass) failed.push(`${test.name}: ${verdict.detail}`);
      continue;
    }
    const verdict = byId.get(test.id);
    // A native test with no result line never ran: the harness stopped early.
    if (!verdict) {
      failed.push(`${test.name}: no result — the harness did not reach this test`);
    } else if (!verdict.pass) {
      failed.push(`${test.name}: ${verdict.detail ?? "failed"}`);
    }
  }

  if (failed.length > 0) {
    failures.push({
      ...card,
      error: `${failed.length}/${card.tests.length} test(s) failed`,
      detail: failed,
      full: stderr,
    });
  }

  if ((i + 1) % 25 === 0) {
    console.log(`  …${i + 1}/${runnable.length}  (${card.file}:${card.line})`);
  }
}

const real = failures.filter((f) => !isEnvironmental(f));
const skipped = failures.filter(isEnvironmental);

const jsonPath = flag("--json");
if (jsonPath) {
  writeFileSync(
    jsonPath,
    JSON.stringify({ real, skipped, unparsable, unsolved, untested }, null, 2),
  );
}

console.log(
  `check-challenge-cards: slowest card was ${(slowest.ms / 1000).toFixed(1)}s ` +
    `(${slowest.file}:${slowest.line})`,
);

// Everything this sweep did not check, said out loud.
for (const [what, list] of [
  ["could not run in Node (polars threads, network)", skipped],
  ["have no reference solution", unsolved],
  ["declare no tests", untested],
  ["have props this parser could not read", unparsable],
]) {
  if (list.length > 0) console.log(`check-challenge-cards: ${list.length} card(s) ${what}`);
}

if (real.length === 0) {
  console.log(
    `✓ all ${runnable.length - skipped.length} checkable python challenge card(s) ` +
      `pass their own tests`,
  );
  process.exit(0);
}

console.error(`\n✗ ${real.length} of ${runnable.length} python challenge card(s) failed:\n`);
for (const f of real) {
  console.error(`  ${f.file}:${f.line}  ${f.title}\n      ${f.error}`);
  for (const d of f.detail ?? []) console.error(`        · ${d.split("\n")[0]}`);
}
process.exit(1);
