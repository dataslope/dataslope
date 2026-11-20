import { describe, expect, it } from "vitest";
import {
  extractCheckConstraints,
  generatedColumnsOf,
} from "../app/_components/sql/utils/tableConstraints";
import {
  buildSqliteCreateTableSql,
  validateSqliteStructure,
} from "../app/_components/sql/utils/structureValidation";
import {
  describeAtomicScriptFailure,
  describePartialScriptFailure,
  dropRepeatedErrorBlocks,
  hasExplicitTransactionControl,
} from "../app/_components/sql/utils/scriptFailure";
import { isNumericSqlType } from "../app/_components/sql/utils/cellEditing";
import {
  duckDbSequenceName,
  packDuckDbArchive,
  patchDuckDbIdentifiers,
  previewDuckDbCreateTable,
  unpackDuckDbArchive,
} from "../app/_components/runtime/duckdb";
import type { ModifyColumnDraft } from "../app/_components/sql/types";

let nextId = 0;
function draft(name: string, extra: Partial<ModifyColumnDraft> = {}): ModifyColumnDraft {
  nextId += 1;
  return {
    id: `c${nextId}`,
    originalName: null,
    name,
    type: "TEXT",
    notNull: false,
    primaryKey: false,
    autoIncrement: false,
    unique: false,
    defaultValue: "",
    fkTable: "",
    fkColumn: "",
    fkOnDelete: "NO ACTION",
    fkOnUpdate: "NO ACTION",
    generated: null,
    ...extra,
  };
}

describe("extractCheckConstraints", () => {
  it("reads column-level and table-level checks, with their names", () => {
    const sql = `CREATE TABLE "orders" (
      id INTEGER PRIMARY KEY,
      qty INTEGER NOT NULL CHECK (qty > 0),
      status TEXT CONSTRAINT status_known CHECK (status IN ('open', 'closed')),
      total REAL,
      CONSTRAINT total_matches CHECK (total >= qty),
      CHECK (length(status) < 10)
    )`;
    expect(extractCheckConstraints(sql)).toEqual([
      { expression: "qty > 0", column: "qty", name: null },
      { expression: "status IN ('open', 'closed')", column: "status", name: "status_known" },
      { expression: "total >= qty", column: null, name: "total_matches" },
      { expression: "length(status) < 10", column: null, name: null },
    ]);
  });

  it("is not fooled by the word in a string, a comment or an identifier", () => {
    const sql = `CREATE TABLE t (
      note TEXT DEFAULT 'CHECK (this)', -- CHECK (nor this)
      "check" INTEGER,
      checked_at TEXT /* CHECK (still no) */
    )`;
    expect(extractCheckConstraints(sql)).toEqual([]);
  });

  it("keeps a nested expression whole", () => {
    const [check] = extractCheckConstraints(
      `CREATE TABLE t (a INT CHECK ((a > 0 AND a < 10) OR a = ')'))`,
    );
    expect(check.expression).toBe("(a > 0 AND a < 10) OR a = ')'");
  });

  it("does not give a constraint name to the wrong constraint", () => {
    const [check] = extractCheckConstraints(
      `CREATE TABLE t (a INT CONSTRAINT a_required NOT NULL CHECK (a > 0))`,
    );
    expect(check).toEqual({ expression: "a > 0", column: "a", name: null });
  });

  it("returns nothing for text that is not a CREATE TABLE", () => {
    expect(extractCheckConstraints("CREATE VIEW v AS SELECT 1")).toEqual([]);
    expect(extractCheckConstraints("CREATE TABLE t AS SELECT 1")).toEqual([]);
  });
});

describe("generatedColumnsOf", () => {
  it("finds both spellings and ignores look-alikes", () => {
    const sql = `CREATE TABLE t (
      price DECIMAL(10,2),
      qty INTEGER DEFAULT (CAST(1 AS INTEGER)),
      total DECIMAL(10,2) GENERATED ALWAYS AS (price * qty),
      "label" VARCHAR AS (CAST(qty AS VARCHAR)),
      note VARCHAR DEFAULT 'x AS (y)'
    )`;
    expect(generatedColumnsOf(sql)).toEqual(["total", "label"]);
  });
});

