import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";
import type { Text } from "@codemirror/state";

import { documentIdentifiers, recencyBoost } from "../completion/ranking";

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
  /** Namespace the entity lives in (`public`, `main`, `analytics`). An
   *  entity without one is taken to live in the dialect's default schema,
   *  so `public.|` lists it and `pg_catalog.|` does not. */
  schema?: string;
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
  // Functions a restricted slot still offers. `restrict` drops the function
  // catalog along with the keywords, which is wrong for the one slot where a
  // function is the point: `FROM read_csv(…)`, `FROM generate_series(…)`.
  functions?: readonly string[];
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
/** `expr AS alias` at the end of a SELECT-list item. */
const selectAliasPattern = new RegExp(
  String.raw`\s+AS\s+(${sqlIdentifierPattern})\s*$`,
  "i",
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
  // Ordering signals layered on the slot boosts above, small enough to
  // reorder within a section and never to move one section past another.
  /** A name already used in the document (locality). */
  localityBump: 3,
  /** In ORDER BY / GROUP BY / HAVING, a column the SELECT list uses. */
  selectListBump: 8,
  /** A SELECT-list alias offered in ORDER BY / GROUP BY / HAVING: the
   *  aggregate the query just computed is the likeliest sort key, so it
   *  sits above even a used, bumped column (90 + 8 + 3). */
  selectAlias: 102,
  /** Bumped columns must stay below the join-condition section. */
  bumpCeiling: 94,
} as const;

/** Signatures and one-line descriptions for the catalog functions, shown
 *  as the popup detail and info the way the other languages' completions
 *  are. Functions missing here fall back to the bare "function" detail. */
const FUNCTION_META: Record<string, { sig: string; doc?: string }> = {
  COUNT: { sig: "(expr | *)", doc: "Number of rows, or of non-NULL values of expr." },
  SUM: { sig: "(expr)", doc: "Sum of the values." },
  AVG: { sig: "(expr)", doc: "Average of the values." },
  MIN: { sig: "(expr)", doc: "Smallest value." },
  MAX: { sig: "(expr)", doc: "Largest value." },
  ROUND: { sig: "(x, digits)", doc: "Round x to the given number of decimal places." },
  ABS: { sig: "(x)", doc: "Absolute value." },
  LOWER: { sig: "(str)", doc: "Lowercase the string." },
  UPPER: { sig: "(str)", doc: "Uppercase the string." },
  LENGTH: { sig: "(str)", doc: "Number of characters." },
  COALESCE: { sig: "(value, ...)", doc: "First non-NULL argument." },
  NULLIF: { sig: "(a, b)", doc: "NULL when a equals b, else a." },
  TOTAL: { sig: "(expr)", doc: "Sum as a floating-point number, 0.0 for no rows." },
  SUBSTR: { sig: "(str, start, length)", doc: "Substring starting at a 1-based position." },
  SUBSTRING: { sig: "(str FROM start FOR length)", doc: "Substring starting at a 1-based position." },
  IFNULL: { sig: "(a, b)", doc: "b when a is NULL, else a." },
  IIF: { sig: "(condition, a, b)", doc: "a when the condition holds, else b." },
  INSTR: { sig: "(str, substr)", doc: "1-based position of substr in str, 0 when absent." },
  TRIM: { sig: "(str)", doc: "Strip leading and trailing spaces." },
  LTRIM: { sig: "(str)", doc: "Strip leading spaces." },
  RTRIM: { sig: "(str)", doc: "Strip trailing spaces." },
  GROUP_CONCAT: { sig: "(expr, separator)", doc: "Concatenate the group's values." },
  STRING_AGG: { sig: "(expr, delimiter)", doc: "Concatenate the group's values." },
  ARRAY_AGG: { sig: "(expr)", doc: "Collect the group's values into an array." },
  JSON_AGG: { sig: "(expr)", doc: "Collect the group's values into a JSON array." },
  JSONB_AGG: { sig: "(expr)", doc: "Collect the group's values into a JSONB array." },
  JSON_BUILD_OBJECT: { sig: "(key, value, ...)", doc: "JSON object from key/value pairs." },
  JSONB_BUILD_OBJECT: { sig: "(key, value, ...)", doc: "JSONB object from key/value pairs." },
  JSON_OBJECT_AGG: { sig: "(key, value)", doc: "JSON object from the group's key/value pairs." },
  JSONB_OBJECT_AGG: { sig: "(key, value)", doc: "JSONB object from the group's key/value pairs." },
  DATE: { sig: "(timevalue, modifier...)", doc: "Date part as YYYY-MM-DD." },
  TIME: { sig: "(timevalue, modifier...)", doc: "Time part as HH:MM:SS." },
  DATETIME: { sig: "(timevalue, modifier...)", doc: "Date and time as YYYY-MM-DD HH:MM:SS." },
  STRFTIME: { sig: "(format, timevalue)", doc: "Format a date/time." },
  STRPTIME: { sig: "(text, format)", doc: "Parse text into a timestamp." },
  JULIANDAY: { sig: "(timevalue)", doc: "Days since noon in Greenwich on -4714-11-24." },
  PRINTF: { sig: "(format, ...)", doc: "Format values like C's printf." },
  RANDOM: { sig: "()", doc: "Pseudo-random integer." },
  HEX: { sig: "(x)", doc: "Hexadecimal rendering of a blob or string." },
  TYPEOF: { sig: "(x)", doc: "Datatype of the value: null, integer, real, text, blob." },
  ROW_NUMBER: { sig: "() OVER (...)", doc: "1, 2, 3, … within the window." },
  RANK: { sig: "() OVER (...)", doc: "Rank with gaps after ties." },
  DENSE_RANK: { sig: "() OVER (...)", doc: "Rank without gaps after ties." },
  NTILE: { sig: "(n) OVER (...)", doc: "Bucket number 1..n within the window." },
  LAG: { sig: "(expr, offset, default) OVER (...)", doc: "Value from a preceding row." },
  LEAD: { sig: "(expr, offset, default) OVER (...)", doc: "Value from a following row." },
  FIRST_VALUE: { sig: "(expr) OVER (...)", doc: "Value from the first row of the frame." },
  LAST_VALUE: { sig: "(expr) OVER (...)", doc: "Value from the last row of the frame." },
  NOW: { sig: "()", doc: "Current date and time." },
  CURRENT_TIMESTAMP: { sig: "", doc: "Current date and time (no parentheses)." },
  CURRENT_DATE: { sig: "", doc: "Today's date (no parentheses)." },
  CURRENT_TIME: { sig: "", doc: "Current time (no parentheses)." },
  AGE: { sig: "(timestamp, timestamp)", doc: "Interval between two timestamps." },
  EXTRACT: { sig: "(field FROM source)", doc: "A part of a date/time: year, month, day, …" },
  DATE_TRUNC: { sig: "(field, source)", doc: "Truncate to a precision: 'month', 'day', …" },
  DATE_PART: { sig: "(field, source)", doc: "A part of a date/time as a number." },
  DATE_DIFF: { sig: "(part, start, end)", doc: "Number of part boundaries between two dates." },
  DATE_ADD: { sig: "(date, interval)", doc: "Add an interval to a date." },
  DATE_SUB: { sig: "(part, start, end)", doc: "Number of complete parts between two dates." },
  TO_CHAR: { sig: "(value, format)", doc: "Format a number or date/time as text." },
  TO_DATE: { sig: "(text, format)", doc: "Parse text into a date." },
  TO_TIMESTAMP: { sig: "(text, format)", doc: "Parse text into a timestamp." },
  TO_NUMBER: { sig: "(text, format)", doc: "Parse text into a number." },
  GENERATE_SERIES: { sig: "(start, stop, step)", doc: "A set of values from start to stop." },
  GREATEST: { sig: "(value, ...)", doc: "Largest of the arguments." },
  LEAST: { sig: "(value, ...)", doc: "Smallest of the arguments." },
  POSITION: { sig: "(substring IN string)", doc: "1-based position of a substring." },
  LPAD: { sig: "(str, length, fill)", doc: "Pad on the left to the length." },
  RPAD: { sig: "(str, length, fill)", doc: "Pad on the right to the length." },
  SPLIT_PART: { sig: "(str, delimiter, n)", doc: "The n-th field after splitting." },
  STRING_SPLIT: { sig: "(str, separator)", doc: "Split into a list." },
  STRING_TO_ARRAY: { sig: "(str, delimiter)", doc: "Split into an array." },
  REGEXP_REPLACE: { sig: "(str, pattern, replacement, flags)", doc: "Replace regex matches." },
  REGEXP_MATCH: { sig: "(str, pattern)", doc: "Captured groups of the first match." },
  REGEXP_MATCHES: { sig: "(str, pattern)", doc: "Whether the pattern matches." },
  REGEXP_EXTRACT: { sig: "(str, pattern, group)", doc: "Text captured by the pattern." },
  CONCAT: { sig: "(str, ...)", doc: "Join the arguments as text." },
  CONCAT_WS: { sig: "(separator, str, ...)", doc: "Join the arguments with a separator." },
  CEIL: { sig: "(x)", doc: "Round up to an integer." },
  FLOOR: { sig: "(x)", doc: "Round down to an integer." },
  POWER: { sig: "(x, y)", doc: "x raised to the power y." },
  SQRT: { sig: "(x)", doc: "Square root." },
  MOD: { sig: "(x, y)", doc: "Remainder of x / y." },
  INITCAP: { sig: "(str)", doc: "Capitalize each word." },
  CHAR_LENGTH: { sig: "(str)", doc: "Number of characters." },
  UNNEST: { sig: "(array)", doc: "One row per array element." },
  ARRAY_LENGTH: { sig: "(array, dimension)", doc: "Length of an array dimension." },
  CARDINALITY: { sig: "(array)", doc: "Total number of elements." },
  LIST: { sig: "(expr)", doc: "Collect the group's values into a list." },
  LIST_VALUE: { sig: "(value, ...)", doc: "A list from the arguments." },
  STRUCT_PACK: { sig: "(name := value, ...)", doc: "A struct from named values." },
  STRUCT_EXTRACT: { sig: "(struct, name)", doc: "One field of a struct." },
  MAP: { sig: "(keys, values)", doc: "A map from two lists." },
  RANGE: { sig: "(start, stop, step)", doc: "A list of numbers from start to stop." },
  EPOCH: { sig: "(timestamp)", doc: "Seconds since 1970-01-01." },
  EPOCH_MS: { sig: "(timestamp)", doc: "Milliseconds since 1970-01-01." },
  QUANTILE: { sig: "(expr, fraction)", doc: "The value at a quantile of the group." },
  MEDIAN: { sig: "(expr)", doc: "Middle value of the group." },
  MODE: { sig: "(expr)", doc: "Most frequent value of the group." },
  ARG_MAX: { sig: "(arg, value)", doc: "arg from the row with the largest value." },
  ARG_MIN: { sig: "(arg, value)", doc: "arg from the row with the smallest value." },
  LEN: { sig: "(str | list)", doc: "Number of characters or elements." },
  CONTAINS: { sig: "(str, search)", doc: "Whether search occurs in str." },
  STARTS_WITH: { sig: "(str, prefix)", doc: "Whether str begins with prefix." },
  READ_CSV: { sig: "('file.csv')", doc: "Read a CSV file as a table." },
  READ_CSV_AUTO: { sig: "('file.csv')", doc: "Read a CSV file, detecting its format." },
  READ_PARQUET: { sig: "('file.parquet')", doc: "Read a Parquet file as a table." },
  READ_JSON_AUTO: { sig: "('file.json')", doc: "Read a JSON file, detecting its shape." },
};

