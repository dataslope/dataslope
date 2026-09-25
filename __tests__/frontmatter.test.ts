// Guards the YAML frontmatter of every authored MDX page. fumadocs-mdx parses
// it at the very start of `npm run build`, and an unquoted scalar containing
// a colon-space is a YAML mapping entry, not a string — the build dies with
// an error that does not name the file. This suite calls the same
// frontmatter() helper the build calls. Fix a failure by quoting the value.
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
  it("parses as YAML and gives a title and a description on every page", async () => {
    const files = await mdxFiles(CONTENT_DIR);
    expect(files.length).toBeGreaterThan(500);

    const failures: string[] = [];
    const missing: string[] = [];
    for (const file of files) {
      const rel = path.relative(process.cwd(), file);
      let data: { title?: unknown; description?: unknown };
      try {
        data = frontmatter(await readFile(file, "utf-8")).data as typeof data;
      } catch (error) {
        const reason =
          error instanceof Error ? error.message.split("\n")[0] : String(error);
        failures.push(`  ${rel}: ${reason}`);
        continue;
      }
      const gaps = [
        typeof data.title === "string" && data.title.trim() ? null : "title",
        typeof data.description === "string" && data.description.trim()
          ? null
          : "description",
      ].filter(Boolean);
      if (gaps.length) missing.push(`  ${rel}: missing ${gaps.join(", ")}`);
    }

    expect(
      failures,
      `frontmatter that fails the build's YAML parse:\n${failures.join("\n")}\n\n` +
        "Quote any value containing a colon-space.",
    ).toEqual([]);
    expect(missing, `pages with incomplete frontmatter:\n${missing.join("\n")}`).toEqual(
      [],
    );
  });
});
