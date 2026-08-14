/** Helpers shared by the column-type pickers in the Modify Structure
 *  drawers across SQL dialects. They keep the picker honest about the
 *  column's *current* type even when that type isn't one of the built-in
 *  presets, e.g. a Postgres `character varying(15)`, a `varchar(15)`, or a
 *  DuckDB `DECIMAL(10,2)` introspected from an existing table. */

/** A labelled group of built-in type strings, as rendered by the Postgres
 *  and DuckDB type comboboxes. */
export interface ColumnTypeGroup {
  readonly label: string;
  readonly types: readonly string[];
}

/** Decide which built-in type groups to show in a column-type combobox: all
 *  groups while the field is empty or still equals the committed type
 *  (including custom/parameterized types absent from the built-in list, e.g.
 *  `character varying(15)`); otherwise filter by the typed fragment. */
export function computeVisibleTypeGroups(
  groups: readonly ColumnTypeGroup[],
  options: readonly string[],
  inputValue: string,
  committedValue: string,
): { label: string; types: string[] }[] {
  const query = inputValue.trim().toLowerCase();
  const showAll =
    query === "" ||
    query === committedValue.trim().toLowerCase() ||
    options.some((type) => type.toLowerCase() === query);
  return groups
    .map((group) => ({
      label: group.label,
      types: showAll
        ? [...group.types]
        : group.types.filter((type) => type.toLowerCase().includes(query)),
    }))
    .filter((group) => group.types.length > 0);
}

/** A native `<select>` can only display a value that exactly matches one of
 *  its `<option>`s. SQLite is dynamically typed, so a column's declared type
 *  may be anything (`VARCHAR(15)`, `character varying(15)`, a lowercase
 *  `integer`, …) and need not appear in the built-in affinity list. Prepend
 *  the current type as an extra option whenever it isn't already an exact
 *  match so it stays visible and is preserved when the user edits other
 *  fields, instead of the select silently rendering blank. */
export function withCurrentTypeOption(
  knownTypes: readonly string[],
  currentType: string,
): string[] {
  const trimmed = currentType.trim();
  if (!trimmed || knownTypes.includes(trimmed)) {
    return [...knownTypes];
  }
  return [trimmed, ...knownTypes];
}