/** Where a dialect spells the same function differently. SQLite's
 *  `strftime` takes the format first and DuckDB's the value first, and a
 *  signature copied across is how a reader ends up with the arguments
 *  swapped; DuckDB's `to_timestamp` takes epoch seconds, not text and a
 *  format. */
const DIALECT_FUNCTION_META: Partial<
  Record<SqlDialect, Record<string, { sig: string; doc?: string }>>
> = {
  duckdb: {
    STRFTIME: { sig: "(timestamp, format)", doc: "Format a date/time." },
    TO_TIMESTAMP: {
      sig: "(seconds)",
      doc: "Timestamp from seconds since 1970-01-01.",
    },
  },
};

function functionMeta(
  fn: string,
  dialect: SqlDialect,
): { sig: string; doc?: string } | undefined {
  return DIALECT_FUNCTION_META[dialect]?.[fn] ?? FUNCTION_META[fn];
}

/** Functions written without parentheses. */
const NO_PAREN_FUNCTIONS = new Set(["CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP"]);

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

// Postgres functions DuckDB does not have, checked against
// `duckdb_functions()` in duckdb-wasm 1.32. DuckDB borrows Postgres's
// syntax, not its catalog: formatting goes through strftime/strptime and
// JSON through json_group_array/json_object, so offering these completes to
// a "function does not exist" error.
const DUCKDB_MISSING_POSTGRES_FUNCTIONS = new Set<string>([
  "TO_CHAR",
  "TO_DATE",
  "TO_NUMBER",
  "JSON_AGG",
  "JSONB_AGG",
  "JSON_BUILD_OBJECT",
  "JSONB_BUILD_OBJECT",
  "JSON_OBJECT_AGG",
  "JSONB_OBJECT_AGG",
  "REGEXP_MATCH",
  "INITCAP",
]);

// Functions that return rows, so they may open a table reference. These are
// the only functions the `FROM |` slot offers.
const TABLE_FUNCTIONS: Record<SqlDialect, readonly string[]> = {
  sqlite: [],
  postgres: ["GENERATE_SERIES", "UNNEST"],
  duckdb: [
    "READ_CSV",
    "READ_CSV_AUTO",
    "READ_PARQUET",
    "READ_JSON_AUTO",
    "GENERATE_SERIES",
    "RANGE",
    "UNNEST",
  ],
};

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

