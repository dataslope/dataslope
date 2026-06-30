/**
 * robots.txt — keep crawlers on the content and off the genuinely
 * non-indexable routes (API endpoints, the raw-Markdown mirrors, dev/demo
 * pages). `/learn`, the homepage, and the playground landing pages stay
 * crawlable — they are the indexable content.
 *
 * Playground note: these pages used to be disallowed because, on Vercel, each
 * cold bot request to a playground shell billed an ISR Read. On Cloudflare the
 * playground landing pages are served as free static assets, so that cost is
 * gone — and `/playground` (+ each `/playground/<lang>`) are legitimate,
 * high-intent landing pages ("online Python playground", "online SQL editor"),
 * so they're now allowed and listed in the sitemap (see app/sitemap.ts).
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
          "/color-test",
          "/svg-gallery",
          "/magicui-demo",
          // Auth surfaces: personalized or credential flows, no SEO value
          // (also marked `robots: { index: false }` in their metadata).
          "/sign-in",
          "/account",
          "/admin",
          "/reset-password",
          "/learn.md",
          "/learn/*.md$",
        ],
      },
    ],
    // Point crawlers at the sitemap (app/sitemap.ts → /sitemap.xml).
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
