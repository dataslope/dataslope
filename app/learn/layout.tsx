/**
 * Layout for the Fumadocs-powered `/learn` route.
 *
 * Wraps every learn page in Fumadocs's `RootProvider` (theme/search
 * context) and `DocsLayout` (sidebar + nav). The sidebar tree is
 * generated automatically from the MDX content under `content/learn/`
 * via the `source` loader.
 *
 * The Tailwind/Fumadocs CSS is imported here (not in `app/layout.tsx`)
 * so it's scoped to the /learn route bundle and doesn't leak into the
 * /playground pages, which use plain CSS + CSS modules.
 */
import "./learn.css";
import type { ReactNode } from "react";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Source_Serif_4 } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import { SidebarCourseTitle } from "./sidebar-course-title";

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

// Build per-course data from each course's meta.json: the display title and
// the ordered list of chapters (url + title). Courses set `root: true`, so
// they live outside the root sidebar tree — we read their meta.json directly.
// Chapter order follows meta.json; titles come from page data; entries that
// don't resolve to a real page (separators, globs, external links) are
// dropped. Read once on the server at render time.
async function getCourseData(): Promise<{
  titles: Record<string, string>;
  chapters: Record<string, { url: string; title: string }[]>;
}> {
  const learnDir = path.join(process.cwd(), "content", "learn");
  const titleByUrl: Record<string, string> = {};
  const existing = new Set<string>();
  for (const page of source.getPages()) {
    titleByUrl[page.url] = page.data.title;
    existing.add(page.url);
  }

  const titles: Record<string, string> = {};
  const chapters: Record<string, { url: string; title: string }[]> = {};
  const entries = await readdir(learnDir, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const slug = entry.name;
        try {
          const raw = await readFile(
            path.join(learnDir, slug, "meta.json"),
            "utf-8",
          );
          const meta = JSON.parse(raw) as { title?: string; pages?: unknown[] };
          if (meta.title) titles[slug] = meta.title;
          const list: { url: string; title: string }[] = [];
          for (const item of meta.pages ?? []) {
            if (typeof item !== "string") continue;
            if (item.startsWith("---") || item === "...") continue; // separator / glob
            const name = item.replace(/^\[[^\]]*\]/, "").trim(); // strip "[Icon]" prefix
            const url = name === "index" ? `/learn/${slug}` : `/learn/${slug}/${name}`;
            if (existing.has(url)) list.push({ url, title: titleByUrl[url] ?? "" });
          }
          if (list.length > 0) chapters[slug] = list;
        } catch {
          // Missing or malformed meta.json — skip this folder.
        }
      }),
  );
  return { titles, chapters };
}

export default async function LearnLayout({ children }: { children: ReactNode }) {
  const { titles: courseTitles, chapters: courseChapters } =
    await getCourseData();

  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        tabs={false}
        sidebar={{
          banner: (
            <SidebarCourseTitle
              key="course-sidebar-banner"
              titles={courseTitles}
              chapters={courseChapters}
            />
          ),
        }}
        nav={{
          title: (
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dataslope-logo-blue.svg"
                alt="Dataslope logo"
                style={{ height: "10px", width: "auto" }}
              />
              Dataslope
            </span>
          ),
          url: "/",
        }}
        githubUrl="https://github.com/dataslope/dataslope/"
        containerProps={{ className: sourceSerif4.variable }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}