// Where an entity that carries no `schema` of its own lives. `memory` is
// DuckDB's default catalog, and `memory.t` resolves to `memory.main.t`, so it
// lists the same tables `main` does.
const DEFAULT_SCHEMA: Record<SqlDialect, readonly string[]> = {
  sqlite: ["main"],
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
  // DuckDB stacks its extensions on top of the Postgres dialect, minus the
  // Postgres functions it never implemented.
  duckdb: buildProfile(
    [...POSTGRES_KEYWORDS, ...DUCKDB_KEYWORDS],
    [
      ...POSTGRES_FUNCTIONS.filter(
        (fn) => !DUCKDB_MISSING_POSTGRES_FUNCTIONS.has(fn),
      ),
      ...DUCKDB_FUNCTIONS,
    ],
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

/** The name an identifier token stands for. Pass `dialect` for a name read
 *  out of the statement (an alias, a CTE, a SELECT-list label) that may be
 *  inserted again later: Postgres folds an unquoted name to lowercase, so
 *  `FROM users U` declares `u`, and that is the spelling `quoteIdentifier`
 *  can leave bare. Kept as typed, `U` would be quoted on the way back in and
 *  `"U".id` names an alias the query never declared. */
function normalizeIdentifier(
  identifier: string | undefined,
  dialect?: SqlDialect,
): string {
  if (!identifier) return "";
  const trimmed = identifier.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return dialect === "postgres" ? trimmed.toLowerCase() : trimmed;
}

// Words each engine refuses, or silently reads as something else, when they
// are written bare where a column or table name belongs. Measured, not taken
// from a keyword list: every keyword the three engines know was created as a
// quoted column and as a quoted table, then referenced bare in a SELECT list,
// WHERE, ORDER BY, FROM, JOIN and INSERT (SQLite 3.53, PGlite, duckdb-wasm
// 1.32). A word is here if any of those failed or returned a different value,
// which is how `current_date` qualifies: it parses, and returns today.
//
// The lists are short on purpose. Most keywords are not reserved, so `name`,
// `date`, `value`, `status`, `type`, `key`, `year` and `text` stay bare in all
// three. `user` is reserved in Postgres only (it is `current_user` there).
const RESERVED_WORDS: Record<SqlDialect, ReadonlySet<string>> = {
  sqlite: new Set(
    (
      "add all alter and as autoincrement between case cast check collate " +
      "commit constraint create current_date current_time current_timestamp " +
      "default deferrable delete distinct drop else escape except exists " +
      "foreign from group having in index insert intersect into is isnull " +
      "join limit not nothing notnull null on or order primary raise " +
      "references returning select set table then to transaction union " +
      "unique update using values when where"
    ).split(" "),
  ),
  // Exactly the `reserved` and `reserved (can be function or type)` rows of
  // pg_get_keywords().
  postgres: new Set(
    (
      "all analyse analyze and any array as asc asymmetric authorization " +
      "binary both case cast check collate collation column concurrently " +
      "constraint create cross current_catalog current_date current_role " +
      "current_schema current_time current_timestamp current_user default " +
      "deferrable desc distinct do else end except false fetch for foreign " +
      "freeze from full grant group having ilike in initially inner " +
      "intersect into is isnull join lateral leading left like limit " +
      "localtime localtimestamp natural not notnull null offset on only or " +
      "order outer overlaps placing primary references returning right " +
      "select session_user similar some symmetric system_user table " +
      "tablesample then to trailing true union unique user using variadic " +
      "verbose when where window with"
    ).split(" "),
  ),
  duckdb: new Set(
    (
      "all analyse analyze and anti any array as asc asof asymmetric at " +
      "authorization binary both by case cast check collate collation " +
      "column concurrently constraint create cross default deferrable desc " +
      "describe distinct do else end except false fetch for foreign freeze " +
      "from full glob group having ilike in initially inner intersect into " +
      "is isnull join lambda lateral leading left like limit natural not " +
      "notnull null offset on only or order outer overlaps pivot " +
      "pivot_longer pivot_wider placing positional primary qualify " +
      "references returning right select semi show similar some summarize " +
      "symmetric table tablesample then to trailing true union unique " +
      "unpack unpivot using variadic verbose when where window with"
    ).split(" "),
  ),
};

/** Always-quoted form. Double quotes are the SQL-standard style, accepted by
 *  all three engines, and match the rest of the playground's generated SQL. */
function forceQuoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/** `identifier` as it has to be written for `dialect` to read it as that
 *  name: bare when the engine would read it back unchanged, quoted when it
 *  has characters a bare name cannot hold, is a reserved word, or (Postgres
 *  only) has an uppercase letter that an unquoted name would lose. SQLite and
 *  DuckDB match names case-insensitively, so they have no case rule. */
function quoteIdentifier(identifier: string, dialect: SqlDialect): string {
  const bare =
    completeIdentifierPattern.test(identifier) &&
    !RESERVED_WORDS[dialect].has(identifier.toLowerCase()) &&
    !(dialect === "postgres" && /[A-Z]/.test(identifier));
  return bare ? identifier : forceQuoteIdentifier(identifier);
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

type LexicalState = "code" | "string" | "comment" | "quoted-identifier";

/** End of the quoted span opening at `start`, and whether it was closed. A
 *  doubled quote character is the escape for one, in a string literal and in
 *  a quoted identifier alike. */
function quotedSpanEnd(
  sql: string,
  start: number,
): { end: number; closed: boolean } {
  const quote = sql[start];
  let i = start + 1;
  while (i < sql.length) {
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) {
        i += 2;
        continue;
      }
      return { end: i + 1, closed: true };
    }
    i += 1;
  }
  return { end: sql.length, closed: false };
}

// `$$` or `$tag$`, the opening (and closing) delimiter of a dollar-quoted
// string. `$1` is a parameter and does not match: a tag cannot start with a
// digit.
const dollarQuoteTagPattern = /\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/y;

/** What the text at `pos` is part of. Completions are for code: inside a
 *  string literal or a comment the reader is writing prose, and a popup
 *  offering `users` after `'us` gets accepted by the next Enter. A
 *  double-quoted span is an identifier, not a string, so it is reported
 *  separately and still completes.
 *
 *  Scans from the top of the document because a string or a block comment
 *  can open on any earlier line. */
function lexicalStateAt(
  sql: string,
  pos: number,
  dialect: SqlDialect,
): LexicalState {
  let i = 0;
  while (i < pos) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "-" && next === "-") {
      const newline = sql.indexOf("\n", i + 2);
      const end = newline === -1 ? sql.length : newline;
      // The end of the line still belongs to the comment being typed.
      if (pos >= i + 2 && pos <= end) return "comment";
      i = end;
      continue;
    }
    if (ch === "/" && next === "*") {
      const close = sql.indexOf("*/", i + 2);
      const end = close === -1 ? sql.length : close + 2;
      if (pos >= i + 2 && (close === -1 || pos < end)) return "comment";
      i = end;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const { end, closed } = quotedSpanEnd(sql, i);
      // Straight after the closing quote is code again; anywhere before it,
      // or anywhere at all in a span that never closes, is inside.
      if (!closed || pos < end) {
        return ch === "'" ? "string" : "quoted-identifier";
      }
      i = end;
      continue;
    }
    // Dollar quoting is Postgres syntax that DuckDB also reads. SQLite has
    // none: `$name` there is a bind parameter.
    if (
      ch === "$" &&
      dialect !== "sqlite" &&
      !/[A-Za-z0-9_$]/.test(sql[i - 1] ?? "")
    ) {
      dollarQuoteTagPattern.lastIndex = i;
      const tag = dollarQuoteTagPattern.exec(sql)?.[0];
      if (tag) {
        const close = sql.indexOf(tag, i + tag.length);
        const end = close === -1 ? sql.length : close + tag.length;
        if (pos >= i + tag.length && (close === -1 || pos < end)) {
          return "string";
        }
        i = end;
        continue;
      }
    }
    i += 1;
  }
  return "code";
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

/** Keywords for a FROM/JOIN slot that has no table reference in it yet:
 *  straight after the keyword, after a comma in the FROM list, or inside
 *  the paren that opens one. Null anywhere else.
 *
 *  Nothing that follows a table (AS, JOIN, WHERE, ANTI, ASOF, ...) can start
 *  one, and offered directly under the table names they read as if they
 *  could. What can start a reference is short: a table, LATERAL where the
 *  dialect has it, a row-returning function, or a parenthesised subquery. */
