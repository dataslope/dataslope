/**
 * Catalog for the full-page challenge workspace (`/challenges/[slug]`).
 *
 * These are fixtures, not a runtime contract: the workspace is a UI shell, so
 * every result the screen shows (run output, check results, submission
 * history) is authored here rather than produced by executing the editor's
 * code. Wiring Run/Submit to a real runtime means replacing the reads in
 * `ChallengeWorkspace`, not reshaping these types — the shapes below are
 * deliberately the ones a grader would return.
 *
 * Siblings: `lib/courseCatalog.ts`, `lib/interviewCatalog.ts`.
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

// ─── Fixtures ────────────────────────────────────────────────────────

const ORDER_SCHEMA: SchemaTable[] = [
  {
    name: "orders",
    rows: "18,402",
    columns: [
      { name: "order_id", type: "integer", key: "pk" },
      { name: "customer_id", type: "integer" },
      { name: "order_date", type: "date" },
      { name: "status", type: "text" },
    ],
  },
  {
    name: "order_items",
    rows: "61,155",
    columns: [
      { name: "order_id", type: "integer", key: "fk" },
      { name: "product_id", type: "integer", key: "fk" },
      { name: "quantity", type: "integer" },
      { name: "unit_price", type: "numeric" },
    ],
  },
  {
    name: "products",
    rows: "92",
    columns: [
      { name: "product_id", type: "integer", key: "pk" },
      { name: "product_name", type: "text" },
      { name: "category", type: "text" },
      { name: "unit_cost", type: "numeric" },
    ],
  },
];

const STEP_1_SQL = `SELECT date_trunc('month', o.order_date) AS month,
       p.product_name,
       SUM(i.quantity * i.unit_price) AS revenue
FROM order_items i
JOIN orders   o USING (order_id)
JOIN products p USING (product_id)
GROUP BY 1, 2;`;

const STEP_2_SQL = `WITH monthly AS (
  SELECT date_trunc('month', o.order_date) AS month,
         p.product_name,
         SUM(i.quantity * i.unit_price) AS revenue
  FROM order_items i
  JOIN orders   o USING (order_id)
  JOIN products p USING (product_id)
  WHERE o.status = 'completed'
  GROUP BY 1, 2
)
SELECT month, product_name, revenue,
       RANK() OVER (PARTITION BY month ORDER BY revenue DESC)
         AS revenue_rank
FROM monthly;`;

const RESULT_COLUMNS: TableColumn[] = [
  { key: "month", label: "month" },
  { key: "product", label: "product_name" },
  { key: "revenue", label: "revenue", align: "right" },
  { key: "rank", label: "revenue_rank", align: "right" },
];

const RESULT_ROWS = [
  { month: "2024-01-01", product: "Cold Brew Concentrate", revenue: "48210.00", rank: "1" },
  { month: "2024-01-01", product: "Oat Milk 1L", revenue: "39880.50", rank: "2" },
  { month: "2024-01-01", product: "Espresso Beans 250g", revenue: "31405.75", rank: "3" },
  { month: "2024-01-01", product: "Paper Cups 12oz", revenue: "12040.00", rank: "4" },
  { month: "2024-02-01", product: "Cold Brew Concentrate", revenue: "51033.20", rank: "1" },
  { month: "2024-02-01", product: "Espresso Beans 250g", revenue: "40118.00", rank: "2" },
  { month: "2024-02-01", product: "Oat Milk 1L", revenue: "40118.00", rank: "3" },
  { month: "2024-02-01", product: "Syrup Vanilla 750ml", revenue: "18760.40", rank: "4" },
];

const TOP_PRODUCTS: Challenge = {
  slug: "top-products-by-month",
  title: "Top Products by Month",
  difficulty: "Intermediate",
  catalog: {
    topic: "Window functions",
    // The workspace runs on sqlite, so the row says SQLite. The list mock
    // said PostgreSQL + DuckDB; the page it links to wins.
    langs: ["sqlite"],
    status: "attempted",
    acceptance: 58,
  },
  languageLabel: "SQL",
  description:
    "Break a monthly revenue ranking into three gated steps: total revenue per product per month, rank within each month, then cut to the top three.",
  submitLabel: "Submit step",
  steps: [
    {
      n: "01",
      title: "Monthly revenue",
      short: "Revenue",
      state: "passed",
      source: STEP_1_SQL,
      sourceMuted: true,
      instructions: [
        { kind: "banner", text: "Passed on your second submission" },
        { kind: "heading", text: "Monthly revenue per product" },
        {
          kind: "prose",
          spans: [
            "Join the three tables and total revenue for every product in every calendar month. Revenue is quantity times unit price, summed. Truncate order dates to the first of the month so months group cleanly.",
          ],
        },
        {
          kind: "prose",
          spans: [
            "Your accepted query returned 1,284 rows across 14 months. Step 2 builds on it.",
          ],
        },
      ],
    },
    {
      n: "02",
      title: "Rank in month",
      short: "Rank",
      state: "active",
      source: STEP_2_SQL,
      instructions: [
        { kind: "heading", text: "Rank products within each month" },
        {
          kind: "prose",
          spans: [
            "Take the monthly totals from step 1 and add a rank column. Within each month, rank products by revenue with the highest first. Where two products tie on revenue, the one whose name comes first alphabetically takes the lower rank number.",
          ],
        },
        {
          kind: "prose",
          spans: [
            "Return one row per product per month. Do not filter anything out yet, step 3 handles the cut.",
          ],
        },
        { kind: "label", text: "Return these columns" },
        {
          kind: "columns",
          rows: [
            { name: "month", type: "date" },
            { name: "product_name", type: "text" },
            { name: "revenue", type: "numeric" },
            { name: "revenue_rank", type: "integer" },
          ],
        },
        { kind: "label", text: "Expected, first rows" },
        {
          kind: "table",
          columns: [
            { key: "month", label: "month" },
            { key: "product", label: "product_name" },
            { key: "revenue", label: "revenue", align: "right" },
            { key: "rank", label: "rank", align: "right" },
          ],
          rows: RESULT_ROWS.slice(0, 3),
        },
      ],
    },
    {
      n: "03",
      title: "Top three",
      short: "Top 3",
      state: "locked",
      instructions: [
        {
          kind: "locked",
          title: "Keep the top three",
          text: "Opens once step 2 passes. You will cut each month down to its three best products and format the output for the report.",
          backTo: 2,
          backLabel: "Back to step 2",
        },
      ],
    },
  ],
  instructions: [],
  languages: [
    {
      id: "sql",
      label: "SQL · sqlite",
      shortLabel: "SQL",
      runMeta: "sqlite · 0.42s · 1,067 rows",
      runTime: "0.42s",
      source: STEP_2_SQL,
    },
  ],
  schema: ORDER_SCHEMA,
  output: {
    kind: "table",
    columns: RESULT_COLUMNS,
    rows: RESULT_ROWS,
    footer: "Showing 8 of 1,067 rows",
  },
  tests: [
    {
      name: "Ranks restart at 1 in every month",
      detail: "14 months checked, each has exactly one rank = 1",
      pass: true,
    },
    {
      name: "Ties break by product name, ascending",
      detail: "3 tied pairs checked in 2024-02 and 2024-09",
      pass: true,
    },
    {
      name: "Row count matches your step 1 result",
      detail: "expected 1284 rows, got 1067",
      pass: false,
    },
  ],
  testsSummary: "2 of 3 checks passed",
  testsSubtitle: "Step 2 is not accepted yet",
  testsBadge: "2/3",
  solution: {
    spans: [
      "The tiebreak is the part people miss. ",
      { code: "RANK()" },
      " gives tied rows the same number and skips the next one, so add product name as a second sort key and use ",
      { code: "ROW_NUMBER()" },
      " when every row needs a distinct rank.",
    ],
    label: "Reference solution",
    language: "sql",
    source: `SELECT month, product_name, revenue,
       ROW_NUMBER() OVER (
         PARTITION BY month
         ORDER BY revenue DESC, product_name ASC
       ) AS revenue_rank
FROM monthly;`,
  },
  submissions: [
    { step: "Step 2", result: "Wrong answer", ok: false, lang: "SQL · sqlite", when: "2 min ago" },
    { step: "Step 2", result: "Runtime error", ok: false, lang: "SQL · sqlite", when: "9 min ago" },
    { step: "Step 1", result: "Accepted", ok: true, lang: "SQL · sqlite", when: "24 min ago" },
    { step: "Step 1", result: "Wrong answer", ok: false, lang: "SQL · sqlite", when: "38 min ago" },
  ],
  submissionColumns: ["step", "result", "lang", "when"],
  keyStrip: ["SELECT", "FROM", "JOIN", "WHERE", "GROUP BY", "OVER", "(", ")", ",", "*", "'"],
};

const TOP_K_WORDS: Challenge = {
  slug: "top-k-frequent-words",
  title: "Top K Frequent Words",
  difficulty: "Intermediate",
  catalog: {
    topic: "Hash maps",
    langs: ["python", "javascript"],
    // The workspace opens on "Attempted · 2 submissions" with a failing
    // check, so the row cannot say Solved the way the list mock did.
    status: "attempted",
    acceptance: 81,
  },
  languageLabel: "Python",
  description:
    "Return the k most frequent words, most frequent first, breaking ties alphabetically. A single-step problem with a choice of language.",
  submitLabel: "Submit",
  steps: [],
  instructions: [
    { kind: "status", text: "Attempted · 2 submissions" },
    {
      kind: "prose",
      spans: [
        "Given a list of words and an integer ",
        { code: "k" },
        ", return the ",
        { code: "k" },
        " most frequent words, most frequent first. When two words appear the same number of times, the one that comes first alphabetically goes first.",
      ],
    },
    {
      kind: "prose",
      spans: [
        "Comparison is case-sensitive. Aim for a solution that runs in O(n log n) or better.",
      ],
    },
    { kind: "label", text: "Signature" },
    { kind: "signature" },
    { kind: "label", text: "Examples" },
    {
      kind: "examples",
      items: [
        {
          label: "Example 1",
          fields: [
            {
              name: "words",
              value: '["the", "sky", "is", "blue", "the", "sun", "is", "sunny", "the"]',
            },
            { name: "k", value: "2" },
            { name: "output", value: '["the", "is"]', emphasis: true },
          ],
          note: '"the" appears 3 times, "is" twice. Everything else appears once.',
        },
        {
          label: "Example 2",
          fields: [
            { name: "words", value: '["b", "a", "c", "b", "a", "c"]' },
            { name: "k", value: "3" },
            { name: "output", value: '["a", "b", "c"]', emphasis: true },
          ],
          note: "All three tie at 2, so alphabetical order decides.",
        },
      ],
    },
    { kind: "label", text: "Constraints" },
    {
      kind: "list",
      items: [
        [{ code: "1 ≤ len(words) ≤ 10⁵" }],
        [{ code: "1 ≤ len(words[i]) ≤ 20" }, ", lowercase and uppercase letters only"],
        [{ code: "1 ≤ k ≤" }, " number of distinct words"],
        ["Time limit 1 s, memory limit 256 MB"],
      ],
    },
  ],
  languages: [
    {
      id: "python",
      label: "Python 3.12",
      shortLabel: "Python",
      runMeta: "python 3.12 · 0.08s · exit 0",
      runTime: "0.08s",
      signature: "def top_k_words(words: list[str], k: int) -> list[str]",
      source: `from collections import Counter

def top_k_words(words: list[str], k: int) -> list[str]:
    counts = Counter(words)
    ranked = sorted(counts.items(), key=lambda kv: -kv[1])
    return [w for w, _ in ranked[:k]]`,
    },
    {
      id: "javascript",
      label: "JavaScript · Node 20",
      shortLabel: "JavaScript",
      runMeta: "node 20 · 0.05s · exit 0",
      runTime: "0.05s",
      signature: "function topKWords(words: string[], k: number): string[]",
      source: `function topKWords(words, k) {
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([w]) => w);
}`,
    },
  ],
  schema: [],
  output: {
    kind: "stdio",
    stdinLabel: "stdin · example 1",
    stdin: `words = ["the", "sky", "is", "blue", "the",
         "sun", "is", "sunny", "the"]
k = 2`,
    stdout: '["the", "is"]',
    matchesExpected: true,
    footer: ["exit 0", "9.2 MB"],
  },
  tests: [
    {
      name: "Example 1",
      detail: 'words = ["the", "sky", "is", "blue", "the", "sun", "is", "sunny", "the"], k = 2',
      pass: true,
    },
    {
      name: "k equals number of distinct words",
      detail: "1,000 distinct words, k = 1000",
      pass: true,
    },
    {
      name: "Ties resolve alphabetically",
      detail: 'expected ["a", "b", "c"]',
      got: 'got      ["b", "a", "c"]',
      pass: false,
    },
    {
      name: "Large input within time limit",
      detail: "100,000 words · 0.31s of 1.00s",
      pass: true,
    },
  ],
  testsSummary: "3 of 4 test cases passed",
  testsSubtitle: "Not accepted yet",
  testsBadge: "3/4",
  solution: {
    spans: [
      "Sort by a tuple so the tiebreak is part of the key: negative count first, then the word itself. Sorting is O(n log n); a heap gets you O(n log k) if ",
      { code: "k" },
      " is small.",
    ],
    label: "Reference solution · Python",
    language: "python",
    source: `def top_k_words(words, k):
    counts = Counter(words)
    ranked = sorted(counts, key=lambda w: (-counts[w], w))
    return ranked[:k]`,
  },
  submissions: [
    { result: "Wrong answer", ok: false, lang: "Python 3.12", runtime: "0.31s", when: "2 min ago" },
    { result: "Runtime error", ok: false, lang: "Python 3.12", runtime: "—", when: "9 min ago" },
  ],
  submissionColumns: ["result", "lang", "runtime", "when"],
  keyStrip: [],
};

const CHALLENGES: Challenge[] = [TOP_PRODUCTS, TOP_K_WORDS];

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

/**
 * Catalog rows with no workspace behind them yet.
 *
 * Tuples rather than objects because there are fifty of them and the column
 * order is fixed; `toEntry` below names the fields. Same provenance as the
 * rest of this module: authored to exercise the list's filtering, sorting and
 * pagination, not scraped from a real problem set.
 *
 * [title, topic, level, langs, steps, status, acceptance]
 */
