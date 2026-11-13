// Reads the CHECK constraints out of a `CREATE TABLE` statement.
//
// SQLite changes most things about a table by rebuilding it, and the
// structure editor renders the new table from what its form knows: columns,
// keys, defaults. A CHECK is none of those, so every save used to drop it
// without a word. The rebuild now carries them across, and this is the
// reader: SQLite keeps no catalog of constraints, only the original text in
// `sqlite_master.sql`.
//
// Not a SQL parser. It needs three things from the text and gets them with a
// scanner that understands quoting and nesting: where the column list
// starts, where each top-level item ends, and where a `CHECK (...)` closes.

export interface CheckConstraint {
  /** The expression inside the parentheses, as written. */
  expression: string;
  /** The column whose definition carried it, or null for a table-level
   *  constraint. A column-level CHECK goes away with its column. */
  column: string | null;
  /** `CONSTRAINT name`, when the constraint was given one. */
  name: string | null;
}

/** Index just past the quoted token starting at `i`, or `i` if none starts
 *  there. Handles 'string', "ident", `ident` and [ident]. */
function skipQuoted(sql: string, i: number): number {
  const open = sql[i];
  const close = open === "[" ? "]" : open;
  if (open !== "'" && open !== '"' && open !== "`" && open !== "[") return i;
  let j = i + 1;
  while (j < sql.length) {
    if (sql[j] === close) {
      // A doubled quote is an escaped quote, except in [brackets].
      if (open !== "[" && sql[j + 1] === close) {
        j += 2;
        continue;
      }
      return j + 1;
    }
    j += 1;
  }
  return sql.length;
}

/** Index just past the comment starting at `i`, or `i` if none starts there. */
function skipComment(sql: string, i: number): number {
  if (sql.startsWith("--", i)) {
    const end = sql.indexOf("\n", i);
    return end === -1 ? sql.length : end + 1;
  }
  if (sql.startsWith("/*", i)) {
    const end = sql.indexOf("*/", i + 2);
    return end === -1 ? sql.length : end + 2;
  }
  return i;
}

/** Index of the `)` matching the `(` at `open`, or -1. */
function matchParen(sql: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < sql.length) {
    const skipped = skipComment(sql, skipQuoted(sql, i));
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    if (sql[i] === "(") depth += 1;
    else if (sql[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

/** Split the body of a column list on its top-level commas. */
function splitTopLevel(body: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < body.length) {
    const skipped = skipComment(body, skipQuoted(body, i));
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    if (body[i] === "(") depth += 1;
    else if (body[i] === ")") depth -= 1;
    else if (body[i] === "," && depth === 0) {
      items.push(body.slice(start, i));
      start = i + 1;
    }
    i += 1;
  }
  items.push(body.slice(start));
  return items.map((item) => item.trim()).filter(Boolean);
}

function unquote(token: string): string {
  const first = token[0];
  if (first === '"' || first === "`") {
    return token.slice(1, -1).split(first + first).join(first);
  }
  if (first === "[") return token.slice(1, -1);
  return token;
}

/** The leading identifier of an item, quoted or bare. */
function leadingIdentifier(item: string): string | null {
  const end = skipQuoted(item, 0);
  if (end > 0) return unquote(item.slice(0, end));
  const match = /^[A-Za-z_][\w$]*/.exec(item);
  return match ? match[0] : null;
}

const TABLE_CONSTRAINT_START = /^(CONSTRAINT|CHECK|UNIQUE|PRIMARY|FOREIGN)\b/i;

/** Every CHECK constraint a `CREATE TABLE` statement declares, column-level
 *  and table-level, in source order. Returns an empty list for text it
 *  cannot make sense of rather than guessing. */
export function extractCheckConstraints(createSql: string): CheckConstraint[] {
  if (!/^\s*CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\b/i.test(createSql)) return [];
  // The column list opens at the first `(` outside the (possibly quoted)
  // table name.
  let open = -1;
  for (let i = 0; i < createSql.length; ) {
    const skipped = skipComment(createSql, skipQuoted(createSql, i));
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    if (createSql[i] === "(") {
      open = i;
      break;
    }
    i += 1;
  }
  if (open === -1) return [];
  const close = matchParen(createSql, open);
  if (close === -1) return [];

  const out: CheckConstraint[] = [];
  for (const item of splitTopLevel(createSql.slice(open + 1, close))) {
    const column = TABLE_CONSTRAINT_START.test(item) ? null : leadingIdentifier(item);
    let pendingName: string | null = null;
    let i = 0;
    while (i < item.length) {
      const skipped = skipComment(item, skipQuoted(item, i));
      if (skipped !== i) {
        i = skipped;
        continue;
      }
      const word = /^[A-Za-z_][\w$]*/.exec(item.slice(i));
      if (!word || (i > 0 && /[\w$]/.test(item[i - 1]))) {
        i += 1;
        continue;
      }
      const upper = word[0].toUpperCase();
      let next = i + word[0].length;
      if (upper === "CONSTRAINT") {
        while (/\s/.test(item[next] ?? "")) next += 1;
        const nameEnd = skipQuoted(item, next);
        if (nameEnd !== next) {
          pendingName = unquote(item.slice(next, nameEnd));
          next = nameEnd;
        } else {
          const bare = /^[A-Za-z_][\w$]*/.exec(item.slice(next));
          pendingName = bare ? bare[0] : null;
          next += bare ? bare[0].length : 0;
        }
      } else if (upper === "CHECK") {
        let paren = next;
        while (/\s/.test(item[paren] ?? "")) paren += 1;
        const end = item[paren] === "(" ? matchParen(item, paren) : -1;
        if (end !== -1) {
          out.push({
            expression: item.slice(paren + 1, end).trim(),
            column,
            name: pendingName,
          });
          next = end + 1;
        }
        pendingName = null;
      } else if (
        upper === "PRIMARY" ||
        upper === "UNIQUE" ||
        upper === "FOREIGN" ||
        upper === "REFERENCES" ||
        upper === "NOT" ||
        upper === "DEFAULT" ||
        upper === "COLLATE" ||
        upper === "GENERATED"
      ) {
        // A name belongs to the constraint right after it, and that was not
        // a CHECK.
        pendingName = null;
      }
      i = next;
    }
  }
  return out;
}
