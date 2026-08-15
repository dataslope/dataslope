import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";

/** Column metadata. Plain strings are accepted everywhere a column is
 *  expected so lightweight callers (and CTE extraction, which only sees
 *  names) don't have to wrap each name in an object. */
export interface SqlColumnMeta {
  name: string;
  /** Declared type (e.g. `INTEGER`, `text`), shown as the completion
   *  detail the way desktop SQL IDEs annotate column suggestions. */
  type?: string;
}

export type SqlCompletionColumn = string | SqlColumnMeta;

/** One column-level foreign-key edge, used to suggest complete
 *  `a.col = b.col` join conditions and to rank join-related tables. */
export interface SqlForeignKeyMeta {
  /** Column on the owning entity. */
  column: string;
  /** Referenced table/view name. */
  refEntity: string;
  /** Referenced column name. */
  refColumn: string;
}

export interface SqlCompletionEntity {
  name: string;
  columns: SqlCompletionColumn[];
  kind: "table" | "view" | "cte";
  foreignKeys?: SqlForeignKeyMeta[];
}

export interface SqlCompletionSchema {
  entities: SqlCompletionEntity[];
  /** Namespace (schema) names like `public` or `main`. Typing
   *  `<schema>.` suggests tables, mirroring qualified completion in
   *  desktop SQL IDEs. Defaults per dialect when omitted. */
  schemas?: string[];
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
  | "naming"
  | "column-def";

interface SqlCompletionContextInfo {
  mode: SqlCompletionMode;
  from: number;
  qualifier?: string;
  /** Qualified mode entered via a literal `alias.`, adds the `*`
   *  suggestion (`t.*`) the way SQL IDEs do. INSERT column lists and
   *  `REFERENCES t(…)` reuse qualified mode but must not offer `*`. */
  viaDot?: boolean;
  /** `JOIN … ON |` slot, prepend ready-made join conditions derived
   *  from foreign keys / matching column names. */
  joinConditionSlot?: boolean;
  /** `JOIN |` slot, tables related (via FKs) to tables already in the
   *  statement are ranked above the rest. */
  joinTableSlot?: boolean;
  /** `USING (…|` slot, suggest bare column names shared between the
   *  joined tables instead of qualified ones. */
  usingSlot?: boolean;
  /** Sub-slot inside a `CREATE TABLE (…)` body. */
  columnDefSlot?: "type" | "constraint";
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
const bareIdentifierPattern = /^[A-Za-z_][A-Za-z0-9_$]*$/;
const sqlIdentifierPattern =
  String.raw`(?:[A-Za-z_][A-Za-z0-9_$]*|"(?:""|[^"])+"|` +
  "`[^`]+`" +
  String.raw`|\[[^\]]+\])`;
const qualifiedIdentifierPattern = new RegExp(
  `(${sqlIdentifierPattern})\\.\\s*([A-Za-z_][A-Za-z0-9_$]*)?$`,
);
// Words that look like identifiers but introduce a new clause and so must
// never be captured as a table alias, without this guard the alias group
// would greedily eat the next clause keyword (e.g. "FROM t JOIN" → alias=JOIN)
// and we'd lose the second table from the reference set.
const aliasBlockListSource =
  String.raw`(?:FROM|JOIN|WHERE|GROUP|ORDER|HAVING|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT|ON|USING|INNER|LEFT|RIGHT|FULL|CROSS|OUTER|NATURAL|SEMI|ANTI|ASOF|POSITIONAL|LATERAL|QUALIFY|WINDOW|PIVOT|UNPIVOT|TABLESAMPLE|SET|VALUES|RETURNING|AS|WHEN|CASE|DROP|ADD|RENAME|ALTER|COLUMN|TO|CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|REFERENCES|NOT|DEFAULT|COLLATE|GENERATED)`;
const aliasGroupSource =
  String.raw`(?:\s+(?:AS\s+)?(?!${aliasBlockListSource}\b)([A-Za-z_][A-Za-z0-9_$]*))?`;
// Optionally schema-qualified table reference: FROM public.orders o.
// Group 1 = clause keyword, 2 = schema (optional), 3 = table, 4 = alias.
// `TABLE` is included so ALTER/DROP TABLE targets join the reference set
// (e.g. `ALTER TABLE t DROP COLUMN |` can complete t's columns).
const tableReferencePattern = new RegExp(
  String.raw`\b(FROM|JOIN|UPDATE|INTO|TABLE)\s+(?:(${sqlIdentifierPattern})\s*\.\s*)?(${sqlIdentifierPattern})${aliasGroupSource}`,
  "gi",
);
const commaTableReferencePattern = new RegExp(
  String.raw`,\s*(?:(${sqlIdentifierPattern})\s*\.\s*)?(${sqlIdentifierPattern})${aliasGroupSource}`,
  "g",
);
const insertColumnListPattern = new RegExp(
  String.raw`\bINSERT\s+INTO\s+(?:${sqlIdentifierPattern}\s*\.\s*)?(${sqlIdentifierPattern})\s*\(([^()]*)$`,
  "i",
);
// FOREIGN KEY (…) REFERENCES parent(col1, …|, complete the parent's columns.
const referencesColumnListPattern = new RegExp(
  String.raw`\bREFERENCES\s+(?:${sqlIdentifierPattern}\s*\.\s*)?(${sqlIdentifierPattern})\s*\(([^()]*)$`,
  "i",
);
// CREATE INDEX idx ON tbl(col1, …|, complete the indexed table's columns.
const indexColumnListPattern = new RegExp(
  String.raw`\bON\s+(?:${sqlIdentifierPattern}\s*\.\s*)?(${sqlIdentifierPattern})\s*\(([^()]*)$`,
  "i",
);
const createIndexStatementPattern = /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i;
const usingClausePattern = /\bUSING\s*\(\s*[A-Za-z0-9_$,\s]*$/i;
const createNewObjectPattern = new RegExp(
  String.raw`\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+)?(?:UNIQUE\s+)?(?:MATERIALIZED\s+)?(TABLE|VIEW|INDEX|TRIGGER|SCHEMA|SEQUENCE)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[A-Za-z_][A-Za-z0-9_$]*)?$`,
  "i",
);
// Head of a CREATE TABLE body, everything between this `(` and its
// matching `)` is column-definition territory with its own slots.
const createTableBodyPattern = new RegExp(
  String.raw`\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:${sqlIdentifierPattern}\s*\.\s*)?${sqlIdentifierPattern}\s*\(`,
  "gi",
);

// All sections use `rank: "dynamic"` so the group with the best-scoring
// suggestion renders first; static ranks would override per-option boosts
// (Tables above Columns even inside a WHERE clause).
const tableSection = { name: "Tables", rank: "dynamic" } as const;
const viewSection = { name: "Views", rank: "dynamic" } as const;
const cteSection = { name: "CTEs", rank: "dynamic" } as const;
const joinSection = { name: "Join conditions", rank: "dynamic" } as const;
const columnSection = { name: "Columns", rank: "dynamic" } as const;
const keywordSection = { name: "Keywords", rank: "dynamic" } as const;

const BOOST = {
  tableInTableContext: 80,
  cteInTableContext: 85,
  // Tables connected by a foreign key to tables already referenced in the
  // statement (e.g. after `FROM customers JOIN |`) outrank everything else
  // in the table list, the DataGrip-style "related tables first" ordering.
  relatedTableBump: 15,
  keywordInTableContext: 5,
  columnInColumnContext: 90,
  keywordInColumnContext: 20,
  tableInColumnContext: 1,
  qualifiedColumn: 100,
  starInQualified: 100,
  joinCondition: 96,
  usingSharedColumn: 95,
  usingOtherColumn: 60,
  keywordInKeywordContext: 50,
  tableInKeywordContext: 10,
  typeInColumnDef: 70,
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
  "NATURAL",
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
  "IIF",
  "INSTR",
  "TRIM",
  "LTRIM",
  "RTRIM",
  "GROUP_CONCAT",
  "DATE",
  "TIME",
  "DATETIME",
  "STRFTIME",
  "JULIANDAY",
  "PRINTF",
  "RANDOM",
  "HEX",
  "TYPEOF",
  // SQLite ≥ 3.25 ships window functions; the playground's WASM build is
  // far newer, so surface the standard set.
  "ROW_NUMBER",
  "RANK",
  "DENSE_RANK",
  "NTILE",
  "LAG",
  "LEAD",
  "FIRST_VALUE",
  "LAST_VALUE",
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
  "CEIL",
  "FLOOR",
  "POWER",
  "SQRT",
  "MOD",
  "INITCAP",
  "CHAR_LENGTH",
  "UNNEST",
  "STRING_TO_ARRAY",
  "ARRAY_LENGTH",
  "CARDINALITY",
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
  "LIST_VALUE",
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
  "UNNEST",
  "LEN",
  "CONTAINS",
  "STARTS_WITH",
  "READ_CSV",
  "READ_CSV_AUTO",
  "READ_PARQUET",
  "READ_JSON_AUTO",
] as const;

// Data types offered inside CREATE TABLE column definitions, most common
// first. Detection (is the previous token a type?) uses the shared
// ALL_TYPE_NAMES set so cross-dialect spellings still classify correctly.
const DIALECT_TYPES: Record<SqlDialect, readonly string[]> = {
  sqlite: ["INTEGER", "TEXT", "REAL", "NUMERIC", "BLOB"],
  postgres: [
    "INTEGER",
    "TEXT",
    "SERIAL",
    "BIGSERIAL",
    "BIGINT",
    "SMALLINT",
    "VARCHAR",
    "BOOLEAN",
    "NUMERIC",
    "DECIMAL",
    "REAL",
    "DOUBLE PRECISION",
    "DATE",
    "TIME",
    "TIMESTAMP",
    "TIMESTAMPTZ",
    "INTERVAL",
    "UUID",
    "JSON",
    "JSONB",
    "BYTEA",
  ],
  duckdb: [
    "INTEGER",
    "VARCHAR",
    "BIGINT",
    "SMALLINT",
    "TINYINT",
    "HUGEINT",
    "DOUBLE",
    "FLOAT",
    "DECIMAL",
    "BOOLEAN",
    "DATE",
    "TIME",
    "TIMESTAMP",
    "TIMESTAMPTZ",
    "INTERVAL",
    "UUID",
    "BLOB",
    "JSON",
  ],
};

const ALL_TYPE_NAMES = new Set<string>([
  ...DIALECT_TYPES.sqlite,
  ...DIALECT_TYPES.postgres,
  ...DIALECT_TYPES.duckdb,
  "INT",
  "CHAR",
  "CHARACTER",
  "FLOAT",
  "DOUBLE",
  "PRECISION",
  "VARYING",
]);

// Schema (namespace) qualifiers recognized when the host doesn't supply
// an explicit list, `main.` in SQLite/DuckDB, `public.` in Postgres.
const DEFAULT_SCHEMA_NAMES: Record<SqlDialect, readonly string[]> = {
  sqlite: ["main", "temp"],
  postgres: ["public"],
  duckdb: ["main", "memory"],
};

interface DialectProfile {
  keywords: string[];
  functions: string[];
}

// Build a dialect's keyword/function set by layering its extensions over the
// shared CORE_* lists; duplicates collapse to a single entry.
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
  // FK targets: `REFERENCES |` always names an existing table.
  "REFERENCES",
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
  // DuckDB: `QUALIFY <expr>` filters on window functions, same shape as
  // HAVING, so completion-wise it wants column names + boolean operators.
  "QUALIFY",
  // CASE expressions: WHEN/THEN/ELSE all introduce sub-expressions that
  // want column references.
  "WHEN",
  "THEN",
  "ELSE",
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

function columnName(column: SqlCompletionColumn): string {
  return typeof column === "string" ? column : column.name;
}

function columnType(column: SqlCompletionColumn): string | undefined {
  if (typeof column === "string") return undefined;
  const type = column.type?.trim();
  return type ? type : undefined;
}

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
      // Leave a `0` operand marker (length-preserving) so the tokenizer
      // still sees a value here. Without it, `WHERE name = 'x' |` looks
      // like a dangling `=` and the keyword context resolver would offer
      // expression *starters* instead of AND/OR connectors.
      masked += "0" + maskRangePreservingNewlines(sql, i + 1, nextIndex);
      i = nextIndex;
      continue;
    }
    masked += ch;
    i += 1;
  }
  return masked;
}

