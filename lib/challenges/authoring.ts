/**
 * Builders for authoring challenges.
 *
 * A `Challenge` carries a fair amount of chrome — submit labels, submission
 * columns, the key strip, the language record a SQL challenge needs even
 * though it only ever has one. Written out per challenge that is fifty copies
 * of the same boilerplate, and fifty chances to get one of them subtly wrong.
 * These builders fill in everything that is implied by the kind of challenge,
 * so an author writes only the parts that differ: the prompt, the starter, the
 * solution, and the checks.
 *
 * They are plain functions, not a DSL: the result is an ordinary `Challenge`,
 * and anything a builder does not cover can be spread over the top.
 */

import { examplesFromCases, jsCases, pyCases, type CallCase } from "./cases";
import type { ChallengeDataset } from "./datasets";
import { jsSignature } from "./signatures";
import type {
  Challenge,
  ChallengeStep,
  CodeTest,
  Difficulty,
  IndexLanguage,
  InstructionBlock,
  Span,
  SqlChallengeTest,
  WorkedExample,
} from "./types";

/** The SQL keyword strip shown above the phone keyboard. */
const SQL_KEYS = [
  "SELECT", "FROM", "JOIN", "WHERE", "GROUP BY", "ORDER BY", "HAVING",
  "(", ")", ",", "*", "'",
];

/**
 * Split backtick runs out of authored text into code spans, so
 * "Sort by `name`." renders `name` in the code face rather than showing the
 * backticks. Text without backticks passes through untouched, and an odd
 * backtick with no partner stays literal.
 */
