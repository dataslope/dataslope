/**
 * Layout for the Fumadocs-powered `/interview` route (Interview Prep).
 *
 * Mirrors `app/learn/layout.tsx`: wraps every page in Fumadocs's
 * `RootProvider` + `DocsLayout`, with the sidebar tree generated from
 * `content/interview/` via `interviewSource`.
 *
 * Reuses the learn route's Tailwind/Fumadocs stylesheet (`../learn/learn.css`)
 * rather than duplicating it — both routes render the same Fumadocs UI, so the
 * scoped styles are identical. Importing it here scopes it to the /interview
 * bundle too, keeping it out of the plain-CSS /playground pages.
 */
import "../learn/learn.css";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { interviewSource } from "@/lib/source";

export default function InterviewLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={interviewSource.pageTree}
        tabs={false}
        // Match /learn: don't viewport-prefetch sidebar links (these pages are
        // static; navigation fetches on click).
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
