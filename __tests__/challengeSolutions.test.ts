/**
 * Every challenge's reference solution must pass every one of its own checks.
 *
 * This runs the real graders — `evaluateSqlTest` and the `challengeHarness`
 * builders/parsers the browser uses — against real engines, without a
 * browser:
 *
 *  - SQL runs on PGlite, the same Postgres 18 compiled to WASM that the
 *    browser loads, and its results go through the browser's own converter
 *    (`resultToQueryExecResult`), so a `date` reaches the grader as
 *    `YYYY-MM-DD` here exactly as it does on the page.
 *  - Python and JavaScript run as subprocesses. The harness builders emit
 *    plain Python and plain ES-module JavaScript with no runtime-specific
 *    API, so `python3` and `node` execute exactly what Pyodide and the JS
 *    worker would.
 *
 * That makes an authoring mistake — a solution that does not actually solve
 * the problem, a check that can never pass, a typo in a seed — a failing test
 * in CI rather than something a learner discovers. It is too slow for every
 * `npm test`, so it runs as `npm run test:challenges`, from its own workflow
 * whenever a challenge or a harness changes (see vitest.config.ts). `e2e/challenge-
 * workspace.spec.ts` covers the other half: that the workspace really drives
 * these runtimes in a browser.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
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
import { resultToQueryExecResult } from "@/app/_components/runtime/postgres";
import {
  getChallenge,
  getChallengeSlugs,
  isMultiStep,
  type Challenge,
  type ChallengeLanguage,
  type ChallengeTask,
} from "@/lib/challenges";

// ─── A PGlite engine that looks like the browser's ──────────────────

/**
 * One Postgres for the whole sweep, with each dataset seeded once into its own
 * schema. Booting PGlite takes seconds, and there are a few hundred SQL tasks,
 * so a database per task would dominate the run.
 *
 * Isolation comes from transactions instead: every task opens one, points its
 * `search_path` at the dataset's schema (so unqualified names resolve the way
 * they do in the browser's `public`), and rolls back on release. Nothing a
 * task does can be seen by the next one.
 */
let pgPromise: Promise<PGlite> | null = null;
const datasetSchemas = new Map<string, Promise<string>>();

function postgres(): Promise<PGlite> {
  pgPromise ??= PGlite.create();
  return pgPromise;
}

/** The schema holding this seed, seeding it on first use. */
function datasetSchema(initSql: string): Promise<string> {
  let schema = datasetSchemas.get(initSql);
  if (!schema) {
    const name = `dataset_${datasetSchemas.size + 1}`;
    schema = (async () => {
      const db = await postgres();
      await db.exec(`CREATE SCHEMA ${name}; SET search_path TO ${name};`);
      await db.exec(initSql);
      await db.exec("SET search_path TO public;");
      return name;
    })();
    datasetSchemas.set(initSql, schema);
  }
  return schema;
}

interface TaskEngine extends SqlEngineLike {
  /** Roll the task's transaction back. Must be called before the next task. */
  release: () => Promise<void>;
}

async function taskEngine(initSql: string): Promise<TaskEngine> {
  const schema = await datasetSchema(initSql);
  const db = await postgres();
  await db.exec(`BEGIN; SET LOCAL search_path TO ${schema};`);
  return {
    label: "PostgreSQL",
    version: "node",
    exec: async (sql: string): Promise<SqlResult[]> =>
      (await db.exec(sql)).map(
        (r) => resultToQueryExecResult(r) ?? { columns: [], values: [] },
      ),
    release: async () => {
      await db.exec("ROLLBACK;");
    },
  };
}

/** Run a task's SQL on a fresh transaction and keep its last result set. */
async function lastResultOf(initSql: string, sql: string): Promise<SqlResult | null> {
  const engine = await taskEngine(initSql);
  try {
    const results = await engine.exec(sql);
    return [...results].reverse().find((r) => r.columns.length > 0) ?? null;
  } finally {
    await engine.release();
  }
}

// ─── Running code the way the browser runtime would ──────────────────

interface CodeRun {
  stdout: string;
  stderr: string;
}

function runPython(source: string, timeout = 30_000): CodeRun {
  const dir = mkdtempSync(join(tmpdir(), "ds-challenge-"));
  const file = join(dir, "main.py");
  writeFileSync(file, source);
  try {
    const stdout = execFileSync("python3", [file], {
      encoding: "utf8",
      timeout,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout, stderr: "" };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? String(err) };
  }
}

