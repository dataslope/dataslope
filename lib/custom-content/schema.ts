/**
 * Validation + sanitization for custom-content payloads. Every payload is
 * rebuilt field-by-field (unknown keys dropped, every value
 * type/length-checked) because stored payloads are spread straight into the
 * interactive components' props on the public /c/<id> and /quiz/<id> pages.
 * Each validator returns `{ ok: true, payload }` or `{ ok: false, message }`
 * with a user-facing reason. Pure module: no D1/R2 access.
 */

import { parseQuestion } from "@/app/_components/multipleChoice/parseQuestion";
import {
  CUSTOM_CODE_FIELD_MAX,
  CUSTOM_INSTRUCTIONS_MAX,
  CUSTOM_MAX_FILES,
  CUSTOM_MAX_PACKAGES,
  CUSTOM_MAX_TESTS,
  CUSTOM_MCQ_MARKDOWN_MAX,
  CUSTOM_PAYLOAD_MAX_BYTES,
  CUSTOM_SET_DESCRIPTION_MAX,
  CUSTOM_SET_MAX_ITEMS,
  CUSTOM_TITLE_MAX,
  isValidCustomId,
} from "./policy";
import type {
  CodeChallengePayload,
  CustomChallengeFile,
  CustomCodeTest,
  CustomItemKind,
  CustomItemPayload,
  CustomSqlDialect,
  CustomSqlTest,
  CustomStdoutExpect,
  McqPayload,
  SqlChallengePayload,
} from "./types";

/** Adapter ids the builder offers, mirroring ADAPTERS in
 *  app/_components/runtime/adapters.ts. Kept as a literal list (rather
 *  than importing the registry) so this module stays free of the heavy
 *  runtime-adapter graph and safe to load in API routes and tests. */
export const CODE_ADAPTER_IDS = [
  "python",
  "r",
  "javascript",
  "typescript",
  "php",
  "c",
  "cpp",
  "java",
  "csharp",
  "web",
  "react",
] as const;

export const SQL_DIALECTS: readonly CustomSqlDialect[] = [
  "sqlite",
  "duckdb",
  "postgres",
];

/** Adapters whose harness supports native `code` tests; the rest
 *  (compiled languages) only support declarative stdout tests. Mirrors
 *  `canRunTests` in app/_components/challengeHarness.ts. */
export const NATIVE_TEST_ADAPTERS: readonly string[] = [
  "python",
  "r",
  "javascript",
  "typescript",
  "php",
  "web",
  "react",
];

export type ValidationResult<T> =
  | { ok: true; payload: T }
  | { ok: false; message: string };

const ITEM_KINDS: readonly CustomItemKind[] = ["code", "sql", "mcq"];

