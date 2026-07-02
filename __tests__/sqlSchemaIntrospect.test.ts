/**
 * Schema introspection for the inline SQL surfaces — verifies the SQL
 * result rows are mapped into both completion schema shapes, and that
 * failures degrade to the empty schema instead of throwing.
 */
import { describe, it, expect } from "vitest";
import {
  EMPTY_SCHEMAS,
  introspectSqlSchemas,
  type SqlExec,
} from "../app/_components/sql/shared/schemaIntrospect";

interface Shape {
  columns: string[];
  values: unknown[][];
}

/** exec stub: first call answers columns, second answers foreign keys. */
function execFor(columnRows: Shape, fkRows?: Shape): SqlExec {
  let call = 0;
  return async () => {
    call += 1;
    if (call === 1) return [columnRows];
    if (fkRows) return [fkRows];
    return [{ columns: [], values: [] }];
  };
}

const CUSTOMER_ORDER_COLUMNS: Shape = {
  columns: ["tbl", "col", "coltype", "kind"],
  values: [
    ["customers", "id", "INTEGER", "table"],
    ["customers", "name", "TEXT", "table"],
    ["orders", "id", "INTEGER", "table"],
    ["orders", "customer_id", "INTEGER", "table"],
    ["order_totals", "total", "NUMERIC", "view"],
  ],
};

describe("introspectSqlSchemas", () => {
  it("maps column rows into entities and the lang-sql schema", async () => {
    const exec = execFor(CUSTOMER_ORDER_COLUMNS);
    const { completion, langSchema } = await introspectSqlSchemas(
      exec,
      "sqlite",
    );

    expect(completion.entities.map((e) => e.name)).toEqual([
      "customers",
      "orders",
      "order_totals",
    ]);
    expect(completion.entities[0].columns).toEqual([
      { name: "id", type: "INTEGER" },
      { name: "name", type: "TEXT" },
    ]);
    expect(completion.entities[2].kind).toBe("view");
    expect(completion.schemas).toEqual(["main"]);
    expect(langSchema).toEqual({
      customers: ["id", "name"],
      orders: ["id", "customer_id"],
      order_totals: ["total"],
    });
  });

  it("attaches foreign keys to their owning entity", async () => {
    const exec = execFor(CUSTOMER_ORDER_COLUMNS, {
      columns: ["tbl", "col", "ref_table", "ref_col"],
      values: [["orders", "customer_id", "customers", "id"]],
    });
    const { completion } = await introspectSqlSchemas(exec, "sqlite");
    const orders = completion.entities.find((e) => e.name === "orders");
    expect(orders?.foreignKeys).toEqual([
      { column: "customer_id", refEntity: "customers", refColumn: "id" },
    ]);
  });

  it("uses the public schema for postgres", async () => {
    const exec = execFor(CUSTOMER_ORDER_COLUMNS, {
      columns: ["tbl", "col", "ref_table", "ref_col"],
      values: [],
    });
    const { completion } = await introspectSqlSchemas(exec, "postgres");
    expect(completion.schemas).toEqual(["public"]);
  });

  it("resolves to the empty schema when introspection fails", async () => {
    const exec: SqlExec = async () => {
      throw new Error("no such function: pragma_table_info");
    };
    await expect(introspectSqlSchemas(exec, "sqlite")).resolves.toEqual(
      EMPTY_SCHEMAS,
    );
  });

  it("keeps column data when only the FK query fails", async () => {
    let call = 0;
    const exec: SqlExec = async () => {
      call += 1;
      if (call === 1) return [CUSTOMER_ORDER_COLUMNS];
      throw new Error("fk query unsupported");
    };
    const { completion } = await introspectSqlSchemas(exec, "sqlite");
    expect(completion.entities).toHaveLength(3);
  });

  it("skips the FK query entirely for duckdb", async () => {
    let calls = 0;
    const exec: SqlExec = async () => {
      calls += 1;
      return [CUSTOMER_ORDER_COLUMNS];
    };
    await introspectSqlSchemas(exec, "duckdb");
    expect(calls).toBe(1);
  });
});
