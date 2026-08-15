/**
 * Fumadocs layout for course lessons under `/courses/<slug>/…`. Lives inside
 * the `[...slug]` catch-all so the `/courses` catalog index is NOT wrapped in
 * docs chrome. The Fumadocs CSS is imported here (not app/layout.tsx) so it
 * doesn't leak into the /playground pages.
 */
import "../../docs.css";
import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { courseSource } from "@/lib/source";
import { ThemePillToggleSlot } from "@/app/_components/ThemePillToggle";
import { DocsRootProvider } from "@/app/_components/DocsRootProvider";
import { DocsFooter } from "@/app/_components/DocsFooter";

export default function CourseLessonLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // Theme must match the rest of the site, which treats `theme` as a binary
    // "light" | "dark" with a light default (siteTheme.ts) — without this a
    // dark-OS visitor with no stored choice would get dark docs, light pages.
    // DocsRootProvider (not bare RootProvider) so search knows the course.
    <DocsRootProvider theme={{ defaultTheme: "light", enableSystem: false }}>
      <DocsLayout
        tree={courseSource.pageTree}
        tabs={false}
        // The site's shared pill toggle instead of Fumadocs's segmented switch.
        slots={{ themeSwitch: ThemePillToggleSlot }}
        // The sidebar renders hundreds of lesson links; viewport prefetch
        // would fan out a segment request per visible link. Fetch on click
        // instead, which is fast for these fully static pages.
        sidebar={{ prefetch: false }}
        nav={{
          title: (
            <span
              className="ds-logo-hover"
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
                className="ds-logo-mark"
                style={{ height: "10px", width: "auto" }}
              />
              <span className="ds-logo-word">Dataslope</span>
            </span>
          ),
          url: "/",
        }}
        githubUrl="https://github.com/dataslope/dataslope/"
      >
        {children}
      </DocsLayout>
      {/* Outside <DocsLayout> deliberately, so the sidebar/TOC stay pinned
          until the lesson runs out. See DocsFooter. */}
      <DocsFooter />
    </DocsRootProvider>
  );
}
