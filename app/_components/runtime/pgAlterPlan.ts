// Plans the `ALTER TABLE` statements that take a Postgres table from its
// current shape to the one the structure editor describes.
//
// The editor used to save by rebuilding: create a temp table, copy the rows,
// `DROP TABLE … CASCADE`, rename. That is how SQLite has to do it, and in
// Postgres it silently destroyed everything hanging off the table: views,
// foreign keys *other* tables held against it, user indexes, CHECK
// constraints, triggers, comments, and the position of every serial
// sequence (the next INSERT then collided with an existing key). Adding one
// column to the sample `users` table removed two of its three views.
//
// Postgres can express every edit the form offers except reordering, so the
// save is now a diff. Whatever the form does not model is simply never
// touched, and a change something depends on (dropping a column a view
// reads) fails with Postgres's own error instead of cascading.
//
// Pure and synchronous on purpose: the caller reads the catalog, this turns
// two descriptions into SQL, and `__tests__/pgAlterPlan.test.ts` can pin the
// output without a database.

import type { ColumnSpec, TableRebuildSpec } from "./sqlite-core";

/** One column as the catalog reports it today. */
export interface PgCurrentColumn {
  name: string;
  /** `format_type()` text, e.g. `integer`, `numeric(10,2)`. */
  type: string;
  notNull: boolean;
  primaryKey: boolean;
  /** Raw default expression, or null. A serial's `nextval(...)` included. */
  defaultValue: string | null;
  /** `GENERATED … AS IDENTITY`. */
  identity: boolean;
  /** The sequence a serial column owns (`pg_get_serial_sequence`), if any. */
  ownedSequence: string | null;
  /** Name of the single-column UNIQUE constraint on it, if any. */
  uniqueConstraint: string | null;
  /** Single-column foreign keys declared on it. */
  foreignKeys: {
    constraint: string;
    table: string;
    column: string;
    onDelete: string;
    onUpdate: string;
  }[];
  /** Expression of a `GENERATED ALWAYS AS (…) STORED` column, else null. */
  generatedExpression: string | null;
}

export interface PgCurrentTable {
  schema: string;
  name: string;
  columns: PgCurrentColumn[];
  /** Name of the PRIMARY KEY constraint, if the table has one. */
  primaryKeyConstraint: string | null;
}

