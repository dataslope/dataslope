/**
 * Runs the courseware-wide Playwright sweep for the languages that have no
 * Node runner, and reconciles what it actually ran against what exists.
 *
 * java (CheerpJ), csharp (.NET wasm), web and react (sandboxed preview
 * iframes) and php (php-wasm) are the last unswept languages on the site: 663
 * items that only a browser can execute. Every other language got a headless
 * runner in this PR precisely because a browser sweep is expensive; these five
 * have no such option, so this drives the real thing.
 *
 * ── Why a wrapper rather than `playwright test` directly ───────────────────
 *
 * Page selection is a `adapter="java"`-style scan of the MDX, which is loose
 * on purpose (see _adapterFilter.ts): a page can be selected and then have
 * nothing to run, so a zero-item page is not an error. That tolerance is
 * exactly what would let a broken selector — a renamed `data-adapter`, a typo
 * in ADAPTERS — sweep 177 pages, run nothing at all, and exit green. So the
 * spec prints one `SWEEP {...}` line per page and this script adds up what was
 * run, compares it with what `scripts/lib/mdx-blocks.mjs` says is there, and
 * fails on a shortfall. Coverage that cannot be silently lost is the whole
 * point of the exercise.
 *
 * Usage:
 *   node scripts/check-browser-blocks.mjs [--adapters java,csharp,…]
 *                                         [--blocks-only|--cards-only]
 *                                         [--list] [--json <path>]
 *                                         [-- <extra playwright args>]
 */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

import { extractBlocks, extractChallengeCards, matchesFilter, parseFilter } from "./lib/mdx-blocks.mjs";

/** The five languages with no headless runner. Kept here rather than in the
 *  spec so `npm run check:browser` and CI cannot drift apart. */
const BROWSER_ONLY = ["java", "csharp", "web", "react", "php"];

const argv = process.argv.slice(2);
const passThroughAt = argv.indexOf("--");
const args = passThroughAt === -1 ? argv : argv.slice(0, passThroughAt);
const extraPlaywrightArgs = passThroughAt === -1 ? [] : argv.slice(passThroughAt + 1);

const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};

const adapters = (flag("--adapters") ?? BROWSER_ONLY.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const wantBlocks = !args.includes("--cards-only");
const wantCards = !args.includes("--blocks-only");

// ─── What exists ───────────────────────────────────────────────────────────

// Kept in step with the spec's own page selection: whatever the filter drops
// from the run must drop out of the expected total too, or the reconciliation
// below reports a filtered run as a shortfall.
const filter = parseFilter(flag("--filter"));
const keep = (x) => (filter ? matchesFilter(filter, x.file, x.title) : true);

const expected = { block: 0, card: 0, byAdapter: {} };
for (const a of adapters) {
  const blocks = extractBlocks(undefined, a).filter((b) => !b.unparsable && keep(b));
  const cards = extractChallengeCards(undefined, a).filter((c) => !c.unparsable && keep(c));
  expected.byAdapter[a] = { block: blocks.length, card: cards.length };
  expected.block += blocks.length;
  expected.card += cards.length;
}

if (args.includes("--list")) {
  for (const a of adapters) {
    const e = expected.byAdapter[a];
    console.log(`${a.padEnd(8)} ${String(e.block).padStart(4)} block(s)  ${String(e.card).padStart(3)} card(s)`);
  }
  console.log(`\n${expected.block} block(s), ${expected.card} card(s) across ${adapters.join(", ")}`);
  process.exit(0);
}

// ─── Run the sweep ─────────────────────────────────────────────────────────

const specs = [
  ...(wantBlocks ? ["e2e/code-blocks-run.spec.ts"] : []),
  ...(wantCards ? ["e2e/challenge-solutions.spec.ts"] : []),
];

console.log(
  `check-browser-blocks: ${adapters.join(", ")} — expecting ` +
    `${wantBlocks ? `${expected.block} block(s)` : ""}` +
    `${wantBlocks && wantCards ? " and " : ""}` +
    `${wantCards ? `${expected.card} card(s)` : ""}` +
    `${filter ? ` from ${filter.length} filtered path(s)` : ""}`,
);

if (filter && expected.block + expected.card === 0) {
  console.log("check-browser-blocks: the filter selected nothing to run.");
  process.exit(0);
}

const child = spawn("npx", ["playwright", "test", ...specs, ...extraPlaywrightArgs], {
  env: {
    ...process.env,
    COURSEWARE: "1",
    ADAPTERS: adapters.join(","),
    ...(filter ? { PAGES_FILTER: filter.join(",") } : {}),
  },
  stdio: ["inherit", "pipe", "inherit"],
});

const swept = [];
let buffered = "";
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  buffered += chunk;
  const lines = buffered.split("\n");
  buffered = lines.pop() ?? "";
  for (const line of lines) {
    const at = line.indexOf("SWEEP {");
    if (at === -1) continue;
    try {
      swept.push(JSON.parse(line.slice(at + "SWEEP ".length)));
    } catch {
      // A torn line is a reconciliation gap, not a crash; the totals below
      // will be short and the run will fail for that reason instead.
    }
  }
});

const playwrightExit = await new Promise((resolve) => child.on("close", resolve));

// ─── Reconcile ─────────────────────────────────────────────────────────────

const ran = { block: 0, card: 0 };
for (const s of swept) ran[s.kind] = (ran[s.kind] ?? 0) + s.ran;

const jsonPath = flag("--json");
if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ adapters, expected, ran, swept }, null, 2));

const shortfalls = [];
if (wantBlocks && ran.block < expected.block) {
  shortfalls.push(`blocks: ran ${ran.block} of ${expected.block}`);
}
if (wantCards && ran.card < expected.card) {
  shortfalls.push(`cards: ran ${ran.card} of ${expected.card}`);
}

console.log(
  `\ncheck-browser-blocks: ran ${ran.block} block(s) and ${ran.card} card(s) ` +
    `across ${swept.length} page visit(s)`,
);

if (shortfalls.length > 0) {
  // Over-count is fine and expected: a card shown inside a ```jsx
  // documentation fence is extracted by the scanner but also rendered live, so
  // the browser can legitimately see more than the file scan predicts. Only a
  // shortfall means coverage was lost.
  console.error(`\n✗ the sweep did not reach everything it should have:`);
  for (const s of shortfalls) console.error(`    ${s}`);
  console.error(
    `\n  Either page selection missed a file or the data-adapter selector no ` +
      `longer matches.\n  A green Playwright run does not make this a pass.`,
  );
  process.exit(1);
}

process.exit(playwrightExit === 0 ? 0 : 1);
