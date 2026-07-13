/**
 * robots.txt, keep crawlers on the content and off the genuinely
 * non-indexable routes (API endpoints, the raw-Markdown mirrors, dev/demo
 * pages). `/courses`, `/interview-prep`, the homepage, and the playground
 * landing pages stay crawlable, they are the indexable content.
 *
 * Playground note: these pages used to be disallowed because, on Vercel, each
 * cold bot request to a playground shell billed an ISR Read. On Cloudflare the
 * playground landing pages are served as free static assets, so that cost is
 * gone, and `/playground` (+ each `/playground/<lang>`) are legitimate,
 * high-intent landing pages ("online Python playground", "online SQL editor"),
 * so they're now allowed and listed in the sitemap (see app/sitemap.ts).
 *
 * The `*.md` patterns cover the raw-Markdown mirrors exposed by the
 * `/courses/:path*.md` rewrite (see next.config.ts); `/llms/` covers the
 * route handler those rewrites point at. `/fumadocs-dev` is the
 * development-only component gallery (the old `/learn` demo pages), its
 * pages also set `robots: { index: false }` in their metadata.
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
          "/illustration-prompts",
          "/magicui-demo",
          // Auth surfaces: personalized or credential flows, no SEO value
          // (also marked `robots: { index: false }` in their metadata).
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/dashboard/account",
          "/dashboard/admin",
          "/reset-password",
          // Shared-playground links (/s/<id>), custom challenges (/c/<id>),
          // and quiz sets (/quiz/<id>) are user content behind unguessable
          // slugs, never index them (their metadata also sets
          // `robots: { index: false }`).
          "/s/",
          "/c/",
          "/quiz/",
          "/fumadocs-dev",
          "/courses/*.md$",
        ],
      },
    ],
    // Point crawlers at the sitemap (app/sitemap.ts → /sitemap.xml).
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