export function isCustomItemKind(v: unknown): v is CustomItemKind {
  return typeof v === "string" && (ITEM_KINDS as string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Small checked-read helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail<T>(message: string): ValidationResult<T> {
  return { ok: false, message };
}

/** Required non-empty string within `max` characters, or an error string. */
function reqStr(
  v: unknown,
  label: string,
  max: number,
): string | { error: string } {
  if (typeof v !== "string" || v.trim().length === 0) {
    return { error: `${label} is required.` };
  }
  if (v.length > max) {
    return { error: `${label} is too long (max ${max.toLocaleString()} characters).` };
  }
  return v;
}

/** Optional string within `max` characters; empty/undefined → undefined. */
function optStr(
  v: unknown,
  label: string,
  max: number,
): string | undefined | { error: string } {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return { error: `${label} must be a string.` };
  if (v.length > max) {
    return { error: `${label} is too long (max ${max.toLocaleString()} characters).` };
  }
  return v.length === 0 ? undefined : v;
}

function isErr(v: unknown): v is { error: string } {
  return isRecord(v) && typeof v.error === "string";
}

function optStrOrArray(
  v: unknown,
  label: string,
): string | string[] | undefined | { error: string } {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v.slice(0, CUSTOM_CODE_FIELD_MAX);
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
    return (v as string[]).slice(0, 50).map((s) => s.slice(0, CUSTOM_CODE_FIELD_MAX));
  }
  return { error: `${label} must be a string or an array of strings.` };
}

// ---------------------------------------------------------------------------
// Titles
// ---------------------------------------------------------------------------

export function normalizeCustomTitle(raw: unknown, fallback: string): string {
  const title = typeof raw === "string" ? raw.trim() : "";
  return (title || fallback).slice(0, CUSTOM_TITLE_MAX);
}

// ---------------------------------------------------------------------------
// Code-challenge payloads
// ---------------------------------------------------------------------------

const TEST_ID_RE = /^[a-z0-9_-]{1,64}$/i;
const FILENAME_RE = /^[a-z0-9._][a-z0-9._ -]{0,79}$/i;

function validateStdoutExpect(
  raw: unknown,
  label: string,
): ValidationResult<CustomStdoutExpect> {
  if (!isRecord(raw)) return fail(`${label}: expectation must be an object.`);
  const out: CustomStdoutExpect = {};

  const equals = optStr(raw.stdoutEquals, `${label} stdoutEquals`, CUSTOM_CODE_FIELD_MAX);
  if (isErr(equals)) return fail(equals.error);
  if (equals !== undefined) out.stdoutEquals = equals;

  const contains = optStrOrArray(raw.stdoutContains, `${label} stdoutContains`);
  if (isErr(contains)) return fail(contains.error);
  if (contains !== undefined) out.stdoutContains = contains;

  const notContains = optStrOrArray(
    raw.stdoutDoesNotContain,
    `${label} stdoutDoesNotContain`,
  );
  if (isErr(notContains)) return fail(notContains.error);
  if (notContains !== undefined) out.stdoutDoesNotContain = notContains;

  const matches = optStr(raw.stdoutMatches, `${label} stdoutMatches`, 2_000);
  if (isErr(matches)) return fail(matches.error);
  if (matches !== undefined) {
    try {
      // Validate at save time so the checker never throws at run time.
      new RegExp(matches);
    } catch {
      return fail(`${label}: stdoutMatches is not a valid regular expression.`);
    }
    out.stdoutMatches = matches;
  }

  const flags = optStr(raw.stdoutMatchesFlags, `${label} stdoutMatchesFlags`, 8);
  if (isErr(flags)) return fail(flags.error);
  if (flags !== undefined) {
    if (!/^[dgimsuvy]*$/.test(flags)) {
      return fail(`${label}: stdoutMatchesFlags contains unknown flags.`);
    }
    out.stdoutMatchesFlags = flags;
  }

  if (raw.stdoutLines !== undefined) {
    if (
      !Array.isArray(raw.stdoutLines) ||
      !raw.stdoutLines.every((l) => typeof l === "string")
    ) {
      return fail(`${label}: stdoutLines must be an array of strings.`);
    }
    out.stdoutLines = (raw.stdoutLines as string[])
      .slice(0, 500)
      .map((l) => l.slice(0, 2_000));
  }
  if (raw.stdoutLinesExact !== undefined) {
    if (typeof raw.stdoutLinesExact !== "boolean") {
      return fail(`${label}: stdoutLinesExact must be a boolean.`);
    }
    out.stdoutLinesExact = raw.stdoutLinesExact;
  }
  if (raw.noStderr !== undefined) {
    if (typeof raw.noStderr !== "boolean") {
      return fail(`${label}: noStderr must be a boolean.`);
    }
    out.noStderr = raw.noStderr;
  }
  const stderrContains = optStrOrArray(
    raw.stderrContains,
    `${label} stderrContains`,
  );
  if (isErr(stderrContains)) return fail(stderrContains.error);
  if (stderrContains !== undefined) out.stderrContains = stderrContains;

  if (Object.keys(out).length === 0) {
    return fail(`${label}: the expectation needs at least one check.`);
  }
  return { ok: true, payload: out };
}

function validateCodeTests(
  raw: unknown,
  adapter: string,
): ValidationResult<CustomCodeTest[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fail("Add at least one test.");
  }
  if (raw.length > CUSTOM_MAX_TESTS) {
    return fail(`Too many tests (max ${CUSTOM_MAX_TESTS}).`);
  }
  const seen = new Set<string>();
  const tests: CustomCodeTest[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    const label = `Test ${i + 1}`;
    if (!isRecord(t)) return fail(`${label} must be an object.`);
    const id = typeof t.id === "string" ? t.id : "";
    if (!TEST_ID_RE.test(id)) {
      return fail(`${label}: id must be 1-64 letters, digits, "_" or "-".`);
    }
    if (seen.has(id)) return fail(`${label}: duplicate test id "${id}".`);
    seen.add(id);
    const name = reqStr(t.name, `${label} name`, 200);
    if (isErr(name)) return fail(name.error);
    const description = optStr(t.description, `${label} description`, 1_000);
    if (isErr(description)) return fail(description.error);

    const hasCode = typeof t.code === "string" && t.code.trim().length > 0;
    const hasExpect = t.expect !== undefined;
    if (hasCode === hasExpect) {
      return fail(
        `${label}: provide either check code or a stdout expectation (exactly one).`,
      );
    }
    const out: CustomCodeTest = { id, name };
    if (description !== undefined) out.description = description;
    if (hasCode) {
      if (!NATIVE_TEST_ADAPTERS.includes(adapter)) {
        return fail(
          `${label}: ${adapter} challenges only support stdout expectations, not check code.`,
        );
      }
      const code = reqStr(t.code, `${label} code`, CUSTOM_CODE_FIELD_MAX);
      if (isErr(code)) return fail(code.error);
      out.code = code;
    } else {
      const expect = validateStdoutExpect(t.expect, label);
      if (!expect.ok) return expect;
      out.expect = expect.payload;
    }
    tests.push(out);
  }
  return { ok: true, payload: tests };
}

