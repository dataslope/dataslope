// Guards e2e/_discoverPages.ts, the page list behind the COURSEWARE=1 sweeps.
// The failure mode is silence: a collection missing from the hardcoded list
// makes the sweep green over an undeclared subset (content/interview was
// absent, so its runnable blocks were checked by nothing). Assertions are
// therefore about coverage of the declarations: every MDX collection in
// source.config.ts must appear, at its real route prefix from lib/source.ts.
import * as fs from "node:fs";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { SECTIONS, discoverPages } from "../e2e/_discoverPages";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");

/** `export const <name> = defineDocs({ dir: "content/<x>" … })` from
 *  source.config.ts, as a name → dir map. */
function declaredCollections(): Map<string, string> {
  const src = fs.readFileSync(path.join(ROOT, "source.config.ts"), "utf8");
  const out = new Map<string, string>();
  for (const m of src.matchAll(
    /export\s+const\s+(\w+)\s*=\s*defineDocs\s*\(\s*\{[\s\S]*?dir:\s*"([^"]+)"/g,
  )) {
    out.set(m[1], m[2]);
  }
  return out;
}

/** `loader({ baseUrl: "…", source: <name>.toFumadocsSource() })` from
 *  lib/source.ts, as a collection-name → baseUrl map. */
function declaredBaseUrls(): Map<string, string> {
  const src = fs.readFileSync(path.join(ROOT, "lib", "source.ts"), "utf8");
  const out = new Map<string, string>();
  for (const m of src.matchAll(
    /loader\s*\(\s*\{[\s\S]*?baseUrl:\s*"([^"]+)"[\s\S]*?source:\s*(\w+)\.toFumadocsSource\(\)/g,
  )) {
    out.set(m[2], m[1]);
  }
  return out;
}

describe("discoverPages sections", () => {
  it("covers every MDX collection declared in source.config.ts", () => {
    const collections = declaredCollections();
    expect(collections.size).toBeGreaterThan(0);

    const covered = new Set(SECTIONS.map((s) => path.relative(ROOT, s.dir).replace(/\\/g, "/")));
    for (const [name, dir] of collections) {
      expect(covered, `collection "${name}" (${dir}) is not swept by discoverPages`).toContain(dir);
    }
  });

  it("uses each collection's real route prefix from lib/source.ts", () => {
    const collections = declaredCollections();
    const baseUrls = declaredBaseUrls();
    const byDir = new Map(
      SECTIONS.map((s) => [path.relative(ROOT, s.dir).replace(/\\/g, "/"), s.base]),
    );

    for (const [name, dir] of collections) {
      const expected = baseUrls.get(name);
      expect(expected, `no loader() baseUrl found for collection "${name}"`).toBeDefined();
      // content/interview is served at /interview-prep; the directory name and
      // the route intentionally differ, which is exactly the kind of mismatch
      // a hand-maintained list gets wrong.
      expect(byDir.get(dir), `wrong route prefix for ${dir}`).toBe(expected);
    }
  });

  it("points every section at a directory that exists", () => {
    for (const { dir } of SECTIONS) {
      expect(fs.existsSync(dir), `${dir} does not exist`).toBe(true);
    }
  });
});

describe("discoverPages results", () => {
  it("finds interview-prep pages for each swept component", () => {
    for (const tag of ["<CodeBlock", "<ChallengeCard", "<SqlCodeBlock"]) {
      const interview = discoverPages([tag]).filter((p) => p.route.startsWith("/interview-prep/"));
      expect(interview.length, `no /interview-prep pages contain ${tag}`).toBeGreaterThan(0);
    }
  });

  it("maps interview files to /interview-prep routes", () => {
    const pages = discoverPages(["<CodeBlock"]);
    const concurrency = pages.find((p) => p.file.endsWith("backend-engineer/concurrency.mdx"));
    // This page keeps one runnable asyncio block; the two threading blocks are
    // shown rather than run (Pyodide is built without pthreads).
    expect(concurrency?.route).toBe("/interview-prep/backend-engineer/concurrency");
  });

  it("returns routes sorted and unique", () => {
    const routes = discoverPages(["<CodeBlock"]).map((p) => p.route);
    expect(routes).toEqual([...routes].sort((a, b) => a.localeCompare(b)));
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("does not miss any .mdx file under a swept directory", () => {
    // `discoverPages` filters by tag; with a tag that every file trivially
    // contains ("---" opens the frontmatter) it should return the whole tree.
    const found = discoverPages(["---"]).length;
    const onDisk = SECTIONS.reduce((n, { dir }) => n + countMdx(dir), 0);
    expect(found).toBe(onDisk);
  });
});

function countMdx(dir: string): number {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) n += countMdx(p);
    else if (entry.name.endsWith(".mdx")) n += 1;
  }
  return n;
}

describe("content tree", () => {
  it("has no unswept collection directory", () => {
    // A directory added under content/ that no section covers is either a new
    // collection (add it to SECTIONS) or not content at all.
    const swept = new Set(SECTIONS.map((s) => path.basename(s.dir)));
    const dirs = fs
      .readdirSync(CONTENT_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    expect([...dirs].sort()).toEqual([...swept].sort());
  });
});
