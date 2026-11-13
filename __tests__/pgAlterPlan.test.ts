import { describe, expect, it } from "vitest";
import {
  planPgAlter,
  type PgCurrentColumn,
  type PgCurrentTable,
} from "../app/_components/runtime/pgAlterPlan";
import type { ColumnSpec } from "../app/_components/runtime/sqlite-core";

function column(name: string, type: string, extra: Partial<PgCurrentColumn> = {}): PgCurrentColumn {
  return {
    name,
    type,
    notNull: false,
    primaryKey: false,
    defaultValue: null,
    identity: false,
    ownedSequence: null,
    uniqueConstraint: null,
    foreignKeys: [],
    generatedExpression: null,
    ...extra,
  };
}

const USERS: PgCurrentTable = {
  schema: "public",
  name: "users",
  primaryKeyConstraint: "users_pkey",
  columns: [
    column("user_id", "integer", {
      notNull: true,
      primaryKey: true,
      defaultValue: "nextval('users_user_id_seq'::regclass)",
      ownedSequence: "public.users_user_id_seq",
    }),
    column("name", "text", { notNull: true }),
    column("email", "character varying(255)", { uniqueConstraint: "users_email_key" }),
    column("team_id", "integer", {
      foreignKeys: [
        {
          constraint: "users_team_id_fkey",
          table: "teams",
          column: "team_id",
          onDelete: "NO ACTION",
          onUpdate: "NO ACTION",
        },
      ],
    }),
  ],
};

/** The form's description of USERS with nothing changed. */
function unchangedSpec(): ColumnSpec[] {
  return [
    { name: "user_id", originalName: "user_id", type: "serial", notNull: true, primaryKey: true, autoIncrement: true },
    { name: "name", originalName: "name", type: "text", notNull: true },
    { name: "email", originalName: "email", type: "varchar(255)", unique: true },
    {
      name: "team_id",
      originalName: "team_id",
      type: "int4",
      foreignKey: { table: "teams", column: "team_id", onDelete: "NO ACTION", onUpdate: "NO ACTION" },
    },
  ];
}

function plan(columns: ColumnSpec[], newName = "users", current = USERS) {
  return planPgAlter(current, { originalName: current.name, newName, columns });
}