export function validateCodeChallengePayload(
  raw: unknown,
): ValidationResult<CodeChallengePayload> {
  if (!isRecord(raw)) return fail("Payload must be an object.");
  const adapter = typeof raw.adapter === "string" ? raw.adapter : "";
  if (!(CODE_ADAPTER_IDS as readonly string[]).includes(adapter)) {
    return fail(`Unknown language "${adapter}".`);
  }
  const instructions = reqStr(
    raw.instructions,
    "Instructions",
    CUSTOM_INSTRUCTIONS_MAX,
  );
  if (isErr(instructions)) return fail(instructions.error);

  if (!Array.isArray(raw.files) || raw.files.length === 0) {
    return fail("Add at least one file.");
  }
  if (raw.files.length > CUSTOM_MAX_FILES) {
    return fail(`Too many files (max ${CUSTOM_MAX_FILES}).`);
  }
  const filenames = new Set<string>();
  const files: CustomChallengeFile[] = [];
  for (let i = 0; i < raw.files.length; i++) {
    const f = raw.files[i];
    const label = `File ${i + 1}`;
    if (!isRecord(f)) return fail(`${label} must be an object.`);
    const filename = typeof f.filename === "string" ? f.filename.trim() : "";
    if (!FILENAME_RE.test(filename)) {
      return fail(
        `${label}: filename must be 1-80 characters (letters, digits, ".", "_", "-", spaces) with no path separators.`,
      );
    }
    if (filenames.has(filename)) {
      return fail(`${label}: duplicate filename "${filename}".`);
    }
    filenames.add(filename);
    // Starter code may legitimately be empty (the learner writes it all),
    // so only length-check it rather than requiring content.
    const starterCode = typeof f.starterCode === "string" ? f.starterCode : "";
    if (starterCode.length > CUSTOM_CODE_FIELD_MAX) {
      return fail(`${label}: starter code is too long.`);
    }
    const initCode = optStr(f.initCode, `${label} init code`, CUSTOM_CODE_FIELD_MAX);
    if (isErr(initCode)) return fail(initCode.error);
    const solutionCode = optStr(
      f.solutionCode,
      `${label} solution code`,
      CUSTOM_CODE_FIELD_MAX,
    );
    if (isErr(solutionCode)) return fail(solutionCode.error);
    const out: CustomChallengeFile = { filename, starterCode };
    if (initCode !== undefined) out.initCode = initCode;
    if (solutionCode !== undefined) out.solutionCode = solutionCode;
    files.push(out);
  }

  let entryFilename: string | undefined;
  if (raw.entryFilename !== undefined) {
    if (
      typeof raw.entryFilename !== "string" ||
      !filenames.has(raw.entryFilename)
    ) {
      return fail("Entry filename must match one of the files.");
    }
    entryFilename = raw.entryFilename;
  }

  // A reference solution is required: the builder verifies that the
  // solution passes the tests before a challenge can be published, and
  // there is nothing to verify without one. The entry file is the one
  // the learner solves, so that's where the solution must live.
  const entryFile =
    files.find((f) => f.filename === (entryFilename ?? files[0].filename)) ??
    files[0];
  if (!entryFile.solutionCode || entryFile.solutionCode.trim().length === 0) {
    return fail(
      `Add solution code to the entry file (${entryFile.filename}); challenges can only be published once the solution passes the tests.`,
    );
  }

  const tests = validateCodeTests(raw.tests, adapter);
  if (!tests.ok) return tests;

  let packages: string[] | undefined;
  if (raw.packages !== undefined) {
    if (
      !Array.isArray(raw.packages) ||
      !raw.packages.every((p) => typeof p === "string" && /^[a-z0-9._-]{1,64}$/i.test(p))
    ) {
      return fail("Packages must be a list of module names.");
    }
    if (raw.packages.length > CUSTOM_MAX_PACKAGES) {
      return fail(`Too many packages (max ${CUSTOM_MAX_PACKAGES}).`);
    }
    if (raw.packages.length > 0) packages = raw.packages as string[];
  }

  const payload: CodeChallengePayload = {
    kind: "code",
    adapter,
    instructions,
    files,
    tests: tests.payload,
  };
  if (entryFilename !== undefined) payload.entryFilename = entryFilename;
  if (packages !== undefined) payload.packages = packages;
  return { ok: true, payload };
}

