import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from "@codemirror/autocomplete";

export interface SqlCompletionEntity {
  name: string;
  columns: string[];
  kind: "table" | "view";
}

export interface SqlCompletionSchema {
  entities: SqlCompletionEntity[];
}

type SqlCompletionMode = "columns" | "tables" | "keywords" | "qualified-columns";

interface SqlCompletionContextInfo {
  mode: SqlCompletionMode;
  from: number;
  qualifier?: string;
}

const identifierPattern = /^[A-Za-z_][\w$]*$/;
const validIdentifierPrefix = /^$|^[A-Za-z_][\w$]*$/;
const sqlIdentifierPattern =
  String.raw`(?:[A-Za-z_][\w$]*|"(?:""|[^"])+"|` +
  "`[^`]+`" +
  String.raw`|\[[^\]]+\])`;
const qualifiedIdentifierPattern = new RegExp(
  `(${sqlIdentifierPattern})\\.\\s*([A-Za-z_][\\w$]*)?$`,
);
const tableReferencePattern = new RegExp(
  String.raw`\b(?:FROM|JOIN|UPDATE|INTO)\s+(${sqlIdentifierPattern})(?:\s+(?:AS\s+)?([A-Za-z_][\w$]*))?`,
  "gi",
);
const commaTableReferencePattern = new RegExp(
  String.raw`,\s*(${sqlIdentifierPattern})(?:\s+(?:AS\s+)?([A-Za-z_][\w$]*))?`,
  "g",
);

const tableSection = { name: "Tables", rank: 10 };
const viewSection = { name: "Views", rank: 11 };
const columnSection = { name: "Columns", rank: 20 };
const keywordSection = { name: "Keywords", rank: 30 };

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
  "GROUP",
  "BY",
  "HAVING",
  "ORDER",
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
  "ALL",
  "WITH",
  "RECURSIVE",
  "CAST",
  "PRAGMA",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
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
  "GROUP",
  "ORDER",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "UNION",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "ALTER",
  "DROP",
  "VALUES",
  "SET",
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
  if (identifierPattern.test(identifier)) return identifier;
  return `"${identifier.replace(/"/g, '""')}"`;
}

