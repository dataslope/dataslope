/**
 * Layout for the Fumadocs-powered `/fumadocs-dev` route, the
 * development-only component gallery (code blocks, challenge cards,
 * loading states, …) that used to live at `/learn`.
 *
 * Wraps every page in Fumadocs's `RootProvider` (theme/search context)
 * and `DocsLayout` (sidebar + nav). The sidebar tree is generated
 * automatically from the MDX content under `content/fumadocs-dev/`
 * via the `devSource` loader.
 *
 * The Tailwind/Fumadocs CSS is imported here (not in `app/layout.tsx`)
 * so it's scoped to this route's bundle and doesn't leak into the
 * /playground pages, which use plain CSS + CSS modules.
 */
import "../docs.css";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { devSource } from "@/lib/source";
import { ThemePillToggleSlot } from "@/app/_components/ThemePillToggle";

export default function FumadocsDevLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // Match the site-wide binary light/dark contract (light default); see the
    // note in app/courses/[...slug]/layout.tsx.
    <RootProvider theme={{ defaultTheme: "light", enableSystem: false }}>
      <DocsLayout
        tree={devSource.pageTree}
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
    </RootProvider>
  );
}
