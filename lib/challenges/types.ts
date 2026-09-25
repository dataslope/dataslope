/**
 * The shape of a challenge.
 *
 * Split from the data so an authored challenge can import its own types
 * without a cycle through the catalog's accessors.
 *
 * A challenge is **executable**: it declares how to run (an in-browser SQL
 * engine, or a WASM language runtime) and what must be true of the result.
 * Nothing here describes a server — grading happens in the learner's browser
 * through the same evaluators the course challenge cards use, so the test
 * types are imported from those harnesses rather than mirrored. They are
 * type-only imports: no runtime coupling, and no drift between what an author
 * writes and what the grader reads.
 */

import type {
  ChallengeTest as CodeTest,
  StdoutExpect,
} from "@/app/_components/challengeHarness";
import type {
  SqlChallengeTest,
  SqlDialect,
} from "@/app/_components/sqlChallengeHarness";

export type { CodeTest, SqlChallengeTest, SqlDialect, StdoutExpect };

// ─── Prose ───────────────────────────────────────────────────────────

/** A run of instruction text. Objects render as inline `<code>`. */
export type Span = string | { code: string };

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

/** Filled bars in the difficulty meter, out of three. */
export const DIFFICULTY_BARS: Record<Difficulty, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

// ─── Instruction blocks ──────────────────────────────────────────────

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

/** One worked example in a problem's instructions. */
export interface WorkedExample {
  label: string;
  /** Rendered as a two-column `name → value` grid in the mono face. */
  fields: {
    name: string;
    value: string;
    emphasis?: boolean;
    /**
     * The value as the named language would write it, where that differs
     * from `value`: `null` rather than `None`, `true` rather than `True`.
     * The example follows the language picker the way the signature does;
     * a language with no entry here shows `value`.
     */
    byLanguage?: Partial<Record<CodeLanguage, string>>;
  }[];
  note?: string;
}

/**
 * Instruction-pane content, authored as blocks so the renderer stays generic
 * across challenges instead of hard-coding one problem's layout.
 */
export type InstructionBlock =
  | { kind: "heading"; text: string }
  | { kind: "prose"; spans: Span[] }
  /** Small uppercase section label. */
  | { kind: "label"; text: string }
  /** "Return these columns" — a name/type list in a bordered card. */
  | { kind: "columns"; rows: { name: string; type: string }[] }
  /** A preview table, e.g. "Expected, first rows". */
  | { kind: "table"; columns: TableColumn[]; rows: Record<string, string>[] }
  /** A fenced code block. */
  | { kind: "code"; source: string; language: CodeLanguage }
  /**
   * The active language's signature, in a fenced block. A separate kind
   * because the text follows the language picker rather than the fixture.
   */
  | { kind: "signature" }
  | { kind: "examples"; items: WorkedExample[] }
  | { kind: "list"; items: Span[][] };

// ─── Schema browser ──────────────────────────────────────────────────

export interface SchemaTable {
  name: string;
  /** Pre-formatted row count, e.g. "18,402". */
  rows: string;
  columns: { name: string; type: string; key?: "pk" | "fk" }[];
}

// ─── How a challenge runs ────────────────────────────────────────────

/** Languages the editor can highlight and CodeMirror can mode. */
export type CodeLanguage = "sql" | "python" | "javascript" | "typescript";

/**
 * What to boot before the learner's code runs.
 *
 * `sql` seeds an in-browser engine with `initSql` and grades the last result
 * set; `code` boots a WASM language runtime and grades stdout or native
 * assertions. Both are the machinery the course challenge cards already use.
 */
export type ChallengeRuntimeSpec =
  | {
      kind: "sql";
      dialect: SqlDialect;
      /** Schema and seed rows, executed once before the first query. */
      initSql: string;
    }
  /**
   * A language runtime. Which one follows the language the learner picked —
   * `ChallengeLanguage.id` doubles as the adapter id in
   * `app/_components/runtime/adapters` — so a challenge offering Python and
   * JavaScript boots whichever is on screen, and only that one.
   */
  | { kind: "code" };

// ─── A unit of work ──────────────────────────────────────────────────

/**
 * One editor, one reference solution, one set of checks.
 *
 * A multi-step challenge has one per step; a single-step challenge has one
 * per offered language. Either way the workspace resolves exactly one task at
 * a time, and everything downstream — editor buffer, Run, Submit, Solution —
 * reads from it.
 */
export interface ChallengeTask {
  /** What the editor opens with. */
  starterCode: string;
  /**
   * The reference solution. Shown in the Solution tab, compared against by
   * SQL tests that ask for it, and swept by the e2e solution check — so it
   * must actually pass every test below.
   */
  solutionCode: string;
  /** Graded checks. SQL challenges use `SqlChallengeTest`, code `CodeTest`. */
  tests: SqlChallengeTest[] | CodeTest[];
}

// ─── Steps ───────────────────────────────────────────────────────────

/**
 * One gated step of a multi-step challenge.
 *
 * There is deliberately no authored `state`: whether a step is passed, open
 * or locked is derived from the learner's stored progress
 * (`lib/challenges/progress`), because with real grading the answer changes
 * as they work.
 */