export function ticks(text: string): Span[] {
  const out: Span[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ code: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Apply `ticks` to every string in a paragraph that may already hold spans. */
function spans(p: Span[] | string): Span[] {
  const parts = typeof p === "string" ? [p] : p;
  return parts.flatMap((part) => (typeof part === "string" ? ticks(part) : [part]));
}

/** Turn one or more paragraphs into prose blocks. */
function prose(paragraphs: (Span[] | string)[]): InstructionBlock[] {
  return paragraphs.map((p) => ({
    kind: "prose" as const,
    spans: spans(p),
  }));
}

/** The "Return these columns" card, when a challenge specifies output shape. */
function columnsBlock(
  columns?: { name: string; type: string }[],
): InstructionBlock[] {
  if (!columns?.length) return [];
  return [
    { kind: "label", text: "Return these columns" },
    { kind: "columns", rows: columns },
  ];
}

function constraintsBlock(items?: (Span[] | string)[]): InstructionBlock[] {
  if (!items?.length) return [];
  return [
    { kind: "label", text: "Constraints" },
    {
      kind: "list",
      items: items.map(spans),
    },
  ];
}

function examplesBlock(items?: WorkedExample[]): InstructionBlock[] {
  if (!items?.length) return [];
  return [
    { kind: "label", text: "Examples" },
    { kind: "examples", items },
  ];
}

/**
 * Indent a query so it reads as a nested CTE body.
 *
 * Multi-step SQL challenges quote an earlier step's accepted query inside a
 * `WITH` clause, and that only looks like SQL somebody wrote if it is indented
 * to match. Blank lines are left alone so the result has no trailing spaces.
 */
export function indentSql(sql: string): string {
  return sql
    .split("\n")
    .map((line) => (line.trim() ? "  " + line : line))
    .join("\n");
}

/**
 * The three checks a single-query SQL challenge almost always wants: the
 * right columns, the right number of rows, then the right values.
 *
 * Shared rather than copied into each module because the wording is what a
 * learner reads on every SQL challenge in the catalog — three copies would
 * drift apart within a week. `ordered` is for challenges whose prompt asks
 * for a specific sort; without it the comparison ignores row order, which is
 * the right default when the prompt does not.
 */
export function resultShape(
  columns: string[],
  rowCount: number,
  matchNote: string,
  ordered = false,
): SqlChallengeTest[] {
  return [
    {
      id: "columns",
      name: `Returns ${columns.join(", ")}`,
      description: "With those names, in that order.",
      expectedColumns: columns,
    },
    {
      id: "rowcount",
      name: `Returns ${rowCount} row${rowCount === 1 ? "" : "s"}`,
      expectedRowCount: rowCount,
    },
    {
      id: "matches",
      name: ordered
        ? "Values match the reference result, in order"
        : "Values match the reference result",
      description: matchNote,
      matchesSolution: true,
      ...(ordered ? { ordered: true } : {}),
    },
  ];
}

// ─── SQL ─────────────────────────────────────────────────────────────

interface SqlTaskSpec {
  /** Paragraphs of instruction. */
  prompt: (Span[] | string)[];
  columns?: { name: string; type: string }[];
  starter: string;
  solution: string;
  tests: SqlChallengeTest[];
}

interface SqlCommon {
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** The concept the problem drills, shown under the title in the catalog. */
  topic: string;
  dataset: ChallengeDataset;
  /** One-line catalog description. */
  description: string;
  solutionNote?: Span[] | string;
}

function sqlBase(common: SqlCommon): Omit<Challenge, "steps" | "instructions" | "languages"> {
  return {
    slug: common.slug,
    title: common.title,
    difficulty: common.difficulty,
    catalog: { topic: common.topic, langs: ["sqlite"] as IndexLanguage[] },
    languageLabel: "SQL",
    description: common.description,
    runtime: { kind: "sql", dialect: "sqlite", initSql: common.dataset.initSql },
    schema: common.dataset.schema,
    solutionNote: spans(common.solutionNote ?? []),
    submissionColumns: ["result", "lang", "runtime", "when"],
    keyStrip: SQL_KEYS,
    submitLabel: "Submit",
  };
}

/** A SQL challenge solved by one query. */
export function sqlChallenge(common: SqlCommon, task: SqlTaskSpec): Challenge {
  return {
    ...sqlBase(common),
    steps: [],
    instructions: [
      { kind: "heading", text: common.title },
      ...prose(task.prompt),
      ...columnsBlock(task.columns),
    ],
    languages: [
      {
        id: "sql",
        label: "SQL · SQLite",
        shortLabel: "SQL",
        starterCode: task.starter,
        solutionCode: task.solution,
        tests: task.tests,
      },
    ],
  };
}

interface SqlStepSpec extends SqlTaskSpec {
  title: string;
  /** Abbreviated title for the phone's stepper. */
  short: string;
  /** What this step's solution teaches; falls back to the challenge's note. */
  solutionNote?: Span[] | string;
}

/** A SQL challenge broken into gated steps. */
export function sqlSteps(common: SqlCommon, steps: SqlStepSpec[]): Challenge {
  return {
    ...sqlBase(common),
    submitLabel: "Submit step",
    submissionColumns: ["step", "result", "lang", "when"],
    instructions: [],
    languages: [
      {
        id: "sql",
        label: "SQL · SQLite",
        shortLabel: "SQL",
        starterCode: "",
        solutionCode: "",
        tests: [],
      },
    ],
    steps: steps.map((step, i): ChallengeStep => ({
      n: String(i + 1).padStart(2, "0"),
      title: step.title,
      short: step.short,
      instructions: [
        { kind: "heading", text: step.title },
        ...prose(step.prompt),
        ...columnsBlock(step.columns),
      ],
      starterCode: step.starter,
      solutionCode: step.solution,
      solutionNote: step.solutionNote === undefined ? undefined : spans(step.solutionNote),
      tests: step.tests,
    })),
  };
}

// ─── Code ────────────────────────────────────────────────────────────

/** One language's take on a code problem. */
export interface CodeVariant {
  /**
   * Shown in the instructions under "Signature". A JavaScript signature may
   * be written with TypeScript annotations; it is shown as JavaScript with
   * JSDoc types (see `./signatures`).
   */
  signature: string;
  starter: string;
  solution: string;
  tests: CodeTest[];
}

/** What every code challenge declares, step rail or not. */
interface CodeMeta {
  slug: string;
  title: string;
  difficulty: Difficulty;
  topic: string;
  description: string;
  solutionNote?: Span[] | string;
}

/**
 * A single-step challenge additionally carries the problem statement. A
 * multi-step one does not: its prose lives on the steps, so `codeSteps` takes
 * `CodeMeta` and an author is never asked for text that would not be rendered.
 */
interface CodeCommon extends CodeMeta {
  prompt: (Span[] | string)[];
  examples?: WorkedExample[];
  constraints?: (Span[] | string)[];
}

const LANG_LABELS: Record<"python" | "javascript", { label: string; short: string }> = {
  // Kept in step with `readyStatus` in app/_components/runtime/python.tsx —
  // the workspace claimed 3.12 while the runtime it boots reported 3.14.2.
  python: { label: "Python 3.14", short: "Python" },
  javascript: { label: "JavaScript · Node", short: "JavaScript" },
};

function codeBase(
  common: CodeMeta,
  langs: ("python" | "javascript")[],
): Omit<Challenge, "steps" | "instructions" | "languages"> {
  return {
    slug: common.slug,
    title: common.title,
    difficulty: common.difficulty,
    catalog: { topic: common.topic, langs: langs as IndexLanguage[] },
    languageLabel: LANG_LABELS[langs[0]].short,
    description: common.description,
    runtime: { kind: "code" },
    schema: [],
    solutionNote: spans(common.solutionNote ?? []),
    submissionColumns: ["result", "lang", "runtime", "when"],
    keyStrip: [],
    submitLabel: "Submit",
  };
}

/** A code challenge solved by one function, in one or more languages. */
export function codeChallenge(
  common: CodeCommon,
  variants: Partial<Record<"python" | "javascript", CodeVariant>>,
): Challenge {
  const ids = Object.keys(variants) as ("python" | "javascript")[];
  if (ids.length === 0) throw new Error(`${common.slug}: no language variants`);
  return {
    ...codeBase(common, ids),
    steps: [],
    instructions: [
      // The page's only other title is the visually hidden `<h1>` and the top
      // bar, so without this the section labels below (which render as `<h3>`)
      // skip a level — and a code challenge looked different from a SQL one,
      // which does emit a heading. Same component, same shape.
      { kind: "heading", text: common.title },
      ...prose(common.prompt),
      { kind: "label", text: "Signature" },
      { kind: "signature" },
      ...examplesBlock(common.examples),
      ...constraintsBlock(common.constraints),
    ],
    languages: ids.map((id) => {
      const v = variants[id]!;
      return {
        id,
        label: LANG_LABELS[id].label,
        shortLabel: LANG_LABELS[id].short,
        signature: id === "javascript" ? jsSignature(v.signature) : v.signature,
        starterCode: v.starter,
        solutionCode: v.solution,
        tests: v.tests,
      };
    }),
  };
}

interface CodeStepSpec {
  title: string;
  short: string;
  prompt: (Span[] | string)[];
  /**
   * The function this step adds, shown in a fenced block under the prompt.
   * On a JavaScript build, annotations become JSDoc, as for `CodeVariant`.
   */
  signature?: string;
  /** What this step's solution teaches; falls back to the challenge's note. */
  solutionNote?: Span[] | string;
  starter: string;
  solution: string;
  tests: CodeTest[];
}

/**
 * A code challenge broken into gated steps, in a single language.
 *
 * Each step's solution is a complete program: the steps are stages of one
 * build, and a later step's starter is the previous step's accepted answer
 * plus the next thing to write.
 *
 * The signature lives on the step rather than the challenge, because each step
 * writes a different function — which is why it renders as a plain code block
 * instead of the `signature` block a single-step challenge uses (that one
 * follows the language picker, and a gated challenge has no picker).
 */
export function codeSteps(
  common: CodeMeta & { language: "python" | "javascript" },
  steps: CodeStepSpec[],
): Challenge {
  return {
    ...codeBase(common, [common.language]),
    submitLabel: "Submit step",
    submissionColumns: ["step", "result", "lang", "when"],
    instructions: [],
    languages: [
      {
        id: common.language,
        label: LANG_LABELS[common.language].label,
        shortLabel: LANG_LABELS[common.language].short,
        starterCode: "",
        solutionCode: "",
        tests: [],
      },
    ],
    steps: steps.map((step, i): ChallengeStep => ({
      n: String(i + 1).padStart(2, "0"),
      title: step.title,
      short: step.short,
      instructions: [
        { kind: "heading", text: step.title },
        ...prose(step.prompt),
        ...(step.signature
          ? ([
              { kind: "label", text: "Signature" },
              {
                kind: "code",
                source:
                  common.language === "javascript"
                    ? jsSignature(step.signature)
                    : step.signature,
                language: common.language,
              },
            ] as InstructionBlock[])
          : []),
      ],
      starterCode: step.starter,
      solutionCode: step.solution,
      solutionNote: step.solutionNote === undefined ? undefined : spans(step.solutionNote),
      tests: step.tests,
    })),
  };
}

// ─── Code, table-driven ──────────────────────────────────────────────

/** One language's half of a `dualChallenge`: everything but the checks. */
export interface DualVariant {
  /** The function the checks call, e.g. `two_sum` / `twoSum`. */
  fn: string;
  signature: string;
  starter: string;
  solution: string;
  /** Hand-written checks to run after the shared cases. */
  extra?: CodeTest[];
}

interface DualSpec extends CodeCommon {
  /**
   * Parameter names, in order, used to label the worked examples derived
   * from cases marked `example`. Needed only when some case is.
   */
  params?: string[];
  python: DualVariant;
  javascript: DualVariant;
  /** Checks shared by both languages, rendered into each. */
  cases: CallCase[];
}

/**
 * A single-step code challenge in Python and JavaScript, graded on one shared
 * set of cases.
 *
 * `codeChallenge` takes a separate list of checks per language, which is
 * right when the two genuinely test different things and a liability when
 * they should not: nothing stops the Python side from gaining an edge case the
 * JavaScript side never checks. Here the cases are written once, as values,
 * and `./cases` renders them into both, so the two variants cannot drift.
 * Worked examples come from the same cases when the spec does not author its
 * own, so the first thing a learner reads is what the first checks run.
 */
export function dualChallenge(spec: DualSpec): Challenge {
  const { python, javascript, cases, params, ...common } = spec;
  const examples =
    common.examples ??
    (cases.some((c) => c.example !== undefined)
      ? examplesFromCases(params ?? [], cases)
      : undefined);
  return codeChallenge(
    { ...common, examples },
    {
      python: {
        signature: python.signature,
        starter: python.starter,
        solution: python.solution,
        tests: [...pyCases(python.fn, cases), ...(python.extra ?? [])],
      },
      javascript: {
        signature: javascript.signature,
        starter: javascript.starter,
        solution: javascript.solution,
        tests: [...jsCases(javascript.fn, cases), ...(javascript.extra ?? [])],
      },
    },
  );
}
