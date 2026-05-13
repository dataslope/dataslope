import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";

export interface SqlCompletionEntity {
  name: string;
  columns: string[];
  kind: "table" | "view" | "cte";
}

export interface SqlCompletionSchema {
  entities: SqlCompletionEntity[];
}

// The three SQL flavors the playground supports. Each shares the same
// completion engine; dialect-specific keyword/function catalogs and a few
// context tweaks (RETURNING, QUALIFY, ILIKE, …) plug in via `dialectProfile`.
export type SqlDialect = "sqlite" | "postgres" | "duckdb";

export interface SqlCompletionOptions {
  dialect?: SqlDialect;
}

type SqlCompletionMode =
  | "columns"
  | "tables"
  | "keywords"
  | "qualified-columns"
  | "naming";

interface SqlCompletionContextInfo {
  mode: SqlCompletionMode;
  from: number;
  qualifier?: string;
  // When set, only these keywords are emitted at high boost; other
  // keywords are either downranked or omitted entirely. Drives the
  // "show only the keywords that make sense at this cursor" behavior.
  keywordContext?: KeywordContext;
}

interface KeywordContext {
  // Most-likely follow-ups (highest keyword boost).
  primary: readonly string[];
  // Plausible-but-less-likely follow-ups (default keyword boost).
  secondary?: readonly string[];
  // When `restrict` is true, *only* primary+secondary keywords are emitted;
  // everything else is suppressed (used for tightly-scoped slots like
  // CREATE TABLE name, ORDER, etc.).
  restrict?: boolean;
}

const completeIdentifierPattern = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const partialIdentifierPattern = /^$|^[A-Za-z_][A-Za-z0-9_$]*$/;
const sqlIdentifierPattern =
  String.raw`(?:[A-Za-z_][A-Za-z0-9_$]*|"(?:""|[^"])+"|` +
  "`[^`]+`" +
  String.raw`|\[[^\]]+\])`;
const qualifiedIdentifierPattern = new RegExp(
  `(${sqlIdentifierPattern})\\.\\s*([A-Za-z_][A-Za-z0-9_$]*)?$`,
);
// Words that look like identifiers but introduce a new clause and so must
// never be captured as a table alias — without this guard the alias group
// would greedily eat the next clause keyword (e.g. "FROM t JOIN" → alias=JOIN)
// and we'd lose the second table from the reference set.
const aliasBlockListSource =
  String.raw`(?:FROM|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT|ON|USING|INNER|LEFT|RIGHT|FULL|CROSS|OUTER|SET|VALUES|RETURNING|AS|WHEN|CASE)`;
const aliasGroupSource =
  String.raw`(?:\s+(?:AS\s+)?(?!${aliasBlockListSource}\b)([A-Za-z_][A-Za-z0-9_$]*))?`;
const tableReferencePattern = new RegExp(
  String.raw`\b(?:FROM|JOIN|UPDATE|INTO)\s+(${sqlIdentifierPattern})${aliasGroupSource}`,
  "gi",
);
const commaTableReferencePattern = new RegExp(
  String.raw`,\s*(${sqlIdentifierPattern})${aliasGroupSource}`,
  "g",
);
const insertColumnListPattern = new RegExp(
  String.raw`\bINSERT\s+INTO\s+(${sqlIdentifierPattern})\s*\(([^()]*)$`,
  "i",
);
const usingClausePattern = /\bUSING\s*\(\s*[A-Za-z0-9_$,\s]*$/i;
const createNewObjectPattern = new RegExp(
  String.raw`\bCREATE\s+(?:TEMP(?:ORARY)?\s+)?(?:UNIQUE\s+)?(?:TABLE|VIEW|INDEX|TRIGGER)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[A-Za-z_][A-Za-z0-9_$]*)?$`,
  "i",
);

const tableSection = { name: "Tables", rank: 10 };
const viewSection = { name: "Views", rank: 11 };
const cteSection = { name: "CTEs", rank: 12 };
const columnSection = { name: "Columns", rank: 20 };
const keywordSection = { name: "Keywords", rank: 30 };

const BOOST = {
  tableInTableContext: 80,
  cteInTableContext: 85,
  keywordInTableContext: 5,
  columnInColumnContext: 90,
  keywordInColumnContext: 20,
  tableInColumnContext: 1,
  qualifiedColumn: 100,
  keywordInKeywordContext: 50,
  tableInKeywordContext: 10,
  functionPenalty: 1,
} as const;

// Keywords/functions that show up in essentially every modern SQL dialect.
// Dialect-specific additions are layered on top via `DIALECT_PROFILES`.
const CORE_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "FULL",
  "CROSS",
  "ON",
  "USING",
  "GROUP",
  "BY",
  "HAVING",
  "ORDER",
  "ASC",
  "DESC",
  "LIMIT",
  "OFFSET",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "CREATE",
  "TABLE",
  "VIEW",
  "INDEX",
  "TRIGGER",
  "ALTER",
  "DROP",
  "PRIMARY",
  "KEY",
  "FOREIGN",
  "REFERENCES",
  "NOT",
  "NULL",
  "DEFAULT",
  "UNIQUE",
  "CHECK",
  "AND",
  "OR",
  "IN",
  "IS",
  "LIKE",
  "BETWEEN",
  "EXISTS",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "AS",
  "DISTINCT",
  "UNION",
  "INTERSECT",
  "EXCEPT",
  "ALL",
  "WITH",
  "RECURSIVE",
  "CAST",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "IF",
  "REPLACE",
  "CONFLICT",
  "TEMP",
  "TEMPORARY",
  "RENAME",
  "ADD",
  "COLUMN",
  "TO",
  "NULLS",
  "FIRST",
  "LAST",
  "TRUE",
  "FALSE",
  "ESCAPE",
  "COLLATE",
  "DATABASE",
  "EXPLAIN",
  "ANALYZE",
  "GENERATED",
  "ALWAYS",
  "STORED",
  "VIRTUAL",
  "RETURNING",
  "OVER",
  "WINDOW",
  "PARTITION",
  "FILTER",
  "LATERAL",
  "MATERIALIZED",
  "CASCADE",
  "RESTRICT",
  "SCHEMA",
  "SEQUENCE",
  "CONSTRAINT",
] as const;

