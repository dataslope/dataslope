import { describe, expect, it } from "vitest";
import {
  applyDuplicateRowPlan,
  buildDuplicateRowPlan,
  conflictingDuplicateColumns,
  constraintInfoFromColumns,
  defaultDuplicateStrategy,
  defaultGeneratesUniqueValue,
  duplicateInsertColumns,
  incrementMaxValue,
  isNumericColumnType,
  isDuplicatePlanComplete,
  isSqliteRowidAlias,
  looksLikeUuid,
  newUuid,
  suggestDuplicateText,
  type DuplicateColumnChoice,
  type DuplicateStrategy,
} from "../app/_components/sql/utils/duplicateRow";
import type {
  ColumnConstraintInfo,
  TableColumnInfo,
} from "../app/_components/runtime/sqlite";

function constraint(
  partial: Partial<ColumnConstraintInfo> & { name: string },
): ColumnConstraintInfo {
  return {
    isPrimaryKey: false,
    isAutoIncrement: false,
    isUnique: false,
    ...partial,
  };
}

function column(
  partial: Partial<TableColumnInfo> & { name: string },
): TableColumnInfo {
  return {
    cid: 0,
    type: "text",
    notNull: false,
    defaultValue: null,
    pk: 0,
    generated: null,
    ...partial,
  };
}

describe("defaultGeneratesUniqueValue", () => {
  it("accepts the sequence and UUID generators the engines emit", () => {
    expect(defaultGeneratesUniqueValue("nextval('t_id_seq'::regclass)")).toBe(
      true,
    );
    expect(defaultGeneratesUniqueValue("gen_random_uuid()")).toBe(true);
    expect(defaultGeneratesUniqueValue("uuid_generate_v4()")).toBe(true);
    expect(defaultGeneratesUniqueValue("uuid()")).toBe(true);
  });

  it("rejects defaults that generate a value but not a distinct one", () => {
    expect(defaultGeneratesUniqueValue("now()")).toBe(false);
    expect(defaultGeneratesUniqueValue("CURRENT_TIMESTAMP")).toBe(false);
    expect(defaultGeneratesUniqueValue("0")).toBe(false);
    expect(defaultGeneratesUniqueValue(null)).toBe(false);
    expect(defaultGeneratesUniqueValue(undefined)).toBe(false);
  });
});

describe("isNumericColumnType", () => {
  it("recognises the integer and decimal families across engines", () => {
    for (const type of [
      "INTEGER",
      "int4",
      "bigint",
      "SMALLINT",
      "serial",
      "numeric(10,2)",
      "double precision",
      "HUGEINT",
    ]) {
      expect(isNumericColumnType(type), type).toBe(true);
    }
  });

  it("leaves types that merely contain a numeric word alone", () => {
    for (const type of ["interval", "point", "text", "uuid", "timestamp"]) {
      expect(isNumericColumnType(type), type).toBe(false);
    }
  });
});

describe("isSqliteRowidAlias", () => {
  const alias = {
    type: "INTEGER",
    pk: 1,
    singleColumnPk: true,
    withoutRowid: false,
  };

  it("accepts a sole INTEGER PRIMARY KEY, in any case", () => {
    expect(isSqliteRowidAlias(alias)).toBe(true);
    expect(isSqliteRowidAlias({ ...alias, type: " integer " })).toBe(true);
  });

  it("rejects INT, which SQLite does not alias to the rowid", () => {
    expect(isSqliteRowidAlias({ ...alias, type: "INT" })).toBe(false);
    expect(isSqliteRowidAlias({ ...alias, type: "BIGINT" })).toBe(false);
  });

  it("rejects a composite key and a WITHOUT ROWID table", () => {
    expect(isSqliteRowidAlias({ ...alias, singleColumnPk: false })).toBe(false);
    expect(isSqliteRowidAlias({ ...alias, pk: 2, singleColumnPk: false })).toBe(
      false,
    );
    expect(isSqliteRowidAlias({ ...alias, withoutRowid: true })).toBe(false);
  });

  it("rejects a non-key column", () => {
    expect(isSqliteRowidAlias({ ...alias, pk: 0 })).toBe(false);
  });
});