/** The statement containing `pos`, split at the cursor. `before` drives
 *  slot detection; `full` also covers text after the cursor so tables
 *  referenced *later* still feed scope ("SELECT | FROM customers"). */
function statementAround(
  sql: string,
  pos: number,
): { before: string; full: string } {
  const masked = maskCommentsAndStrings(sql);
  const start = pos === 0 ? 0 : masked.lastIndexOf(";", pos - 1) + 1;
  const endIndex = masked.indexOf(";", pos);
  const end = endIndex === -1 ? sql.length : endIndex;
  return { before: sql.slice(start, pos), full: sql.slice(start, end) };
}

function tokenize(sql: string): string[] {
  // Operators and punctuation are kept as clause boundaries so nearby SQL
  // expressions don't get folded into identifier/keyword context detection.
  // Numeric literals tokenize as single units so `1.5` doesn't leak a `.`
  // token that would be mistaken for a qualified-identifier dot.
  return (
    maskCommentsAndStrings(sql).match(
      /[A-Za-z_][A-Za-z0-9_$]*|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[,().;=*<>+\-/]/g,
    ) ?? []
  );
}

function isClauseBoundaryKeyword(value: string | undefined): boolean {
  return value ? clauseBoundaryKeywords.has(value.toUpperCase()) : false;
}

