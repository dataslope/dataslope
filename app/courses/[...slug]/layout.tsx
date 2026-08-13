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
    // Override next-themes' defaults (defaultTheme "system", enableSystem) to
    // match the rest of the site: the non-Fumadocs pages' bootstrap scripts
    // and the shared pill toggle (siteTheme.ts) treat the `theme` key as a
    // binary "light" | "dark" with a light default, so without this a dark-OS
    // visitor with no stored choice would get dark docs but light pages
    // everywhere else.
    //
    // DocsRootProvider (not the bare RootProvider) so the search dialog knows
    // the current course and deep links stay aligned + highlighted; see that
    // component's header.
    <DocsRootProvider theme={{ defaultTheme: "light", enableSystem: false }}>
      <DocsLayout
        tree={courseSource.pageTree}
        tabs={false}
        // Use the site's shared light/dark pill toggle in place of Fumadocs's
        // default segmented theme switch, so the docs chrome matches the home
        // header, mobile drawer, and playground settings.
        slots={{ themeSwitch: ThemePillToggleSlot }}
        // Don't prefetch sidebar links. The sidebar renders hundreds of
        // lesson links per page; with Next.js's default viewport prefetch
        // every visible link fans out its own segment request the moment the
        // sidebar scrolls into view. (On Vercel each of those that missed the
        // edge cache was also a billed ISR Read, which is what originally
        // forced this; Cloudflare has no such meter, but the request fan-out
        // is reason enough on its own.) Navigation falls back to fetching on
        // click, which is fast for these fully static pages.
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
      {/* Outside <DocsLayout>, deliberately: the footer sits below the docs
          grid so the sidebar (and the TOC) stay pinned until the lesson runs
          out and then release into it. See DocsFooter. */}
      <DocsFooter />
    </DocsRootProvider>
  );
}