type CatalogRow = [string, string, number, IndexLanguage[], number, ChallengeStatus, number];

const CATALOG_ONLY: CatalogRow[] = [
  ["Second Highest Salary", "Subqueries", 1, ["postgres", "sqlite"], 1, "solved", 74],
  ["Customer Retention Cohorts", "Date math, self joins", 3, ["postgres", "duckdb"], 4, "attempted", 31],
  ["Running Total of Deposits", "Window functions", 2, ["postgres", "sqlite", "duckdb"], 1, "solved", 66],
  ["Merge Intervals", "Sorting", 2, ["python", "javascript", "typescript"], 1, "solved", 62],
  ["Gaps in Sequential IDs", "Gaps and islands", 3, ["postgres"], 2, "new", 29],
  ["Daily Active Users", "Aggregation", 1, ["postgres", "sqlite", "duckdb"], 1, "new", 79],
  ["Parse Log Lines", "Regular expressions", 2, ["python"], 2, "new", 55],
  ["Consecutive Login Streaks", "Gaps and islands", 3, ["postgres", "duckdb"], 3, "new", 27],
  ["Group Anagrams", "Hash maps", 1, ["python", "javascript"], 1, "new", 77],
  ["Median Order Value", "Percentiles", 2, ["postgres", "duckdb"], 1, "new", 48],
  ["Deduplicate Customer Records", "Window functions", 2, ["postgres", "sqlite"], 2, "new", 52],
  ["Flatten Nested JSON", "Recursion", 2, ["python", "javascript", "typescript"], 1, "new", 59],
  ["Year-over-Year Growth", "LAG, date math", 2, ["postgres", "duckdb"], 2, "new", 50],
  ["Moving Average Over a Stream", "Queues", 2, ["python"], 1, "new", 61],
  ["Employees Earning More Than Managers", "Self joins", 1, ["postgres", "sqlite"], 1, "new", 83],
  ["Balanced Brackets", "Stacks", 1, ["python", "javascript"], 1, "new", 85],
  ["Pivot Monthly Sales", "Conditional aggregation", 2, ["postgres", "duckdb"], 2, "new", 44],
  ["LRU Cache", "Linked lists, hash maps", 3, ["python", "typescript"], 3, "new", 33],
  ["Sessionize Click Events", "Window functions", 3, ["postgres", "duckdb"], 3, "new", 26],
  ["Validate ISBN Numbers", "String parsing", 1, ["python", "javascript"], 1, "new", 72],
  ["Late Shipments by Carrier", "Joins, filtering", 1, ["postgres", "sqlite"], 1, "new", 76],
  ["Longest Substring Without Repeats", "Sliding window", 2, ["python", "javascript"], 1, "new", 46],
  ["First Purchase per Customer", "DISTINCT ON, ranking", 1, ["postgres", "duckdb"], 1, "new", 70],
  ["CSV to Nested Dict", "Parsing", 1, ["python"], 2, "new", 68],
  ["Inventory Below Reorder Point", "Joins, HAVING", 1, ["postgres", "sqlite", "duckdb"], 1, "new", 80],
  ["Rate Limiter", "Sliding window", 3, ["python", "typescript"], 3, "new", 30],
  ["Average Time to Resolve Tickets", "Interval math", 2, ["postgres"], 1, "new", 57],
  ["Debounce Function", "Closures, timers", 2, ["javascript", "typescript"], 1, "new", 54],
  ["Products Never Ordered", "Anti joins", 1, ["postgres", "sqlite", "duckdb"], 1, "new", 84],
  ["Deep Clone Object", "Recursion", 2, ["javascript", "typescript"], 1, "new", 51],
  ["Percent Change Week over Week", "LAG, date_trunc", 2, ["postgres", "duckdb"], 2, "new", 47],
  ["Event Emitter", "Classes", 2, ["javascript", "typescript"], 2, "new", 56],
  ["Funnel Conversion Rates", "Conditional aggregation", 3, ["postgres", "duckdb"], 4, "new", 24],
  ["Binary Search Tree Insert", "Trees", 2, ["python"], 1, "new", 63],
  ["Nth Highest Rating", "DENSE_RANK", 2, ["postgres", "sqlite"], 1, "new", 60],
  ["Reverse a Linked List", "Linked lists", 1, ["python", "javascript"], 1, "new", 78],
  ["Overlapping Reservations", "Range overlap", 3, ["postgres"], 2, "new", 28],
  ["Spiral Order Matrix", "Arrays", 2, ["python", "javascript"], 1, "new", 49],
  ["Fill Missing Dates", "generate_series", 2, ["postgres", "duckdb"], 2, "new", 42],
  ["Count Islands", "Graph search", 2, ["python", "typescript"], 1, "new", 53],
  ["Top Referrers per Page", "Ranking", 2, ["postgres", "duckdb"], 2, "new", 45],
  ["Shortest Path with Dijkstra", "Graphs, heaps", 3, ["python"], 3, "new", 25],
  ["Churned Subscribers", "Date math, anti joins", 2, ["postgres", "sqlite"], 2, "new", 43],
  ["Sudoku Validator", "Sets", 1, ["python", "javascript"], 1, "new", 71],
  ["Kth Largest Element", "Heaps", 2, ["python", "typescript"], 1, "new", 58],
  ["Summarise Survey Responses", "dplyr, tidyr", 1, ["r"], 1, "new", 73],
  ["Trie Autocomplete", "Tries", 3, ["python", "typescript"], 3, "new", 32],
  ["Reshape Wide to Long", "tidyr", 2, ["r"], 1, "new", 61],
  ["Roman Numerals", "String parsing", 1, ["python", "javascript"], 1, "new", 82],
  ["Linear Regression by Group", "purrr, broom", 3, ["r"], 2, "new", 35],
];