// ---------------------------------------------------------------------------
// SQL-challenge payloads
// ---------------------------------------------------------------------------

function validateSqlTests(
  raw: unknown,
  hasSolution: boolean,
): ValidationResult<CustomSqlTest[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fail("Add at least one test.");
  }
  if (raw.length > CUSTOM_MAX_TESTS) {
    return fail(`Too many tests (max ${CUSTOM_MAX_TESTS}).`);
  }
  const seen = new Set<string>();
  const tests: CustomSqlTest[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    const label = `Test ${i + 1}`;
    if (!isRecord(t)) return fail(`${label} must be an object.`);
    const id = typeof t.id === "string" ? t.id : "";
    if (!TEST_ID_RE.test(id)) {
      return fail(`${label}: id must be 1-64 letters, digits, "_" or "-".`);
    }
    if (seen.has(id)) return fail(`${label}: duplicate test id "${id}".`);
    seen.add(id);
    const name = reqStr(t.name, `${label} name`, 200);
    if (isErr(name)) return fail(name.error);
    const description = optStr(t.description, `${label} description`, 1_000);
    if (isErr(description)) return fail(description.error);

    const out: CustomSqlTest = { id, name };
    if (description !== undefined) out.description = description;

    let hasAssertion = false;
    const intKeys = [
      "expectedRowCount",
      "rowCountAtLeast",
      "runAfterRowCount",
    ] as const;
    for (const key of intKeys) {
      const v = t[key];
      if (v === undefined) continue;
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
        return fail(`${label}: ${key} must be a non-negative integer.`);
      }
      out[key] = v;
      hasAssertion = true;
    }
    const colKeys = ["expectedColumns", "expectedColumnsInclude"] as const;
    for (const key of colKeys) {
      const v = t[key];
      if (v === undefined) continue;
      if (
        !Array.isArray(v) ||
        v.length === 0 ||
        v.length > 100 ||
        !v.every((c) => typeof c === "string" && c.length > 0 && c.length <= 200)
      ) {
        return fail(`${label}: ${key} must be a non-empty list of column names.`);
      }
      out[key] = v as string[];
      hasAssertion = true;
    }
    if (t.matchesSolution !== undefined) {
      if (typeof t.matchesSolution !== "boolean") {
        return fail(`${label}: matchesSolution must be a boolean.`);
      }
      if (t.matchesSolution && !hasSolution) {
        return fail(
          `${label}: matchesSolution requires a solution SQL on the challenge.`,
        );
      }
      if (t.matchesSolution) {
        out.matchesSolution = true;
        hasAssertion = true;
      }
    }
    if (t.ordered !== undefined) {
      if (typeof t.ordered !== "boolean") {
        return fail(`${label}: ordered must be a boolean.`);
      }
      if (t.ordered) out.ordered = true;
    }
    const runAfterSql = optStr(
      t.runAfterSql,
      `${label} runAfterSql`,
      CUSTOM_CODE_FIELD_MAX,
    );
    if (isErr(runAfterSql)) return fail(runAfterSql.error);
    if (runAfterSql !== undefined) {
      out.runAfterSql = runAfterSql;
      const hasRunAfterCheck =
        t.runAfterEquals !== undefined || out.runAfterRowCount !== undefined;
      if (!hasRunAfterCheck) {
        return fail(
          `${label}: runAfterSql needs runAfterEquals or runAfterRowCount.`,
        );
      }
      if (t.runAfterEquals !== undefined) {
        const v = t.runAfterEquals;
        if (
          !(
            v === null ||
            typeof v === "string" ||
            typeof v === "number" ||
            typeof v === "boolean"
          )
        ) {
          return fail(`${label}: runAfterEquals must be a scalar value.`);
        }
        if (typeof v === "string" && v.length > 2_000) {
          return fail(`${label}: runAfterEquals is too long.`);
        }
        out.runAfterEquals = v;
      }
      hasAssertion = true;
    } else if (t.runAfterEquals !== undefined || out.runAfterRowCount !== undefined) {
      return fail(`${label}: runAfterEquals/runAfterRowCount need runAfterSql.`);
    }

    if (!hasAssertion) {
      return fail(`${label}: the test needs at least one assertion.`);
    }
    tests.push(out);
  }
  return { ok: true, payload: tests };
}

