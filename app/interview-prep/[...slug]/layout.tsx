/**
 * Fumadocs layout for interview-prep role/topic pages. Lives inside the
 * `[...slug]` catch-all so the `/interview-prep` catalog index is NOT wrapped
 * in docs chrome (same split as /courses). Importing docs.css here keeps it
 * out of the plain-CSS /playground pages.
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
    // Match the site-wide binary light/dark contract (light default); see
    // app/courses/[...slug]/layout.tsx.
    <DocsRootProvider theme={{ defaultTheme: "light", enableSystem: false }}>
      <DocsLayout
        tree={interviewSource.pageTree}
        tabs={false}
        // The site's shared pill toggle instead of Fumadocs's segmented switch.
        slots={{ themeSwitch: ThemePillToggleSlot }}
        // Don't viewport-prefetch sidebar links; static pages fetch on click.
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
          until the page runs out. See DocsFooter. */}
      <DocsFooter />
    </DocsRootProvider>
  );
}
