/**
 * Engine error text for the results pane: the message as shown, and a
 * plain-language hint under it. Shared by the SQLite, DuckDB and PostgreSQL
 * playgrounds, which is why each pattern below names its engine.
 */

import { stripSqliteCodePrefix } from "../../runtime/sqlite";

/** The engine's message, minus wrapping that carries no information. The
 *  SQLite worker already strips its result-code prefix; this repeats it for
 *  a message that reached the pane some other way (a stored history entry),
 *  since the prefix also keeps every SQLite hint below from matching. */
export function cleanEngineError(error: string): string {
  return stripSqliteCodePrefix(error);
}

const missingRelation = (name: string) =>
  `Table or view "${name}" does not exist. Check the Tables pane for the ones that do.`;
const missingColumn = (name: string) =>
  `Column "${name}" was not found. Check the column names in the Tables pane, or with View Structure.`;
const ambiguousColumn = (name: string) =>
  `Column "${name}" is ambiguous. Qualify it with its table, e.g. table.column.`;

/** Friendly hint for an engine error, or null when there is nothing to add.
 *  The same mistake gets the same hint whichever engine reported it. */
export function getEngineErrorHint(rawError: string): string | null {
  const error = cleanEngineError(rawError);

  // ── SQLite ──
  const nearMatch = error.match(/^near "(.+)": syntax error$/i);
  if (nearMatch) {
    return `Unexpected token "${nearMatch[1]}". Check for typos in SQL keywords or extra characters.`;
  }
  const noTableMatch = error.match(/^no such table: (.+)$/i);
  if (noTableMatch) return missingRelation(noTableMatch[1]);
  const noColumnMatch = error.match(/^no such column: (.+)$/i);
  if (noColumnMatch) return missingColumn(noColumnMatch[1]);
  const uniqueMatch = error.match(/^UNIQUE constraint failed: (.+)$/i);
  if (uniqueMatch) {
    return `Duplicate value violates the UNIQUE constraint on "${uniqueMatch[1]}".`;
  }
  const notNullMatch = error.match(/^NOT NULL constraint failed: (.+)$/i);
  if (notNullMatch) {
    return `"${notNullMatch[1]}" requires a non-NULL value.`;
  }
  if (/^FOREIGN KEY constraint failed$/i.test(error)) {
    return "The value does not exist in the referenced table.";
  }
  const ambiguousMatch = error.match(/^ambiguous column name: (.+)$/i);
  if (ambiguousMatch) return ambiguousColumn(ambiguousMatch[1]);

  // ── DuckDB ──
  // DuckDB writes the name bare (`Table with name orders does not exist!`);
  // older builds quoted it.
  const duckdbNoTableMatch = error.match(
    /Table with name "?([^"\s!]+)"? does not exist/i,
  );
  if (duckdbNoTableMatch) return missingRelation(duckdbNoTableMatch[1]);
  const duckdbNoColMatch = error.match(
    /Referenced column "?([^"\s!]+)"? not found in FROM clause/i,
  );
  if (duckdbNoColMatch) return missingColumn(duckdbNoColMatch[1]);
  const duckdbBinderColMatch = error.match(
    /Binder Error:.*column "(.+)" does not exist/i,
  );
  if (duckdbBinderColMatch) return missingColumn(duckdbBinderColMatch[1]);
  const duckdbAmbiguousMatch = error.match(
    /Ambiguous reference to column name "([^"]+)"/i,
  );
  if (duckdbAmbiguousMatch) return ambiguousColumn(duckdbAmbiguousMatch[1]);

  // ── PostgreSQL ──
  // Checked before the generic column patterns below, which would otherwise
  // match this message's `column "x" is of type …` and give a hint about a
  // missing column that exists.
  const pgCastMatch = error.match(
    /column "([^"]+)" (?:is of type|cannot be cast automatically to type) ([\w ]+?)(?: but expression is of type ([\w ]+))?$/im,
  );
  if (pgCastMatch) {
    const [, column, targetType] = pgCastMatch;
    return `Postgres will not convert "${column}" to ${targetType} on its own. Add a USING expression, e.g. USING ${column}::${targetType.trim().split(/\s+/)[0]}.`;
  }
  const pgNoTableMatch = error.match(/relation "(.+)" does not exist/i);
  if (pgNoTableMatch) return missingRelation(pgNoTableMatch[1]);
  const pgNoColMatch = error.match(/column "(.+)" does not exist/i);
  if (pgNoColMatch) return missingColumn(pgNoColMatch[1]);
  const pgAmbiguousMatch = error.match(/column reference "(.+)" is ambiguous/i);
  if (pgAmbiguousMatch) return ambiguousColumn(pgAmbiguousMatch[1]);
  return null;
}
