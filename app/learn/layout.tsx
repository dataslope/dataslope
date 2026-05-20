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
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import Link from "next/link";

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: (
            <Link
              href="/"
              style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "inherit" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dataslope-logo-blue.svg"
                alt="Dataslope logo"
                style={{ height: "10px", width: "auto" }}
              />
              Dataslope · Learn
            </Link>
          ),
        }}
        githubUrl="https://github.com/dataslope/dataslope/"
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
