// Guards the "one icon per course" rule for the course-card glyphs
// (app/courses/_components/courseArt.tsx): every root course under
// content/courses must have a bespoke COURSE_MOTIFS entry, no two courses
// may share a motif, and every assigned motif must actually draw something
// (an unknown kind falls through motifShapes' switch to null).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  COURSE_MOTIFS,
  motifShapes,
} from "../app/courses/_components/courseArt";

async function rootCourseSlugs(): Promise<string[]> {
  const coursesDir = path.join(process.cwd(), "content", "courses");
  const entries = await readdir(coursesDir, { withFileTypes: true });
  const slugs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await readFile(
        path.join(coursesDir, entry.name, "meta.json"),
        "utf-8",
      );
      const meta = JSON.parse(raw) as { root?: unknown; title?: unknown };
      if (meta.root === true && typeof meta.title === "string") {
        slugs.push(entry.name);
      }
    } catch {
      // no meta.json — not a course root
    }
  }
  return slugs;
}

describe("course glyph assignments", () => {
  it("gives every course its own bespoke motif", async () => {
    const slugs = await rootCourseSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    const missing = slugs.filter((s) => !(s in COURSE_MOTIFS));
    expect(missing, "courses without a COURSE_MOTIFS entry").toEqual([]);
  });

  it("never assigns the same motif to two courses", () => {
    const seen = new Map<string, string>();
    for (const [slug, motif] of Object.entries(COURSE_MOTIFS)) {
      const other = seen.get(motif);
      expect(
        other,
        `motif "${motif}" is assigned to both "${other}" and "${slug}"`,
      ).toBeUndefined();
      seen.set(motif, slug);
    }
  });

  it("only assigns motifs that draw a shape", () => {
    for (const [slug, motif] of Object.entries(COURSE_MOTIFS)) {
      expect(
        motifShapes(motif),
        `motif "${motif}" (course "${slug}") renders nothing`,
      ).not.toBeNull();
    }
  });

  it("stale entries point at removed courses", async () => {
    const slugs = new Set(await rootCourseSlugs());
    const stale = Object.keys(COURSE_MOTIFS).filter((s) => !slugs.has(s));
    expect(stale, "COURSE_MOTIFS entries without a course").toEqual([]);
  });
});