describe("looksLikeUuid", () => {
  it("matches a canonical UUID, in either case", () => {
    expect(looksLikeUuid("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
    expect(looksLikeUuid("F47AC10B-58CC-4372-A567-0E02B2C3D479")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(looksLikeUuid("not-a-uuid")).toBe(false);
    expect(looksLikeUuid(42)).toBe(false);
    expect(looksLikeUuid(null)).toBe(false);
  });
});

describe("duplicateInsertColumns", () => {
  it("drops the columns the database re-populates", () => {
    const info = [
      constraint({ name: "id", isPrimaryKey: true, autoPopulated: true }),
      constraint({ name: "email", isUnique: true }),
      constraint({ name: "name" }),
    ];
    expect(
      duplicateInsertColumns(
        ["id", "email", "name"],
        [7, "a@b.c", "Ada"],
        info,
      ),
    ).toEqual({ names: ["email", "name"], values: ["a@b.c", "Ada"] });
  });

  it("keeps every column when nothing is auto-populated", () => {
    expect(duplicateInsertColumns(["a", "b"], [1, 2], undefined)).toEqual({
      names: ["a", "b"],
      values: [1, 2],
    });
  });
});

describe("conflictingDuplicateColumns", () => {
  it("reports nothing when the key is auto-populated", () => {
    const info = [
      constraint({ name: "id", isPrimaryKey: true, autoPopulated: true }),
      constraint({ name: "name" }),
    ];
    expect(conflictingDuplicateColumns(["name"], ["Ada"], info)).toEqual([]);
  });

  it("reports a plain integer primary key, with the next-number option", () => {
    const info = [
      constraint({ name: "id", isPrimaryKey: true, type: "INT", notNull: true }),
    ];
    const [conflict] = conflictingDuplicateColumns(["id"], [7], info);
    expect(conflict.name).toBe("id");
    expect(conflict.autoKind).toBe("next-number");
    expect(conflict.canBeNull).toBe(false);
    expect(defaultDuplicateStrategy(conflict)).toBe("auto");
  });

  it("offers a fresh UUID for a uuid-typed key and for uuid-shaped text", () => {
    const typed = conflictingDuplicateColumns(
      ["id"],
      ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
      [constraint({ name: "id", isPrimaryKey: true, type: "uuid" })],
    );
    expect(typed[0].autoKind).toBe("uuid");
    const untyped = conflictingDuplicateColumns(
      ["id"],
      ["f47ac10b-58cc-4372-a567-0e02b2c3d479"],
      [constraint({ name: "id", isPrimaryKey: true, type: "TEXT" })],
    );
    expect(untyped[0].autoKind).toBe("uuid");
  });

  it("has no automatic answer for a plain text unique column", () => {
    const [conflict] = conflictingDuplicateColumns(
      ["email"],
      ["ada@example.com"],
      [constraint({ name: "email", isUnique: true, type: "TEXT" })],
    );
    expect(conflict.autoKind).toBeNull();
    expect(conflict.canBeNull).toBe(true);
    expect(defaultDuplicateStrategy(conflict)).toBe("custom");
  });

  it("skips a NULL in a nullable unique column, since NULLs never collide", () => {
    const info = [constraint({ name: "email", isUnique: true, type: "TEXT" })];
    expect(conflictingDuplicateColumns(["email"], [null], info)).toEqual([]);
  });

  it("still reports a NOT NULL unique column holding NULL", () => {
    const info = [
      constraint({
        name: "email",
        isUnique: true,
        type: "TEXT",
        notNull: true,
      }),
    ];
    expect(conflictingDuplicateColumns(["email"], [null], info)).toHaveLength(1);
  });

  it("reports every member of a composite primary key", () => {
    const info = [
      constraint({ name: "order_id", isPrimaryKey: true, type: "INT" }),
      constraint({ name: "product_id", isPrimaryKey: true, type: "INT" }),
      constraint({ name: "qty", type: "INT" }),
    ];
    const conflicts = conflictingDuplicateColumns(
      ["order_id", "product_id", "qty"],
      [1, 2, 3],
      info,
    );
    expect(conflicts.map((c) => c.name)).toEqual(["order_id", "product_id"]);
  });
});

describe("incrementMaxValue", () => {
  it("starts at 1 for an empty table", () => {
    expect(incrementMaxValue(null)).toBe(1);
    expect(incrementMaxValue(undefined)).toBe(1);
  });

  it("adds one to numbers, bigints and numeric strings", () => {
    expect(incrementMaxValue(7)).toBe(8);
    expect(incrementMaxValue(-3)).toBe(-2);
    expect(incrementMaxValue(10n)).toBe(11);
    expect(incrementMaxValue("41")).toBe(42);
  });

  it("keeps precision past 2^53 by returning a decimal string", () => {
    expect(incrementMaxValue("9007199254740993")).toBe("9007199254740994");
  });

  it("falls back to 1 for a value that isn't a number at all", () => {
    expect(incrementMaxValue("abc")).toBe(1);
  });
});

describe("suggestDuplicateText", () => {
  const numeric: DuplicateColumnChoice = {
    name: "id",
    type: "INT",
    isPrimaryKey: true,
    isUnique: false,
    originalValue: 7,
    autoKind: "next-number",
    canBeNull: false,
  };

  it("suggests one past the copied number", () => {
    expect(suggestDuplicateText(numeric, "")).toBe("8");
  });

  it("hands a UUID column the caller's fresh UUID", () => {
    expect(
      suggestDuplicateText({ ...numeric, autoKind: "uuid" }, "abc-123"),
    ).toBe("abc-123");
  });

  it('suffixes text with " (copy)"', () => {
    expect(
      suggestDuplicateText(
        {
          ...numeric,
          type: "TEXT",
          originalValue: "ada@example.com",
          autoKind: null,
        },
        "",
      ),
    ).toBe("ada@example.com (copy)");
  });
});

describe("isDuplicatePlanComplete", () => {
  const choice: DuplicateColumnChoice = {
    name: "email",
    type: "TEXT",
    isPrimaryKey: false,
    isUnique: true,
    originalValue: "ada@example.com",
    autoKind: null,
    canBeNull: true,
  };

  it("refuses a plan where every column keeps its value", () => {
    expect(isDuplicatePlanComplete([choice], { email: "keep" }, {})).toBe(false);
  });

  it("refuses an empty custom value", () => {
    expect(
      isDuplicatePlanComplete([choice], { email: "custom" }, { email: "" }),
    ).toBe(false);
  });

  it("accepts a filled custom value, or NULL", () => {
    expect(
      isDuplicatePlanComplete([choice], { email: "custom" }, { email: "x" }),
    ).toBe(true);
    expect(isDuplicatePlanComplete([choice], { email: "null" }, {})).toBe(true);
  });

  it("accepts a composite key where only one member moves", () => {
    const a = { ...choice, name: "order_id", autoKind: "next-number" as const };
    const b = { ...choice, name: "product_id" };
    expect(
      isDuplicatePlanComplete(
        [a, b],
        { order_id: "auto", product_id: "keep" },
        {},
      ),
    ).toBe(true);
  });
});

describe("buildDuplicateRowPlan", () => {
  const idChoice: DuplicateColumnChoice = {
    name: "id",
    type: "INT",
    isPrimaryKey: true,
    isUnique: false,
    originalValue: 7,
    autoKind: "next-number",
    canBeNull: false,
  };
  const emailChoice: DuplicateColumnChoice = {
    name: "email",
    type: "TEXT",
    isPrimaryKey: false,
    isUnique: true,
    originalValue: "ada@example.com",
    autoKind: null,
    canBeNull: true,
  };

  it("routes an auto number to nextNumber and a typed value to overrides", () => {
    const plan = buildDuplicateRowPlan(
      [idChoice, emailChoice],
      { id: "auto", email: "custom" },
      { email: "grace@example.com" },
      () => "unused",
    );
    expect(plan.nextNumber).toEqual(["id"]);
    expect(plan.overrides).toEqual([
      { column: "email", value: "grace@example.com" },
    ]);
  });

  it("coerces a typed value to a number for a numeric column", () => {
    const plan = buildDuplicateRowPlan(
      [idChoice],
      { id: "custom" },
      { id: "42" },
      () => "unused",
    );
    expect(plan.overrides).toEqual([{ column: "id", value: 42 }]);
  });

  it("mints one UUID per auto UUID column", () => {
    let n = 0;
    const plan = buildDuplicateRowPlan(
      [{ ...idChoice, type: "uuid", autoKind: "uuid" }],
      { id: "auto" },
      {},
      () => `uuid-${++n}`,
    );
    expect(plan.overrides).toEqual([{ column: "id", value: "uuid-1" }]);
    expect(plan.nextNumber).toEqual([]);
  });

  it("leaves kept columns out of the plan entirely", () => {
    const strategies: Record<string, DuplicateStrategy> = {
      id: "auto",
      email: "keep",
    };
    const plan = buildDuplicateRowPlan(
      [idChoice, emailChoice],
      strategies,
      {},
      () => "unused",
    );
    expect(plan.overrides).toEqual([]);
    expect(plan.nextNumber).toEqual(["id"]);
  });

  it("writes NULL for the set-to-NULL option", () => {
    const plan = buildDuplicateRowPlan(
      [emailChoice],
      { email: "null" },
      {},
      () => "unused",
    );
    expect(plan.overrides).toEqual([{ column: "email", value: null }]);
  });
});

describe("applyDuplicateRowPlan", () => {
  it("returns the row untouched when there is no plan", async () => {
    const resolved = await applyDuplicateRowPlan(
      ["id", "name"],
      [1, "Ada"],
      undefined,
      async () => {
        throw new Error("should not be called");
      },
    );
    expect(resolved).toEqual({ names: ["id", "name"], values: [1, "Ada"] });
  });

  it("substitutes overrides and resolves MAX + 1 for nextNumber columns", async () => {
    const asked: string[] = [];
    const resolved = await applyDuplicateRowPlan(
      ["id", "email"],
      [7, "ada@example.com"],
      {
        nextNumber: ["id"],
        overrides: [{ column: "email", value: "grace@example.com" }],
      },
      async (column) => {
        asked.push(column);
        return 41;
      },
    );
    expect(asked).toEqual(["id"]);
    expect(resolved).toEqual({
      names: ["id", "email"],
      values: [42, "grace@example.com"],
    });
  });

  it("never queries when the plan asks for no generated numbers", async () => {
    const resolved = await applyDuplicateRowPlan(
      ["email"],
      ["ada@example.com"],
      { nextNumber: [], overrides: [{ column: "email", value: null }] },
      async () => {
        throw new Error("should not be called");
      },
    );
    expect(resolved.values).toEqual([null]);
  });

  it("ignores plan entries for columns the INSERT doesn't carry", async () => {
    const resolved = await applyDuplicateRowPlan(
      ["name"],
      ["Ada"],
      { nextNumber: ["id"], overrides: [{ column: "id", value: 1 }] },
      async () => 0,
    );
    expect(resolved).toEqual({ names: ["name"], values: ["Ada"] });
  });
});

describe("constraintInfoFromColumns", () => {
  it("reads the primary key, uniqueness and identity off the column list", () => {
    const info = constraintInfoFromColumns([
      column({ name: "id", type: "integer", pk: 1, identity: true, notNull: true }),
      column({ name: "email", type: "text", unique: true }),
      column({ name: "name", type: "text" }),
    ]);
    expect(info[0]).toMatchObject({
      name: "id",
      isPrimaryKey: true,
      isAutoIncrement: true,
      autoPopulated: true,
      notNull: true,
    });
    expect(info[1]).toMatchObject({
      name: "email",
      isUnique: true,
      autoPopulated: false,
    });
    expect(info[2]).toMatchObject({ isPrimaryKey: false, isUnique: false });
  });

  it("treats a serial default as auto-populated", () => {
    const [info] = constraintInfoFromColumns([
      column({
        name: "id",
        type: "integer",
        pk: 1,
        defaultValue: "nextval('t_id_seq'::regclass)",
      }),
    ]);
    expect(info.isAutoIncrement).toBe(true);
    expect(info.autoPopulated).toBe(true);
  });

  it("treats a UUID default as auto-populated but not auto-increment", () => {
    const [info] = constraintInfoFromColumns([
      column({
        name: "id",
        type: "uuid",
        pk: 1,
        defaultValue: "gen_random_uuid()",
      }),
    ]);
    expect(info.isAutoIncrement).toBe(false);
    expect(info.autoPopulated).toBe(true);
  });
});

describe("newUuid", () => {
  it("returns a distinct, canonically shaped v4 UUID", () => {
    const a = newUuid();
    const b = newUuid();
    expect(looksLikeUuid(a)).toBe(true);
    expect(a[14]).toBe("4");
    expect("89ab").toContain(a[19].toLowerCase());
    expect(a).not.toBe(b);
  });
});
