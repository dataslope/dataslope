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
 *  `character varying(15)`); otherwise filter by the typed fragment.
 *
 *  Within the filtered list the best match comes first: an exact match, then
 *  types that start with the fragment, then the rest. The combobox highlights
 *  its first row and Enter takes it, so the order is what decides whether
 *  typing `int` and pressing Enter gives `integer` or `smallint`. (Typing a
 *  complete built-in type used to show the whole list again, first row
 *  highlighted, and Enter then committed whatever that row happened to be.) */
export function computeVisibleTypeGroups(
  groups: readonly ColumnTypeGroup[],
  _options: readonly string[],
  inputValue: string,
  committedValue: string,
): { label: string; types: string[] }[] {
  const query = inputValue.trim().toLowerCase();
  const showAll =
    query === "" || query === committedValue.trim().toLowerCase();
  if (showAll) {
    return groups
      .map((group) => ({ label: group.label, types: [...group.types] }))
      .filter((group) => group.types.length > 0);
  }
  const rank = (type: string) => {
    const lower = type.toLowerCase();
    if (lower === query) return 0;
    return lower.startsWith(query) ? 1 : 2;
  };
  return groups
    .map((group) => ({
      label: group.label,
      types: group.types
        .filter((type) => type.toLowerCase().includes(query))
        .sort((a, b) => rank(a) - rank(b)),
    }))
    .filter((group) => group.types.length > 0)
    .sort(
      (a, b) =>
        Math.min(...a.types.map(rank)) - Math.min(...b.types.map(rank)),
    );
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
