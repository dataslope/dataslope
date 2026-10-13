/**
 * A course's `meta.json` description is the line under its title on the
 * `/courses` catalog and the home page's course cards, and it is meant to
 * fit in two lines there. Descriptions had grown to as many as 362
 * characters, which the catalog printed as four or five lines.
 *
 * Characters stand in for rendered lines here. Measured in Chromium
 * (2026-10): the catalog's text column narrows to about 330-360px on
 * phones and tablets, and the home cards to 224-262px, where they clamp to
 * two lines with an ellipsis. At those widths 85 characters is the most
 * that reliably stays within two lines on the catalog; descriptions for
 * the four courses featured on the home page need to stay nearer 60.
 */
import { describe, it, expect } from "vitest";
import { readCourseCatalog } from "../scripts/build-course-catalog.mjs";

const MAX_CHARS = 85;

describe("course catalog descriptions", () => {
  const courses = readCourseCatalog() as { slug: string; description: string }[];

  it.each(courses.map((c) => [c.slug, c.description]))(
    "%s fits in two catalog lines",
    (_slug, description) => {
      expect(description.trim().length, "a description is required").toBeGreaterThan(0);
      expect(description.length, `"${description}" is ${description.length} characters`).toBeLessThanOrEqual(MAX_CHARS);
      expect(description).toMatch(/\.$/);
    },
  );
});
