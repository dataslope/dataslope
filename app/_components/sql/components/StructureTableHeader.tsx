/**
 * Two-tier grouped header for the Postgres / DuckDB structure tables in the
 * View/Edit Structure and Add Table drawers. The first tier brackets the
 * boolean constraint checkboxes and the foreign-key fields under shared
 * labels; the second tier names each column. (SQLite renders its own header
 * inline because it carries per-column info popovers and dialect-specific
 * labels such as "Auto-increment".)
 */
export function StructureTableHeader() {
  return (
    <thead>
      <tr className="sql-modify-group-row">
        <th aria-hidden="true" />
        <th aria-hidden="true" />
        <th aria-hidden="true" />
        <th className="sql-modify-group-label" colSpan={4}>
          Constraints
        </th>
        <th aria-hidden="true" />
        <th className="sql-modify-group-label" colSpan={4}>
          Foreign key
        </th>
        <th aria-hidden="true" />
      </tr>
      <tr>
        <th className="sql-modify-drag-cell" aria-label="Drag handle" />
        <th>Name</th>
        <th>Type</th>
        <th className="sql-modify-th-center">Not null</th>
        <th className="sql-modify-th-center">Primary</th>
        <th className="sql-modify-th-center">Unique</th>
        <th
          className="sql-modify-th-center"
          title="Identity / serial (auto-incrementing) column"
        >
          Identity
        </th>
        <th>Default</th>
        <th>Table</th>
        <th>Column</th>
        <th>On delete</th>
        <th>On update</th>
        <th aria-label="Actions" />
      </tr>
    </thead>
  );
}
