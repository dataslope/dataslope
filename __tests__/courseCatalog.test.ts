/**
 * The course catalog is generated at build time so / and /courses render
 * without a filesystem (workerd has none — a request-time read once 500'd in
 * production). These tests re-derive the catalog from disk and compare, so a
 * course added or renamed without a rebuild fails here rather than shipping
 * a home page that quietly omits it.
 */
import { describe, it, expect } from "vitest";
import { readCourseCatalog } from "../scripts/build-course-catalog.mjs";
import generated from "../lib/generated/course-catalog.js";
import generatedStats from "../lib/generated/home-stats.js";
import { readHomeStats } from "../scripts/build-home-stats.mjs";
import { getCourseCatalog } from "../lib/courseCatalog";

describe("generated course catalog", () => {
  it("matches what is on disk under content/courses", () => {
    expect(generated).toEqual(readCourseCatalog());
  });

  it("is not empty", () => {
    // An empty catalog renders as a home page with no course cards, which
    // reads as a styling bug rather than a data one. The generator exits
    // non-zero on this too; this catches a hand-edited or truncated file.
    expect(generated.length).toBeGreaterThan(0);
  });

  it("carries a slug, title and tags for every course", () => {
    for (const course of generated) {
      expect(course.slug, JSON.stringify(course)).toBeTruthy();
      expect(typeof course.title).toBe("string");
      expect(course.title.length).toBeGreaterThan(0);
      expect(typeof course.description).toBe("string");
      expect(course.tags).toBeTypeOf("object");
    }
  });
});

describe("generated home stats", () => {
  it("matches a fresh scan of the MDX corpus", () => {
    expect(generatedStats).toEqual(readHomeStats());
  });

  it("has no zero figures", () => {
    // A zero means the corpus scan stopped matching (a renamed component, a
    // moved content directory) and the grid would advertise "0+ runnable code
    // blocks". The generator refuses to emit this; this catches a stale file.
    for (const [key, value] of Object.entries(generatedStats)) {
      expect(value, `${key} should be non-zero`).toBeGreaterThan(0);
    }
  });
});

describe("the / and /courses render path", () => {
  // These routes 500 when they touch the filesystem (workerd has no node:fs),
  // and a reintroduced import is invisible until production — so assert on
  // the sources rather than trust review.
  it.each([
    "../lib/courseCatalog.ts",
    "../app/page.tsx",
    "../app/courses/page.tsx",
  ])("%s imports no filesystem module", async (file) => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    expect(src).not.toMatch(/from\s+["']node:fs/);
    expect(src).not.toMatch(/from\s+["']fs["']/);
    expect(src).not.toMatch(/require\(["'](node:)?fs/);
  });
});

describe("getCourseCatalog", () => {

  it("returns every generated course, ranked with ties alphabetical", async () => {
    const catalog = await getCourseCatalog();
    expect(catalog).toHaveLength(generated.length);
    expect(new Set(catalog.map((c) => c.slug))).toEqual(
      new Set(generated.map((c) => c.slug)),
    );
    for (let i = 1; i < catalog.length; i++) {
      const prev = catalog[i - 1];
      const cur = catalog[i];
      expect(
        prev.popularity < cur.popularity ||
          (prev.popularity === cur.popularity &&
            prev.title.localeCompare(cur.title) <= 0),
        `${prev.slug} (${prev.popularity}) should sort before ${cur.slug} (${cur.popularity})`,
      ).toBe(true);
    }
  });
});