export interface PgAlterPlan {
  /** Statements to run in order, inside one transaction. */
  statements: string[];
  /** The form moved existing columns relative to each other. Postgres has no
   *  way to do that short of recreating the table, so it is reported rather
   *  than attempted. New columns are always appended. */
  reorderIgnored: boolean;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

const FK_ACTIONS = new Set([
  "NO ACTION",
  "RESTRICT",
  "CASCADE",
  "SET NULL",
  "SET DEFAULT",
]);

function fkAction(action: string | undefined): string {
  const normalized = (action || "NO ACTION").trim().toUpperCase();
  return FK_ACTIONS.has(normalized) ? normalized : "NO ACTION";
}

const SERIAL_BASE: Record<string, string> = {
  serial: "integer",
  serial4: "integer",
  bigserial: "bigint",
  serial8: "bigint",
  smallserial: "smallint",
  serial2: "smallint",
};

/** The storage type a spec asks for: a serial pseudo-type is its integer
 *  type plus a sequence, and only the first half is a column type. */
function baseType(type: string): string {
  const trimmed = (type || "text").trim();
  return SERIAL_BASE[trimmed.toLowerCase()] ?? trimmed;
}

/** Spellings Postgres treats as the same type. Only used to decide whether
 *  an `ALTER … TYPE` is needed, so it has to recognise the common aliases
 *  and nothing more: an unrecognised difference costs one harmless ALTER. */
const TYPE_ALIASES: [RegExp, string][] = [
  [/^int4?$/, "integer"],
  [/^int8$/, "bigint"],
  [/^int2$/, "smallint"],
  [/^bool$/, "boolean"],
  [/^float8$/, "double precision"],
  [/^float4$/, "real"],
  [/^decimal\b/, "numeric"],
  [/^varchar\b/, "character varying"],
  [/^char\b/, "character"],
  [/^timestamptz$/, "timestamp with time zone"],
  [/^timestamp$/, "timestamp without time zone"],
  [/^timetz$/, "time with time zone"],
  [/^time$/, "time without time zone"],
];

function canonicalType(type: string): string {
  let t = baseType(type).toLowerCase().replace(/\s+/g, " ").trim();
  t = t.replace(/\s*\(\s*/g, "(").replace(/\s*,\s*/g, ",").replace(/\s*\)/g, ")");
  for (const [pattern, replacement] of TYPE_ALIASES) {
    if (pattern.test(t)) {
      t = t.replace(pattern, replacement);
      break;
    }
  }
  return t;
}

function sameDefault(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").trim() === (b ?? "").trim();
}

function isSequenceDefault(expr: string | null): boolean {
  return /^nextval\s*\(/i.test((expr ?? "").trim());
}

function fkClause(column: string, fk: NonNullable<ColumnSpec["foreignKey"]>) {
  return (
    `FOREIGN KEY (${quoteIdent(column)}) REFERENCES ${quoteIdent(fk.table)}(${quoteIdent(fk.column)})` +
    ` ON DELETE ${fkAction(fk.onDelete)} ON UPDATE ${fkAction(fk.onUpdate)}`
  );
}

/** `ADD COLUMN` body for a brand-new column. Table-level pieces (PRIMARY
 *  KEY, FOREIGN KEY) are added afterwards with the rest. */
function newColumnDef(col: ColumnSpec): string {
  const name = quoteIdent(col.name);
  if (col.generated) {
    return `${name} ${baseType(col.type)} GENERATED ALWAYS AS (${col.generated.expression}) STORED`;
  }
  const type = baseType(col.type);
  const parts = [name, type];
  if (col.autoIncrement) parts.push("GENERATED BY DEFAULT AS IDENTITY");
  else if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`);
  if (col.notNull && !col.autoIncrement) parts.push("NOT NULL");
  if (col.unique && !col.primaryKey) parts.push("UNIQUE");
  return parts.join(" ");
}

export function planPgAlter(
  current: PgCurrentTable,
  spec: TableRebuildSpec,
): PgAlterPlan {
  const out: string[] = [];
  const schemaPrefix = `${quoteIdent(current.schema)}.`;
  const table = `${schemaPrefix}${quoteIdent(current.name)}`;
  const alter = (clause: string) => out.push(`ALTER TABLE ${table} ${clause}`);

  const currentByName = new Map(current.columns.map((c) => [c.name, c]));
  const columns = spec.columns
    .filter((c) => c.name.trim())
    .map((c) => ({ ...c, name: c.name.trim(), type: (c.type || "text").trim() }));
  if (columns.length === 0) {
    throw new Error("A table must have at least one column.");
  }

  // Pair every spec column with the catalog column it came from. A spec
  // column whose `originalName` no longer exists is treated as new.
  const kept = columns
    .map((col) => ({
      col,
      was: col.originalName ? currentByName.get(col.originalName) : undefined,
    }))
    .filter((pair): pair is { col: (typeof columns)[number]; was: PgCurrentColumn } =>
      Boolean(pair.was),
    );
  const added = columns.filter(
    (col) => !col.originalName || !currentByName.has(col.originalName),
  );
  const keptNames = new Set(kept.map((pair) => pair.was.name));
  const dropped = current.columns.filter((c) => !keptNames.has(c.name));

  const wantsFk = (col: ColumnSpec) =>
    col.foreignKey?.table && col.foreignKey.column && !col.generated
      ? col.foreignKey
      : null;

  // ── 1. Constraints that go away, before the columns they sit on move ──
  for (const { col, was } of kept) {
    const want = wantsFk(col);
    for (const fk of was.foreignKeys) {
      const unchanged =
        want &&
        was.foreignKeys.length === 1 &&
        want.table === fk.table &&
        want.column === fk.column &&
        fkAction(want.onDelete) === fkAction(fk.onDelete) &&
        fkAction(want.onUpdate) === fkAction(fk.onUpdate);
      if (!unchanged) alter(`DROP CONSTRAINT ${quoteIdent(fk.constraint)}`);
    }
    if (was.uniqueConstraint && !(col.unique && !col.primaryKey)) {
      alter(`DROP CONSTRAINT ${quoteIdent(was.uniqueConstraint)}`);
    }
  }

  const oldPk = current.columns.filter((c) => c.primaryKey).map((c) => c.name);
  const newPk = columns.filter((c) => c.primaryKey).map((c) => c.name);
  // Compared by the names the columns will have, so a renamed key column is
  // not mistaken for a key change.
  const oldPkRenamed = oldPk.map(
    (name) => kept.find((pair) => pair.was.name === name)?.col.name ?? `\u0000${name}`,
  );
  const pkChanged =
    oldPkRenamed.length !== newPk.length ||
    oldPkRenamed.some((name) => !newPk.includes(name));
  if (pkChanged && current.primaryKeyConstraint) {
    alter(`DROP CONSTRAINT ${quoteIdent(current.primaryKeyConstraint)}`);
  }

  // ── 2. Dropped columns. No CASCADE: a view or another table's foreign
  //       key that still needs the column makes this fail, by design. ──
  for (const col of dropped) alter(`DROP COLUMN ${quoteIdent(col.name)}`);

  // ── 3. Renames. A swap (a→b while b→a) needs a stopover name. ──
  const renames = kept.filter(({ col, was }) => col.name !== was.name);
  const liveNames = new Set(kept.map((pair) => pair.was.name));
  const collides = renames.some(({ col }) => liveNames.has(col.name));
  if (collides) {
    renames.forEach(({ was }, i) =>
      alter(
        `RENAME COLUMN ${quoteIdent(was.name)} TO ${quoteIdent(`__rename_${i}`)}`,
      ),
    );
    renames.forEach(({ col }, i) =>
      alter(
        `RENAME COLUMN ${quoteIdent(`__rename_${i}`)} TO ${quoteIdent(col.name)}`,
      ),
    );
  } else {
    for (const { col, was } of renames) {
      alter(`RENAME COLUMN ${quoteIdent(was.name)} TO ${quoteIdent(col.name)}`);
    }
  }

  // ── 4. Type, nullability, default and identity of surviving columns ──
  for (const { col, was } of kept) {
    const name = quoteIdent(col.name);
    if (col.generated) {
      if (
        was.generatedExpression !== null &&
        col.generated.expression.trim() !== was.generatedExpression.trim()
      ) {
        alter(`ALTER COLUMN ${name} SET EXPRESSION AS (${col.generated.expression})`);
      }
      continue;
    }

    const wasAuto = was.identity || isSequenceDefault(was.defaultValue);
    const wantAuto = Boolean(col.autoIncrement);
    const typeChanged = canonicalType(col.type) !== canonicalType(was.type);
    const wantDefault = wantAuto ? null : (col.defaultValue?.trim() || null);
    const hadDefault = wasAuto ? null : was.defaultValue;
    const defaultChanged = !sameDefault(wantDefault, hadDefault);

    // Stop auto-numbering first: the default it leaves behind would
    // otherwise be carried through a type change it cannot survive.
    if (wasAuto && !wantAuto) {
      if (was.identity) alter(`ALTER COLUMN ${name} DROP IDENTITY IF EXISTS`);
      else {
        alter(`ALTER COLUMN ${name} DROP DEFAULT`);
        if (was.ownedSequence) out.push(`DROP SEQUENCE IF EXISTS ${was.ownedSequence}`);
      }
    }
    // An existing default is dropped across a type change and re-added
    // after it: Postgres refuses to cast most defaults automatically.
    if (hadDefault && (defaultChanged || typeChanged)) {
      alter(`ALTER COLUMN ${name} DROP DEFAULT`);
    }
    if (typeChanged) {
      const type = baseType(col.type);
      alter(`ALTER COLUMN ${name} TYPE ${type} USING ${name}::${type}`);
    }
    // Primary-key columns are NOT NULL by definition; never try to relax one.
    const wantNotNull = Boolean(col.notNull) || Boolean(col.primaryKey) || wantAuto;
    if (wantNotNull && !was.notNull) alter(`ALTER COLUMN ${name} SET NOT NULL`);
    if (!wantNotNull && was.notNull && !was.primaryKey) {
      alter(`ALTER COLUMN ${name} DROP NOT NULL`);
    }
    if (wantDefault && (defaultChanged || typeChanged)) {
      alter(`ALTER COLUMN ${name} SET DEFAULT ${wantDefault}`);
    }
    if (wantAuto && !wasAuto) {
      alter(`ALTER COLUMN ${name} ADD GENERATED BY DEFAULT AS IDENTITY`);
      // Start past the rows already there, or the first insert collides.
      out.push(
        `SELECT setval(pg_get_serial_sequence(${quoteLiteral(`${quoteIdent(current.schema)}.${quoteIdent(current.name)}`)}, ${quoteLiteral(col.name)}), ` +
          `COALESCE((SELECT MAX(${name}) FROM ${table}), 0) + 1, false)`,
      );
    }
  }

  // ── 5. New columns, appended in the order the form lists them ──
  for (const col of added) alter(`ADD COLUMN ${newColumnDef(col)}`);

  // ── 6. Constraints that arrive ──
  if (pkChanged && newPk.length > 0) {
    alter(`ADD PRIMARY KEY (${newPk.map(quoteIdent).join(", ")})`);
  }
  for (const { col, was } of kept) {
    if (col.generated) continue;
    if (col.unique && !col.primaryKey && !was.uniqueConstraint) {
      alter(`ADD UNIQUE (${quoteIdent(col.name)})`);
    }
    const want = wantsFk(col);
    if (!want) continue;
    const existing =
      was.foreignKeys.length === 1 &&
      was.foreignKeys[0].table === want.table &&
      was.foreignKeys[0].column === want.column &&
      fkAction(was.foreignKeys[0].onDelete) === fkAction(want.onDelete) &&
      fkAction(was.foreignKeys[0].onUpdate) === fkAction(want.onUpdate);
    if (!existing) alter(`ADD ${fkClause(col.name, want)}`);
  }
  for (const col of added) {
    const want = wantsFk(col);
    if (want) alter(`ADD ${fkClause(col.name, want)}`);
  }

  // ── 7. The table's own name, last so everything above can address it ──
  const finalName = spec.newName.trim();
  if (!finalName) throw new Error("Table name cannot be empty.");
  if (finalName !== current.name) {
    alter(`RENAME TO ${quoteIdent(finalName)}`);
  }

  // Existing columns keep their catalog order whatever the form shows.
  const catalogOrder = current.columns
    .filter((c) => keptNames.has(c.name))
    .map((c) => c.name);
  const formOrder = kept.map((pair) => pair.was.name);
  const reorderIgnored = catalogOrder.some((name, i) => formOrder[i] !== name);

  return { statements: out, reorderIgnored };
}
