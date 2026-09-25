/**
 * The course catalog is generated at build time so / and /courses render
 * without a filesystem (workerd has none — a request-time read once 500'd in
 * production). This keeps a filesystem import from creeping back into that
 * render path.
 */
import { describe, it, expect } from "vitest";

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