describe("validateSqliteStructure", () => {
  const base = { originalName: "", newName: "things" };

  it("accepts a plain table", () => {
    const result = validateSqliteStructure(
      { ...base, columns: [draft("id", { type: "INTEGER", primaryKey: true, autoIncrement: true })] },
      ["users"],
    );
    expect(result).toMatchObject({ errors: [], isValid: true });
  });

  it("explains each problem the engine used to report as a syntax error", () => {
    expect(
      validateSqliteStructure({ ...base, newName: " ", columns: [] }, []).errors,
    ).toEqual(["Table name cannot be empty.", "A table must have at least one column."]);

    const blank = draft("");
    const result = validateSqliteStructure(
      { ...base, newName: "Users", columns: [draft("a"), draft("A"), blank] },
      ["users"],
    );
    expect(result.errors).toEqual([
      'A table or view named "Users" already exists.',
      'Duplicate column name "A".',
      "Column names cannot be empty.",
    ]);
    expect(result.invalidColumnIds.has(blank.id)).toBe(true);
    expect(result.invalidColumnIds.size).toBe(3);
  });

  it("lets a table keep its own name when it is being edited", () => {
    const result = validateSqliteStructure(
      { originalName: "users", newName: "Users", columns: [draft("a")] },
      ["users"],
    );
    expect(result.isValid).toBe(true);
  });

  it("flags half a foreign key instead of dropping it", () => {
    const result = validateSqliteStructure(
      { ...base, columns: [draft("user_id", { fkTable: "users" })] },
      [],
    );
    expect(result.errors).toEqual([
      '"user_id" has an incomplete foreign key: pick the column it references.',
    ]);
  });

  it("holds AUTOINCREMENT to a single INTEGER primary key", () => {
    expect(
      validateSqliteStructure(
        { ...base, columns: [draft("id", { type: "TEXT", primaryKey: true, autoIncrement: true })] },
        [],
      ).errors,
    ).toEqual(['"id" must be an INTEGER primary key to auto-increment.']);
    expect(
      validateSqliteStructure(
        {
          ...base,
          columns: [
            draft("a", { type: "INTEGER", primaryKey: true, autoIncrement: true }),
            draft("b", { primaryKey: true }),
          ],
        },
        [],
      ).errors,
    ).toEqual(["AUTOINCREMENT needs a single-column primary key."]);
  });
});

describe("buildSqliteCreateTableSql", () => {
  it("declares a single key inline and several as a table constraint", () => {
    expect(
      buildSqliteCreateTableSql({
        newName: "t",
        columns: [draft("id", { type: "INTEGER", primaryKey: true, autoIncrement: true })],
      }),
    ).toBe('CREATE TABLE "t" ("id" INTEGER PRIMARY KEY AUTOINCREMENT)');
    expect(
      buildSqliteCreateTableSql({
        newName: "t",
        columns: [draft("a", { primaryKey: true }), draft("b", { primaryKey: true })],
      }),
    ).toBe('CREATE TABLE "t" ("a" TEXT, "b" TEXT, PRIMARY KEY ("a", "b"))');
  });

  it("writes foreign keys, and one column per line when pretty", () => {
    const sql = buildSqliteCreateTableSql(
      {
        newName: "cards",
        columns: [
          draft("user_id", {
            type: "INTEGER",
            notNull: true,
            fkTable: "users",
            fkColumn: "user_id",
            fkOnDelete: "CASCADE",
          }),
          draft("label", { unique: true, defaultValue: "'none'" }),
        ],
      },
      { pretty: true },
    );
    expect(sql).toBe(
      [
        'CREATE TABLE "cards" (',
        '  "user_id" INTEGER NOT NULL,',
        `  "label" TEXT UNIQUE DEFAULT 'none',`,
        '  FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION',
        ");",
      ].join("\n"),
    );
  });
});

describe("script failure messages", () => {
  it("says what already ran when statements run one at a time", () => {
    expect(describePartialScriptFailure("no such table: x", 1, 0)).toBe("no such table: x");
    expect(describePartialScriptFailure("no such table: x", 3, 2)).toBe(
      "Statement 3 failed: no such table: x\n(2 statements before it already ran; the rest of the script did not.)",
    );
    expect(describePartialScriptFailure("boom", 2, 1)).toContain("(1 statement before it");
  });

  it("says nothing was applied when the script was one transaction", () => {
    expect(describeAtomicScriptFailure("boom", 1, 1)).toBe("boom");
    expect(describeAtomicScriptFailure("boom", 2, 3)).toBe(
      "boom\n(Statement 2 of 3 failed. PostgreSQL ran the script as one transaction, so none of it was applied.)",
    );
    expect(describeAtomicScriptFailure("boom", null, 3)).toBe(
      "boom\n(PostgreSQL ran the script as one transaction, so none of it was applied.)",
    );
  });

  it("recognises a script that manages its own transaction", () => {
    expect(hasExplicitTransactionControl(["SELECT 1", "  begin"])).toBe(true);
    expect(hasExplicitTransactionControl(["START TRANSACTION", "SELECT 1"])).toBe(true);
    expect(hasExplicitTransactionControl(["SELECT 'BEGIN'", "INSERT INTO t VALUES (1)"])).toBe(false);
  });

  it("drops the excerpt DuckDB prints twice, and nothing else", () => {
    const excerpt = "LINE 1: SELEC 1\n        ^";
    expect(
      dropRepeatedErrorBlocks(`Parser Error: syntax error at or near "SELEC"\n\n${excerpt}\n\n${excerpt}`),
    ).toBe(`Parser Error: syntax error at or near "SELEC"\n\n${excerpt}`);
    expect(dropRepeatedErrorBlocks("a\n\nb\n\na")).toBe("a\n\nb\n\na");
  });
});