const CORE_FUNCTIONS = [
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "ROUND",
  "ABS",
  "LOWER",
  "UPPER",
  "LENGTH",
  "COALESCE",
  "NULLIF",
] as const;

// Dialect-specific keywords/functions layered on top of the core sets.
const SQLITE_KEYWORDS = [
  "PRAGMA",
  "GLOB",
  "REGEXP",
  "MATCH",
  "ATTACH",
  "DETACH",
  "VACUUM",
  "REINDEX",
  "AUTOINCREMENT",
] as const;

const SQLITE_FUNCTIONS = [
  "TOTAL",
  "SUBSTR",
  "IFNULL",
  "DATE",
  "TIME",
  "DATETIME",
  "STRFTIME",
  "JULIANDAY",
  "PRINTF",
  "RANDOM",
  "HEX",
  "TYPEOF",
] as const;

// Postgres-specific extras (also covers most of what DuckDB's PG-compatible
// surface exposes). Includes ILIKE, SIMILAR, ROLE/USER admin, JSON ops, …
const POSTGRES_KEYWORDS = [
  "ILIKE",
  "SIMILAR",
  "OVERLAPS",
  "ANY",
  "SOME",
  "ARRAY",
  "ENUM",
  "DOMAIN",
  "TYPE",
  "EXTENSION",
  "ROLE",
  "USER",
  "GRANT",
  "REVOKE",
  "TRUNCATE",
  "VACUUM",
  "REINDEX",
  "INTERVAL",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "JSONB",
  "SERIAL",
  "BIGSERIAL",
  "BOOLEAN",
  "TEXT",
  "VARCHAR",
  "INTEGER",
  "BIGINT",
  "NUMERIC",
  "DECIMAL",
  "REAL",
  "DOUBLE",
  "PRECISION",
  "UUID",
  "ZONE",
  "CONFLICT",
  "DO",
  "NOTHING",
  "EXCLUDED",
  "RANGE",
  "ROWS",
  "GROUPS",
  "PRECEDING",
  "FOLLOWING",
  "CURRENT",
  "ROW",
  "UNBOUNDED",
  "TABLESAMPLE",
] as const;

const POSTGRES_FUNCTIONS = [
  "NOW",
  "CURRENT_TIMESTAMP",
  "CURRENT_DATE",
  "CURRENT_TIME",
  "AGE",
  "EXTRACT",
  "DATE_TRUNC",
  "DATE_PART",
  "TO_CHAR",
  "TO_DATE",
  "TO_TIMESTAMP",
  "TO_NUMBER",
  "GENERATE_SERIES",
  "ARRAY_AGG",
  "STRING_AGG",
  "JSON_AGG",
  "JSONB_AGG",
  "JSON_BUILD_OBJECT",
  "JSONB_BUILD_OBJECT",
  "JSON_OBJECT_AGG",
  "JSONB_OBJECT_AGG",
  "GREATEST",
  "LEAST",
  "POSITION",
  "TRIM",
  "LTRIM",
  "RTRIM",
  "LPAD",
  "RPAD",
  "SPLIT_PART",
  "REGEXP_REPLACE",
  "REGEXP_MATCH",
  "REGEXP_MATCHES",
  "SUBSTRING",
  "CONCAT",
  "CONCAT_WS",
  "ROW_NUMBER",
  "RANK",
  "DENSE_RANK",
  "LAG",
  "LEAD",
  "NTILE",
  "FIRST_VALUE",
  "LAST_VALUE",
] as const;

// DuckDB sits on top of the Postgres dialect but adds its own syntax
// extensions: PIVOT/UNPIVOT, QUALIFY, ASOF JOIN, EXCLUDE/REPLACE in SELECT,
// SEMI/ANTI joins, list/struct/map literals, and the `USING SAMPLE` clause.
const DUCKDB_KEYWORDS = [
  "PIVOT",
  "UNPIVOT",
  "QUALIFY",
  "EXCLUDE",
  "ASOF",
  "POSITIONAL",
  "SEMI",
  "ANTI",
  "SAMPLE",
  "RESERVOIR",
  "BERNOULLI",
  "SYSTEM",
  "ATTACH",
  "DETACH",
  "DESCRIBE",
  "SHOW",
  "SUMMARIZE",
  "MAP",
  "STRUCT",
  "LIST",
  "IGNORE",
  "RESPECT",
  "MACRO",
] as const;

const DUCKDB_FUNCTIONS = [
  "LIST",
  "LIST_AGG",
  "ARRAY_AGG",
  "STRING_AGG",
  "STRING_SPLIT",
  "STRUCT_PACK",
  "STRUCT_EXTRACT",
  "MAP",
  "RANGE",
  "GENERATE_SERIES",
  "EPOCH",
  "EPOCH_MS",
  "STRFTIME",
  "STRPTIME",
  "DATE_TRUNC",
  "DATE_PART",
  "DATE_DIFF",
  "DATE_ADD",
  "DATE_SUB",
  "REGEXP_MATCHES",
  "REGEXP_EXTRACT",
  "REGEXP_REPLACE",
  "ROW_NUMBER",
  "RANK",
  "DENSE_RANK",
  "LAG",
  "LEAD",
  "QUANTILE",
  "MEDIAN",
  "MODE",
  "ARG_MAX",
  "ARG_MIN",
] as const;

interface DialectProfile {
  keywords: string[];
  functions: string[];
}

