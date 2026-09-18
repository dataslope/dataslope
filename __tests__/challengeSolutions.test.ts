/**
 * Every challenge's reference solution must pass every one of its own checks.
 *
 * This runs the real graders — `evaluateSqlTest` and the `challengeHarness`
 * builders/parsers the browser uses — against real engines, without a
 * browser:
 *
 *  - SQL runs on `node:sqlite`. The browser ships SQLite 3.53 via WASM and
 *    Node here carries 3.4x; both have window functions, CTEs and `strftime`,
 *    which is the whole surface the pilot uses.
 *  - Python and JavaScript run as subprocesses. The harness builders emit
 *    plain Python and plain ES-module JavaScript with no runtime-specific
 *    API, so `python3` and `node` execute exactly what Pyodide and the JS
 *    worker would.
 *
 * That makes an authoring mistake — a solution that does not actually solve
 * the problem, a check that can never pass, a typo in a seed — a failing unit
 * test in CI rather than something a learner discovers. `e2e/challenge-
 * workspace.spec.ts` covers the other half: that the workspace really drives
 * these runtimes in a browser.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  buildHarness,
  evaluateStdoutExpect,
  isStdoutTest,
  parseHarnessOutput,
  type ChallengeTest as CodeTest,
  type ParsedTestResult,
} from "@/app/_components/challengeHarness";
import {
  evaluateSqlTest,
  type SqlChallengeTest,
  type SqlEngineLike,
  type SqlResult,
} from "@/app/_components/sqlChallengeHarness";
import {
  getChallenge,
  getChallengeSlugs,
  isMultiStep,
  type Challenge,
  type ChallengeLanguage,
  type ChallengeTask,
} from "@/lib/challenges";

// ─── A node:sqlite engine that looks like the browser's ──────────────

/**
 * Split a script into statements so `exec` can return one result set per
 * statement, the way the browser engine does. Quote-aware so a semicolon
 * inside a string literal does not split a statement in half.
 */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = sql[i + 1] === quote ? (i++, current += ch, quote) : null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ";") {
      if (current.trim()) out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function nodeSqlEngine(initSql: string): SqlEngineLike {
  const db = new DatabaseSync(":memory:");
  db.exec(initSql);
  return {
    label: "SQLite",
    version: "node",
    exec: async (sql: string): Promise<SqlResult[]> =>
      splitStatements(sql).map((statement) => {
        const prepared = db.prepare(statement);
        // `.all()` throws on a statement that returns nothing (INSERT, DDL);
        // run it instead and report an empty result, like the browser does.
        try {
          const rows = prepared.all() as Record<string, unknown>[];
          const columns = prepared.columns().map((c) => c.name);
          return { columns, values: rows.map((r) => columns.map((c) => r[c])) };
        } catch {
          prepared.run();
          return { columns: [], values: [] };
        }
      }),
  };
}

// ─── Running code the way the browser runtime would ──────────────────

interface CodeRun {
  stdout: string;
  stderr: string;
}

function runPython(source: string): CodeRun {
  const dir = mkdtempSync(join(tmpdir(), "ds-challenge-"));
  const file = join(dir, "main.py");
  writeFileSync(file, source);
  try {
    const stdout = execFileSync("python3", [file], {
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "" };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? String(err) };
  }
}

function runJavaScript(source: string): CodeRun {
  const dir = mkdtempSync(join(tmpdir(), "ds-challenge-"));
  // `.mjs` so the harness's top-level `await` is legal, exactly as it is in
  // the browser runtime.
  const file = join(dir, "main.mjs");
  writeFileSync(file, source);
  try {
    const stdout = execFileSync(process.execPath, [file], {
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "" };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? String(err) };
  }
}

// ─── Per-task assertions ─────────────────────────────────────────────

async function checkSqlTask(challenge: Challenge, task: ChallengeTask, label: string) {
  if (challenge.runtime.kind !== "sql") throw new Error("not a sql challenge");
  const engine = nodeSqlEngine(challenge.runtime.initSql);
  const results = await engine.exec(task.solutionCode);
  const finalResult =
    [...results].reverse().find((r) => r.columns.length > 0) ?? null;

  expect(finalResult, `${label}: the reference solution returned no result set`).not.toBeNull();
  expect(finalResult!.values.length, `${label}: the reference solution returned no rows`).toBeGreaterThan(0);

  for (const test of task.tests as SqlChallengeTest[]) {
    const { pass, detail } = await evaluateSqlTest(test, {
      engine,
      finalResult,
      // The solution is being graded against itself, which is what makes
      // `matchesSolution` meaningful here: it proves the check is runnable
      // and self-consistent, and every other check does the real work.
      solutionResult: finalResult,
    });
    expect(pass, `${label} · ${test.name}: ${detail ?? "failed"}`).toBe(true);
  }
}

function checkCodeTask(lang: ChallengeLanguage, label: string) {
  const tests = lang.tests as CodeTest[];
  const harness = buildHarness(lang.id, tests);
  const source = harness ? `${lang.solutionCode}\n${harness}` : lang.solutionCode;

  const { stdout, stderr } =
    lang.id === "python" ? runPython(source) : runJavaScript(source);

  const parsed: ParsedTestResult[] = [];
  let clean = "";
  const out = parseHarnessOutput(stdout);
  parsed.push(...out.results);
  clean = out.clean;

  for (const t of tests) {
    if (isStdoutTest(t)) parsed.push(evaluateStdoutExpect(t, clean, stderr));
  }

  const byId = new Map(parsed.map((r) => [r.id, r]));
  for (const t of tests) {
    const r = byId.get(t.id);
    expect(
      r?.pass,
      `${label} · ${t.name}: ${r?.detail ?? "produced no result"}${
        stderr ? `\nstderr: ${stderr.slice(0, 500)}` : ""
      }`,
    ).toBe(true);
  }
}

// ─── The sweep ───────────────────────────────────────────────────────

const SLUGS = getChallengeSlugs();

describe("challenge reference solutions", () => {
  it("has challenges to check", () => {
    expect(SLUGS.length).toBeGreaterThan(0);
  });

  for (const slug of SLUGS) {
    const challenge = getChallenge(slug)!;

    if (challenge.runtime.kind === "sql") {
      if (isMultiStep(challenge)) {
        for (const step of challenge.steps) {
          it(`${slug} · step ${step.n} (${step.title})`, async () => {
            await checkSqlTask(challenge, step, `${slug}/${step.n}`);
          });
        }
      } else {
        for (const lang of challenge.languages) {
          it(`${slug} · ${lang.shortLabel}`, async () => {
            await checkSqlTask(challenge, lang, `${slug}/${lang.id}`);
          });
        }
      }
      continue;
    }

    // Code challenges: a multi-step one carries its tasks on the steps, and
    // runs them in the single language it declares.
    if (isMultiStep(challenge)) {
      const lang = challenge.languages[0];
      for (const step of challenge.steps) {
        it(`${slug} · step ${step.n} (${step.title})`, () => {
          checkCodeTask({ ...lang, ...step }, `${slug}/${step.n}`);
        });
      }
    } else {
      for (const lang of challenge.languages) {
        it(`${slug} · ${lang.shortLabel}`, () => {
          checkCodeTask(lang, `${slug}/${lang.id}`);
        });
      }
    }
  }
});