function emptyTableSlotContext(
  tokens: string[],
  lastToken: string | undefined,
  dialect: SqlDialect,
): KeywordContext | null {
  const opensReference = (token: string | undefined) =>
    token === "FROM" || token === "JOIN" || token === ",";
  if (opensReference(lastToken)) {
    // A comma inside a paren separates arguments (`FROM range(1, |`), not
    // table references.
    const clauseIndex = Math.max(
      tokens.lastIndexOf("FROM"),
      tokens.lastIndexOf("JOIN"),
    );
    let depth = 0;
    for (const token of tokens.slice(clauseIndex + 1)) {
      if (token === "(") depth += 1;
      else if (token === ")") depth -= 1;
    }
    if (lastToken === "," && depth > 0) return null;
    // `DELETE FROM |` names one plain table.
    if (lastToken === "FROM" && tokens.at(-2) === "DELETE") {
      return { primary: [], restrict: true };
    }
    return {
      primary: [],
      secondary: dialect === "sqlite" ? [] : ["LATERAL"],
      restrict: true,
      functions: TABLE_FUNCTIONS[dialect],
    };
  }
  // `FROM (|`: a derived table. A paren after anything else is a function's
  // argument list or a join condition and keeps its usual keywords.
  if (
    lastToken === "(" &&
    (opensReference(tokens.at(-2)) || tokens.at(-2) === "LATERAL")
  ) {
    return { primary: ["SELECT"], secondary: ["WITH", "VALUES"], restrict: true };
  }
  return null;
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
      const tableSlot = emptyTableSlotContext(tokens, lastToken, dialect);
      if (tableSlot) return tableSlot;
      return {
        primary: ["AS"],
        secondary: ["JOIN", "WHERE", ...dialectJoinExtras],
      };
    }
    case "JOIN": {
      const tableSlot = emptyTableSlotContext(tokens, lastToken, dialect);
      if (tableSlot) return tableSlot;
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
    }
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

  // `expr::|`, a cast: the only thing that fits is a type name.
  if (dialect !== "sqlite" && /::\s*[A-Za-z_][A-Za-z0-9_$]*$|::\s*$/.test(statement)) {
    return {
      mode: "column-def",
      columnDefSlot: "type",
      from: word?.from ?? context.pos,
      keywordContext: { primary: [], restrict: true },
    };
  }

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
  /** Offset of the reference in the scanned text. */
  at: number;
}

/** Ordered table references in the statement (FROM/JOIN/UPDATE/INTO/
 *  ALTER-TABLE targets plus comma-separated FROM lists), with aliases and
 *  optional schema qualifiers stripped. */
