// Every course and interview-prep page gets a document title no other page
// shares. Frontmatter titles are only unique within a course (each landing
// page is "Welcome", and "Next Steps" or "Strings" recur across courses), so
// the pages qualify them with the course name through `sectionPageTitle`.
// This rebuilds each page's title from the same inputs the route's
// generateMetadata reads (the page's frontmatter and its folder's meta.json)
// and fails on any title two URLs would share. Fix a failure by renaming the
// lesson, not by special-casing it here.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { frontmatter } from "fumadocs-core/content/md/frontmatter";
import { interviewTrackName, sectionPageTitle } from "../lib/courseMeta";

const CONTENT_DIR = path.join(process.cwd(), "content");

/** URL → title for every page of one section, as the route renders them. */
function sectionTitles(
  section: "courses" | "interview",
  baseUrl: string,
): Map<string, string> {
  const titles = new Map<string, string>();
  const sectionDir = path.join(CONTENT_DIR, section);
  for (const folder of readdirSync(sectionDir, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const dir = path.join(sectionDir, folder.name);
    const meta = JSON.parse(readFileSync(path.join(dir, "meta.json"), "utf-8")) as {
      title: string;
      root?: boolean;
    };
    // Mirrors the routes: a course names its pages only when it is a
    // Fumadocs root; every interview role folder names its pages.
    const course =
      section === "interview"
        ? interviewTrackName(meta.title)
        : meta.root
          ? meta.title
          : null;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".mdx")) continue;
      const { data } = frontmatter(readFileSync(path.join(dir, file), "utf-8"));
      const stem = file.replace(/\.mdx$/, "");
      const isLanding = stem === "index";
      const url = `${baseUrl}/${folder.name}${isLanding ? "" : `/${stem}`}`;
      titles.set(
        url,
        sectionPageTitle(String((data as { title?: unknown }).title), course, isLanding),
      );
    }
  }
  return titles;
}

describe("course and interview-prep page titles", () => {
  const titles = new Map([
    ...sectionTitles("courses", "/courses"),
    ...sectionTitles("interview", "/interview-prep"),
  ]);

  it("covers the corpus", () => {
    expect(titles.size).toBeGreaterThan(800);
  });

  it("names a landing page after its course", () => {
    expect(titles.get("/courses/python-basics")).toBe("Python Basics");
    expect(titles.get("/courses/python-basics/variables")).toBe(
      "Variables · Python Basics",
    );
    expect(titles.get("/interview-prep/data-analyst")).toBe(
      "Data Analyst Interview Prep",
    );
  });

  it("gives no two pages the same title", () => {
    const urlsByTitle = new Map<string, string[]>();
    for (const [url, title] of titles) {
      urlsByTitle.set(title, [...(urlsByTitle.get(title) ?? []), url]);
    }
    const shared = [...urlsByTitle]
      .filter(([, urls]) => urls.length > 1)
      .map(([title, urls]) => `  "${title}": ${urls.join(", ")}`);
    expect(shared, `titles shared by more than one page:\n${shared.join("\n")}`).toEqual(
      [],
    );
  });
});