function runJavaScript(source: string, timeout = 30_000): CodeRun {
  const dir = mkdtempSync(join(tmpdir(), "ds-challenge-"));
  // `.mjs` so the harness's top-level `await` is legal, exactly as it is in
  // the browser runtime.
  const file = join(dir, "main.mjs");
  writeFileSync(file, source);
  try {
    const stdout = execFileSync(process.execPath, [file], {
      encoding: "utf8",
      timeout,
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
  const engine = await taskEngine(challenge.runtime.initSql);
  try {
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
  } finally {
    await engine.release();
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

// ─── Starters must not already pass ──────────────────────────────────

/**
 * Whether a task's starter code already passes every check. The catalog test
 * only asserts that the starter's *text* differs from the solution's; this
 * runs it. A starter that passes is a challenge the learner completes by
 * pressing Submit, and it is an easy mistake when the starter carries most of
 * the answer and the checks are loose.
 */
async function starterPassesSql(challenge: Challenge, task: ChallengeTask): Promise<boolean> {
  if (challenge.runtime.kind !== "sql") throw new Error("not a sql challenge");
  const { initSql } = challenge.runtime;
  // The solution first, on its own transaction: the two share one database,
  // so they cannot both hold one open.
  const solutionResult = await lastResultOf(initSql, task.solutionCode);
  const engine = await taskEngine(initSql);
  try {
    let finalResult: SqlResult | null = null;
    try {
      const results = await engine.exec(task.starterCode);
      finalResult = [...results].reverse().find((r) => r.columns.length > 0) ?? null;
    } catch {
      return false;
    }
    for (const test of task.tests as SqlChallengeTest[]) {
      const { pass } = await evaluateSqlTest(test, { engine, finalResult, solutionResult });
      if (!pass) return false;
    }
    return true;
  } finally {
    await engine.release();
  }
}

// The slowest starter that finishes takes ~0.3 s; six loop forever on purpose,
// and at 4 s each they were over a third of this file's time.
const STARTER_TIMEOUT_MS = 1_500;

function starterPassesCode(lang: ChallengeLanguage): boolean {
  const tests = lang.tests as CodeTest[];
  const harness = buildHarness(lang.id, tests);
  const source = harness ? `${lang.starterCode}\n${harness}` : lang.starterCode;
  // Some starters loop until the learner fills the loop in. A hang passes
  // nothing, so a short kill is enough to see that.
  const { stdout, stderr } =
    lang.id === "python"
      ? runPython(source, STARTER_TIMEOUT_MS)
      : runJavaScript(source, STARTER_TIMEOUT_MS);
  const out = parseHarnessOutput(stdout);
  const parsed: ParsedTestResult[] = [...out.results];
  for (const t of tests) {
    if (isStdoutTest(t)) parsed.push(evaluateStdoutExpect(t, out.clean, stderr));
  }
  const byId = new Map(parsed.map((r) => [r.id, r]));
  return tests.every((t) => byId.get(t.id)?.pass === true);
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

describe("challenge starters", () => {
  for (const slug of SLUGS) {
    const challenge = getChallenge(slug)!;
    const tasks: { key: string; task: ChallengeTask; lang: ChallengeLanguage }[] =
      isMultiStep(challenge)
        ? challenge.steps.map((step) => ({
            key: `step ${step.n}`,
            task: step,
            lang: { ...challenge.languages[0], ...step },
          }))
        : challenge.languages.map((lang) => ({ key: lang.shortLabel, task: lang, lang }));

    for (const { key, task, lang } of tasks) {
      it(`${slug} · ${key} starter fails at least one check`, async () => {
        const passes =
          challenge.runtime.kind === "sql"
            ? await starterPassesSql(challenge, task)
            : starterPassesCode(lang);
        expect(passes, `${slug} · ${key}: the starter code already passes every check`).toBe(false);
      });
    }
  }
});

/**
 * The schema browser is authored by hand beside the seed it describes, so the
 * two can disagree: a column renamed in the `CREATE TABLE` but not in the
 * browser, a type changed in one place, or a row count left over from before
 * a few inserts were added. The learner reads the browser, then writes a
 * query against the seed.
 */
describe("challenge datasets", () => {
  /** information_schema's spelling, shortened to what the browser shows. */
  const shownType = (dataType: string) =>
    dataType === "timestamp without time zone" ? "timestamp" : dataType;

  const seen = new Set<string>();
  for (const slug of SLUGS) {
    const challenge = getChallenge(slug)!;
    if (challenge.runtime.kind !== "sql") continue;
    const initSql = challenge.runtime.initSql;
    if (seen.has(initSql)) continue;
    seen.add(initSql);

    it(`${slug}'s dataset matches its schema browser`, async () => {
      const schema = await datasetSchema(initSql);
      const db = await postgres();
      const tables = (
        await db.query<{ table_name: string }>(
          `SELECT table_name FROM information_schema.tables
            WHERE table_schema = $1 AND table_type = 'BASE TABLE'
            ORDER BY table_name`,
          [schema],
        )
      ).rows.map((t) => t.table_name);
      expect(tables, `${slug}: tables`).toEqual(
        challenge.schema.map((t) => t.name).sort(),
      );
      for (const table of challenge.schema) {
        const columns = (
          await db.query<{ column_name: string; data_type: string }>(
            `SELECT column_name, data_type FROM information_schema.columns
              WHERE table_schema = $1 AND table_name = $2
              ORDER BY ordinal_position`,
            [schema, table.name],
          )
        ).rows;
        expect(
          columns.map((c) => c.column_name),
          `${slug}: ${table.name} columns`,
        ).toEqual(table.columns.map((c) => c.name));
        expect(
          columns.map((c) => shownType(c.data_type)),
          `${slug}: ${table.name} column types`,
        ).toEqual(table.columns.map((c) => c.type));
        const [{ n }] = (
          await db.query<{ n: number }>(
            `SELECT COUNT(*)::int AS n FROM ${schema}.${table.name}`,
          )
        ).rows;
        expect(n, `${slug}: ${table.name} row count`).toBe(
          Number(table.rows.replace(/,/g, "")),
        );
      }
    });
  }
});