// Build a dialect's full keyword/function set by layering its extensions
// over the shared CORE_* lists. Duplicates collapse to a single entry, so
// dialects can mention common identifiers (e.g. DuckDB declaring REPLACE)
// without conflicting with the core.
function buildProfile(
  extraKeywords: readonly string[],
  extraFunctions: readonly string[],
): DialectProfile {
  return {
    keywords: [...new Set([...CORE_KEYWORDS, ...extraKeywords])],
    functions: [...new Set([...CORE_FUNCTIONS, ...extraFunctions])],
  };
}

const DIALECT_PROFILES: Record<SqlDialect, DialectProfile> = {
  sqlite: buildProfile(SQLITE_KEYWORDS, SQLITE_FUNCTIONS),
  postgres: buildProfile(POSTGRES_KEYWORDS, POSTGRES_FUNCTIONS),
  // DuckDB stacks its extensions on top of the Postgres dialect.
  duckdb: buildProfile(
    [...POSTGRES_KEYWORDS, ...DUCKDB_KEYWORDS],
    [...POSTGRES_FUNCTIONS, ...DUCKDB_FUNCTIONS],
  ),
};

const clauseBoundaryKeywords = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "ON",
  "USING",
  "GROUP",
  "ORDER",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "UNION",
  "INTERSECT",
  "EXCEPT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "ALTER",
  "DROP",
  "VALUES",
  "SET",
  "WITH",
  "RETURNING",
  // DuckDB extras: QUALIFY filters window results, PIVOT/UNPIVOT reshape
  // rows, WINDOW declares named windows used by OVER. All three behave as
  // top-level clause boundaries when ordering follow-up suggestions.
  "QUALIFY",
  "WINDOW",
  "PIVOT",
  "UNPIVOT",
]);

const tableTargetKeywords = new Set([
  "FROM",
  "JOIN",
  "UPDATE",
  "INTO",
  "TABLE",
  "VIEW",
  "INDEX",
  "TRIGGER",
]);

const columnTargetKeywords = new Set([
  "SELECT",
  "WHERE",
  "ON",
  "BY",
  "HAVING",
  "SET",
  "ORDER",
  "GROUP",
  "RETURNING",
  // DuckDB: `QUALIFY <expr>` filters on window functions — same shape as
  // HAVING, so completion-wise it wants column names + boolean operators.
  "QUALIFY",
]);

// Tokens that indicate the user is mid-expression and probably wants a column
// or value-style identifier next: comparison ops, arithmetic, boolean glue.
const expressionContinuationTokens = new Set([
  "=",
  "<",
  ">",
  "+",
  "-",
  "*",
  "/",
  "AND",
  "OR",
  "NOT",
  "IN",
  "IS",
  "LIKE",
  "ILIKE",
  "SIMILAR",
  "BETWEEN",
  "(",
]);

function normalizeIdentifier(identifier: string | undefined): string {
  if (!identifier) return "";
  const trimmed = identifier.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

function quoteIdentifier(identifier: string): string {
  if (completeIdentifierPattern.test(identifier)) return identifier;
  // SQLite accepts several identifier quote styles; double quotes are the
  // SQL-standard form and match the rest of the playground's generated SQL.
  return `"${identifier.replace(/"/g, '""')}"`;
}

function maskRangePreservingNewlines(
  sql: string,
  start: number,
  end: number,
): string {
  return sql
    .slice(start, end)
    .split("")
    .map((ch) => (ch === "\n" ? "\n" : " "))
    .join("");
}

function findSingleQuotedStringEnd(sql: string, start: number): number {
  let i = start + 1;
  while (i < sql.length) {
    if (sql[i] === "'") {
      if (sql[i + 1] === "'") {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i += 1;
  }
  return sql.length;
}

function maskCommentsAndStrings(sql: string): string {
  let masked = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i + 2);
      const nextIndex = end === -1 ? sql.length : end;
      masked += maskRangePreservingNewlines(sql, i, nextIndex);
      i = nextIndex;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      const nextIndex = end === -1 ? sql.length : end + 2;
      masked += maskRangePreservingNewlines(sql, i, nextIndex);
      i = nextIndex;
      continue;
    }
    if (ch === "'") {
      const nextIndex = findSingleQuotedStringEnd(sql, i);
      masked += maskRangePreservingNewlines(sql, i, nextIndex);
      i = nextIndex;
      continue;
    }
    masked += ch;
    i += 1;
  }
  return masked;
}

function currentStatementBeforeCursor(sql: string, pos: number): string {
  const before = sql.slice(0, pos);
  const masked = maskCommentsAndStrings(before);
  const start = masked.lastIndexOf(";") + 1;
  return before.slice(start);
}

function tokenize(sql: string): string[] {
  // Operators and punctuation are kept as clause boundaries so nearby SQL
  // expressions don't get folded into identifier/keyword context detection.
  return (
    maskCommentsAndStrings(sql).match(
      /[A-Za-z_][A-Za-z0-9_$]*|[,().;=*<>+\-/]/g,
    ) ?? []
  );
}

function isClauseBoundaryKeyword(value: string | undefined): boolean {
  return value ? clauseBoundaryKeywords.has(value.toUpperCase()) : false;
}

// Keyword tiers per syntactic context. `primary` is the strongest match,
// `secondary` is plausible-but-less-likely. The resolver picks the tier list
// that fits the cursor's surroundings; the keyword emitter then ranks the
// SQL keyword catalog accordingly.
const KW_NAME_TAIL: KeywordContext = {
  primary: ["IF", "NOT", "EXISTS"],
  restrict: true,
};

// Statement-starter keywords depend on the dialect: PRAGMA is SQLite-only,
// TRUNCATE/GRANT/REVOKE are Postgres-flavored, COPY/EXPORT/IMPORT/DESCRIBE
// are common in DuckDB. We share the same `primary` set so the most common
// DML/DDL verbs always sort first regardless of dialect.
const STATEMENT_STARTERS_BASE: readonly string[] = [
  "SELECT",
  "WITH",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "DROP",
  "ALTER",
  "REPLACE",
];