export function validateSqlChallengePayload(
  raw: unknown,
): ValidationResult<SqlChallengePayload> {
  if (!isRecord(raw)) return fail("Payload must be an object.");
  const dialect = typeof raw.dialect === "string" ? raw.dialect : "";
  if (!(SQL_DIALECTS as readonly string[]).includes(dialect)) {
    return fail(`Unknown SQL dialect "${dialect}".`);
  }
  const instructions = reqStr(
    raw.instructions,
    "Instructions",
    CUSTOM_INSTRUCTIONS_MAX,
  );
  if (isErr(instructions)) return fail(instructions.error);
  const initSql = optStr(raw.initSql, "Setup SQL", CUSTOM_CODE_FIELD_MAX);
  if (isErr(initSql)) return fail(initSql.error);
  const starterCode =
    typeof raw.starterCode === "string" ? raw.starterCode : "";
  if (starterCode.length > CUSTOM_CODE_FIELD_MAX) {
    return fail("Starter SQL is too long.");
  }
  const solutionSql = optStr(raw.solutionSql, "Solution SQL", CUSTOM_CODE_FIELD_MAX);
  if (isErr(solutionSql)) return fail(solutionSql.error);
  // Required, mirroring code challenges: publishing is gated on the
  // solution passing the tests, so a solution must exist.
  if (solutionSql === undefined || solutionSql.trim().length === 0) {
    return fail(
      "Add a solution SQL; challenges can only be published once the solution passes the tests.",
    );
  }

  const tests = validateSqlTests(raw.tests, solutionSql !== undefined);
  if (!tests.ok) return tests;

  const payload: SqlChallengePayload = {
    kind: "sql",
    dialect: dialect as CustomSqlDialect,
    instructions,
    starterCode,
    tests: tests.payload,
  };
  if (initSql !== undefined) payload.initSql = initSql;
  if (solutionSql !== undefined) payload.solutionSql = solutionSql;
  return { ok: true, payload };
}

