// Pure helpers for the "Explain" action (show a query's execution plan),
// shared by the SQLite / Postgres / DuckDB playgrounds. Kept free of React /
// engine imports so the SQL generation and plan formatting are unit-testable.

import type { SqlDialectId } from "./ddl";

/** Optional EXPLAIN modifiers. Postgres only: `ANALYZE` *runs* the statement
 *  to report real timings and row counts, and `BUFFERS` adds shared-buffer
 *  hit/read counts (which needs ANALYZE to mean anything). */
export interface ExplainOptions {
  analyze?: boolean;
  buffers?: boolean;
}

/** Build the engine-appropriate EXPLAIN statement for `sql`.
 *
 *  - SQLite: plain `EXPLAIN` returns VM bytecode, so we use the
 *    human-readable `EXPLAIN QUERY PLAN`.
 *  - Postgres / DuckDB: plain `EXPLAIN` by default, which *plans* the
 *    statement without executing it, so it's safe even for DML. Postgres also
 *    accepts `ANALYZE` / `BUFFERS` via `opts` — those do execute the
 *    statement, so the caller is responsible for warning about that.
 *
 *  A trailing `;` is tolerated, and an already-`EXPLAIN`-prefixed statement is
 *  passed through unchanged so the user can't double-wrap it. */
export function buildExplainSql(
  dialect: SqlDialectId,
  sql: string,
  opts: ExplainOptions = {},
): string {
  const stmt = sql.trim().replace(/;+\s*$/, "").trim();
  if (/^explain\b/i.test(stmt)) return stmt;
  if (dialect === "sqlite") return `EXPLAIN QUERY PLAN ${stmt}`;
  if (dialect === "postgres") {
    const flags: string[] = [];
    if (opts.analyze) flags.push("ANALYZE");
    // BUFFERS without ANALYZE is accepted but reports nothing useful, so it
    // implies ANALYZE rather than silently producing an empty section.
    if (opts.buffers) {
      if (!opts.analyze) flags.push("ANALYZE");
      flags.push("BUFFERS");
    }
    if (flags.length > 0) return `EXPLAIN (${flags.join(", ")}) ${stmt}`;
  }
  return `EXPLAIN ${stmt}`;
}

/** Redraw a plan's Unicode box-drawing characters (U+2500–U+257F) with their
 *  ASCII lookalikes, one character in one character out so every column keeps
 *  its position.
 *
 *  DuckDB draws its plan tree with `┌─┬─┐ │ └─┴─┘`, but the site's monospace
 *  face is JetBrains Mono served by next/font in its `latin` subset, which
 *  stops well short of the box-drawing block. The browser therefore renders
 *  those characters from a fallback font whose advance width doesn't match:
 *  measured in the plan viewer, box characters take 8.86px against JetBrains
 *  Mono's 7.50px, so every border drifts ~18% to the right of the text it is
 *  supposed to frame and the tree shears apart. Characters we can render are
 *  the fix: `-`, `|` and `+` are plain ASCII, so the whole diagram comes from
 *  one font and lines up — in the dialog, and in whatever the Copy button's
 *  text is pasted into. */
export function boxDrawingToAscii(text: string): string {
  return text.replace(/[\u2500-\u257f]/g, (ch) => {
    const code = ch.codePointAt(0)!;
    // Horizontal runs (light/heavy/double dashes included) read as `-`,
    // uprights as `|`, and every corner, tee and cross as `+`.
    if (HORIZONTAL_BOX_CHARS.has(code)) return "-";
    if (VERTICAL_BOX_CHARS.has(code)) return "|";
    return "+";
  });
}

// U+2500–U+257F, split by the direction each glyph draws in. Anything not
// listed here is a corner/junction and becomes `+`.
const HORIZONTAL_BOX_CHARS = new Set([
  0x2500, 0x2501, 0x2504, 0x2505, 0x2508, 0x2509, 0x254c, 0x254d, 0x2550,
  0x2574, 0x2576, 0x2578, 0x257a, 0x257c, 0x257e,
]);
const VERTICAL_BOX_CHARS = new Set([
  0x2502, 0x2503, 0x2506, 0x2507, 0x250a, 0x250b, 0x254e, 0x254f, 0x2551,
  0x2575, 0x2577, 0x2579, 0x257b, 0x257d, 0x257f,
]);

/** Format the rows an EXPLAIN query returns into readable plan text for the
 *  plan viewer's `<pre>`.
 *
 *  The shape differs per engine: Postgres returns a single `QUERY PLAN` text
 *  column (one plan line per row); SQLite `EXPLAIN QUERY PLAN` returns
 *  `(id, parent, notused, detail)`; DuckDB returns a `(explain_key,
 *  explain_value)` pair whose value is a multi-line tree drawing. When a
 *  `detail` column is present (SQLite) we show just that; otherwise each row's
 *  non-null cells are joined, then rows by newlines.
 *
 *  A row carrying a multi-line cell stacks its cells instead of joining them
 *  with spaces: inlining DuckDB's `physical_plan` label ahead of the drawing
 *  indented only the tree's *first* line, pushing the top of the box 15
 *  columns right of the rest of it. */
export function formatExplainResult(
  columns: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
  if (rows.length === 0) return "(no plan returned)";
  const detailIdx = columns.findIndex((c) => c.toLowerCase() === "detail");
  if (detailIdx >= 0) {
    return boxDrawingToAscii(
      rows.map((r) => String(r[detailIdx] ?? "")).join("\n"),
    );
  }
  return boxDrawingToAscii(
    rows
      .map((row) => {
        const cells = row.map((cell) =>
          cell === null || cell === undefined ? "" : String(cell),
        );
        // Stacked, so a label never indents just the drawing's first line;
        // empty cells would only add blank lines between them.
        if (cells.some((cell) => cell.includes("\n"))) {
          return cells
            .filter((cell) => cell !== "")
            .join("\n")
            .trimEnd();
        }
        return cells.join("  ").trimEnd();
      })
      .join("\n"),
  );
}
