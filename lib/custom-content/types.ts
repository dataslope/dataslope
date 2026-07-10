/**
 * Shared types for user-created custom content: code challenges, SQL
 * challenges, multiple-choice questions, and quiz sets.
 *
 * The payload shapes deliberately mirror the props of the existing
 * interactive components (`<ChallengeCard>`, `<SqlChallengeCard>`,
 * `<MultipleChoiceQuestion>`): a stored payload is rendered by building the
 * component's props straight from the JSON, so the components' prop
 * interfaces ARE the storage schema. Fields the builder UI doesn't expose
 * (datasets, remoteInitSql, tailwind, …) are intentionally absent.
 *
 * Pure type module: safe to import from client components, API routes, and
 * unit tests alike.
 */

export type CustomItemKind = "code" | "sql" | "mcq";

// ---------------------------------------------------------------------------
// Code challenges (rendered by <ChallengeCard> via <MdxChallengeCard>)
// ---------------------------------------------------------------------------

/** One file in a code-challenge workspace, mirroring `ChallengeFile`. */
export interface CustomChallengeFile {
  filename: string;
  /** Read-only setup code prepended to every run. */
  initCode?: string;
  /** Editable starter shown in the editor. */
  starterCode: string;
  /** Optional reference solution (enables the Solution modal). */
  solutionCode?: string;
}

/** Declarative stdout/stderr expectation, mirroring `StdoutExpect` in
 *  app/_components/challengeHarness.ts (subset: every key optional, at
 *  least one required by validation). */
export interface CustomStdoutExpect {
  stdoutEquals?: string;
  stdoutContains?: string | string[];
  stdoutDoesNotContain?: string | string[];
  stdoutMatches?: string;
  stdoutMatchesFlags?: string;
  stdoutLines?: string[];
  stdoutLinesExact?: boolean;
  noStderr?: boolean;
  stderrContains?: string | string[];
}

/** One check run on "Check Answer", mirroring `ChallengeTest`: either a
 *  native `code` snippet (assert/throw on failure) or a declarative
 *  stdout `expect`. Exactly one of the two must be present. */
export interface CustomCodeTest {
  id: string;
  name: string;
  description?: string;
  code?: string;
  expect?: CustomStdoutExpect;
}

export interface CodeChallengePayload {
  kind: "code";
  /** Language adapter id ("python", "javascript", …), see
   *  CODE_ADAPTER_IDS in schema.ts. */
  adapter: string;
  /** Markdown instructions rendered above the editor. */
  instructions: string;
  files: CustomChallengeFile[];
  /** Filename passed to the runtime as the entry; defaults to the first
   *  file when omitted. */
  entryFilename?: string;
  tests: CustomCodeTest[];
  /** Extra importable modules to pre-install (Python only). */
  packages?: string[];
}

// ---------------------------------------------------------------------------
// SQL challenges (rendered by <SqlChallengeCard>)
// ---------------------------------------------------------------------------

export type CustomSqlDialect = "sqlite" | "duckdb" | "postgres";

/** Declarative SQL assertion, mirroring `SqlChallengeTest`. At least one
 *  assertion key must be present. */
export interface CustomSqlTest {
  id: string;
  name: string;
  description?: string;
  expectedRowCount?: number;
  rowCountAtLeast?: number;
  expectedColumns?: string[];
  expectedColumnsInclude?: string[];
  matchesSolution?: boolean;
  ordered?: boolean;
  runAfterSql?: string;
  runAfterEquals?: unknown;
  runAfterRowCount?: number;
}

export interface SqlChallengePayload {
  kind: "sql";
  dialect: CustomSqlDialect;
  instructions: string;
  /** Setup SQL run before the learner's first execution (CREATE TABLE +
   *  seed data). */
  initSql?: string;
  starterCode: string;
  solutionSql?: string;
  tests: CustomSqlTest[];
}

// ---------------------------------------------------------------------------
// Multiple-choice questions (rendered by <MultipleChoiceQuestion>)
// ---------------------------------------------------------------------------

export interface McqPayload {
  kind: "mcq";
  /** The question in the Markdown syntax parsed by
   *  app/_components/multipleChoice/parseQuestion.ts (`- [o]` marks the
   *  correct choice, `>` lines are per-choice explanations). */
  markdown: string;
}

export type CustomItemPayload =
  | CodeChallengePayload
  | SqlChallengePayload
  | McqPayload;

// ---------------------------------------------------------------------------
// API wire shapes
// ---------------------------------------------------------------------------

/** Item metadata + payload as returned by the API (payload parsed). */
export interface CustomItemView {
  id: string;
  kind: CustomItemKind;
  title: string;
  payload: CustomItemPayload;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  /** True when the requester owns the row (drives edit/delete UI). */
  owned: boolean;
}

/** List-view metadata (no payload, keeps "your creations" lists light). */
export interface CustomItemMeta {
  id: string;
  kind: CustomItemKind;
  title: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface CustomSetView {
  id: string;
  title: string;
  description: string;
  itemIds: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  owned: boolean;
}

export interface CustomSetMeta {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}
