/**
 * Layout for the Fumadocs-powered `/fumadocs-dev` route — the
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

export default function FumadocsDevLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RootProvider>
      <DocsLayout
        tree={devSource.pageTree}
        tabs={false}
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
