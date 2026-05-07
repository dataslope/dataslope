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

const SQL_KEYWORDS = [
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
  "PRAGMA",
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
  "GLOB",
  "REGEXP",
  "MATCH",
  "ESCAPE",
  "COLLATE",
  "ATTACH",
  "DETACH",
  "DATABASE",
  "EXPLAIN",
  "ANALYZE",
  "VACUUM",
  "REINDEX",
  "AUTOINCREMENT",
  "GENERATED",
  "ALWAYS",
  "STORED",
  "VIRTUAL",
];

const SQL_FUNCTIONS = [
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "TOTAL",
  "ROUND",
  "ABS",
  "LOWER",
  "UPPER",
  "LENGTH",
  "SUBSTR",
  "COALESCE",
  "IFNULL",
  "NULLIF",
  "DATE",
  "TIME",
  "DATETIME",
  "STRFTIME",
];

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

const STATEMENT_STARTERS: KeywordContext = {
  primary: [
    "SELECT",
    "WITH",
    "INSERT",
    "UPDATE",
    "DELETE",
    "CREATE",
    "DROP",
    "ALTER",
    "REPLACE",
  ],
  secondary: [
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
};

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
): KeywordContext | null {
  if (tokens.length === 0) return STATEMENT_STARTERS;

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
      return { primary: ["INTO", "OR"], restrict: true };
    case "DELETE":
      return { primary: ["FROM"], restrict: true };
    case "UPDATE":
      return { primary: ["OR"], secondary: ["REPLACE"] };
    case "CREATE":
      return {
        primary: ["TABLE", "VIEW", "INDEX", "TRIGGER"],
        secondary: ["UNIQUE", "TEMP", "TEMPORARY", "VIRTUAL"],
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
    case "NOT":
      return {
        primary: ["NULL", "EXISTS", "IN", "LIKE", "BETWEEN"],
        secondary: ["GLOB", "REGEXP", "MATCH"],
        restrict: true,
      };
    case "BETWEEN":
      return { primary: [], secondary: ["AND"] };
    case "DISTINCT":
    case "ALL":
      return { primary: ["FROM"] };
    case "TEMP":
    case "TEMPORARY":
      return { primary: ["TABLE", "VIEW", "TRIGGER"], restrict: true };
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
    case "FROM":
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
          ],
        };
      }
      return {
        primary: ["AS"],
        secondary: ["JOIN", "WHERE"],
      };
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
          ],
        };
      }
      return { primary: ["AS"] };
    case "ON":
    case "WHERE":
    case "HAVING": {
      if (isExpressionOperator(lastToken)) {
        return {
          primary: ["NOT", "NULL", "EXISTS", "CASE"],
          secondary: ["CAST", "TRUE", "FALSE"],
        };
      }
      if (isIdentifierToken(lastToken)) {
        return {
          primary: ["AND", "OR", "IS", "NOT", "LIKE", "IN", "BETWEEN"],
          secondary: [
            "GROUP",
            "ORDER",
            "HAVING",
            "LIMIT",
            "OFFSET",
            "UNION",
            "GLOB",
            "REGEXP",
            "MATCH",
            "ESCAPE",
            "COLLATE",
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
        secondary: ["ASC", "DESC", "HAVING", "LIMIT", "OFFSET", "UNION"],
      };
    case "INSERT":
      return {
        primary: ["INTO", "VALUES", "SELECT"],
        secondary: ["DEFAULT", "OR", "REPLACE", "RETURNING"],
      };
    case "UPDATE":
      return {
        primary: ["SET"],
        secondary: ["WHERE", "OR", "REPLACE", "RETURNING"],
      };
    case "DELETE":
      return { primary: ["FROM"], secondary: ["WHERE", "RETURNING"] };
    case "CREATE":
      return {
        primary: ["TABLE", "VIEW", "INDEX", "TRIGGER"],
        secondary: ["UNIQUE", "TEMP", "TEMPORARY", "IF", "NOT", "EXISTS"],
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
    resolveKeywordContext(tokens, lastToken, lastClauseKeyword) ?? undefined;

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
  boost: number,
  keywordContext?: KeywordContext,
  options: { includeFunctions?: boolean } = {},
): Completion[] {
  const { includeFunctions = true } = options;
  const primary = keywordContext ? new Set(keywordContext.primary) : null;
  const secondary = keywordContext?.secondary
    ? new Set(keywordContext.secondary)
    : null;
  const restrict = keywordContext?.restrict ?? false;
  const hasContext = primary !== null;

  const orderedKeywords = primary
    ? [
        // Stable boost ordering means iteration order also drives display
        // order — list primaries first so the popup shows them up top even
        // before we sort by boost.
        ...keywordContext!.primary.filter((kw) => SQL_KEYWORDS.includes(kw)),
        ...(keywordContext!.secondary ?? []).filter((kw) =>
          SQL_KEYWORDS.includes(kw),
        ),
        ...SQL_KEYWORDS.filter(
          (kw) => !primary.has(kw) && !(secondary?.has(kw) ?? false),
        ),
      ]
    : SQL_KEYWORDS;

  const out: Completion[] = [];
  for (const keyword of orderedKeywords) {
    const isPrimary = primary?.has(keyword) ?? false;
    const isSecondary = secondary?.has(keyword) ?? false;
    if (restrict && !isPrimary && !isSecondary) continue;
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
    for (const fn of SQL_FUNCTIONS) {
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
): CompletionSource {
  return (context) => {
    const info = inferCompletionContext(context);
    if (!info) return null;

    const statement = currentStatementBeforeCursor(
      context.state.doc.toString(),
      context.pos,
    );
    const localSchema = effectiveSchema(schema, statement);

    const kw = info.keywordContext;
    const options = (() => {
      switch (info.mode) {
        case "tables":
          return [
            ...tableOptions(localSchema, BOOST.tableInTableContext),
            ...keywordOptions(BOOST.keywordInTableContext, kw),
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
              ...keywordOptions(BOOST.keywordInColumnContext, kw),
              ...tableOptions(localSchema, BOOST.tableInColumnContext),
            ];
          }
          return [
            ...cols,
            ...keywordOptions(BOOST.keywordInColumnContext, kw),
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
          return keywordOptions(BOOST.keywordInKeywordContext, kw, {
            includeFunctions: false,
          });
        case "keywords":
          return [
            ...keywordOptions(BOOST.keywordInKeywordContext, kw),
            ...tableOptions(localSchema, BOOST.tableInKeywordContext),
          ];
      }
    })();

    const uniqueOptions = dedupeOptions(options);
    if (uniqueOptions.length === 0) return null;
    return {
      from: info.from,
      options: uniqueOptions,
      validFor: partialIdentifierPattern,
    } satisfies CompletionResult;
  };
}
