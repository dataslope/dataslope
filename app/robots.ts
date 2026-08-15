/**
 * robots.txt: keep crawlers on the content and off the non-indexable routes
 * (API endpoints, raw-Markdown mirrors, dev/demo pages). `*.md` covers the
 * lesson mirrors, `/llms/` the fumadocs-dev raw-Markdown handler, and
 * `/fumadocs-dev` the dev-only component gallery (also noindex in metadata).
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
          // Auth surfaces: no SEO value (also noindex in their metadata).
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/dashboard/account",
          "/dashboard/admin",
          "/reset-password",
          // Shared playgrounds, challenges, and quizzes: user content behind
          // unguessable slugs, never index (also noindex in their metadata).
          "/s/",
          "/c/",
          "/quiz/",
          "/fumadocs-dev",
          "/courses/*.md$",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
