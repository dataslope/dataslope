/**
 * Render a `SqlCompletionSchema` (the shape every SQL surface already builds
 * for autocomplete) as a compact plain-text summary for the Ask AI context:
 *
 *   Table users (id INTEGER, name TEXT, team_id INTEGER -> teams.id)
 *   View top_teams (name TEXT, wins BIGINT)
 *
 * One line per entity keeps it cheap to clip against the server-side token
 * budget without splitting a table's columns from its name.
 */
import type { SqlCompletionSchema } from "../sql/sqlCompletion";

const MAX_SCHEMA_CHARS = 6000;

export function formatSqlSchemaText(
  schema: SqlCompletionSchema | null | undefined,
): string | undefined {
  if (!schema || schema.entities.length === 0) return undefined;
  const lines: string[] = [];
  for (const entity of schema.entities) {
    const fkByColumn = new Map(
      (entity.foreignKeys ?? []).map((fk) => [
        fk.column,
        `${fk.refEntity}.${fk.refColumn}`,
      ]),
    );
    // Columns may be bare names or `{ name, type }` objects.
    const cols = entity.columns.map((c) => {
      const name = typeof c === "string" ? c : c.name;
      const type = typeof c === "string" ? undefined : c.type?.trim();
      const ref = fkByColumn.get(name);
      return `${name}${type ? ` ${type}` : ""}${ref ? ` -> ${ref}` : ""}`;
    });
    const kind = entity.kind === "view" ? "View" : "Table";
    lines.push(`${kind} ${entity.name} (${cols.join(", ")})`);
    if (lines.join("\n").length > MAX_SCHEMA_CHARS) {
      lines.push(`… and ${schema.entities.length - lines.length + 1} more entities`);
      break;
    }
  }
  return lines.join("\n");
}
