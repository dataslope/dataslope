import { describe, expect, it } from "vitest";
import {
  COURSE_LANGUAGES,
  courseLanguageHref,
  readFilters,
} from "../app/courses/_components/catalogFilters";
import { readCourseCatalog } from "../scripts/build-course-catalog.mjs";
import { TAG_LABELS } from "../lib/tagLabels";

const LEVELS = ["beginner", "intermediate", "advanced"];

// COURSE_LANGUAGES is hand-kept and one consumer cannot notice drift: the
// sidebar derives its rows from the courses it is handed, but the footer
// renders the list verbatim, so an omission is a language it never links to.
describe("the catalog's language vocabulary", () => {
  const inContent = [
    ...new Set(
      readCourseCatalog()
        .map((c) => c.tags.language?.[0])
        .filter(Boolean) as string[],
    ),
  ].sort();

  it("names every language content/courses actually uses", () => {
    const missing = inContent.filter((l) => !COURSE_LANGUAGES.includes(l));
    expect(
      missing,
      `add these to COURSE_LANGUAGES in app/courses/_components/catalogFilters.ts, ` +
        `in the position the /courses sidebar should show them: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  // The reverse: a language listed with no courses behind it would be a footer
  // link to an empty catalog, and a sidebar row that never renders.
  it("names nothing content/courses has stopped using", () => {
    const stale = COURSE_LANGUAGES.filter((l) => !inContent.includes(l));
    expect(
      stale,
      `these have no courses left and would link to an empty catalog: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  // The footer labels these with `formatTagLabel`. Its fallback title-cases the
  // slug, which is wrong for every language whose name is an acronym or carries
  // punctuation ("Cpp Courses", "Sql Courses"), and silently so.
  it("has a proper display label for every language", () => {
    for (const lang of COURSE_LANGUAGES) {
      expect(TAG_LABELS[lang], `${lang} needs a TAG_LABELS entry`).toBeTruthy();
    }
  });

  // Each footer row is a link the catalog must read back as that language.
  it("builds hrefs the catalog reads back", () => {
    for (const lang of COURSE_LANGUAGES) {
      const href = courseLanguageHref(lang);
      expect(href.startsWith("/courses?")).toBe(true);
      expect(
        readFilters(href.slice(href.indexOf("?")), COURSE_LANGUAGES, LEVELS),
      ).toEqual({ langs: [lang], levels: [] });
    }
  });
});