const STATEMENT_STARTER_SECONDARY: Record<SqlDialect, readonly string[]> = {
  sqlite: [
    "BEGIN",
    "COMMIT",
    "ROLLBACK",
    "PRAGMA",
    "ATTACH",
    "DETACH",
    "EXPLAIN",
    "ANALYZE",
    "VACUUM",
    "REINDEX",
  ],
  postgres: [
    "BEGIN",
    "COMMIT",
    "ROLLBACK",
    "EXPLAIN",
    "ANALYZE",
    "VACUUM",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "COPY",
  ],
  duckdb: [
    "BEGIN",
    "COMMIT",
    "ROLLBACK",
    "EXPLAIN",
    "ANALYZE",
    "ATTACH",
    "DETACH",
    "DESCRIBE",
    "SHOW",
    "SUMMARIZE",
    "PIVOT",
    "UNPIVOT",
    "COPY",
  ],
};

function statementStartersFor(dialect: SqlDialect): KeywordContext {
  return {
    primary: STATEMENT_STARTERS_BASE,
    secondary: STATEMENT_STARTER_SECONDARY[dialect],
  };
}

function isIdentifierToken(token: string | undefined): boolean {
  if (!token) return false;
  if (!/^[A-Z_][A-Z0-9_$]*$/.test(token)) return false;
  return !clauseBoundaryKeywords.has(token);
}

function isExpressionOperator(token: string | undefined): boolean {
  if (!token) return false;
  return expressionContinuationTokens.has(token);
}

