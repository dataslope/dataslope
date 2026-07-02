import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// House style for course/dev page titles: use an em-dash ("Code Blocks — C"),
// not a spaced hyphen ("Code Blocks - C"), as the separator. Guards the
// fix to code-blocks-c.mdx against regression and keeps the demo-page
// title family consistent. Runs under `npm test`.
function mdxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...mdxFiles(full));
    else if (entry.name.endsWith(".mdx")) out.push(full);
  }
  return out;
}

function frontmatterTitle(src: string): string | null {
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const title = fm[1].match(/^title:\s*(.+?)\s*$/m);
  return title ? title[1].trim() : null;
}

describe("content/courses + content/fumadocs-dev page titles", () => {
  const files = [
    ...mdxFiles(path.join(process.cwd(), "content", "courses")),
    ...mdxFiles(path.join(process.cwd(), "content", "fumadocs-dev")),
  ];

  it("locates the content corpus", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('use an em-dash ("—"), not a spaced hyphen (" - "), as a separator', () => {
    const offenders = files
      .map((f) => ({ f, title: frontmatterTitle(readFileSync(f, "utf8")) }))
      .filter((x) => x.title && / - /.test(x.title))
      .map((x) => `  ${path.relative(process.cwd(), x.f)}: "${x.title}"`);
    expect(
      offenders,
      `These titles should use "—" instead of " - ":\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
