/**
 * Ask AI schema summary: one-line-per-entity rendering, truncation trailer
 * arithmetic, and the entity count the "What AI can see" panel displays.
 */
import { describe, it, expect } from "vitest";
import {
  countSchemaEntities,
  formatSqlSchemaText,
} from "../app/_components/ai/sqlSchemaText";
import type { SqlCompletionSchema } from "../app/_components/sql/sqlCompletion";

function makeSchema(count: number, columnsPer = 3): SqlCompletionSchema {
  return {
    entities: Array.from({ length: count }, (_, i) => ({
      name: `table_${i}`,
      kind: "table" as const,
      columns: Array.from({ length: columnsPer }, (_, c) => ({
        name: `column_${c}`,
        type: "INTEGER",
      })),
    })),
  };
}

describe("formatSqlSchemaText", () => {
  it("renders one line per entity with columns and kinds", () => {
    const text = formatSqlSchemaText({
      entities: [
        {
          name: "users",
          kind: "table",
          columns: [
            { name: "id", type: "INTEGER" },
            { name: "team_id", type: "INTEGER" },
          ],
          foreignKeys: [
            { column: "team_id", refEntity: "teams", refColumn: "id" },
          ],
        },
        { name: "top_teams", kind: "view", columns: ["name", "wins"] },
      ],
    } as SqlCompletionSchema);
    expect(text).toBe(
      [
        "Table users (id INTEGER, team_id INTEGER -> teams.id)",
        "View top_teams (name, wins)",
      ].join("\n"),
    );
  });

  it("reports the exact number of entities omitted by truncation", () => {
    const total = 200; // enough to blow the 6000-char budget
    const text = formatSqlSchemaText(makeSchema(total))!;
    const lines = text.split("\n");
    const trailer = lines[lines.length - 1];
    const match = trailer.match(/^… and (\d+) more entities$/);
    expect(match).not.toBeNull();
    const rendered = lines.length - 1;
    expect(rendered + Number(match![1])).toBe(total);
  });

  it("returns undefined for an empty schema", () => {
    expect(formatSqlSchemaText({ entities: [] })).toBeUndefined();
    expect(formatSqlSchemaText(null)).toBeUndefined();
  });
});

describe("countSchemaEntities", () => {
  it("counts entity lines, not raw lines", () => {
    const text = formatSqlSchemaText(makeSchema(5))!;
    expect(countSchemaEntities(text)).toBe(5);
  });

  it("includes the truncated remainder from the trailer", () => {
    const total = 200;
    const text = formatSqlSchemaText(makeSchema(total))!;
    expect(countSchemaEntities(text)).toBe(total);
  });
});