function toEntry(row: CatalogRow): ChallengeIndexEntry {
  const [title, topic, level, langs, steps, status, acceptance] = row;
  return { title, topic, level, langs, steps, status, acceptance };
}

/**
 * Every challenge in the catalog. The built ones come first and derive their
 * title, level and step count from the challenge itself, so a row can never
 * disagree with the page it links to.
 */
export function getChallengeIndex(): ChallengeIndexEntry[] {
  const built = CHALLENGES.map((c) => ({
    ...c.catalog,
    title: c.title,
    level: DIFFICULTY_BARS[c.difficulty],
    steps: Math.max(1, c.steps.length),
    slug: c.slug,
  }));
  return [...built, ...CATALOG_ONLY.map(toEntry)];
}

export function getChallenge(slug: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.slug === slug);
}

export function getChallengeSlugs(): string[] {
  return CHALLENGES.map((c) => c.slug);
}

/** True when this challenge gates its steps behind the previous one. */
export function isMultiStep(challenge: Challenge): boolean {
  return challenge.steps.length > 0;
}

/** Index of the step the learner is working on, or 0 for a single-step problem. */
export function initialStepIndex(challenge: Challenge): number {
  const active = challenge.steps.findIndex((s) => s.state === "active");
  return active === -1 ? 0 : active;
}
