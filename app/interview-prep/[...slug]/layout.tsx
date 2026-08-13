/**
 * Layout for the Fumadocs-powered interview-prep role/topic pages under
 * `/interview-prep/<role>/…`.
 *
 * Wraps every role/topic page in Fumadocs's `RootProvider` + `DocsLayout`,
 * with the sidebar tree generated from `content/interview/` via
 * `interviewSource`. Each role folder's meta.json sets `root: true`, so the
 * sidebar scopes itself to the single role being read (isolating the tracks
 * from one another), exactly like each course under `/courses`.
 *
 * This layout lives inside the required `[...slug]` catch-all (not at
 * `app/interview-prep/`) so the `/interview-prep` index, the custom catalog
 * page in `app/interview-prep/page.tsx`, is NOT wrapped in the docs chrome,
 * the same split `/courses` uses.
 *
 * Reuses the shared Tailwind/Fumadocs stylesheet (`../../docs.css`); importing
 * it here scopes it to the interview-prep lesson bundle, keeping it out of the
 * plain-CSS /playground pages.
 */
import "../../docs.css";
import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { interviewSource } from "@/lib/source";
import { ThemePillToggleSlot } from "@/app/_components/ThemePillToggle";
import { DocsRootProvider } from "@/app/_components/DocsRootProvider";
import { DocsFooter } from "@/app/_components/DocsFooter";

export default function InterviewLayout({ children }: { children: ReactNode }) {
  return (
    // Match the site-wide binary light/dark contract (light default); see the
    // note in app/courses/[...slug]/layout.tsx. DocsRootProvider additionally
    // scopes the search dialog to the current interview track and keeps deep
    // links aligned + highlighted; see that component's header.
    <DocsRootProvider theme={{ defaultTheme: "light", enableSystem: false }}>
      <DocsLayout
        tree={interviewSource.pageTree}
        tabs={false}
        // Use the site's shared light/dark pill toggle in place of Fumadocs's
        // default segmented theme switch, so the docs chrome matches the home
        // header, mobile drawer, and playground settings.
        slots={{ themeSwitch: ThemePillToggleSlot }}
        // Match /learn: don't viewport-prefetch sidebar links (these pages are
        // static; navigation fetches on click).
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
          grid so the sidebar (and the TOC) stay pinned until the page runs out
          and then release into it. See DocsFooter. */}
      <DocsFooter />
    </DocsRootProvider>
  );
}