// Resolve which keywords to surface at the cursor. Returns `null` when no
// specific context applies and all keywords should be shown at default rank.
function resolveKeywordContext(
  tokens: string[],
  lastToken: string | undefined,
  lastClauseKeyword: string | undefined,
  dialect: SqlDialect,
): KeywordContext | null {
  if (tokens.length === 0) return statementStartersFor(dialect);

  // ── Direct follow-ups: the previous *token* dictates a tightly-scoped slot.
  switch (lastToken) {
    case "ORDER":
    case "GROUP":
      return { primary: ["BY"], restrict: true };
    case "BY":
      return {
        primary: ["ASC", "DESC"],
        secondary: ["NULLS", "HAVING", "LIMIT", "OFFSET", "UNION"],
      };
    case "LIMIT":
      return { primary: ["OFFSET"], secondary: ["UNION"], restrict: true };
    case "UNION":
    case "INTERSECT":
    case "EXCEPT":
      return { primary: ["ALL", "SELECT"], restrict: true };
    case "INSERT":
      // SQLite uses `INSERT OR REPLACE`; Postgres/DuckDB use `INSERT INTO …
      // ON CONFLICT …`. We don't suggest OR for non-SQLite dialects, but
      // INTO is universal.
      return dialect === "sqlite"
        ? { primary: ["INTO", "OR"], restrict: true }
        : { primary: ["INTO"], restrict: true };
    case "DELETE":
      return { primary: ["FROM"], restrict: true };
    case "UPDATE":
      return dialect === "sqlite"
        ? { primary: ["OR"], secondary: ["REPLACE"] }
        : { primary: [], secondary: [] };
    case "CREATE":
      // Postgres/DuckDB allow CREATE [OR REPLACE] {TABLE,VIEW,…};
      // SQLite doesn't have OR REPLACE for CREATE.
      return dialect === "sqlite"
        ? {
            primary: ["TABLE", "VIEW", "INDEX", "TRIGGER"],
            secondary: ["UNIQUE", "TEMP", "TEMPORARY", "VIRTUAL"],
          }
        : {
            primary: ["TABLE", "VIEW", "INDEX", "SCHEMA"],
            secondary: [
              "OR",
              "REPLACE",
              "UNIQUE",
              "TEMP",
              "TEMPORARY",
              "MATERIALIZED",
              "TYPE",
              "SEQUENCE",
              "EXTENSION",
              ...(dialect === "duckdb" ? ["MACRO"] : []),
            ],
          };
    case "DROP":
      return {
        primary: ["TABLE", "VIEW", "INDEX", "TRIGGER"],
        secondary: ["IF", "EXISTS"],
        restrict: true,
      };
    case "ALTER":
      return { primary: ["TABLE"], restrict: true };
    case "WITH":
      return { primary: ["RECURSIVE"], secondary: ["AS"] };
    case "AS":
      return { primary: [], restrict: true };
    case "USING":
      return { primary: [], restrict: true };
    case "VALUES":
      return { primary: ["DEFAULT", "NULL"] };
    case "SET":
      return { primary: [] };
    case "ASC":
    case "DESC":
      return {
        primary: ["LIMIT", "OFFSET"],
        secondary: ["NULLS", "UNION"],
      };
    case "NULLS":
      return { primary: ["FIRST", "LAST"], restrict: true };
    case "IS":
      return { primary: ["NULL", "NOT"], restrict: true };
    case "NOT": {
      // SQLite has GLOB/REGEXP/MATCH operators; Postgres/DuckDB have
      // ILIKE and SIMILAR TO. Tailor the follow-ups so users only see the
      // operators their engine actually supports.
      const dialectOps: readonly string[] =
        dialect === "sqlite"
          ? ["GLOB", "REGEXP", "MATCH"]
          : ["ILIKE", "SIMILAR"];
      return {
        primary: ["NULL", "EXISTS", "IN", "LIKE", "BETWEEN"],
        secondary: dialectOps,
        restrict: true,
      };
    }
    case "BETWEEN":
      return { primary: [], secondary: ["AND"] };
    case "DISTINCT":
    case "ALL":
      return { primary: ["FROM"] };
    case "TEMP":
    case "TEMPORARY":
      // SQLite supports TEMP TRIGGER but not TEMP INDEX; Postgres/DuckDB
      // don't have triggers in the same form, so drop TRIGGER for them.
      return dialect === "sqlite"
        ? { primary: ["TABLE", "VIEW", "TRIGGER"], restrict: true }
        : { primary: ["TABLE", "VIEW", "SEQUENCE"], restrict: true };
    case "UNIQUE":
      return { primary: ["INDEX"], restrict: true };
    case "RENAME":
      return { primary: ["TO", "COLUMN"], restrict: true };
    case "ADD":
      return { primary: ["COLUMN", "CONSTRAINT"], restrict: true };
    default:
      break;
  }

  // ── Clause-relative defaults: where in the larger statement are we?
  switch (lastClauseKeyword) {
    case "SELECT":
      if (isIdentifierToken(lastToken)) {
        return {
          primary: ["AS", "FROM"],
          secondary: [
            "AND",
            "OR",
            "NOT",
            "IS",
            "NULL",
            "LIKE",
            "IN",
            "BETWEEN",
            "CASE",
            "WHEN",
            "THEN",
            "ELSE",
            "END",
          ],
        };
      }
      return {
        primary: ["DISTINCT", "ALL"],
        secondary: ["FROM", "CASE", "CAST", "NOT", "NULL"],
      };
    case "FROM": {
      // DuckDB adds SEMI/ANTI/POSITIONAL/ASOF joins; Postgres adds LATERAL.
      // We surface those as secondary completions only for the dialects
      // that actually accept them.
      const dialectJoinExtras: readonly string[] =
        dialect === "duckdb"
          ? ["SEMI", "ANTI", "ASOF", "POSITIONAL", "LATERAL"]
          : dialect === "postgres"
            ? ["LATERAL"]
            : [];
      if (isIdentifierToken(lastToken)) {
        return {
          primary: ["WHERE", "JOIN", "GROUP", "ORDER", "LIMIT", "AS"],
          secondary: [
            "LEFT",
            "RIGHT",
            "INNER",
            "OUTER",
            "FULL",
            "CROSS",
            "HAVING",
            "OFFSET",
            "UNION",
            "INTERSECT",
            "EXCEPT",
            ...(dialect === "duckdb" ? ["QUALIFY"] : []),
            ...dialectJoinExtras,
          ],
        };
      }
      return {
        primary: ["AS"],
        secondary: ["JOIN", "WHERE", ...dialectJoinExtras],
      };
    }
    case "JOIN":
      if (isIdentifierToken(lastToken)) {
        return {
          primary: ["ON", "USING", "AS"],
          secondary: [
            "WHERE",
            "JOIN",
            "LEFT",
            "RIGHT",
            "INNER",
            "OUTER",
            "FULL",
            "CROSS",
            "GROUP",
            "ORDER",
            "HAVING",
            "LIMIT",
            ...(dialect === "duckdb" ? ["QUALIFY"] : []),
          ],
        };
      }
      return { primary: ["AS"] };
    case "ON":
    case "WHERE":
    case "HAVING":
    case "QUALIFY": {
      if (isExpressionOperator(lastToken)) {
        return {
          primary: ["NOT", "NULL", "EXISTS", "CASE"],
          secondary: ["CAST", "TRUE", "FALSE"],
        };
      }
      if (isIdentifierToken(lastToken)) {
        // The mid-expression operator menu after `WHERE col `. SQLite's
        // tail (GLOB/REGEXP/MATCH) differs from Postgres/DuckDB (ILIKE,
        // SIMILAR); we splice in the right one so users don't see
        // operators their engine rejects.
        const dialectOps: readonly string[] =
          dialect === "sqlite"
            ? ["GLOB", "REGEXP", "MATCH"]
            : ["ILIKE", "SIMILAR"];
        return {
          primary: ["AND", "OR", "IS", "NOT", "LIKE", "IN", "BETWEEN"],
          secondary: [
            "GROUP",
            "ORDER",
            "HAVING",
            "LIMIT",
            "OFFSET",
            "UNION",
            ...dialectOps,
            "ESCAPE",
            "COLLATE",
            ...(dialect === "duckdb" ? ["QUALIFY"] : []),
          ],
        };
      }
      return {
        primary: ["NOT", "EXISTS", "CASE"],
        secondary: ["NULL", "CAST"],
      };
    }
    case "GROUP":
    case "ORDER":
      return {
        primary: ["BY"],
        // QUALIFY is DuckDB-specific; keep it out of the SQLite/Postgres
        // secondary list so it doesn't pollute their suggestions.
        secondary: [
          "ASC",
          "DESC",
          "HAVING",
          "LIMIT",
          "OFFSET",
          "UNION",
          ...(dialect === "duckdb" ? ["QUALIFY"] : []),
        ],
      };
    case "INSERT":
      return {
        primary: ["INTO", "VALUES", "SELECT"],
        // SQLite: INSERT OR REPLACE. Postgres/DuckDB: INSERT … ON CONFLICT.
        secondary: [
          "DEFAULT",
          ...(dialect === "sqlite" ? ["OR", "REPLACE"] : ["ON", "CONFLICT"]),
          "RETURNING",
        ],
      };
    case "UPDATE":
      return {
        primary: ["SET"],
        secondary: [
          "WHERE",
          ...(dialect === "sqlite" ? ["OR", "REPLACE"] : ["FROM"]),
          "RETURNING",
        ],
      };
    case "DELETE":
      return {
        primary: ["FROM"],
        // Postgres/DuckDB allow DELETE … USING <other table> for joins.
        secondary: [
          "WHERE",
          ...(dialect !== "sqlite" ? ["USING"] : []),
          "RETURNING",
        ],
      };
    case "CREATE":
      return dialect === "sqlite"
        ? {
            primary: ["TABLE", "VIEW", "INDEX", "TRIGGER"],
            secondary: ["UNIQUE", "TEMP", "TEMPORARY", "IF", "NOT", "EXISTS"],
          }
        : {
            primary: ["TABLE", "VIEW", "INDEX", "SCHEMA"],
            secondary: [
              "OR",
              "REPLACE",
              "UNIQUE",
              "TEMP",
              "TEMPORARY",
              "MATERIALIZED",
              "IF",
              "NOT",
              "EXISTS",
              "TYPE",
              "SEQUENCE",
              "EXTENSION",
              ...(dialect === "duckdb" ? ["MACRO"] : []),
            ],
          };
    case "DROP":
      return {
        primary: ["TABLE", "VIEW", "INDEX", "TRIGGER"],
        secondary: ["IF", "EXISTS"],
      };
    case "ALTER":
      return {
        primary: ["TABLE", "RENAME", "ADD", "DROP"],
        secondary: ["COLUMN", "TO"],
      };
    case "SET":
      return { primary: ["WHERE"], secondary: ["AND", "OR", "RETURNING"] };
    case "VALUES":
      return { primary: ["DEFAULT", "NULL"], secondary: ["RETURNING"] };
    case "USING":
      return { primary: [], restrict: true };
    case "WITH":
      return { primary: ["AS", "RECURSIVE"] };
    case "UNION":
    case "INTERSECT":
    case "EXCEPT":
      return { primary: ["ALL", "SELECT"] };
    default:
      return null;
  }
}