export interface ChallengeStep extends ChallengeTask {
  /** Zero-padded display number, e.g. "01". */
  n: string;
  /** Full title, shown beside the active step's mark. */
  title: string;
  /** Abbreviated title for the mobile stepper. */
  short: string;
  instructions: InstructionBlock[];
  /**
   * What this step's reference solution is teaching.
   *
   * Per step, because each step of a build has its own idea: step 2 is about
   * the window function, step 3 about the filter. The challenge-level
   * `solutionNote` is the fallback, and on a multi-step challenge it is the
   * wrong note on every step but one — so authored steps set this.
   */
  solutionNote?: Span[];
}

// ─── Languages ───────────────────────────────────────────────────────

/** One selectable language for a single-step challenge. */
export interface ChallengeLanguage extends ChallengeTask {
  id: CodeLanguage;
  /** Menu label, e.g. "Python 3.12". */
  label: string;
  /** Editor-header label, e.g. "Python". */
  shortLabel: string;
  /** Signature line rendered in the instructions, when the problem has one. */
  signature?: string;
}

// ─── Results (produced by a run, not authored) ───────────────────────

/** A graded check, as the results pane shows it. */
export interface TestOutcome {
  name: string;
  detail: string;
  /** Second mono line under a failing check. */
  got?: string;
  pass: boolean;
}

/** One entry in the session's submission history. */
export interface Submission {
  /** Present only on multi-step challenges. */
  step?: string;
  result: string;
  ok: boolean;
  lang: string;
  runtime?: string;
  when: string;
}

/** Which submission columns this challenge's history table shows. */
export type SubmissionColumn = "step" | "result" | "lang" | "runtime" | "when";

/**
 * The Output tab. A SQL run returns a result set; a program returns stdout,
 * so the pane shape differs per run.
 */
export type OutputPanel =
  | {
      kind: "table";
      columns: TableColumn[];
      rows: Record<string, string>[];
      /** Footer, e.g. "Showing 8 of 1,067 rows". */
      footer: string;
    }
  | {
      kind: "stdio";
      /** Left pane, when the run was given input worth showing. */
      stdin?: { label: string; text: string };
      stdout: string;
      /** Right-hand note on the stdout pane, e.g. "Matches expected". */
      stdoutNote?: string;
      stderr?: string;
      /** Mono footer segments, joined with "·". */
      footer: string[];
    }
  | { kind: "error"; message: string };

// ─── Catalog ─────────────────────────────────────────────────────────

/**
 * Languages a challenge can be listed under. Finer-grained than
 * `CodeLanguage`: the list distinguishes SQL dialects, because "PostgreSQL"
 * and "SQLite" are different filter choices even though the editor calls
 * both "sql". Ids match `LANGUAGE_ICONS` in `app/_components/languageIcons`.
 */
export type IndexLanguage =
  | "postgres"
  | "sqlite"
  | "duckdb"
  | "python"
  | "javascript"
  | "typescript"
  | "r";

export const INDEX_LANGUAGE_LABELS: Record<IndexLanguage, string> = {
  postgres: "PostgreSQL",
  sqlite: "SQLite",
  duckdb: "DuckDB",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  r: "R",
};

/** Where the learner stands on a challenge. */
export type ChallengeStatus = "solved" | "attempted" | "new";

export const CHALLENGE_STATUS_LABELS: Record<ChallengeStatus, string> = {
  solved: "Solved",
  attempted: "In progress",
  new: "Not started",
};

/** How a challenge appears in the catalog list. */
export interface ChallengeCatalogMeta {
  /** The concept the problem drills, shown under the title. */
  topic: string;
  langs: IndexLanguage[];
}

// ─── Challenge ───────────────────────────────────────────────────────

export interface Challenge {
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** This challenge's row in the catalog list. */
  catalog: ChallengeCatalogMeta;
  /** Subtitle beside the difficulty meter on mobile, e.g. "SQL". */
  languageLabel: string;
  description: string;
  runtime: ChallengeRuntimeSpec;
  /**
   * Multi-step challenges break one problem into gated steps — the Dataslope
   * difference. A single-step challenge leaves this empty and uses
   * `instructions` plus `languages` instead.
   */
  steps: ChallengeStep[];
  /** Instructions for a single-step challenge. */
  instructions: InstructionBlock[];
  /**
   * Selectable languages. A multi-step challenge declares exactly one (its
   * per-step tasks carry the code); a single-step challenge declares one per
   * language it offers.
   */
  languages: ChallengeLanguage[];
  schema: SchemaTable[];
  /** Explanation shown above the reference solution. */
  solutionNote: Span[];
  submissionColumns: SubmissionColumn[];
  /** Keyword strip above the mobile keyboard. Empty hides the strip. */
  keyStrip: string[];
  /** Label on the primary action: "Submit step" when gated, else "Submit". */
  submitLabel: string;
}

/** Enough of another challenge to link to it. */
export interface ChallengeLink {
  slug: string;
  title: string;
}

// ─── Catalog index ───────────────────────────────────────────────────

/** One row of the challenge list at `/dashboard/challenges`. */
export interface ChallengeIndexEntry extends ChallengeCatalogMeta {
  title: string;
  /** 1 Beginner, 2 Intermediate, 3 Advanced — the filled difficulty bars. */
  level: number;
  /** 1 for a single-step problem, otherwise the number of gated steps. */
  steps: number;
  /**
   * The workspace at `/challenges/<slug>`. Every row has one, because the
   * index is derived from the challenges themselves — a row can never point
   * at a page that does not exist.
   */
  slug: string;
  /**
   * Filled in on the client from stored progress. The server renders every
   * row as "new" and the list upgrades them after mount.
   */
  status?: ChallengeStatus;
}
