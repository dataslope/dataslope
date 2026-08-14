// Pins the flat-URL redirect table next.config.ts bakes into the routes
// manifest (lib/courseAliasRedirects.ts). Loud failure: a destination that is
// not a real lesson (a redirect to a 404). Quiet failure: the ambiguity rule
// inverting — `next-steps` exists in 31 courses, and picking one would send
// 30 courses' readers to the wrong course while looking healthy.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { courseAliasRedirects } from "../lib/courseAliasRedirects";

const COURSES = join(process.cwd(), "content", "courses");

/** Every real lesson URL, derived independently of the module under test. */
const lessonUrls = (() => {
  const urls = new Set<string>();
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), rel);
      else if (/\.mdx?$/i.test(entry.name)) {
        const stem = rel.replace(/\.mdx?$/i, "").replace(/(^|\/)index$/i, "");
        if (stem) urls.add(`/courses/${stem}`);
      }
    }
  };
  walk(COURSES, "");
  return urls;
})();

describe("courseAliasRedirects", () => {
  const redirects = courseAliasRedirects();

  it("emits redirects at all", () => {
    expect(redirects.length).toBeGreaterThan(500);
  });

  it("sends every flat URL to a lesson that actually exists", () => {
    const broken = redirects.filter((r) => !lessonUrls.has(r.destination));
    expect(broken).toEqual([]);
  });

  it("only ever redirects the one-segment shape", () => {
    const wrongShape = redirects.filter(
      (r) => !/^\/courses\/[^/]+$/.test(r.source),
    );
    expect(wrongShape).toEqual([]);
  });

  it("redirects the flat URL to a deeper path, never to itself", () => {
    const selfOrShorter = redirects.filter(
      (r) => r.destination === r.source || !r.destination.startsWith("/courses/"),
    );
    expect(selfOrShorter).toEqual([]);
    // The whole point: the source is one segment, the destination is more.
    for (const r of redirects) {
      expect(r.destination.split("/").length).toBeGreaterThan(
        r.source.split("/").length,
      );
    }
  });

  it("never shadows a real page", () => {
    // A course root (`/courses/<course>`) is a real one-segment URL. Sending
    // one of those to a lesson would break a working page rather than fix a
    // broken one.
    const shadowing = redirects.filter((r) => lessonUrls.has(r.source));
    expect(shadowing).toEqual([]);
  });

  it("skips lesson slugs that appear in more than one course", () => {
    const sources = new Set(redirects.map((r) => r.source));
    // `next-steps` is the worst offender (31 courses when measured); there is
    // no honest destination for it, so it must stay a 404.
    const leafCounts = new Map<string, number>();
    for (const url of lessonUrls) {
      const parts = url.split("/").slice(2);
      if (parts.length < 2) continue;
      const leaf = parts[parts.length - 1];
      leafCounts.set(leaf, (leafCounts.get(leaf) ?? 0) + 1);
    }
    const ambiguous = [...leafCounts].filter(([, n]) => n > 1).map(([leaf]) => leaf);
    expect(ambiguous.length).toBeGreaterThan(0); // the rule has something to do
    for (const leaf of ambiguous) {
      expect(sources.has(`/courses/${leaf}`)).toBe(false);
    }
  });

  it("covers the two flat URLs confirmed broken in production", () => {
    // Measured 2026-08-14: both 404'd while the two-segment path returned 200.
    const bySource = new Map(redirects.map((r) => [r.source, r.destination]));
    expect(bySource.get("/courses/capstone-data-pipeline")).toBe(
      "/courses/csharp-linq-functional/capstone-data-pipeline",
    );
    expect(bySource.get("/courses/setup-and-tsconfig")).toBe(
      "/courses/typescript-from-scratch/setup-and-tsconfig",
    );
  });

  it("emits permanent redirects in a stable order", () => {
    expect(redirects.every((r) => r.permanent)).toBe(true);
    const sources = redirects.map((r) => r.source);
    expect(sources).toEqual([...sources].sort());
  });

  it("produces no duplicate sources", () => {
    const sources = redirects.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});