function extractTableRefList(
  sql: string,
  dialect: SqlDialect,
): TableReference[] {
  const refs: TableReference[] = [];
  const masked = maskCommentsAndStrings(sql);
  const push = (
    tableToken: string,
    aliasToken: string | undefined,
    via: TableReference["via"],
    at: number,
  ) => {
    const table = normalizeIdentifier(tableToken, dialect);
    if (!table) return;
    const alias = normalizeIdentifier(aliasToken, dialect);
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
  return refs.sort((a, b) => a.at - b.at);
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

function parseColumnList(
  list: string | undefined,
  dialect: SqlDialect,
): string[] {
  if (!list) return [];
  return list
    .split(",")
    .map((part) => normalizeIdentifier(part.trim(), dialect))
    .filter((name) => name.length > 0);
}

interface CteDefinition {
  entity: SqlCompletionEntity;
  /** Offset of the paren that opens the CTE's body. */
  bodyOpen: number;
  /** `WITH x(a, b) AS …` named its columns itself. */
  explicitColumns: boolean;
}

function extractCtes(masked: string, dialect: SqlDialect): CteDefinition[] {
  const seen = new Set<string>();
  const result: CteDefinition[] = [];

  const addCte = (match: RegExpExecArray) => {
    const name = normalizeIdentifier(match[1], dialect);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const columns = parseColumnList(match[2], dialect);
    result.push({
      entity: { name, kind: "cte", columns },
      // Both patterns end on the body's opening paren.
      bodyOpen: match.index + match[0].length - 1,
      explicitColumns: columns.length > 0,
    });
  };

  let match: RegExpExecArray | null;
  cteHeadPattern.lastIndex = 0;
  while ((match = cteHeadPattern.exec(masked))) {
    addCte(match);
  }

  // Continuation `, name AS (...)`, only honor those that fall outside any
  // open CTE body, otherwise we'd pick up commas from inside subqueries.
  cteContinuationPattern.lastIndex = 0;
  while ((match = cteContinuationPattern.exec(masked))) {
    const upTo = masked.slice(0, match.index);
    if (parenDepth(upTo) === 0) {
      addCte(match);
    }
  }

  // Definition order, so a CTE that selects from an earlier one finds that
  // one's columns already worked out.
  return result.sort((a, b) => a.bodyOpen - b.bodyOpen);
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

/** One SELECT's worth of scope: the statement itself, or a parenthesised
 *  subquery inside it. */
interface QueryBlock {
  /** Offset of the opening paren, -1 for the statement itself. */
  open: number;
  /** Offset of the closing paren, or the statement length when unclosed. */
  close: number;
  parent: QueryBlock | null;
  children: QueryBlock[];
}

const subqueryOpenPattern = /\(\s*(?:SELECT|WITH)\b/iy;

/** The statement's subqueries as a tree. Only a paren that opens with SELECT
 *  or WITH starts a block; a function call or an IN list belongs to the
 *  block around it. */
function parseQueryBlocks(masked: string): QueryBlock {
  const root: QueryBlock = {
    open: -1,
    close: masked.length,
    parent: null,
    children: [],
  };
  // One entry per open paren, null for a paren that is not a subquery.
  const stack: Array<QueryBlock | null> = [];
  let current = root;
  for (let i = 0; i < masked.length; i += 1) {
    const ch = masked[i];
    if (ch === "(") {
      subqueryOpenPattern.lastIndex = i;
      if (subqueryOpenPattern.test(masked)) {
        const block: QueryBlock = {
          open: i,
          close: masked.length,
          parent: current,
          children: [],
        };
        current.children.push(block);
        stack.push(block);
        current = block;
      } else {
        stack.push(null);
      }
    } else if (ch === ")") {
      const closed = stack.pop();
      if (closed) {
        closed.close = i;
        current = closed.parent ?? root;
      }
    }
  }
  return root;
}

/** The block's text at statement offsets, with everything before it and the
 *  inside of each nested subquery blanked, so a scan of it sees only what
 *  this SELECT itself wrote. */
function blockOwnText(masked: string, block: QueryBlock): string {
  let text = " ".repeat(block.open + 1);
  let at = block.open + 1;
  for (const child of block.children) {
    text +=
      masked.slice(at, child.open + 1) +
      " ".repeat(child.close - child.open - 1);
    at = child.close;
  }
  return text + masked.slice(at, block.close);
}

/** The innermost block containing `offset`. */
function blockAt(root: QueryBlock, offset: number): QueryBlock {
  let block = root;
  for (;;) {
    const inner = block.children.find(
      (child) => offset > child.open && offset <= child.close,
    );
    if (!inner) return block;
    block = inner;
  }
}

// Keywords that end a SELECT list when they appear outside any paren.
const selectListEndPattern =
  /(?:FROM|WHERE|GROUP|HAVING|WINDOW|QUALIFY|ORDER|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT)\b/iy;

/** The items of the first SELECT list in `text`, split at its top-level
 *  commas. Null when there is no SELECT to read. */
function firstSelectListItems(text: string): string[] | null {
  const select = /\bSELECT\b/i.exec(text);
  if (!select) return null;
  const items: string[] = [];
  let itemStart = select.index + select[0].length;
  let depth = 0;
  let i = itemStart;
  for (; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      if (depth === 0) break;
      depth -= 1;
    } else if (depth > 0) {
      continue;
    } else if (ch === ",") {
      items.push(text.slice(itemStart, i));
      itemStart = i + 1;
    } else if (
      /[A-Za-z]/.test(ch) &&
      !/[A-Za-z0-9_$."]/.test(text[i - 1] ?? " ")
    ) {
      selectListEndPattern.lastIndex = i;
      if (selectListEndPattern.test(text)) break;
    }
  }
  items.push(text.slice(itemStart, i));
  return items
    .map((item, index) =>
      index === 0
        ? item.replace(/^\s*(?:DISTINCT(?:\s+ON\s*\([^)]*\))?|ALL)\b/i, "")
        : item,
    )
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** `*` or `alias.*`. Group 1 is the qualifier. */
const starItemPattern = new RegExp(
  String.raw`^(?:(${sqlIdentifierPattern})\s*\.\s*)?\*$`,
);
/** `col`, `t.col` or `schema.t.col`. Group 1 is the nearest qualifier,
 *  group 2 the column. */
const plainColumnItemPattern = new RegExp(
  String.raw`^(?:${sqlIdentifierPattern}\s*\.\s*)*?(?:(${sqlIdentifierPattern})\s*\.\s*)?(${sqlIdentifierPattern})$`,
);
/** `expr label`: a trailing identifier after whitespace. */
const implicitAliasItemPattern = new RegExp(
  String.raw`^([\s\S]*\S)\s+(${sqlIdentifierPattern})$`,
);
// Words that leave an expression waiting for its next operand. An identifier
// after one of these is that operand (`x AND y`, `x COLLATE nocase`), not a
// label for the column.
const OPERAND_EXPECTING_WORDS = new Set([
  "AND", "OR", "NOT", "IS", "IN", "LIKE", "ILIKE", "BETWEEN", "SIMILAR",
  "GLOB", "REGEXP", "MATCH", "ESCAPE", "COLLATE", "ZONE", "DISTINCT", "ALL",
  "CASE", "WHEN", "THEN", "ELSE", "BY", "AS", "FROM", "FOR", "INTERVAL",
  "EXCLUDE", "REPLACE",
]);

/** The name a SELECT-list item gives its output column, when the text says
 *  so: an `AS label`, a trailing label, or a plain column reference. Null
 *  for a bare expression, whose name each engine invents differently
 *  (`count`, `count_star()`, `COUNT(*)`). */
function selectItemName(item: string, dialect: SqlDialect): string | null {
  const explicit = selectAliasPattern.exec(item);
  if (explicit) return normalizeIdentifier(explicit[1], dialect);
  const plain = plainColumnItemPattern.exec(item);
  if (plain) {
    return SELECT_LIST_KEYWORDS.has(plain[2].toUpperCase())
      ? null
      : normalizeIdentifier(plain[2], dialect);
  }
  const implicit = implicitAliasItemPattern.exec(item);
  if (!implicit) return null;
  const [, expr, label] = implicit;
  if (SELECT_LIST_KEYWORDS.has(label.toUpperCase())) return null;
  if (/[.+\-*/%<>=|!,(:]$/.test(expr)) return null;
  const lastWord = /([A-Za-z_]+)$/.exec(expr)?.[1].toUpperCase();
  if (lastWord && OPERAND_EXPECTING_WORDS.has(lastWord)) return null;
  return normalizeIdentifier(label, dialect);
}

/** A table reference paired with what it names. */
interface ResolvedRef {
  ref: TableReference;
  /** The catalog table, CTE or derived table behind the reference, when it
   *  is one completion knows. */
  entity?: SqlCompletionEntity;
}

interface StatementScope {
  /** The host's schema plus the statement's CTEs: what a table slot lists. */
  schema: SqlCompletionSchema;
  /** References made by the SELECT the cursor is in, in statement order. */
  own: ResolvedRef[];
  /** `own`, followed by those of each enclosing SELECT that can see out. */
  visible: ResolvedRef[];
}

function refMatchesQualifier(ref: TableReference, qualifier: string): boolean {
  return (
    ref.alias?.toLowerCase() === qualifier ||
    ref.table.toLowerCase() === qualifier
  );
}

// What follows a derived table's closing paren: its alias, and optionally
// the column names it gives the subquery's output.
const derivedAliasPattern = new RegExp(
  String.raw`^\)\s*(?:AS\s+)?(?!${aliasBlockListSource}\b)(${sqlIdentifierPattern})\s*(?:\(([^()]*)\))?`,
  "i",
);

/** Works out which tables the cursor can see, and what columns the
 *  statement's CTEs and derived tables produce.
 *
 *  Scope follows the SELECT the cursor is in. A table named inside a
 *  subquery is not visible to the query around it, and the other way round
 *  only a correlated subquery (one in an expression, or after LATERAL) sees
 *  out; a CTE body and a plain derived table do not. Treating the whole
 *  statement as one flat scope is what made `WITH r AS (SELECT * FROM users)
 *  SELECT | FROM r` offer every column twice, as `users.id` and `r.id`.
 *
 *  A CTE or a derived table gets its columns from its own SELECT list: `*`
 *  expands to the tables in that SELECT's FROM, and `col`, `t.col` and
 *  `expr AS label` contribute their names. This is not a SQL parser. An item
 *  it cannot name is skipped, and a list it cannot read at all leaves the
 *  inner tables showing through, which is what completion did before. */
function resolveStatementScope(
  base: SqlCompletionSchema,
  statement: string,
  cursor: number,
  dialect: SqlDialect,
): StatementScope {
  const masked = maskCommentsAndStrings(statement);
  const root = parseQueryBlocks(masked);
  const ctes = extractCtes(masked, dialect);
  const knownNames = new Set(
    base.entities.map((entity) => entity.name.toLowerCase()),
  );
  const schema: SqlCompletionSchema =
    ctes.length === 0
      ? base
      : {
          ...base,
          entities: [
            ...base.entities,
            ...ctes
              .map((cte) => cte.entity)
              .filter((entity) => !knownNames.has(entity.name.toLowerCase())),
          ],
        };

  const blockByOpen = new Map<number, QueryBlock>();
  const indexBlocks = (block: QueryBlock) => {
    blockByOpen.set(block.open, block);
    block.children.forEach(indexBlocks);
  };
  indexBlocks(root);
  const cteBodyOpens = new Set(ctes.map((cte) => cte.bodyOpen));
  // CTEs whose SELECT list could not be read, with the body to fall back on.
  const unreadBodies = new Map<SqlCompletionEntity, QueryBlock>();

  const ownTexts = new Map<QueryBlock, string>();
  const ownText = (block: QueryBlock): string => {
    let text = ownTexts.get(block);
    if (text === undefined) {
      text = blockOwnText(masked, block);
      ownTexts.set(block, text);
    }
    return text;
  };

  interface BlockRole {
    kind: "cte" | "derived" | "expression";
    /** Whether the block can refer to the tables of the query around it. */
    seesOut: boolean;
    alias?: string;
    columnList?: string;
  }
  const roles = new Map<QueryBlock, BlockRole>();
  const roleOf = (block: QueryBlock): BlockRole => {
    const known = roles.get(block);
    if (known) return known;
    let role: BlockRole = { kind: "expression", seesOut: true };
    if (cteBodyOpens.has(block.open)) {
      role = { kind: "cte", seesOut: false };
    } else if (block.parent) {
      const parentText = ownText(block.parent);
      // Trimmed first: a blanked sibling subquery leaves a long run of
      // spaces, and `\s*$` would rescan it from every position.
      const head = parentText.slice(0, block.open).trimEnd();
      const opener = /(?:\b(FROM|JOIN|LATERAL)|(,))$/i.exec(head);
      // A comma opens a table reference only in a FROM list; in a SELECT
      // list the same shape is a scalar subquery.
      const inFromList = () => {
        const clause = tokenize(head)
          .reverse()
          .find((token) => isClauseBoundaryKeyword(token));
        return /^(?:FROM|JOIN)$/i.test(clause ?? "");
      };
      if (opener && (opener[2] === undefined || inFromList())) {
        const tail = derivedAliasPattern.exec(parentText.slice(block.close));
        role = {
          kind: "derived",
          seesOut: opener[1]?.toUpperCase() === "LATERAL",
          alias: tail ? normalizeIdentifier(tail[1], dialect) : "",
          columnList: tail?.[2],
        };
      }
    }
    roles.set(block, role);
    return role;
  };

  const refCache = new Map<QueryBlock, ResolvedRef[]>();
  const resolving = new Set<QueryBlock>();
  const ownRefs = (block: QueryBlock): ResolvedRef[] => {
    const cached = refCache.get(block);
    if (cached) return cached;
    // A recursive CTE selects from itself; the second visit adds nothing.
    if (resolving.has(block)) return [];
    resolving.add(block);
    const refs: ResolvedRef[] = [];
    for (const ref of extractTableRefList(ownText(block), dialect)) {
      const entity = findEntity(schema, ref.table);
      refs.push({ ref, entity });
      const unread = entity ? unreadBodies.get(entity) : undefined;
      if (unread) refs.push(...ownRefs(unread));
    }
    for (const child of block.children) {
      const role = roleOf(child);
      if (role.kind !== "derived") continue;
      const columns = role.columnList
        ? parseColumnList(role.columnList, dialect)
        : selectColumns(child);
      // An unaliased derived table (SQLite and DuckDB allow one) keeps an
      // empty name: its columns are in scope but cannot be qualified.
      const name = role.alias ?? "";
      refs.push({
        ref: { table: name, via: "from", at: child.open },
        entity: { name: name || "subquery", kind: "cte", columns: columns ?? [] },
      });
      if (!columns) refs.push(...ownRefs(child));
    }
    refs.sort((a, b) => a.ref.at - b.ref.at);
    resolving.delete(block);
    refCache.set(block, refs);
    return refs;
  };

  const selectColumns = (block: QueryBlock): SqlCompletionColumn[] | null => {
    const items = firstSelectListItems(ownText(block));
    if (!items) return null;
    const refs = ownRefs(block);
    const columns: SqlCompletionColumn[] = [];
    const seen = new Set<string>();
    const add = (column: SqlCompletionColumn) => {
      const key = columnName(column).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      columns.push(column);
    };
    for (const item of items) {
      const star = starItemPattern.exec(item);
      if (star) {
        const qualifier = normalizeIdentifier(star[1]).toLowerCase();
        const sources = refs.filter(
          ({ ref, entity }) =>
            entity !== undefined &&
            entity.columns.length > 0 &&
            (!qualifier || refMatchesQualifier(ref, qualifier)),
        );
        // `*` over tables completion has never heard of (a table function,
        // a file) could be anything.
        if (sources.length === 0) return null;
        for (const source of sources) source.entity?.columns.forEach(add);
        continue;
      }
      const name = selectItemName(item, dialect);
      if (!name) continue;
      // A plain column reference carries its declared type along.
      const plain = plainColumnItemPattern.exec(item);
      const qualifier = normalizeIdentifier(plain?.[1]).toLowerCase();
      const source = plain
        ? refs
            .filter(({ ref }) => !qualifier || refMatchesQualifier(ref, qualifier))
            .flatMap(({ entity }) => entity?.columns ?? [])
            .find((column) => columnName(column).toLowerCase() === name.toLowerCase())
        : undefined;
      add(source ?? name);
    }
    return columns;
  };

  for (const cte of ctes) {
    // `WITH x(a, b) AS (…)` named its columns; nothing to work out.
    if (cte.explicitColumns) continue;
    const body = blockByOpen.get(cte.bodyOpen);
    if (!body) continue;
    const columns = selectColumns(body);
    if (columns) cte.entity.columns = columns;
    else unreadBodies.set(cte.entity, body);
  }

  const cursorBlock = blockAt(root, cursor);
  const visible: ResolvedRef[] = [];
  for (
    let block: QueryBlock | null = cursorBlock;
    block;
    block = block.parent
  ) {
    visible.push(...ownRefs(block));
    if (!roleOf(block).seesOut) break;
  }
  return { schema, own: ownRefs(cursorBlock), visible };
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
  dialect: SqlDialect,
  related?: Set<string>,
): Completion[] {
  return schema.entities.map((entity) => {
    const base =
      entity.kind === "cte" ? BOOST.cteInTableContext : defaultBoost;
    const isRelated = related?.has(entity.name.toLowerCase()) ?? false;
    return {
      label: entity.name,
      apply: quoteIdentifier(entity.name, dialect),
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
  // A restricted slot drops the catalog but may still name a few functions
  // of its own (the row-returning ones, in a FROM slot).
  const functions = emitFunctions
    ? profile.functions
    : includeFunctions
      ? (keywordContext?.functions ?? [])
      : [];

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
  for (const fn of functions) {
    const insert = casing === "lower" ? fn.toLowerCase() : fn;
    const meta = functionMeta(fn, dialect);
    const base: Completion = {
      label: fn,
      detail: meta?.sig || "function",
      info: meta?.doc,
      type: "function",
      section: keywordSection,
      boost: boost - BOOST.functionPenalty,
    };
    out.push(
      NO_PAREN_FUNCTIONS.has(fn)
        ? { ...base, apply: insert }
        : snippetCompletion(`${insert}(#{})`, base),
    );
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

/** Display name for a table reference: the alias when one was declared,
 *  the table name otherwise. Once a table is aliased the alias is the only
 *  name every engine accepts for it. */
function refDisplay(ref: TableReference): string {
  return ref.alias ?? ref.table;
}

/** The distinct entities behind a list of references, in reference order. */
function entitiesOf(refs: ResolvedRef[]): SqlCompletionEntity[] {
  const entities = new Set<SqlCompletionEntity>();
  for (const { entity } of refs) {
    if (entity) entities.add(entity);
  }
  return [...entities];
}

function columnOptions(
  refs: ResolvedRef[],
  boost: number,
  dialect: SqlDialect,
): Completion[] {
  // One source per name a column can be reached through. The two sides of a
  // self-join are two sources (`e.id`, `m.id`); the same table written the
  // same way twice, in a query and its correlated subquery, is one.
  const sources: Array<{ display: string; entity: SqlCompletionEntity }> = [];
  const seenSources = new Set<string>();
  for (const { ref, entity } of refs) {
    if (!entity) continue;
    const display = refDisplay(ref);
    const key = display ? display.toLowerCase() : `#${sources.length}`;
    if (seenSources.has(key)) continue;
    seenSources.add(key);
    sources.push({ display, entity });
  }
  if (sources.length === 0) return [];

  const ownerCount = new Map<string, number>();
  for (const { entity } of sources) {
    for (const column of entity.columns) {
      const key = columnName(column).toLowerCase();
      ownerCount.set(key, (ownerCount.get(key) ?? 0) + 1);
    }
  }

  const multipleSources = sources.length > 1;
  const options: Completion[] = [];
  const seen = new Set<string>();
  for (const { display, entity } of sources) {
    for (const column of entity.columns) {
      const name = columnName(column);
      // A column two sources share has to say which one it means. The
      // qualifier is the reference's alias when it has one: `users.user_id`
      // is an error on every engine once the query says `FROM users u`. An
      // unaliased derived table has no name to qualify with.
      const qualified =
        (ownerCount.get(name.toLowerCase()) ?? 0) > 1 && display !== "";
      const label = qualified ? `${display}.${name}` : name;
      if (seen.has(label)) continue;
      seen.add(label);
      options.push({
        label,
        apply: qualified
          ? `${quoteIdentifier(display, dialect)}.${quoteIdentifier(name, dialect)}`
          : quoteIdentifier(name, dialect),
        detail: formatColumnDetail(entity, column, multipleSources),
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
  refs: ResolvedRef[],
  dialect: SqlDialect,
): Completion[] {
  const entities = entitiesOf(refs);
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
    apply: quoteIdentifier(display, dialect),
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
  scope: StatementScope,
  statement: string,
  qualifier: string | undefined,
  boost: number,
  includeStar: boolean,
  dialect: SqlDialect,
): Completion[] {
  if (!qualifier) return [];
  const lower = qualifier.toLowerCase();
  // Nearest scope first, an alias before a table of the same name. The
  // statement-wide lookup after it keeps a qualifier resolving when the
  // block structure could not be read (unbalanced parens mid-edit).
  const inScope =
    scope.visible.find(({ ref }) => ref.alias?.toLowerCase() === lower) ??
    scope.visible.find(({ ref }) => ref.table.toLowerCase() === lower);
  const entity =
    inScope?.entity ??
    findEntity(
      scope.schema,
      referenceMap(extractTableRefList(statement, dialect)).get(lower) ??
        qualifier,
    );
  if (!entity) return [];
  const options: Completion[] = entity.columns.map((column) => ({
    label: columnName(column),
    apply: quoteIdentifier(columnName(column), dialect),
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

function joinConditionCompletion(
  left: TableReference,
  leftColumn: string,
  right: TableReference,
  rightColumn: string,
  dialect: SqlDialect,
): Completion {
  const quote = (name: string) => quoteIdentifier(name, dialect);
  const label = `${refDisplay(left)}.${leftColumn} = ${refDisplay(right)}.${rightColumn}`;
  const apply = `${quote(refDisplay(left))}.${quote(leftColumn)} = ${quote(refDisplay(right))}.${quote(rightColumn)}`;
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
  refsBeforeCursor: ResolvedRef[],
  dialect: SqlDialect,
): Completion[] {
  if (refsBeforeCursor.length < 2) return [];
  const entityOf = new Map(
    refsBeforeCursor.map(({ ref, entity }) => [ref, entity] as const),
  );
  const refs = refsBeforeCursor.map(({ ref }) => ref);
  const target = refs[refs.length - 1];
  if (target.via !== "join") return [];
  const others = refs.slice(0, -1);
  const targetEntity = entityOf.get(target);
  const condition = (
    left: TableReference,
    leftColumn: string,
    right: TableReference,
    rightColumn: string,
  ) => joinConditionCompletion(left, leftColumn, right, rightColumn, dialect);

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
      add(condition(target, fk.column, other, fk.refColumn));
    }
  }
  // 2. …and foreign keys on already-referenced tables pointing at it.
  for (const other of others) {
    const otherEntity = entityOf.get(other);
    for (const fk of otherEntity?.foreignKeys ?? []) {
      if (fk.refEntity.toLowerCase() === target.table.toLowerCase()) {
        add(condition(target, fk.refColumn, other, fk.column));
      }
    }
  }

  // 3. Heuristics when no FK metadata produced anything (e.g. imported
  //    CSVs): shared column names, and `<entity>_id` ↔ `id` pairs.
  if (out.length === 0 && targetEntity) {
    const targetColumns = targetEntity.columns.map(columnName);
    for (const other of others) {
      const otherEntity = entityOf.get(other);
      if (!otherEntity) continue;
      const otherColumns = new Set(
        otherEntity.columns.map((column) => columnName(column).toLowerCase()),
      );
      for (const column of targetColumns) {
        const lower = column.toLowerCase();
        // A column named exactly the same on both sides is the classic
        // join key, except bare `id`, which is both tables' own pk.
        if (lower !== "id" && otherColumns.has(lower)) {
          add(condition(target, column, other, column));
        }
        // orders.customer_id ↔ customers.id
        if (lower.endsWith("_id") && otherColumns.has("id")) {
          const base = lower.slice(0, -3);
          if (base && other.table.toLowerCase().startsWith(base)) {
            add(condition(target, column, other, "id"));
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
            add(condition(target, "id", other, column));
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

/** The entities a `<schemaName>.|` qualifier may list. An entity that does
 *  not say which schema it is in belongs to the default one, so `public.|`
 *  lists the reader's tables and `pg_catalog.|` or `information_schema.|`
 *  no longer do: completing `pg_catalog.users` is a relation that does not
 *  exist. Statement-local CTEs are never schema-qualified, which is why this
 *  reads the host's schema rather than the statement's. */
function entitiesInSchema(
  schema: SqlCompletionSchema,
  schemaName: string,
  dialect: SqlDialect,
): SqlCompletionEntity[] {
  const lower = schemaName.toLowerCase();
  const isDefault = DEFAULT_SCHEMA[dialect].includes(lower);
  return schema.entities.filter((entity) =>
    entity.schema ? entity.schema.toLowerCase() === lower : isDefault,
  );
}

const lowercaseIdentifierCache = new WeakMap<Text, Set<string>>();

/** Identifiers in the document, lowercased (SQL names are case-insensitive
 *  unless quoted), cached per document version. */
function lowercaseIdentifiers(doc: Text): Set<string> {
  const cached = lowercaseIdentifierCache.get(doc);
  if (cached) return cached;
  const lower = new Set<string>();
  for (const id of documentIdentifiers(doc)) lower.add(id.toLowerCase());
  lowercaseIdentifierCache.set(doc, lower);
  return lower;
}

type OrderingClause = "order" | "group" | "having" | "qualify";

/** Which of the SELECT-list-aware clauses the cursor sits in, if any:
 *  scanning back from the cursor, the first clause keyword decides. */
function orderingClauseOf(statementBefore: string): OrderingClause | null {
  const tokens = tokenize(statementBefore).map((token) => token.toUpperCase());
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    if (token === "ORDER" || token === "GROUP") {
      return tokens[i + 1] === "BY" ? (token.toLowerCase() as OrderingClause) : null;
    }
    if (token === "HAVING") return "having";
    if (token === "QUALIFY") return "qualify";
    if (
      token === "SELECT" ||
      token === "FROM" ||
      token === "WHERE" ||
      token === "JOIN" ||
      token === "ON" ||
      token === "LIMIT" ||
      token === "UNION" ||
      token === "SET" ||
      token === "VALUES"
    ) {
      return null;
    }
  }
  return null;
}

interface SelectListInfo {
  /** Bare identifiers the SELECT list references, lowercased. */
  columns: Set<string>;
  /** Output aliases (`expr AS alias`, `expr alias`) in list order. */
  aliases: string[];
}

const SELECT_LIST_KEYWORDS = new Set([
  "AS", "DISTINCT", "ALL", "CASE", "WHEN", "THEN", "ELSE", "END", "AND",
  "OR", "NOT", "IS", "NULL", "IN", "LIKE", "ILIKE", "BETWEEN", "OVER",
  "PARTITION", "BY", "ORDER", "ASC", "DESC", "TRUE", "FALSE", "FROM",
  "FOR", "FILTER", "WHERE", "EXCLUDE", "REPLACE", "INTERVAL", "CAST",
]);

/** The outermost SELECT list of the statement: which columns it uses and
 *  which aliases it defines. Null for `SELECT *` or no SELECT. */
function parseSelectList(
  statement: string,
  dialect: SqlDialect,
): SelectListInfo | null {
  const masked = maskCommentsAndStrings(statement);
  const start = masked.search(/\bSELECT\b/i);
  if (start < 0) return null;
  let depth = 0;
  let end = masked.length;
  for (let i = start + 6; i < masked.length; i += 1) {
    const ch = masked[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (
      depth === 0 &&
      /^FROM$/i.test(masked.slice(i, i + 4)) &&
      /\s/.test(masked[i - 1] ?? " ") &&
      !/[A-Za-z0-9_$]/.test(masked[i + 4] ?? " ")
    ) {
      end = i;
      break;
    }
  }
  const list = statement.slice(start + 6, end).replace(/^\s*(DISTINCT|ALL)\b/i, "");
  if (!list.trim() || list.trim() === "*") return null;

  const items: string[] = [];
  let current = "";
  depth = 0;
  for (const ch of list) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      items.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  items.push(current);

  const columns = new Set<string>();
  const aliases: string[] = [];
  for (const rawItem of items) {
    const item = rawItem.trim();
    if (!item) continue;
    let expr = item;
    const asMatch = selectAliasPattern.exec(item);
    if (asMatch) {
      aliases.push(normalizeIdentifier(asMatch[1], dialect));
      expr = item.slice(0, asMatch.index);
    } else {
      // `SUM(total) total_sum`, a trailing bare identifier after an
      // expression (not after a `.`, not a keyword) is an implicit alias.
      const implicit = /^(.*?\S)\s+([A-Za-z_][A-Za-z0-9_$]*)\s*$/.exec(item);
      if (
        implicit &&
        !/[.\s]$/.test(implicit[1]) &&
        !SELECT_LIST_KEYWORDS.has(implicit[2].toUpperCase()) &&
        !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(implicit[1].trim())
      ) {
        aliases.push(normalizeIdentifier(implicit[2], dialect));
        expr = implicit[1];
      }
    }
    const exprMasked = maskCommentsAndStrings(expr);
    const wordPattern = /[A-Za-z_][A-Za-z0-9_$]*/g;
    let m: RegExpExecArray | null;
    while ((m = wordPattern.exec(exprMasked))) {
      const after = exprMasked.slice(m.index + m[0].length).trimStart();
      if (after.startsWith("(")) continue; // a function name
      const upper = m[0].toUpperCase();
      if (SELECT_LIST_KEYWORDS.has(upper)) continue;
      columns.add(m[0].toLowerCase());
    }
  }
  return { columns, aliases };
}

/** Whether an alias may be referenced in this clause for the dialect:
 *  ORDER BY everywhere; GROUP BY and HAVING in SQLite and DuckDB (Postgres
 *  rejects aliases there); QUALIFY (DuckDB) too. */
function aliasesAllowedIn(clause: OrderingClause, dialect: SqlDialect): boolean {
  if (clause === "order") return true;
  if (clause === "group") return dialect !== "postgres";
  if (clause === "having") return dialect !== "postgres";
  return dialect === "duckdb";
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
    // Nothing completes inside a string literal or a comment, and that holds
    // for an explicit Ctrl+Space too: there is no code there to complete.
    const lexical = lexicalStateAt(doc, context.pos, dialect);
    if (lexical === "string" || lexical === "comment") return null;

    const { before, full } = statementAround(doc, context.pos);
    const info = inferCompletionContext(context, before, dialect);
    if (!info) return null;

    const typed = doc.slice(info.from, context.pos);
    const casing = casingOf(typed);
    // `full` starts where `before` does, so the cursor's offset in it is
    // the length of `before`.
    const scope = resolveStatementScope(schema, full, before.length, dialect);
    const localSchema = scope.schema;

    const kw = info.keywordContext;
    const completions = (() => {
      switch (info.mode) {
        case "tables": {
          const related = info.joinTableSlot
            ? fkRelatedTables(
                localSchema,
                extractTableRefList(before, dialect),
              )
            : undefined;
          return [
            ...tableOptions(
              localSchema,
              BOOST.tableInTableContext,
              dialect,
              related,
            ),
            ...keywordOptions(dialect, BOOST.keywordInTableContext, kw, {
              casing,
            }),
          ];
        }
        case "columns": {
          const cols = info.usingSlot
            ? usingColumnOptions(scope.own, dialect)
            : columnOptions(
                scope.visible,
                BOOST.columnInColumnContext,
                dialect,
              );
          const joins = info.joinConditionSlot
            ? joinConditionOptions(
                scope.own.filter(({ ref }) => ref.at < before.length),
                dialect,
              )
            : [];
          if (cols.length === 0 && joins.length === 0) {
            // No FROM/JOIN/UPDATE/INTO target in scope yet, column suggestions
            // would be misleading, so offer keywords + tables instead.
            return [
              ...keywordOptions(dialect, BOOST.keywordInColumnContext, kw, {
                casing,
              }),
              ...tableOptions(localSchema, BOOST.tableInColumnContext, dialect),
            ];
          }
          return [
            ...joins,
            ...cols,
            ...keywordOptions(dialect, BOOST.keywordInColumnContext, kw, {
              casing,
            }),
            ...tableOptions(localSchema, BOOST.tableInColumnContext, dialect),
          ];
        }
        case "qualified-columns": {
          const qualified = qualifiedColumnOptions(
            scope,
            full,
            info.qualifier,
            BOOST.qualifiedColumn,
            info.viaDot ?? false,
            dialect,
          );
          if (qualified.length > 0) return qualified;
          // `public.|` / `main.|`, a schema qualifier completes to the
          // tables in that schema rather than columns.
          if (
            info.qualifier &&
            schemaNamesFor(schema, dialect).has(info.qualifier.toLowerCase())
          ) {
            return tableOptions(
              {
                ...schema,
                entities: entitiesInSchema(schema, info.qualifier, dialect),
              },
              BOOST.qualifiedColumn,
              dialect,
            );
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
            ...tableOptions(localSchema, BOOST.tableInKeywordContext, dialect),
          ];
      }
    })();

    let uniqueOptions = dedupeOptions(completions);

    // ORDER BY / GROUP BY / HAVING: what the SELECT list already names is
    // the likeliest pick, and its aliases are legal here too.
    const clause = info.mode === "columns" ? orderingClauseOf(before) : null;
    const selectList = clause ? parseSelectList(full, dialect) : null;
    if (clause && selectList) {
      for (const option of uniqueOptions) {
        if (option.type !== "property") continue;
        const bare = option.label.slice(option.label.lastIndexOf(".") + 1).toLowerCase();
        if (selectList.columns.has(bare)) {
          option.boost = (option.boost ?? 0) + BOOST.selectListBump;
        }
      }
      if (aliasesAllowedIn(clause, dialect)) {
        const existing = new Set(uniqueOptions.map((o) => o.label.toLowerCase()));
        const aliasOptions: Completion[] = selectList.aliases
          .filter((alias) => alias && !existing.has(alias.toLowerCase()))
          .map((alias) => ({
            label: alias,
            apply: quoteIdentifier(alias, dialect),
            detail: "alias",
            type: "property",
            section: columnSection,
            boost: BOOST.selectAlias,
          }));
        uniqueOptions = dedupeOptions([...aliasOptions, ...uniqueOptions]);
      }
    }

    // Inside an open `"…` the reader has typed the opening quote already and
    // the closing one is theirs (or the editor's bracket matching) to supply,
    // so a name that would be quoted goes in bare. A second pair would leave
    // `""Mixed Case""`.
    if (lexical === "quoted-identifier") {
      for (const option of uniqueOptions) {
        if (option.apply === forceQuoteIdentifier(option.label)) {
          option.apply = option.apply.slice(1, -1);
        }
      }
    }

    // Locality and recency: a name already used in the document, or one
    // the reader accepted a moment ago, edges ahead of its section mates.
    // Capped below the join-condition section so a well-used column can't
    // push the ready-made `a.id = b.a_id` off the top of the ON slot.
    const ids = lowercaseIdentifiers(context.state.doc);
    const typedLower = typed.toLowerCase();
    for (const option of uniqueOptions) {
      const key = option.label.toLowerCase();
      let bump = recencyBoost(option.label);
      if (key !== typedLower && ids.has(key)) bump += BOOST.localityBump;
      if (bump === 0) continue;
      const base = option.boost ?? 0;
      option.boost =
        info.joinConditionSlot && option.type === "property"
          ? Math.min(base + bump, BOOST.bumpCeiling)
          : base + bump;
    }

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
