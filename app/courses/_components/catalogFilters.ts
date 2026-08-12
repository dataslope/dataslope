/**
 * Encoding the `/courses` catalog's language and level selection in the query
 * string, so a filtered catalog is a link someone can send:
 * `/courses?lang=python`, `/courses?level=beginner`, or both together.
 *
 * Kept apart from `CoursesCatalog.tsx` because it is the only part of the
 * feature with branches worth testing: which values are accepted, which are
 * ignored, and what happens to parameters that belong to somebody else. The
 * component holds the two effects that call these, which are mechanical.
 *
 * Both functions take the query string rather than reading `window`, so they
 * are pure and run in the Node test environment.
 */
export const PARAM = { lang: "lang", level: "level" } as const;

/**
 * The selection encoded in `search`, as the 0-or-1-element arrays the catalog
 * keeps its filter state in.
 *
 * Values the catalog does not have are ignored rather than applied. Applying
 * `?lang=cobol` would show an empty catalog filtered by a language with no row
 * in the sidebar to switch off again, which is a dead end; dropping it shows
 * the full catalog, which is what a visitor following a stale link wants.
 */
export function readFilters(
  search: string,
  languages: readonly string[],
  levels: readonly string[],
): { langs: string[]; levels: string[] } {
  const params = new URLSearchParams(search);
  const lang = params.get(PARAM.lang);
  const level = params.get(PARAM.level);
  return {
    langs: lang && languages.includes(lang) ? [lang] : [],
    levels: level && levels.includes(level) ? [level] : [],
  };
}

/**
 * The query string for a selection, as it should appear in the address bar.
 *
 * Starts from the URL's existing parameters so anything that is not ours
 * survives: someone arriving on `?lang=python&utm_source=newsletter` and then
 * clearing the filter should keep their campaign tag. Returns "" when nothing
 * is left, which the caller turns into a bare path rather than a trailing "?".
 */
export function writeFilters(
  search: string,
  langs: readonly string[],
  levels: readonly string[],
): string {
  const params = new URLSearchParams(search);
  if (langs[0]) params.set(PARAM.lang, langs[0]);
  else params.delete(PARAM.lang);
  if (levels[0]) params.set(PARAM.level, levels[0]);
  else params.delete(PARAM.level);
  return params.toString();
}
