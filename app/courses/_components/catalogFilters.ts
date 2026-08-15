/**
 * Encodes the `/courses` catalog's language and level selection in the query
 * string (`/courses?lang=python&level=beginner`), so a filtered catalog is a
 * shareable link. Functions take the query string rather than reading
 * `window`, so they are pure and run in the Node test environment.
 */
export const PARAM = { lang: "lang", level: "level" } as const;

/**
 * Languages the catalog sidebar offers, in display order. `CoursesCatalog`
 * uses it as an order (unlisted languages still get a row, appended last);
 * the footer's Courses column uses it as the list itself, since importing the
 * generated catalog there would ship every course to the browser. Hand-kept,
 * so it can go stale — __tests__/coursesCatalogFilters.test.ts fails when a
 * course's language is missing here.
 */
export const COURSE_LANGUAGES: readonly string[] = [
  "python",
  "sql",
  "javascript",
  "typescript",
  "c",
  "cpp",
  "csharp",
  "java",
  "r",
  "css",
  "html",
];

/**
 * The catalog filtered to one language. Link these as plain `<a>` document
 * navigations, not `<Link>`: the catalog reads the query string via a
 * `popstate`-subscribed store, which a `<Link>` pushState never fires — from
 * `/courses` itself the address bar would change while the unfiltered list
 * stayed on screen. Same-document links are also bad prefetch candidates.
 */
export function courseLanguageHref(language: string): string {
  return `/courses?${PARAM.lang}=${encodeURIComponent(language)}`;
}

/**
 * The selection encoded in `search`, as 0-or-1-element arrays. Values the
 * catalog does not have are dropped rather than applied — a stale `?lang=`
 * link shows the full catalog instead of an empty dead end.
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
 * The query string for a selection. Preserves foreign params (e.g. utm tags);
 * returns "" when nothing is left, which the caller turns into a bare path.
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
