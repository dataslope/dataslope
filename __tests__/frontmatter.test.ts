// Guards the YAML frontmatter of every authored MDX page.
//
// `fumadocs-mdx` parses each page's frontmatter as YAML at the very start of
// `npm run build`, before `next build` runs. An unquoted scalar containing a
// colon-space (`description: A read order, built on one principle: risk first`)
// is a YAML mapping entry, not a string, so the whole build dies with
// "bad indentation of a mapping entry" and a snippet that does not name the
// file. Nothing in the rest of the suite reads frontmatter, so this used to be
// invisible to `npm test` and only surfaced in a Cloudflare Workers Build.
//
// This suite calls the same `frontmatter()` helper the build calls, so a page
// that parses here parses there. Fix a failure by quoting the value:
//
//   description: "A read order, built on one principle: risk first"
//
// 85 values in the corpus already carry quotes for exactly this reason.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { frontmatter } from "fumadocs-core/content/md/frontmatter";

const CONTENT_DIR = path.join(process.cwd(), "content");

async function mdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await mdxFiles(full)));
    else if (entry.name.endsWith(".mdx")) files.push(full);
  }
  return files;
}

describe("authored MDX frontmatter", () => {
  it("parses as YAML on every page", async () => {
    const files = await mdxFiles(CONTENT_DIR);
    expect(files.length).toBeGreaterThan(500);

    const failures: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf-8");
      try {
        frontmatter(source);
      } catch (error) {
        const reason =
          error instanceof Error ? error.message.split("\n")[0] : String(error);
        failures.push(`  ${path.relative(process.cwd(), file)}: ${reason}`);
      }
    }

    expect(
      failures,
      `frontmatter that fails the build's YAML parse:\n${failures.join("\n")}\n\n` +
        "Quote any value containing a colon-space.",
    ).toEqual([]);
  });

  it("gives every page a title and a description", async () => {
    const files = await mdxFiles(CONTENT_DIR);
    const missing: string[] = [];
    for (const file of files) {
      const { data } = frontmatter(await readFile(file, "utf-8"));
      const meta = data as { title?: unknown; description?: unknown };
      const gaps = [
        typeof meta.title === "string" && meta.title.trim() ? null : "title",
        typeof meta.description === "string" && meta.description.trim()
          ? null
          : "description",
      ].filter(Boolean);
      if (gaps.length) {
        missing.push(
          `  ${path.relative(process.cwd(), file)}: missing ${gaps.join(", ")}`,
        );
      }
    }
    expect(missing, `pages with incomplete frontmatter:\n${missing.join("\n")}`).toEqual(
      [],
    );
  });

  // The rule that keeps the first test useful rather than mysterious: an
  // unquoted colon-space is what actually broke the build.
  it("fails an unquoted value containing a colon-space", () => {
    expect(() =>
      frontmatter("---\ntitle: A page\ndescription: One principle: risk first\n---\n"),
    ).toThrow();
    expect(() =>
      frontmatter('---\ntitle: A page\ndescription: "One principle: risk first"\n---\n'),
    ).not.toThrow();
  });
});