describe("planPgAlter", () => {
  it("plans nothing for a form that changed nothing", () => {
    // Type aliases (serial, varchar, int4) must not read as a type change:
    // the save used to rebuild the table for a no-op.
    expect(plan(unchangedSpec())).toEqual({ statements: [], reorderIgnored: false });
  });

  it("adds a column with one ALTER and touches nothing else", () => {
    const { statements } = plan([
      ...unchangedSpec(),
      { name: "nickname", type: "text", defaultValue: "'none'", notNull: true },
    ]);
    expect(statements).toEqual([
      `ALTER TABLE "public"."users" ADD COLUMN "nickname" text DEFAULT 'none' NOT NULL`,
    ]);
  });

  it("never drops the table or cascades", () => {
    const spec = unchangedSpec().filter((c) => c.name !== "email");
    spec[1] = { ...spec[1], name: "full_name", type: "varchar(80)" };
    const { statements } = plan(spec, "people");
    expect(statements.join("\n")).not.toMatch(/DROP TABLE|CASCADE/i);
    expect(statements).toContain(`ALTER TABLE "public"."users" DROP COLUMN "email"`);
    expect(statements).toContain(
      `ALTER TABLE "public"."users" RENAME COLUMN "name" TO "full_name"`,
    );
    expect(statements).toContain(
      `ALTER TABLE "public"."users" ALTER COLUMN "full_name" TYPE varchar(80) USING "full_name"::varchar(80)`,
    );
    expect(statements[statements.length - 1]).toBe(
      `ALTER TABLE "public"."users" RENAME TO "people"`,
    );
  });

  it("swaps two column names through stopover names", () => {
    const spec = unchangedSpec();
    spec[1] = { ...spec[1], name: "email" };
    spec[2] = { ...spec[2], name: "name" };
    const { statements } = plan(spec);
    const renames = statements.filter((s) => s.includes("RENAME COLUMN"));
    expect(renames).toEqual([
      `ALTER TABLE "public"."users" RENAME COLUMN "name" TO "__rename_0"`,
      `ALTER TABLE "public"."users" RENAME COLUMN "email" TO "__rename_1"`,
      `ALTER TABLE "public"."users" RENAME COLUMN "__rename_0" TO "email"`,
      `ALTER TABLE "public"."users" RENAME COLUMN "__rename_1" TO "name"`,
    ]);
  });

  it("drops a default across a type change and restores it afterwards", () => {
    const current: PgCurrentTable = {
      schema: "public",
      name: "t",
      primaryKeyConstraint: null,
      columns: [column("n", "integer", { defaultValue: "0" })],
    };
    const { statements } = plan(
      [{ name: "n", originalName: "n", type: "bigint", defaultValue: "0" }],
      "t",
      current,
    );
    expect(statements).toEqual([
      `ALTER TABLE "public"."t" ALTER COLUMN "n" DROP DEFAULT`,
      `ALTER TABLE "public"."t" ALTER COLUMN "n" TYPE bigint USING "n"::bigint`,
      `ALTER TABLE "public"."t" ALTER COLUMN "n" SET DEFAULT 0`,
    ]);
  });

  it("starts a new identity past the rows already in the table", () => {
    const current: PgCurrentTable = {
      schema: "public",
      name: "t",
      primaryKeyConstraint: "t_pkey",
      columns: [column("id", "integer", { notNull: true, primaryKey: true })],
    };
    const { statements } = plan(
      [{ name: "id", originalName: "id", type: "integer", primaryKey: true, notNull: true, autoIncrement: true }],
      "t",
      current,
    );
    expect(statements[0]).toBe(
      `ALTER TABLE "public"."t" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY`,
    );
    expect(statements[1]).toContain("setval(pg_get_serial_sequence(");
    expect(statements[1]).toContain(`COALESCE((SELECT MAX("id") FROM "public"."t"), 0) + 1, false)`);
  });

  it("turns off a serial by dropping its default and its sequence", () => {
    const spec = unchangedSpec();
    spec[0] = { ...spec[0], type: "integer", autoIncrement: false };
    expect(plan(spec).statements).toEqual([
      `ALTER TABLE "public"."users" ALTER COLUMN "user_id" DROP DEFAULT`,
      `DROP SEQUENCE IF EXISTS public.users_user_id_seq`,
    ]);
  });

  it("replaces the primary key when its columns change, but not on a rename", () => {
    const renamed = unchangedSpec();
    renamed[0] = { ...renamed[0], name: "id" };
    expect(plan(renamed).statements).toEqual([
      `ALTER TABLE "public"."users" RENAME COLUMN "user_id" TO "id"`,
    ]);

    const composite = unchangedSpec();
    composite[1] = { ...composite[1], primaryKey: true };
    const { statements } = plan(composite);
    expect(statements[0]).toBe(`ALTER TABLE "public"."users" DROP CONSTRAINT "users_pkey"`);
    expect(statements).toContain(
      `ALTER TABLE "public"."users" ADD PRIMARY KEY ("user_id", "name")`,
    );
  });

  it("drops and re-adds a foreign key whose action changed, and only that one", () => {
    const spec = unchangedSpec();
    spec[3] = {
      ...spec[3],
      foreignKey: { table: "teams", column: "team_id", onDelete: "CASCADE", onUpdate: "NO ACTION" },
    };
    expect(plan(spec).statements).toEqual([
      `ALTER TABLE "public"."users" DROP CONSTRAINT "users_team_id_fkey"`,
      `ALTER TABLE "public"."users" ADD FOREIGN KEY ("team_id") REFERENCES "teams"("team_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    ]);
  });

  it("removes a unique constraint by name and adds one where it is new", () => {
    const spec = unchangedSpec();
    spec[2] = { ...spec[2], unique: false };
    spec[1] = { ...spec[1], unique: true };
    expect(plan(spec).statements).toEqual([
      `ALTER TABLE "public"."users" DROP CONSTRAINT "users_email_key"`,
      `ALTER TABLE "public"."users" ADD UNIQUE ("name")`,
    ]);
  });

  it("reports a reorder instead of attempting one", () => {
    const spec = unchangedSpec();
    [spec[1], spec[2]] = [spec[2], spec[1]];
    expect(plan(spec)).toEqual({ statements: [], reorderIgnored: true });
  });

  it("changes a generated column's expression in place", () => {
    const current: PgCurrentTable = {
      schema: "public",
      name: "t",
      primaryKeyConstraint: null,
      columns: [
        column("a", "integer"),
        column("double_a", "integer", { generatedExpression: "(a * 2)" }),
      ],
    };
    const { statements } = plan(
      [
        { name: "a", originalName: "a", type: "integer" },
        {
          name: "double_a",
          originalName: "double_a",
          type: "integer",
          generated: { expression: "a * 3", storageType: "STORED" },
        },
      ],
      "t",
      current,
    );
    expect(statements).toEqual([
      `ALTER TABLE "public"."t" ALTER COLUMN "double_a" SET EXPRESSION AS (a * 3)`,
    ]);
  });

  it("refuses a table with no columns", () => {
    expect(() => plan([])).toThrow("at least one column");
  });
});
