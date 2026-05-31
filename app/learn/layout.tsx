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

// Build a courseSlug → title map from each course's meta.json so the sidebar
// can label the active course. Read once on the server at render time.
async function getCourseTitles(): Promise<Record<string, string>> {
  const learnDir = path.join(process.cwd(), "content", "learn");
  const titles: Record<string, string> = {};
  const entries = await readdir(learnDir, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          const raw = await readFile(
            path.join(learnDir, entry.name, "meta.json"),
            "utf-8",
          );
          const meta = JSON.parse(raw) as { title?: string };
          if (meta.title) titles[entry.name] = meta.title;
        } catch {
          // Missing or malformed meta.json — skip this folder.
        }
      }),
  );
  return titles;
}

export default async function LearnLayout({ children }: { children: ReactNode }) {
  const courseTitles = await getCourseTitles();

  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        tabs={false}
        sidebar={{ banner: <SidebarCourseTitle titles={courseTitles} /> }}
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