function maskCommentsAndStrings(sql: string): string {
  let masked = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "-" && next === "-") {
      masked += "  ";
      i += 2;
      while (i < sql.length && sql[i] !== "\n") {
        masked += " ";
        i += 1;
      }
      continue;
    }
    if (ch === "/" && next === "*") {
      masked += "  ";
      i += 2;
      while (i < sql.length) {
        const end = sql[i] === "*" && sql[i + 1] === "/";
        masked += sql[i] === "\n" ? "\n" : " ";
        i += 1;
        if (end) {
          masked += " ";
          i += 1;
          break;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      masked += " ";
      i += 1;
      while (i < sql.length) {
        const current = sql[i];
        masked += current === "\n" ? "\n" : " ";
        i += 1;
        if (current === quote) {
          if (sql[i] === quote) {
            masked += " ";
            i += 1;
          } else {
            break;
          }
        }
      }
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
  return (
    maskCommentsAndStrings(sql).match(/[A-Za-z_][\w$]*|[,().;=*<>+\-/]/g) ??
    []
  );
}

function isKeyword(value: string | undefined): boolean {
  return value ? clauseBoundaryKeywords.has(value.toUpperCase()) : false;
}

function inferCompletionContext(
  context: CompletionContext,
): SqlCompletionContextInfo | null {
  const statement = currentStatementBeforeCursor(
    context.state.doc.toString(),
    context.pos,
  );
  const word = context.matchBefore(/[A-Za-z_][\w$]*/);
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
  if (!context.explicit && !currentWord && !/\s$/.test(statement)) return null;

  const prefixWithoutWord = currentWord
    ? statement.slice(0, Math.max(0, statement.length - currentWord.length))
    : statement;
  const tokens = tokenize(prefixWithoutWord).map((token) => token.toUpperCase());
  const lastToken = tokens.at(-1);
  const lastKeyword = [...tokens].reverse().find((token) =>
    clauseBoundaryKeywords.has(token),
  );

  if (lastToken && tableTargetKeywords.has(lastToken)) {
    return { mode: "tables", from };
  }
  if (lastToken === ".") return null;
  if (lastKeyword && tableTargetKeywords.has(lastKeyword)) {
    return { mode: "tables", from };
  }
  if (lastKeyword && columnTargetKeywords.has(lastKeyword)) {
    return { mode: "columns", from };
  }
  if (context.explicit || currentWord.length > 0) {
    return { mode: "keywords", from };
  }
  return null;
}

function extractTableReferences(sql: string): Map<string, string> {
  const references = new Map<string, string>();
  const masked = maskCommentsAndStrings(sql);
  const addReference = (tableToken: string, aliasToken?: string) => {
    const tableName = normalizeIdentifier(tableToken);
    if (!tableName) return;
    references.set(tableName.toLowerCase(), tableName);
    const alias = normalizeIdentifier(aliasToken);
    if (alias && !isKeyword(alias)) references.set(alias.toLowerCase(), tableName);
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
    if (lastBoundary >= 0 && /\b(FROM|JOIN)\b/.test(beforeComma.slice(lastBoundary))) {
      addReference(match[1], match[2]);
    }
  }

  return references;
}

function tableOptions(schema: SqlCompletionSchema, boost: number): Completion[] {
  return schema.entities.map((entity) => ({
    label: entity.name,
    apply: quoteIdentifier(entity.name),
    detail: entity.kind,
    type: entity.kind === "view" ? "namespace" : "type",
    section: entity.kind === "view" ? viewSection : tableSection,
    boost,
  }));
}

function keywordOptions(boost: number): Completion[] {
  return [
    ...SQL_KEYWORDS.map((keyword) => ({
      label: keyword,
      type: "keyword",
      section: keywordSection,
      boost,
    })),
    ...SQL_FUNCTIONS.map((fn) => ({
      label: fn,
      apply: `${fn}()`,
      type: "function",
      section: keywordSection,
      boost: boost - 1,
    })),
  ];
}

function columnOptions(
  schema: SqlCompletionSchema,
  statement: string,
  boost: number,
): Completion[] {
  const references = extractTableReferences(statement);
  const referencedTables = new Set([...references.values()].map((name) => name.toLowerCase()));
  const entities = referencedTables.size
    ? schema.entities.filter((entity) => referencedTables.has(entity.name.toLowerCase()))
    : schema.entities;

  const columnOwners = new Map<string, SqlCompletionEntity[]>();
  for (const entity of entities) {
    for (const column of entity.columns) {
      const key = column.toLowerCase();
      columnOwners.set(key, [...(columnOwners.get(key) ?? []), entity]);
    }
  }

  const options: Completion[] = [];
  for (const entity of entities) {
    for (const column of entity.columns) {
      const owners = columnOwners.get(column.toLowerCase()) ?? [];
      const ambiguous = owners.length > 1;
      options.push({
        label: ambiguous ? `${entity.name}.${column}` : column,
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
  const tableName = references.get(qualifier.toLowerCase()) ?? qualifier;
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
    const key = `${option.type}:${option.label}:${option.apply ?? ""}`;
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
    const options = (() => {
      switch (info.mode) {
        case "tables":
          return [...tableOptions(schema, 80), ...keywordOptions(5)];
        case "columns":
          return [
            ...columnOptions(schema, statement, 90),
            ...keywordOptions(20),
            ...tableOptions(schema, 1),
          ];
        case "qualified-columns":
          return qualifiedColumnOptions(schema, statement, info.qualifier, 100);
        case "keywords":
          return [...keywordOptions(50), ...tableOptions(schema, 10)];
      }
    })();

    const uniqueOptions = dedupeOptions(options);
    if (uniqueOptions.length === 0) return null;
    return {
      from: info.from,
      options: uniqueOptions,
      validFor: validIdentifierPrefix,
    } satisfies CompletionResult;
  };
}