function isInsideUnclosedParen(prefix: string): boolean {
  const masked = maskCommentsAndStrings(prefix);
  let depth = 0;
  for (let i = 0; i < masked.length; i += 1) {
    const ch = masked[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
  }
  return depth > 0;
}

function inferCompletionContext(
  context: CompletionContext,
  dialect: SqlDialect,
): SqlCompletionContextInfo | null {
  const statement = currentStatementBeforeCursor(
    context.state.doc.toString(),
    context.pos,
  );
  const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_$]*/);
  const qualified = statement.match(qualifiedIdentifierPattern);

  if (qualified) {
    return {
      mode: "qualified-columns",
      qualifier: normalizeIdentifier(qualified[1]),
      from: context.pos - (qualified[2]?.length ?? 0),
    };
  }

  const from = word?.from ?? context.pos;
  const currentWord = word?.text ?? "";
  if (!context.explicit && !currentWord && !/\s$|[(,.=<>+\-*/]$/.test(statement))
    return null;

  const prefixWithoutWord = currentWord
    ? statement.slice(0, Math.max(0, statement.length - currentWord.length))
    : statement;

  // INSERT INTO <table> (col1, col2, |) — suggest columns of <table>.
  const insertMatch = insertColumnListPattern.exec(prefixWithoutWord);
  if (insertMatch) {
    return {
      mode: "qualified-columns",
      qualifier: normalizeIdentifier(insertMatch[1]),
      from,
    };
  }

  // JOIN ... USING (col1, |) — suggest columns from joined tables.
  if (
    usingClausePattern.test(prefixWithoutWord) &&
    isInsideUnclosedParen(prefixWithoutWord)
  ) {
    return { mode: "columns", from };
  }

  // CREATE [TEMP] [UNIQUE] TABLE|VIEW|INDEX|TRIGGER [IF NOT EXISTS] <newName>
  // — user is naming a new object, so suppress existing-table suggestions
  // and only surface the few keywords that legally appear in this slot.
  if (createNewObjectPattern.test(prefixWithoutWord)) {
    return {
      mode: "naming",
      from,
      keywordContext: KW_NAME_TAIL,
    };
  }

  const tokens = tokenize(prefixWithoutWord).map((token) => token.toUpperCase());
  const lastToken = tokens.at(-1);
  const lastClauseKeyword = [...tokens]
    .reverse()
    .find((token) => clauseBoundaryKeywords.has(token));
  const keywordContext =
    resolveKeywordContext(tokens, lastToken, lastClauseKeyword, dialect) ??
    undefined;

  // Right after a clause keyword that introduces tables / columns.
  if (lastToken && tableTargetKeywords.has(lastToken)) {
    return { mode: "tables", from, keywordContext };
  }
  if (lastToken && columnTargetKeywords.has(lastToken)) {
    return { mode: "columns", from, keywordContext };
  }

  // After a comma or open-paren, stay in the surrounding clause's mode.
  if (lastToken === "," || lastToken === "(") {
    if (lastClauseKeyword && tableTargetKeywords.has(lastClauseKeyword)) {
      return { mode: "tables", from, keywordContext };
    }
    if (lastClauseKeyword && columnTargetKeywords.has(lastClauseKeyword)) {
      return { mode: "columns", from, keywordContext };
    }
  }

  // Mid-expression operators / boolean glue inside a column-flavored clause.
  if (lastToken && expressionContinuationTokens.has(lastToken)) {
    if (lastClauseKeyword && columnTargetKeywords.has(lastClauseKeyword)) {
      return { mode: "columns", from, keywordContext };
    }
  }

  if (lastToken === ".") return null;

  // Fall back to keywords (e.g. user has typed `SELECT *` or
  // `SELECT * FROM customers ` and the next token should be FROM/JOIN/WHERE).
  return { mode: "keywords", from, keywordContext };
}