// ---------------------------------------------------------------------------
// MCQ payloads
// ---------------------------------------------------------------------------

export function validateMcqPayload(raw: unknown): ValidationResult<McqPayload> {
  if (!isRecord(raw)) return fail("Payload must be an object.");
  const markdown = reqStr(raw.markdown, "Question", CUSTOM_MCQ_MARKDOWN_MAX);
  if (isErr(markdown)) return fail(markdown.error);
  const parsed = parseQuestion(markdown);
  if (parsed.body.trim().length === 0) {
    return fail("The question needs a body before the choices.");
  }
  if (parsed.choices.length < 2) {
    return fail("Add at least two choices.");
  }
  const correct = parsed.choices.filter((c) => c.correct);
  if (correct.length !== 1) {
    return fail("Mark exactly one choice as correct.");
  }
  return { ok: true, payload: { kind: "mcq", markdown } };
}

// ---------------------------------------------------------------------------
// Dispatch + envelope checks
// ---------------------------------------------------------------------------

export function validateItemPayload(
  kind: CustomItemKind,
  raw: unknown,
): ValidationResult<CustomItemPayload> {
  const result =
    kind === "code"
      ? validateCodeChallengePayload(raw)
      : kind === "sql"
        ? validateSqlChallengePayload(raw)
        : validateMcqPayload(raw);
  if (!result.ok) return result;
  const encoded = JSON.stringify(result.payload);
  if (encoded.length > CUSTOM_PAYLOAD_MAX_BYTES) {
    return fail("The challenge is too large to save.");
  }
  return result;
}

export interface ValidatedSetInput {
  title: string;
  description: string;
  itemIds: string[];
}

export function validateSetInput(raw: unknown): ValidationResult<ValidatedSetInput> {
  if (!isRecord(raw)) return fail("Body must be an object.");
  const title = normalizeCustomTitle(raw.title, "");
  if (!title) return fail("Give the quiz set a title.");
  const description = optStr(
    raw.description,
    "Description",
    CUSTOM_SET_DESCRIPTION_MAX,
  );
  if (isErr(description)) return fail(description.error);
  if (!Array.isArray(raw.itemIds) || raw.itemIds.length === 0) {
    return fail("Add at least one challenge or question to the set.");
  }
  if (raw.itemIds.length > CUSTOM_SET_MAX_ITEMS) {
    return fail(`Too many items (max ${CUSTOM_SET_MAX_ITEMS}).`);
  }
  const itemIds: string[] = [];
  const seen = new Set<string>();
  for (const id of raw.itemIds) {
    if (typeof id !== "string" || !isValidCustomId(id)) {
      return fail("The set contains an invalid item id.");
    }
    if (seen.has(id)) continue; // silently drop duplicates
    seen.add(id);
    itemIds.push(id);
  }
  return {
    ok: true,
    payload: { title, description: description ?? "", itemIds },
  };
}
