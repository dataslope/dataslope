/**
 * Layout for the Fumadocs-powered course lessons under `/courses/<slug>/…`.
 *
 * Wraps every lesson in Fumadocs's `RootProvider` (theme/search context)
 * and `DocsLayout` (sidebar + nav). The sidebar tree is generated
 * automatically from the MDX content under `content/courses/` via the
 * `courseSource` loader; each course folder's meta.json sets `root: true`,
 * so the sidebar scopes itself to the course being read.
 *
 * This layout lives inside the required `[...slug]` catch-all (rather than
 * at `app/courses/`) so the `/courses` index, the custom course-catalog
 * page in `app/courses/page.tsx`, is NOT wrapped in the docs chrome.
 *
 * The Tailwind/Fumadocs CSS is imported here (not in `app/layout.tsx`)
 * so it's scoped to the lesson bundle and doesn't leak into the
 * /playground pages, which use plain CSS + CSS modules.
 */
import "../../docs.css";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { courseSource } from "@/lib/source";
import { ThemePillToggleSlot } from "@/app/_components/ThemePillToggle";

export default function CourseLessonLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RootProvider>
      <DocsLayout
        tree={courseSource.pageTree}
        tabs={false}
        // Use the site's shared light/dark pill toggle in place of Fumadocs's
        // default segmented theme switch, so the docs chrome matches the home
        // header, mobile drawer, and playground settings.
        slots={{ themeSwitch: ThemePillToggleSlot }}
        // Don't prefetch sidebar links. The sidebar renders hundreds of
        // lesson links per page; with Next.js's default viewport prefetch
        // every visible link fans out segment requests, and on Vercel each
        // edge-cache miss is a billed ISR Read. Navigation falls back to
        // fetching on click, which is fast for these fully static pages.
        sidebar={{ prefetch: false }}
        nav={{
          title: (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                letterSpacing: "-0.01em",
              }}
            >
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
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