function extractTableReferences(sql: string): Map<string, string> {
  const references = new Map<string, string>();
  const masked = maskCommentsAndStrings(sql);
  const addReference = (tableToken: string, aliasToken?: string) => {
    const tableName = normalizeIdentifier(tableToken);
    if (!tableName) return;
    references.set(tableName.toLowerCase(), tableName);
    const alias = normalizeIdentifier(aliasToken);
    if (alias && !isClauseBoundaryKeyword(alias))
      references.set(alias.toLowerCase(), tableName);
  };

  let match: RegExpExecArray | null;
  tableReferencePattern.lastIndex = 0;
  while ((match = tableReferencePattern.exec(masked))) {
    addReference(match[1], match[2]);
  }

  commaTableReferencePattern.lastIndex = 0;
  while ((match = commaTableReferencePattern.exec(masked))) {
    const beforeComma = masked.slice(0, match.index).toUpperCase();
    const lastBoundary = Math.max(
      beforeComma.lastIndexOf(" FROM "),
      beforeComma.lastIndexOf(" JOIN "),
      beforeComma.lastIndexOf(" WHERE "),
      beforeComma.lastIndexOf(" GROUP "),
      beforeComma.lastIndexOf(" ORDER "),
    );
    if (
      lastBoundary >= 0 &&
      /\b(FROM|JOIN)\b/.test(beforeComma.slice(lastBoundary))
    ) {
      addReference(match[1], match[2]);
    }
  }

  return references;
}

const cteHeadPattern = new RegExp(
  String.raw`\bWITH\s+(?:RECURSIVE\s+)?(${sqlIdentifierPattern})\s*(?:\(([^)]*)\))?\s*AS\s*\(`,
  "gi",
);
const cteContinuationPattern = new RegExp(
  String.raw`,\s*(${sqlIdentifierPattern})\s*(?:\(([^)]*)\))?\s*AS\s*\(`,
  "g",
);

function parseColumnList(list: string | undefined): string[] {
  if (!list) return [];
  return list
    .split(",")
    .map((part) => normalizeIdentifier(part.trim()))
    .filter((name) => name.length > 0);
}

function extractCtes(sql: string): SqlCompletionEntity[] {
  const masked = maskCommentsAndStrings(sql);
  const seen = new Set<string>();
  const result: SqlCompletionEntity[] = [];

  const addCte = (rawName: string, columnList: string | undefined) => {
    const name = normalizeIdentifier(rawName);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      name,
      kind: "cte",
      columns: parseColumnList(columnList),
    });
  };

  let match: RegExpExecArray | null;
  cteHeadPattern.lastIndex = 0;
  while ((match = cteHeadPattern.exec(masked))) {
    addCte(match[1], match[2]);
  }

  // Continuation `, name AS (...)` — only honor those that fall outside any
  // open CTE body, otherwise we'd pick up commas from inside subqueries.
  cteContinuationPattern.lastIndex = 0;
  while ((match = cteContinuationPattern.exec(masked))) {
    const upTo = masked.slice(0, match.index);
    if (parenDepth(upTo) === 0) {
      addCte(match[1], match[2]);
    }
  }

  return result;
}