describe("isNumericSqlType", () => {
  it("recognises the numeric types of all three engines", () => {
    for (const type of [
      "integer", "INTEGER", "int4", "bigint", "smallint", "HUGEINT", "UBIGINT", "tinyint",
      "real", "REAL", "double precision", "DOUBLE", "float8", "numeric(10,2)", "DECIMAL(38,2)",
      "serial", "bigserial", "money",
    ]) {
      expect(isNumericSqlType(type), type).toBe(true);
    }
  });

  it("leaves everything else left-aligned", () => {
    for (const type of [
      undefined, "", "text", "varchar(10)", "date", "timestamp", "boolean", "interval",
      "integer[]", "LIST(INTEGER)", "json", "uuid", "blob",
    ]) {
      expect(isNumericSqlType(type), String(type)).toBe(false);
    }
  });
});

describe("DuckDB identity columns and identifier patching", () => {
  it("backs an identity column with a sequence named after it", () => {
    expect(duckDbSequenceName("orders", "id")).toBe("orders_id_seq");
    const sql = previewDuckDbCreateTable("orders", [
      { name: "id", type: "BIGINT", primaryKey: true, notNull: true, autoIncrement: true },
      { name: "note", type: "VARCHAR" },
    ]);
    expect(sql).toContain('CREATE SEQUENCE "orders_id_seq"');
    expect(sql).toContain(`"id" BIGINT DEFAULT nextval('orders_id_seq')`);
    expect(sql).toContain('PRIMARY KEY ("id")');
  });

  it("renames identifiers in carried SQL without touching longer names", () => {
    const patched = patchDuckDbIdentifiers(
      'CREATE INDEX idx ON orders (qty, "qty", qty_total)',
      new Map([["qty", "quantity"]]),
    );
    expect(patched).toContain("qty_total");
    expect(patched).not.toMatch(/\(qty,/);
    expect(patched).toContain("quantity");
  });
});

describe("DuckDB catalog archive", () => {
  it("round-trips its files", () => {
    const files = [
      { name: "schema.sql", bytes: new TextEncoder().encode("CREATE TABLE t (a INT);") },
      { name: "t.parquet", bytes: new Uint8Array([80, 65, 82, 49, 0, 255]) },
      { name: "empty.csv", bytes: new Uint8Array() },
    ];
    const unpacked = unpackDuckDbArchive(packDuckDbArchive(files));
    expect(unpacked?.map((f) => f.name)).toEqual(["schema.sql", "t.parquet", "empty.csv"]);
    expect(Array.from(unpacked![1].bytes)).toEqual([80, 65, 82, 49, 0, 255]);
    expect(new TextDecoder().decode(unpacked![0].bytes)).toBe("CREATE TABLE t (a INT);");
  });

  it("reads an archive that sits at an offset inside a larger buffer", () => {
    const packed = packDuckDbArchive([{ name: "a", bytes: new Uint8Array([1, 2, 3]) }]);
    const padded = new Uint8Array(packed.byteLength + 5);
    padded.set(packed, 5);
    expect(unpackDuckDbArchive(padded.subarray(5))?.[0].bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("returns null for a native database image or a truncated archive", () => {
    expect(unpackDuckDbArchive(new TextEncoder().encode("DUCK\u0000\u0000\u0000\u0000rest of file"))).toBeNull();
    expect(unpackDuckDbArchive(new Uint8Array(3))).toBeNull();
    const packed = packDuckDbArchive([{ name: "a", bytes: new Uint8Array(100) }]);
    expect(unpackDuckDbArchive(packed.subarray(0, packed.byteLength - 10))).toBeNull();
  });
});
