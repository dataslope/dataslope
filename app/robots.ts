/**
 * robots.txt — keep crawlers on the content and off everything else.
 *
 * Bots requesting cold non-content routes (playground shells, dev/demo
 * pages, API endpoints, the raw-Markdown mirrors) are pure cost on Vercel:
 * each edge-cache miss bills an ISR Read / Edge Request / Fast Origin
 * Transfer with no user benefit. `/learn` and the homepage stay fully
 * crawlable — they are the indexable content.
 *
 * The `*.md` patterns cover the raw-Markdown mirrors exposed by the
 * `/learn/:path*.md` rewrite (see next.config.ts); `/llms/` covers the
 * route handler those rewrites point at.
 */
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/llms/",
          "/playground",
          "/color-test",
          "/svg-gallery",
          "/learn.md",
          "/learn/*.md$",
        ],
      },
    ],
    // Point crawlers at the sitemap (app/sitemap.ts → /sitemap.xml).
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