function parenDepth(masked: string): number {
  let depth = 0;
  for (let i = 0; i < masked.length; i += 1) {
    const ch = masked[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
  }
  return depth;
}

function effectiveSchema(
  base: SqlCompletionSchema,
  statement: string,
): SqlCompletionSchema {
  const ctes = extractCtes(statement);
  if (ctes.length === 0) return base;
  const knownNames = new Set(
    base.entities.map((entity) => entity.name.toLowerCase()),
  );
  const merged = [
    ...base.entities,
    ...ctes.filter((cte) => !knownNames.has(cte.name.toLowerCase())),
  ];
  return { entities: merged };
}

function entitySection(
  entity: SqlCompletionEntity,
): typeof tableSection | typeof viewSection | typeof cteSection {
  if (entity.kind === "view") return viewSection;
  if (entity.kind === "cte") return cteSection;
  return tableSection;
}

function entityType(entity: SqlCompletionEntity): string {
  if (entity.kind === "view") return "namespace";
  if (entity.kind === "cte") return "class";
  return "type";
}

function tableOptions(
  schema: SqlCompletionSchema,
  defaultBoost: number,
): Completion[] {
  return schema.entities.map((entity) => ({
    label: entity.name,
    apply: quoteIdentifier(entity.name),
    detail: entity.kind,
    type: entityType(entity),
    section: entitySection(entity),
    boost:
      entity.kind === "cte" ? BOOST.cteInTableContext : defaultBoost,
  }));
}

// Boost adjustments applied when the cursor's syntactic position predicts a
// narrower keyword set. Values are tuned so context-relevant keywords sort
// among the user's likely picks while keeping table/column suggestions
// dominant when those are what the slot wants.
const KEYWORD_PRIMARY_BUMP = 30;
const KEYWORD_SECONDARY_BUMP = 5;
const KEYWORD_OFF_CONTEXT_PENALTY = 25;

function keywordOptions(
  dialect: SqlDialect,
  boost: number,
  keywordContext?: KeywordContext,
  options: { includeFunctions?: boolean } = {},
): Completion[] {
  const { includeFunctions = true } = options;
  const profile = DIALECT_PROFILES[dialect];
  const dialectKeywordSet = new Set(profile.keywords);
  const primary = keywordContext ? new Set(keywordContext.primary) : null;
  const secondary = keywordContext?.secondary
    ? new Set(keywordContext.secondary)
    : null;
  const restrict = keywordContext?.restrict ?? false;
  const hasContext = primary !== null;

  // Primary/secondary entries from the context may reference keywords
  // outside the active dialect (e.g. PRAGMA in Postgres). We keep them in
  // the suggestion list anyway — the context resolver is already dialect-
  // aware — but fall back to the dialect catalog for the unranked tail.
  const orderedKeywords = primary
    ? [
        ...keywordContext!.primary,
        ...(keywordContext!.secondary ?? []),
        ...profile.keywords.filter(
          (kw) => !primary.has(kw) && !(secondary?.has(kw) ?? false),
        ),
      ]
    : profile.keywords;

  const seen = new Set<string>();
  const out: Completion[] = [];
  for (const keyword of orderedKeywords) {
    if (seen.has(keyword)) continue;
    seen.add(keyword);
    const isPrimary = primary?.has(keyword) ?? false;
    const isSecondary = secondary?.has(keyword) ?? false;
    if (restrict && !isPrimary && !isSecondary) continue;
    // For non-restricted, dialect-aware mode: drop any keyword that the
    // active dialect doesn't recognize *and* isn't pinned by context.
    if (!restrict && !isPrimary && !isSecondary && !dialectKeywordSet.has(keyword))
      continue;
    let kwBoost = boost;
    if (hasContext) {
      if (isPrimary) kwBoost = boost + KEYWORD_PRIMARY_BUMP;
      else if (isSecondary) kwBoost = boost + KEYWORD_SECONDARY_BUMP;
      else kwBoost = boost - KEYWORD_OFF_CONTEXT_PENALTY;
    }
    out.push({
      label: keyword,
      type: "keyword",
      section: keywordSection,
      boost: kwBoost,
    });
  }
  if (includeFunctions && !restrict) {
    for (const fn of profile.functions) {
      out.push(
        snippetCompletion(`${fn}(#{})`, {
          label: fn,
          detail: "function",
          type: "function",
          section: keywordSection,
          boost: boost - BOOST.functionPenalty,
        }),
      );
    }
  }
  return out;
}

function columnOptions(
  schema: SqlCompletionSchema,
  statement: string,
  boost: number,
): Completion[] {
  const references = extractTableReferences(statement);
  const referencedTables = new Set(
    [...references.values()].map((name) => name.toLowerCase()),
  );
  const entities = referencedTables.size
    ? schema.entities.filter((entity) =>
        referencedTables.has(entity.name.toLowerCase()),
      )
    : [];

  if (entities.length === 0) return [];

  const columnOwners = new Map<string, SqlCompletionEntity[]>();
  for (const entity of entities) {
    for (const column of entity.columns) {
      const key = column.toLowerCase();
      columnOwners.set(key, [...(columnOwners.get(key) ?? []), entity]);
    }
  }

  const options: Completion[] = [];
  const seen = new Set<string>();
  for (const entity of entities) {
    for (const column of entity.columns) {
      const owners = columnOwners.get(column.toLowerCase()) ?? [];
      const ambiguous = owners.length > 1;
      const label = ambiguous ? `${entity.name}.${column}` : column;
      if (seen.has(label)) continue;
      seen.add(label);
      options.push({
        label,
        apply: ambiguous
          ? `${quoteIdentifier(entity.name)}.${quoteIdentifier(column)}`
          : quoteIdentifier(column),
        detail: entity.name,
        type: "property",
        section: columnSection,
        boost,
      });
    }
  }
  return options;
}

function qualifiedColumnOptions(
  schema: SqlCompletionSchema,
  statement: string,
  qualifier: string | undefined,
  boost: number,
): Completion[] {
  if (!qualifier) return [];
  const references = extractTableReferences(statement);
  const tableName =
    references.get(qualifier.toLowerCase()) ?? qualifier;
  const entity = schema.entities.find(
    (item) => item.name.toLowerCase() === tableName.toLowerCase(),
  );
  if (!entity) return [];
  return entity.columns.map((column) => ({
    label: column,
    apply: quoteIdentifier(column),
    detail: entity.name,
    type: "property",
    section: columnSection,
    boost,
  }));
}

function dedupeOptions(options: Completion[]): Completion[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const applyKey =
      typeof option.apply === "string" ? option.apply : option.label;
    const key = `${option.type}:${option.label}:${applyKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createSqlCompletionSource(
  schema: SqlCompletionSchema,
  options: SqlCompletionOptions = {},
): CompletionSource {
  const dialect: SqlDialect = options.dialect ?? "sqlite";
  return (context) => {
    const info = inferCompletionContext(context, dialect);
    if (!info) return null;

    const statement = currentStatementBeforeCursor(
      context.state.doc.toString(),
      context.pos,
    );
    const localSchema = effectiveSchema(schema, statement);

    const kw = info.keywordContext;
    const completions = (() => {
      switch (info.mode) {
        case "tables":
          return [
            ...tableOptions(localSchema, BOOST.tableInTableContext),
            ...keywordOptions(dialect, BOOST.keywordInTableContext, kw),
          ];
        case "columns": {
          const cols = columnOptions(
            localSchema,
            statement,
            BOOST.columnInColumnContext,
          );
          if (cols.length === 0) {
            // No FROM/JOIN/UPDATE/INTO target in scope yet — column suggestions
            // would be misleading, so offer keywords + tables instead.
            return [
              ...keywordOptions(dialect, BOOST.keywordInColumnContext, kw),
              ...tableOptions(localSchema, BOOST.tableInColumnContext),
            ];
          }
          return [
            ...cols,
            ...keywordOptions(dialect, BOOST.keywordInColumnContext, kw),
            ...tableOptions(localSchema, BOOST.tableInColumnContext),
          ];
        }
        case "qualified-columns":
          return qualifiedColumnOptions(
            localSchema,
            statement,
            info.qualifier,
            BOOST.qualifiedColumn,
          );
        case "naming":
          // New-object name slot: only legal trailing keywords like
          // `IF NOT EXISTS`. Tables and free functions would mislead the user
          // here, so we suppress them entirely.
          return keywordOptions(dialect, BOOST.keywordInKeywordContext, kw, {
            includeFunctions: false,
          });
        case "keywords":
          return [
            ...keywordOptions(dialect, BOOST.keywordInKeywordContext, kw),
            ...tableOptions(localSchema, BOOST.tableInKeywordContext),
          ];
      }
    })();

    const uniqueOptions = dedupeOptions(completions);
    if (uniqueOptions.length === 0) return null;
    return {
      from: info.from,
      options: uniqueOptions,
      validFor: partialIdentifierPattern,
    } satisfies CompletionResult;
  };
}
