/**
 * The shape of a challenge.
 *
 * Split from the data so an authored challenge in this directory can import
 * its own types without a cycle through the catalog's accessors. Nothing here
 * is a runtime contract with a server: the workspace grades in the browser
 * (see `app/_components/challengeHarness.ts`), so these are the shapes an
 * author writes, not the shapes an API returns.
 */

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

/** One worked example in a single-step problem's instructions. */
export interface WorkedExample {
  label: string;
  /** Rendered as a two-column `name → value` grid in the mono face. */
  fields: { name: string; value: string; emphasis?: boolean }[];
  note?: string;
}

/**
 * Instruction-pane content, authored as blocks so the renderer stays generic
 * across challenges instead of hard-coding one problem's layout.
 */
export type InstructionBlock =
  /** Green "you already passed this" banner. */
  | { kind: "banner"; text: string }
  /** Amber-dot status line, e.g. "Attempted · 2 submissions". */
  | { kind: "status"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "prose"; spans: Span[] }
  /** Small uppercase section label. */
  | { kind: "label"; text: string }
  /** "Return these columns" — a name/type list in a bordered card. */
  | { kind: "columns"; rows: { name: string; type: string }[] }
  /** "Expected, first rows" — a preview table. */
  | { kind: "table"; columns: TableColumn[]; rows: Record<string, string>[] }
  /** A fenced code block. */
  | { kind: "code"; source: string; language: CodeLanguage }
  /**
   * The active language's signature, in a fenced block. A separate kind
   * because the text follows the language picker rather than the fixture.
   */
  | { kind: "signature" }
  | { kind: "examples"; items: WorkedExample[] }
  | { kind: "list"; items: Span[][] }
  /** The placeholder shown in a locked step's instruction pane. */
  | {
      kind: "locked";
      title: string;
      text: string;
      /** Button that returns the learner to the step they can work on. */
      backTo: number;
      backLabel: string;
    };

// ─── Schema browser ──────────────────────────────────────────────────

export interface SchemaTable {
  name: string;
  /** Pre-formatted row count, e.g. "18,402". */
  rows: string;
  columns: { name: string; type: string; key?: "pk" | "fk" }[];
}

// ─── Editor ──────────────────────────────────────────────────────────

export type CodeLanguage = "sql" | "python" | "javascript";

/** One selectable language for a challenge whose solution isn't SQL-only. */
export interface ChallengeLanguage {
  id: CodeLanguage;
  /** Menu label, e.g. "Python 3.12". */
  label: string;
  /** Left-hand editor-header label, e.g. "SQL". */
  shortLabel: string;
  /** Mono run-meta string shown at the right of the editor header. */
  runMeta: string;
  /** Wall-clock figure echoed in the stdout footer. */
  runTime: string;
  /** Signature line rendered in the instructions, when the problem has one. */
  signature?: string;
  source: string;
}

// ─── Results ─────────────────────────────────────────────────────────

export interface TestCase {
  name: string;
  detail: string;
  /** Second mono line, shown in red under a failing check. */
  got?: string;
  pass: boolean;
}

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
 * The Output tab. SQL challenges return a result set; a program returns
 * stdout for a given stdin, so the pane shape differs per challenge.
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
      stdinLabel: string;
      stdin: string;
      stdout: string;
      matchesExpected: boolean;
      /** Mono footer segments, joined with "·", e.g. exit code and memory. */
      footer: string[];
    };

export interface SolutionPanel {
  /** Explanation above the reference code. */
  spans: Span[];
  label: string;
  source: string;
  language: CodeLanguage;
}

// ─── Steps ───────────────────────────────────────────────────────────

export type StepState = "passed" | "active" | "locked";

export interface ChallengeStep {
  /** Zero-padded display number, e.g. "01". */
  n: string;
  /** Full title, shown beside the active step's mark. */
  title: string;
  /** Abbreviated title for the mobile stepper. */
  short: string;
  state: StepState;
  instructions: InstructionBlock[];
  /**
   * Editor contents for this step. A passed step shows its accepted query in
   * a muted color; a locked step shows no editor at all.
   */
  source?: string;
  /** Renders the step's code muted, as read-only history. */
  sourceMuted?: boolean;
}

// ─── Challenge ───────────────────────────────────────────────────────

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
  status: ChallengeStatus;
  /** Percent of submissions accepted. */
  acceptance: number;
}

export interface Challenge {
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** This challenge's row in the catalog list. */
  catalog: ChallengeCatalogMeta;
  /** Subtitle beside the difficulty meter on mobile, e.g. "SQL". */
  languageLabel: string;
  description: string;
  /**
   * Multi-step challenges break one problem into gated steps — the Dataslope
   * difference. A single-step challenge leaves this empty and uses
   * `instructions` plus `languages` instead.
   */
  steps: ChallengeStep[];
  /** Instructions for a single-step challenge. */
  instructions: InstructionBlock[];
  /** Selectable languages. A one-entry list renders as a static label. */
  languages: ChallengeLanguage[];
  schema: SchemaTable[];
  output: OutputPanel;
  tests: TestCase[];
  /** Red banner above the checks, e.g. "2 of 3 checks passed". */
  testsSummary: string;
  /** Secondary line beside it, e.g. "Step 2 is not accepted yet". */
  testsSubtitle?: string;
  /** Badge on the Test cases tab, e.g. "2/3". */
  testsBadge: string;
  solution: SolutionPanel;
  submissions: Submission[];
  submissionColumns: SubmissionColumn[];
  /** Keyword strip above the mobile keyboard. Empty hides the strip. */
  keyStrip: string[];
  /** Label on the primary action: "Submit step" when gated, else "Submit". */
  submitLabel: string;
}

// ─── Catalog index ───────────────────────────────────────────────────

/** One row of the challenge list at `/dashboard/challenges`. */
export interface ChallengeIndexEntry extends ChallengeCatalogMeta {
  title: string;
  /** 1 Beginner, 2 Intermediate, 3 Advanced — the filled difficulty bars. */
  level: number;
  /** 1 for a single-step problem, otherwise the number of gated steps. */
  steps: number;
  /** Set only when a workspace exists at `/challenges/<slug>`. */
  slug?: string;
}