// Keyword tiers per syntactic context: `primary` is the strongest match,
// `secondary` plausible-but-less-likely. The resolver picks the tier list;
// the keyword emitter ranks the catalog accordingly.
const KW_NAME_TAIL: KeywordContext = {
  primary: ["IF", "NOT", "EXISTS"],
  restrict: true,
};

// Statement starters vary by dialect (PRAGMA, TRUNCATE, COPY, …), but the
// shared `primary` set keeps the common DML/DDL verbs sorted first.
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

/** True when `token` reads as a *complete operand* (identifier, numeric
 *  literal incl. the masked-string `0` marker, `)`, or END). After an
 *  operand the user wants connectors/clauses, not a fresh expression. */
function isOperandToken(token: string | undefined): boolean {
  if (!token) return false;
  if (token === ")" || token === "END") return true;
  if (/^\d/.test(token)) return true;
  return isIdentifierToken(token);
}

function isExpressionOperator(token: string | undefined): boolean {
  if (!token) return false;
  return expressionContinuationTokens.has(token);
}

/** Inside an unfinished CASE expression (more CASEs than ENDs so far)? */
function inOpenCaseExpression(tokens: string[]): boolean {
  let open = 0;
  for (const token of tokens) {
    if (token === "CASE") open += 1;
    else if (token === "END" && open > 0) open -= 1;
  }
  return open > 0;
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

  // Numeric literal: the slot after `LIMIT 10` / `OFFSET 5` is special;
  // any other trailing number behaves like a completed operand and falls
  // through to the clause-relative rules below.
  if (lastToken && /^\d/.test(lastToken)) {
    const prev = tokens.at(-2);
    if (prev === "LIMIT")
      return { primary: ["OFFSET"], secondary: ["UNION"], restrict: true };
    if (prev === "OFFSET")
      return { primary: [], secondary: ["UNION"], restrict: true };
  }

  // `SELECT * |`, the select list is complete, FROM is next. Without this
  // the `*` would be read as a dangling multiplication operator.
  if (
    lastToken === "*" &&
    ["SELECT", "DISTINCT", "ALL"].includes(tokens.at(-2) ?? "")
  ) {
    return { primary: ["FROM"] };
  }

  // `OVER (|`, window definition slot.
  if (lastToken === "(" && tokens.at(-2) === "OVER") {
    return {
      primary: ["PARTITION", "ORDER"],
      secondary: ["ROWS", "RANGE", "GROUPS"],
    };
  }

  // `WITH name AS (|` / `CREATE VIEW v AS (|`, a subquery body starts.
  if (lastToken === "(" && tokens.at(-2) === "AS") {
    return { primary: ["SELECT"], secondary: ["WITH", "VALUES"] };
  }

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
    case "TO":
      return { primary: [], restrict: true };
    case "PRIMARY":
    case "FOREIGN":
      return { primary: ["KEY"], restrict: true };
    case "PARTITION":
      return { primary: ["BY"], restrict: true };
    // Join modifiers always lead to JOIN.
    case "LEFT":
    case "RIGHT":
    case "FULL":
      return { primary: ["JOIN", "OUTER"], restrict: true };
    case "INNER":
    case "CROSS":
    case "OUTER":
      return { primary: ["JOIN"], restrict: true };
    case "NATURAL":
      return {
        primary: ["JOIN"],
        secondary: ["LEFT", "RIGHT", "INNER", "FULL"],
        restrict: true,
      };
    case "SEMI":
    case "ANTI":
    case "ASOF":
    case "POSITIONAL":
      if (dialect === "duckdb") return { primary: ["JOIN"], restrict: true };
      break;
    case "CASE":
      return { primary: ["WHEN"] };
    case "WHEN":
      return { primary: ["NOT", "EXISTS"], secondary: ["NULL", "CASE"] };
    case "THEN":
    case "ELSE":
      return { primary: [], secondary: ["NULL", "NOT", "CASE"] };
    default:
      break;
  }

  // Open CASE expression: after a complete operand the next step is
  // THEN (in the WHEN branch) or WHEN/ELSE/END, ahead of clause keywords.
  if (inOpenCaseExpression(tokens) && isOperandToken(lastToken)) {
    return {
      primary: ["THEN", "WHEN", "ELSE", "END", "AND", "OR"],
      secondary: ["IS", "NOT", "LIKE", "IN", "BETWEEN"],
    };
  }

  // ── Clause-relative defaults: where in the larger statement are we?
  switch (lastClauseKeyword) {
    case "SELECT":
      if (isOperandToken(lastToken)) {
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
            "NATURAL",
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
            "NATURAL",
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
          // An opening paren may start a scalar subquery / IN-list.
          secondary: [
            "CAST",
            "TRUE",
            "FALSE",
            ...(lastToken === "(" ? ["SELECT"] : []),
          ],
        };
      }
      if (isOperandToken(lastToken)) {
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
    case "ORDER": {
      // Once BY has been typed, the slot wants sort modifiers and the
      // next clause, re-suggesting BY would be noise.
      const clauseIndex = Math.max(
        tokens.lastIndexOf("GROUP"),
        tokens.lastIndexOf("ORDER"),
      );
      const byTyped = tokens.lastIndexOf("BY") > clauseIndex;
      return {
        primary: byTyped ? ["ASC", "DESC"] : ["BY"],
        // QUALIFY is DuckDB-specific; keep it out of the SQLite/Postgres
        // secondary list so it doesn't pollute their suggestions.
        secondary: [
          ...(byTyped ? ["HAVING", "LIMIT", "OFFSET", "UNION", "NULLS"]
            : ["ASC", "DESC", "HAVING", "LIMIT", "OFFSET", "UNION"]),
          ...(dialect === "duckdb" ? ["QUALIFY"] : []),
        ],
      };
    }
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
      // Once the object kind *and* its name have been typed, the slot
      // wants the kind-specific continuation: `CREATE INDEX i ON …`,
      // `CREATE VIEW v AS …`, `CREATE TABLE t (… | AS …)`.
      if (isIdentifierToken(lastToken)) {
        if (tokens.includes("INDEX"))
          return {
            primary: ["ON"],
            secondary: ["IF", "NOT", "EXISTS"],
            restrict: true,
          };
        if (tokens.includes("VIEW"))
          return {
            primary: ["AS"],
            secondary: ["IF", "NOT", "EXISTS"],
            restrict: true,
          };
        if (tokens.includes("TABLE"))
          return {
            primary: ["AS"],
            secondary: ["IF", "NOT", "EXISTS"],
            restrict: true,
          };
      }
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
      // After the closing paren of a VALUES tuple the row is complete;
      // what follows is RETURNING / ON CONFLICT (PG, DuckDB), not more
      // value keywords.
      if (lastToken === ")") {
        return dialect === "sqlite"
          ? { primary: ["RETURNING"] }
          : { primary: ["ON", "RETURNING"], secondary: ["CONFLICT"] };
      }
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

/** Signed paren balance, unlike `isInsideUnclosedParen` this may go
 *  negative, which is how we know a `CREATE TABLE (…)` body has already
 *  been closed before the cursor. */
function signedParenBalance(masked: string): number {
  let depth = 0;
  for (let i = 0; i < masked.length; i += 1) {
    const ch = masked[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
  }
  return depth;
}

/** Column-definition slots inside a `CREATE TABLE name ( … |`. Returns
 *  null when the cursor isn't inside such a body. */
function resolveCreateTableBody(
  prefixWithoutWord: string,
  dialect: SqlDialect,
  explicit: boolean,
): SqlCompletionContextInfo | null {
  const masked = maskCommentsAndStrings(prefixWithoutWord);
  let bodyStart = -1;
  createTableBodyPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = createTableBodyPattern.exec(masked))) {
    bodyStart = match.index + match[0].length;
  }
  if (bodyStart === -1) return null;
  const body = masked.slice(bodyStart);
  const depth = 1 + signedParenBalance(body);
  if (depth <= 0) return null; // body already closed
  if (depth > 1) {
    // Nested paren, CHECK(...), DECIMAL(10,…), etc. Suggestions here are
    // more likely to mislead than help (the columns being defined aren't
    // in the schema yet), so stay quiet.
    return {
      mode: "naming",
      from: 0,
      keywordContext: { primary: [], restrict: true },
    };
  }

  const bodyTokens = tokenize(body).map((token) => token.toUpperCase());
  const last = bodyTokens.at(-1);
  const prev = bodyTokens.at(-2);

  // Fresh column-name slot, the user is inventing a name, so stay quiet
  // unless they explicitly ask, in which case offer the table-constraint
  // starters that are also legal here.
  if (last === undefined || last === "(" || last === ",") {
    return {
      mode: "naming",
      from: 0,
      keywordContext: explicit
        ? {
            primary: [],
            secondary: ["PRIMARY", "FOREIGN", "UNIQUE", "CHECK", "CONSTRAINT"],
            restrict: true,
          }
        : { primary: [], restrict: true },
    };
  }

  if (last === "REFERENCES") return null; // handled as a table target

  if (last === "PRIMARY" || last === "FOREIGN") {
    return {
      mode: "naming",
      from: 0,
      keywordContext: { primary: ["KEY"], restrict: true },
    };
  }
  if (last === "NOT") {
    return {
      mode: "naming",
      from: 0,
      keywordContext: { primary: ["NULL"], restrict: true },
    };
  }
  if (last === "DEFAULT") {
    return {
      mode: "naming",
      from: 0,
      keywordContext: {
        primary: ["NULL", "TRUE", "FALSE"],
        secondary: ["CURRENT_TIMESTAMP", "CURRENT_DATE", "CURRENT_TIME"],
        restrict: true,
      },
    };
  }

  const constraintContext: KeywordContext = {
    primary: ["NOT", "NULL", "PRIMARY", "KEY", "UNIQUE", "DEFAULT", "REFERENCES", "CHECK"],
    secondary: [
      "COLLATE",
      "GENERATED",
      "CONSTRAINT",
      ...(dialect === "sqlite" ? ["AUTOINCREMENT"] : []),
    ],
    restrict: true,
  };

  // `name |` straight after `(`/`,` → the type slot (suggest data types);
  // anything later (after a type, `)`, KEY, NULL, …) → constraint slot.
  const inTypeSlot =
    !ALL_TYPE_NAMES.has(last) &&
    last !== ")" &&
    !["KEY", "NULL", "UNIQUE", "AUTOINCREMENT"].includes(last) &&
    isIdentifierToken(last) &&
    (prev === undefined || prev === "(" || prev === ",");

  return {
    mode: "column-def",
    from: 0,
    columnDefSlot: inTypeSlot ? "type" : "constraint",
    keywordContext: inTypeSlot
      ? {
          primary: [],
          secondary: constraintContext.primary,
          restrict: true,
        }
      : constraintContext,
  };
}

