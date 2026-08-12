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
 * Every language the catalog sidebar offers a row for, in the order it offers
 * them. Two consumers, and they need it for different reasons.
 *
 * `CoursesCatalog` uses it as an *order*: its rows are the languages that
 * actually occur in the courses it was handed, sorted by this list, with
 * anything unlisted appended alphabetically. So a language missing from here
 * still gets a row — just last.
 *
 * The footer's Courses column uses it as the *list itself*, because it has no
 * courses to derive one from. `HomeFooter` renders on every route and inside
 * the home page's client tree, so importing the generated catalog there to
 * count languages would ship every course's title, description, and tags to
 * the browser to produce eleven links.
 *
 * That second use is what makes this hand-kept list able to go stale: add a
 * course in a language not named here and the sidebar absorbs it silently
 * while the footer never learns about it. `__tests__/coursesCatalogFilters.
 * test.ts` fails in exactly that case.
 *
 * Not wired into `readFilters` as its default: that function validates
 * against the languages a given catalog actually has, which is narrower than
 * this and is the whole point of the check (see its doc comment).
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
 * The catalog filtered to one language, in the form `readFilters` reads back
 * out.
 *
 * ── Link these as document navigations, not `<Link>` ───────────────────────
 *
 * Every one of these hrefs is the same document: the filter is applied in the
 * browser from the query string, so `?lang=r` and `?lang=sql` are `/courses`
 * with different reading instructions. `CoursesCatalog` picks those up with a
 * `useSyncExternalStore` subscribed to `popstate`, which means it notices a
 * new query string when it mounts, and when the visitor uses Back/Forward.
 *
 * A Next `<Link>` navigates with `pushState`, which fires neither. Linking one
 * of these from a page that is *not* `/courses` still works, because the
 * catalog mounts fresh and reads the URL on its way up — but from `/courses`
 * itself the component is already mounted, so the address bar would change to
 * `?lang=r` and the unfiltered list would stay on screen. The footer's Courses
 * column is exactly that case (it renders on `/courses`), so it links these
 * with a plain `<a>`. Do the same for any new caller.
 *
 * The one-document property also makes these bad prefetch candidates: eleven
 * links, one payload, already fetched by any plain `/courses` link nearby.
 */
export function courseLanguageHref(language: string): string {
  return `/courses?${PARAM.lang}=${encodeURIComponent(language)}`;
}

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
