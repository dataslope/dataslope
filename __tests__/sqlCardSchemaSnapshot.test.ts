/**
 * Schema snapshot for the SQL cards' tools menu, run against the REAL engines:
 * sqlSchemaIntrospect.test.ts stubs `exec` and tests the mapping but not the
 * SQL, and a catalog query that stops parsing degrades to "no columns" rather
 * than throwing (the ER diagram once drew every table as an empty box). A
 * dialect whose catalog query breaks fails here instead.
 */
import { describe, it, expect } from "vitest";

import { createEngine } from "../scripts/lib/sql-engines.mjs";
import {
  buildCreateTableDdl,
  readSchemaDdl,
  readSqlSchemaSnapshot,
  type SqlExec,
} from "../app/_components/sqlCardTools/schemaSnapshot";

const DIALECTS = ["sqlite", "postgres", "duckdb"] as const;

/** `SERIAL` is Postgres-only; the other two take a plain INTEGER key. */
function setupSql(dialect: (typeof DIALECTS)[number]): string {
  const key = dialect === "postgres" ? "SERIAL PRIMARY KEY" : "INTEGER PRIMARY KEY";
  return `
    CREATE TABLE owners (id ${key}, name TEXT NOT NULL);
    CREATE TABLE pets (id ${key}, name TEXT, owner_id INTEGER REFERENCES owners(id));
  `;
}

describe.each(DIALECTS)("readSqlSchemaSnapshot (%s)", (dialect) => {
  it("reads tables, columns, keys and DDL from a live engine", async () => {
    const engine = await createEngine(dialect);
    try {
      const exec: SqlExec = (sql: string) => engine.exec(sql);
      await exec(setupSql(dialect));

      const snap = await readSqlSchemaSnapshot(exec, dialect);

      expect(snap.tables.sort()).toEqual(["owners", "pets"]);

      // Columns: the regression that motivated this file. A dialect whose
      // column query stops parsing lands here as an empty array.
      const pets = snap.columnsByEntity.pets ?? [];
      expect(pets.map((c) => c.name)).toEqual(["id", "name", "owner_id"]);
      expect(pets.every((c) => c.type.length > 0)).toBe(true);

      const owners = snap.columnsByEntity.owners ?? [];
      expect(owners.find((c) => c.name === "id")?.pk).toBeGreaterThan(0);
      expect(owners.find((c) => c.name === "name")?.notNull).toBe(true);

      // DuckDB's constraint views don't expose FK column pairs reliably
      // across versions, so it is allowed to report none — the diagram
      // draws the tables without edges rather than with wrong ones.
      if (dialect !== "duckdb") {
        expect(snap.foreignKeysByEntity.pets).toEqual([
          expect.objectContaining({ from: "owner_id", table: "owners", to: "id" }),
        ]);
      }

      const ddl = await readSchemaDdl(exec, dialect, snap);
      expect(ddl).toMatch(/CREATE TABLE/i);
      expect(ddl).toMatch(/owners/);
      expect(ddl).toMatch(/pets/);
    } finally {
      await engine.destroy?.();
    }
  }, 120_000);
});

describe("buildCreateTableDdl", () => {
  it("reconstructs a CREATE TABLE from a snapshot", () => {
    const ddl = buildCreateTableDdl("sqlite", "pets", {
      tables: ["pets"],
      views: [],
      columnsByEntity: {
        pets: [
          { cid: 0, name: "id", type: "INTEGER", notNull: true, defaultValue: null, pk: 1, generated: null },
          { cid: 1, name: "name", type: "TEXT", notNull: false, defaultValue: "'x'", pk: 0, generated: null },
        ],
      },
      foreignKeysByEntity: {
        pets: [{ from: "owner_id", table: "owners", to: "id", onDelete: "NO ACTION", onUpdate: "NO ACTION" }],
      },
    });
    expect(ddl).toContain('CREATE TABLE "pets"');
    expect(ddl).toContain('"id" INTEGER NOT NULL');
    expect(ddl).toContain("DEFAULT 'x'");
    expect(ddl).toContain('PRIMARY KEY ("id")');
    expect(ddl).toContain('FOREIGN KEY ("owner_id") REFERENCES "owners"("id")');
  });

  it("returns an empty string for an entity with no columns", () => {
    expect(
      buildCreateTableDdl("sqlite", "missing", {
        tables: [],
        views: [],
        columnsByEntity: {},
        foreignKeysByEntity: {},
      }),
    ).toBe("");
  });
});