function inferCompletionContext(
  context: CompletionContext,
  statementBefore: string,
  dialect: SqlDialect,
): SqlCompletionContextInfo | null {
  const statement = statementBefore;
  const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_$]*/);
  const qualified = statement.match(qualifiedIdentifierPattern);

  if (qualified) {
    return {
      mode: "qualified-columns",
      qualifier: normalizeIdentifier(qualified[1]),
      viaDot: true,
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

  // INSERT INTO <table> (col1, col2, |), suggest columns of <table>.
  const insertMatch = insertColumnListPattern.exec(prefixWithoutWord);
  if (insertMatch) {
    return {
      mode: "qualified-columns",
      qualifier: normalizeIdentifier(insertMatch[1]),
      from,
    };
  }

  // … REFERENCES parent (col1, |), suggest the parent table's columns.
  const referencesMatch = referencesColumnListPattern.exec(prefixWithoutWord);
  if (referencesMatch) {
    return {
      mode: "qualified-columns",
      qualifier: normalizeIdentifier(referencesMatch[1]),
      from,
    };
  }

  // CREATE INDEX … ON <table> (col1, |), suggest the table's columns.
  if (createIndexStatementPattern.test(prefixWithoutWord)) {
    const indexMatch = indexColumnListPattern.exec(prefixWithoutWord);
    if (indexMatch) {
      return {
        mode: "qualified-columns",
        qualifier: normalizeIdentifier(indexMatch[1]),
        from,
      };
    }
  }

  // JOIN ... USING (col1, |), suggest columns shared by the joined tables.
  if (
    usingClausePattern.test(prefixWithoutWord) &&
    isInsideUnclosedParen(prefixWithoutWord)
  ) {
    return { mode: "columns", from, usingSlot: true };
  }

  // CREATE [TEMP] [UNIQUE] TABLE|VIEW|INDEX|TRIGGER [IF NOT EXISTS] <newName>
  //, user is naming a new object, so suppress existing-table suggestions
  // and only surface the few keywords that legally appear in this slot.
  const namingMatch = createNewObjectPattern.exec(prefixWithoutWord);
  if (namingMatch) {
    const objectKind = namingMatch[1]?.toUpperCase();
    // After the new name, INDEX continues with ON and VIEW with AS;
    // IF NOT EXISTS is legal before the name for all of them.
    const tail: KeywordContext =
      objectKind === "INDEX"
        ? { primary: ["ON", "IF", "NOT", "EXISTS"], restrict: true }
        : objectKind === "VIEW"
          ? { primary: ["AS", "IF", "NOT", "EXISTS"], restrict: true }
          : KW_NAME_TAIL;
    return { mode: "naming", from, keywordContext: tail };
  }

  // Inside a CREATE TABLE ( … ) body: column-definition slots.
  const bodyInfo = resolveCreateTableBody(
    prefixWithoutWord,
    dialect,
    context.explicit,
  );
  if (bodyInfo) return { ...bodyInfo, from };

  const tokens = tokenize(prefixWithoutWord).map((token) => token.toUpperCase());
  const lastToken = tokens.at(-1);
  const lastClauseKeyword = [...tokens]
    .reverse()
    .find((token) => clauseBoundaryKeywords.has(token));
  const keywordContext =
    resolveKeywordContext(tokens, lastToken, lastClauseKeyword, dialect) ??
    undefined;

  // CREATE INDEX idx ON |, ON names a table here, not a join condition.
  if (
    lastToken === "ON" &&
    tokens.includes("CREATE") &&
    tokens.includes("INDEX")
  ) {
    return { mode: "tables", from, keywordContext };
  }

  // ALTER TABLE t DROP/RENAME COLUMN |, complete t's existing columns.
  // (ADD COLUMN names a new column, so that slot stays quiet.)
  if (lastToken === "COLUMN" && tokens.includes("ALTER")) {
    if (tokens.at(-2) === "ADD") {
      return {
        mode: "naming",
        from,
        keywordContext: { primary: [], restrict: true },
      };
    }
    return { mode: "columns", from, keywordContext };
  }

  // Right after a clause keyword that introduces tables / columns.
  if (lastToken && tableTargetKeywords.has(lastToken)) {
    return {
      mode: "tables",
      from,
      keywordContext,
      joinTableSlot: lastToken === "JOIN",
    };
  }
  if (lastToken && columnTargetKeywords.has(lastToken)) {
    return {
      mode: "columns",
      from,
      keywordContext,
      joinConditionSlot: lastToken === "ON",
    };
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

interface TableReference {
  table: string;
  alias?: string;
  /** Clause keyword that introduced the reference, lowercased. */
  via: "from" | "join" | "update" | "into" | "table" | "comma";
}

/** Ordered table references in the statement (FROM/JOIN/UPDATE/INTO/
 *  ALTER-TABLE targets plus comma-separated FROM lists), with aliases and
 *  optional schema qualifiers stripped. */
function extractTableRefList(sql: string): TableReference[] {
  const refs: Array<TableReference & { at: number }> = [];
  const masked = maskCommentsAndStrings(sql);
  const push = (
    tableToken: string,
    aliasToken: string | undefined,
    via: TableReference["via"],
    at: number,
  ) => {
    const table = normalizeIdentifier(tableToken);
    if (!table) return;
    const alias = normalizeIdentifier(aliasToken);
    refs.push({
      table,
      alias: alias && !isClauseBoundaryKeyword(alias) ? alias : undefined,
      via,
      at,
    });
  };

  let match: RegExpExecArray | null;
  tableReferencePattern.lastIndex = 0;
  while ((match = tableReferencePattern.exec(masked))) {
    push(
      match[3],
      match[4],
      match[1].toLowerCase() as TableReference["via"],
      match.index,
    );
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
      push(match[2], match[3], "comma", match.index);
    }
  }

  // The two scans above each emit in their own document order; merge them
  // so positional logic ("which table was joined last?") sees the true
  // statement order.
  return refs
    .sort((a, b) => a.at - b.at)
    .map(({ table, alias, via }) => ({ table, alias, via }));
}

/** alias/table-name (lowercased) → canonical table name. */
function referenceMap(refs: TableReference[]): Map<string, string> {
  const references = new Map<string, string>();
  for (const ref of refs) {
    references.set(ref.table.toLowerCase(), ref.table);
    if (ref.alias) references.set(ref.alias.toLowerCase(), ref.table);
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

  // Continuation `, name AS (...)`, only honor those that fall outside any
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
  return { ...base, entities: merged };
}

function findEntity(
  schema: SqlCompletionSchema,
  name: string,
): SqlCompletionEntity | undefined {
  const lower = name.toLowerCase();
  return schema.entities.find(
    (entity) => entity.name.toLowerCase() === lower,
  );
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

/** Quick-doc shown next to a highlighted table suggestion: its column
 *  list with types, like the structure preview desktop SQL IDEs render. */
function entityInfo(entity: SqlCompletionEntity): string | undefined {
  if (entity.columns.length === 0) return undefined;
  const shown = entity.columns.slice(0, 12).map((column) => {
    const type = columnType(column);
    return type ? `${columnName(column)} ${type}` : columnName(column);
  });
  const suffix = entity.columns.length > 12 ? ", …" : "";
  return `${entity.kind} ${entity.name} (${shown.join(", ")}${suffix})`;
}

/** Table names (lowercased) reachable via a foreign key from/to any of
 *  the already-referenced tables, used to float likely JOIN partners. */
function fkRelatedTables(
  schema: SqlCompletionSchema,
  refs: TableReference[],
): Set<string> {
  const referenced = new Set(refs.map((ref) => ref.table.toLowerCase()));
  const related = new Set<string>();
  for (const entity of schema.entities) {
    const entityLower = entity.name.toLowerCase();
    for (const fk of entity.foreignKeys ?? []) {
      const target = fk.refEntity.toLowerCase();
      // Outgoing edge from an already-referenced table…
      if (referenced.has(entityLower) && !referenced.has(target)) {
        related.add(target);
      }
      // …or incoming edge pointing at one.
      if (referenced.has(target) && !referenced.has(entityLower)) {
        related.add(entityLower);
      }
    }
  }
  return related;
}

function tableOptions(
  schema: SqlCompletionSchema,
  defaultBoost: number,
  related?: Set<string>,
): Completion[] {
  return schema.entities.map((entity) => {
    const base =
      entity.kind === "cte" ? BOOST.cteInTableContext : defaultBoost;
    const isRelated = related?.has(entity.name.toLowerCase()) ?? false;
    return {
      label: entity.name,
      apply: quoteIdentifier(entity.name),
      detail: entity.kind,
      type: entityType(entity),
      section: entitySection(entity),
      info: entityInfo(entity),
      boost: isRelated ? base + BOOST.relatedTableBump : base,
    };
  });
}

// Boost adjustments applied when the cursor's syntactic position predicts a
// narrower keyword set. Values are tuned so context-relevant keywords sort
// among the user's likely picks while keeping table/column suggestions
// dominant when those are what the slot wants.
const KEYWORD_PRIMARY_BUMP = 30;
const KEYWORD_SECONDARY_BUMP = 5;
const KEYWORD_OFF_CONTEXT_PENALTY = 25;

/** Keyword/function casing follows what the user is typing, a
 *  lowercase prefix completes to `select`, anything else to `SELECT`,
 *  the "match typed case" insertion mode of desktop SQL IDEs. Labels
 *  always render uppercase; only the inserted text changes. */
type KeywordCasing = "upper" | "lower";

function casingOf(typed: string): KeywordCasing {
  return /^[a-z]/.test(typed) ? "lower" : "upper";
}

function keywordOptions(
  dialect: SqlDialect,
  boost: number,
  keywordContext?: KeywordContext,
  options: { includeFunctions?: boolean; casing?: KeywordCasing } = {},
): Completion[] {
  const { includeFunctions = true, casing = "upper" } = options;
  const profile = DIALECT_PROFILES[dialect];
  const dialectKeywordSet = new Set(profile.keywords);
  const primary = keywordContext ? new Set(keywordContext.primary) : null;
  const secondary = keywordContext?.secondary
    ? new Set(keywordContext.secondary)
    : null;
  const restrict = keywordContext?.restrict ?? false;
  const hasContext = primary !== null;
  const emitFunctions = includeFunctions && !restrict;
  const functionLabels = emitFunctions ? new Set(profile.functions) : null;

  // Context entries may reference keywords outside the active dialect; keep
  // them (the resolver is dialect-aware) and fall back to the dialect
  // catalog for the unranked tail.
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
    // A handful of DuckDB identifiers (LIST, MAP, STRUCT, RANGE) exist as
    // both keyword and function. Showing both is duplicate noise, keep
    // the callable form unless the context explicitly pinned the keyword.
    if (functionLabels?.has(keyword) && !isPrimary && !isSecondary) continue;
    let kwBoost = boost;
    if (hasContext) {
      if (isPrimary) kwBoost = boost + KEYWORD_PRIMARY_BUMP;
      else if (isSecondary) kwBoost = boost + KEYWORD_SECONDARY_BUMP;
      else kwBoost = boost - KEYWORD_OFF_CONTEXT_PENALTY;
    }
    out.push({
      label: keyword,
      apply: casing === "lower" ? keyword.toLowerCase() : undefined,
      type: "keyword",
      section: keywordSection,
      boost: kwBoost,
    });
  }
  if (emitFunctions) {
    for (const fn of profile.functions) {
      const insert = casing === "lower" ? fn.toLowerCase() : fn;
      out.push(
        snippetCompletion(`${insert}(#{})`, {
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

function typeOptions(
  dialect: SqlDialect,
  casing: KeywordCasing,
): Completion[] {
  return DIALECT_TYPES[dialect].map((typeName) => ({
    label: typeName,
    apply: casing === "lower" ? typeName.toLowerCase() : typeName,
    detail: "type",
    type: "type",
    section: keywordSection,
    boost: BOOST.typeInColumnDef,
  }));
}

function formatColumnDetail(
  entity: SqlCompletionEntity,
  column: SqlCompletionColumn,
  multipleEntities: boolean,
): string {
  const type = columnType(column);
  if (!type) return entity.name;
  const shortType = type.length > 24 ? `${type.slice(0, 23)}…` : type;
  // With several tables in scope the owning table is the more valuable
  // hint; single-table contexts show the type alone.
  return multipleEntities ? `${entity.name} · ${shortType}` : shortType;
}

function columnOptions(
  schema: SqlCompletionSchema,
  statement: string,
  boost: number,
): Completion[] {
  const references = referenceMap(extractTableRefList(statement));
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
      const key = columnName(column).toLowerCase();
      columnOwners.set(key, [...(columnOwners.get(key) ?? []), entity]);
    }
  }

  const multipleEntities = entities.length > 1;
  const options: Completion[] = [];
  const seen = new Set<string>();
  for (const entity of entities) {
    for (const column of entity.columns) {
      const name = columnName(column);
      const owners = columnOwners.get(name.toLowerCase()) ?? [];
      const ambiguous = owners.length > 1;
      const label = ambiguous ? `${entity.name}.${name}` : name;
      if (seen.has(label)) continue;
      seen.add(label);
      options.push({
        label,
        apply: ambiguous
          ? `${quoteIdentifier(entity.name)}.${quoteIdentifier(name)}`
          : quoteIdentifier(name),
        detail: formatColumnDetail(entity, column, multipleEntities),
        type: "property",
        section: columnSection,
        boost,
      });
    }
  }
  return options;
}

/** Bare column names for a `USING (…)` list. Columns shared by two or
 *  more of the joined tables float to the top (those are the only ones
 *  USING accepts); the rest trail at low rank as a fallback. */
function usingColumnOptions(
  schema: SqlCompletionSchema,
  statement: string,
): Completion[] {
  const references = referenceMap(extractTableRefList(statement));
  const referencedTables = new Set(
    [...references.values()].map((name) => name.toLowerCase()),
  );
  const entities = schema.entities.filter((entity) =>
    referencedTables.has(entity.name.toLowerCase()),
  );
  if (entities.length === 0) return [];

  const owners = new Map<string, { display: string; entities: string[] }>();
  for (const entity of entities) {
    for (const column of entity.columns) {
      const name = columnName(column);
      const key = name.toLowerCase();
      const entry = owners.get(key) ?? { display: name, entities: [] };
      entry.entities.push(entity.name);
      owners.set(key, entry);
    }
  }

  return [...owners.values()].map(({ display, entities: ownerNames }) => ({
    label: display,
    apply: quoteIdentifier(display),
    detail: ownerNames.join(", "),
    type: "property",
    section: columnSection,
    boost:
      ownerNames.length > 1
        ? BOOST.usingSharedColumn
        : BOOST.usingOtherColumn,
  }));
}

function qualifiedColumnOptions(
  schema: SqlCompletionSchema,
  statement: string,
  qualifier: string | undefined,
  boost: number,
  includeStar: boolean,
): Completion[] {
  if (!qualifier) return [];
  const references = referenceMap(extractTableRefList(statement));
  const tableName = references.get(qualifier.toLowerCase()) ?? qualifier;
  const entity = findEntity(schema, tableName);
  if (!entity) return [];
  const options: Completion[] = entity.columns.map((column) => ({
    label: columnName(column),
    apply: quoteIdentifier(columnName(column)),
    detail: formatColumnDetail(entity, column, false),
    type: "property",
    section: columnSection,
    boost,
  }));
  if (includeStar) {
    options.unshift({
      label: "*",
      apply: "*",
      detail: "all columns",
      type: "constant",
      section: columnSection,
      boost: BOOST.starInQualified,
    });
  }
  return options;
}

/** Display name for a table reference inside a join condition, the
 *  alias when one was declared, the table name otherwise. */
function refDisplay(ref: TableReference): string {
  return ref.alias ?? ref.table;
}

function joinConditionCompletion(
  left: TableReference,
  leftColumn: string,
  right: TableReference,
  rightColumn: string,
): Completion {
  const label = `${refDisplay(left)}.${leftColumn} = ${refDisplay(right)}.${rightColumn}`;
  const apply = `${quoteIdentifier(refDisplay(left))}.${quoteIdentifier(leftColumn)} = ${quoteIdentifier(refDisplay(right))}.${quoteIdentifier(rightColumn)}`;
  return {
    label,
    apply,
    type: "text",
    section: joinSection,
    boost: BOOST.joinCondition,
  };
}

/** Ready-made `a.col = b.col` conditions for the `JOIN … ON |` slot. FK
 *  metadata drives the suggestions when available; otherwise name-matching
 *  heuristics (`x.customer_id = customers.id`, shared column names). */
function joinConditionOptions(
  schema: SqlCompletionSchema,
  statementBefore: string,
): Completion[] {
  const refs = extractTableRefList(statementBefore);
  if (refs.length < 2) return [];
  const target = refs[refs.length - 1];
  if (target.via !== "join") return [];
  const others = refs.slice(0, -1);
  const targetEntity = findEntity(schema, target.table);

  const out: Completion[] = [];
  const seen = new Set<string>();
  const add = (completion: Completion) => {
    if (seen.has(completion.label)) return;
    seen.add(completion.label);
    out.push(completion);
  };

  // 1. Foreign keys on the freshly-joined table pointing back at tables
  //    already in the statement…
  for (const fk of targetEntity?.foreignKeys ?? []) {
    const other = others.find(
      (ref) => ref.table.toLowerCase() === fk.refEntity.toLowerCase(),
    );
    if (other) {
      add(joinConditionCompletion(target, fk.column, other, fk.refColumn));
    }
  }
  // 2. …and foreign keys on already-referenced tables pointing at it.
  for (const other of others) {
    const otherEntity = findEntity(schema, other.table);
    for (const fk of otherEntity?.foreignKeys ?? []) {
      if (fk.refEntity.toLowerCase() === target.table.toLowerCase()) {
        add(joinConditionCompletion(target, fk.refColumn, other, fk.column));
      }
    }
  }

  // 3. Heuristics when no FK metadata produced anything (e.g. imported
  //    CSVs): shared column names, and `<entity>_id` ↔ `id` pairs.
  if (out.length === 0 && targetEntity) {
    const targetColumns = targetEntity.columns.map(columnName);
    for (const other of others) {
      const otherEntity = findEntity(schema, other.table);
      if (!otherEntity) continue;
      const otherColumns = new Set(
        otherEntity.columns.map((column) => columnName(column).toLowerCase()),
      );
      for (const column of targetColumns) {
        const lower = column.toLowerCase();
        // A column named exactly the same on both sides is the classic
        // join key, except bare `id`, which is both tables' own pk.
        if (lower !== "id" && otherColumns.has(lower)) {
          add(joinConditionCompletion(target, column, other, column));
        }
        // orders.customer_id ↔ customers.id
        if (lower.endsWith("_id") && otherColumns.has("id")) {
          const base = lower.slice(0, -3);
          if (base && other.table.toLowerCase().startsWith(base)) {
            add(joinConditionCompletion(target, column, other, "id"));
          }
        }
      }
      // customers JOIN … where the *other* side holds the FK-style column.
      for (const column of otherEntity.columns.map(columnName)) {
        const lower = column.toLowerCase();
        if (lower.endsWith("_id")) {
          const base = lower.slice(0, -3);
          if (
            base &&
            target.table.toLowerCase().startsWith(base) &&
            targetColumns.some((c) => c.toLowerCase() === "id")
          ) {
            add(joinConditionCompletion(target, "id", other, column));
          }
        }
      }
    }
  }

  return out.slice(0, 6);
}

function schemaNamesFor(
  schema: SqlCompletionSchema,
  dialect: SqlDialect,
): Set<string> {
  const names = new Set(
    DEFAULT_SCHEMA_NAMES[dialect].map((name) => name.toLowerCase()),
  );
  for (const name of schema.schemas ?? []) {
    names.add(name.toLowerCase());
  }
  return names;
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
    const doc = context.state.doc.toString();
    const { before, full } = statementAround(doc, context.pos);
    const info = inferCompletionContext(context, before, dialect);
    if (!info) return null;

    const typed = doc.slice(info.from, context.pos);
    const casing = casingOf(typed);
    const localSchema = effectiveSchema(schema, full);

    const kw = info.keywordContext;
    const completions = (() => {
      switch (info.mode) {
        case "tables": {
          const related = info.joinTableSlot
            ? fkRelatedTables(localSchema, extractTableRefList(before))
            : undefined;
          return [
            ...tableOptions(localSchema, BOOST.tableInTableContext, related),
            ...keywordOptions(dialect, BOOST.keywordInTableContext, kw, {
              casing,
            }),
          ];
        }
        case "columns": {
          const cols = info.usingSlot
            ? usingColumnOptions(localSchema, full)
            : columnOptions(localSchema, full, BOOST.columnInColumnContext);
          const joins = info.joinConditionSlot
            ? joinConditionOptions(localSchema, before)
            : [];
          if (cols.length === 0 && joins.length === 0) {
            // No FROM/JOIN/UPDATE/INTO target in scope yet, column suggestions
            // would be misleading, so offer keywords + tables instead.
            return [
              ...keywordOptions(dialect, BOOST.keywordInColumnContext, kw, {
                casing,
              }),
              ...tableOptions(localSchema, BOOST.tableInColumnContext),
            ];
          }
          return [
            ...joins,
            ...cols,
            ...keywordOptions(dialect, BOOST.keywordInColumnContext, kw, {
              casing,
            }),
            ...tableOptions(localSchema, BOOST.tableInColumnContext),
          ];
        }
        case "qualified-columns": {
          const qualified = qualifiedColumnOptions(
            localSchema,
            full,
            info.qualifier,
            BOOST.qualifiedColumn,
            info.viaDot ?? false,
          );
          if (qualified.length > 0) return qualified;
          // `public.|` / `main.|`, a schema qualifier completes to its
          // tables rather than columns.
          if (
            info.qualifier &&
            schemaNamesFor(schema, dialect).has(info.qualifier.toLowerCase())
          ) {
            return tableOptions(localSchema, BOOST.qualifiedColumn);
          }
          return [];
        }
        case "naming":
          // New-object name slot: only legal trailing keywords like
          // `IF NOT EXISTS`. Tables and free functions would mislead the user
          // here, so we suppress them entirely.
          return keywordOptions(dialect, BOOST.keywordInKeywordContext, kw, {
            includeFunctions: false,
            casing,
          });
        case "column-def":
          // CREATE TABLE column definitions: data types (in the type
          // slot) plus the legal constraint keywords. No tables, no
          // free functions.
          return [
            ...(info.columnDefSlot === "type" ? typeOptions(dialect, casing) : []),
            ...keywordOptions(dialect, BOOST.keywordInKeywordContext, kw, {
              includeFunctions: false,
              casing,
            }),
          ];
        case "keywords":
          return [
            ...keywordOptions(dialect, BOOST.keywordInKeywordContext, kw, {
              casing,
            }),
            ...tableOptions(localSchema, BOOST.tableInKeywordContext),
          ];
      }
    })();

    const uniqueOptions = dedupeOptions(completions);
    if (uniqueOptions.length === 0) return null;
    return {
      from: info.from,
      options: uniqueOptions,
      // Keep the result alive while the user extends the identifier, but
      // force a re-query when the casing style flips so keyword inserts
      // track what's actually being typed.
      validFor: (text: string) =>
        (text === "" || bareIdentifierPattern.test(text)) &&
        casingOf(text) === casing,
    } satisfies CompletionResult;
  };
}
