/**
 * XML sitemap — emitted at `/sitemap.xml`.
 *
 * Lists the home page, the `/courses` catalog index, every prerendered lesson
 * resolved from the Fumadocs `courseSource` loader (the same page set behind
 * `generateStaticParams`), the interview-prep pages, and the static
 * playground landing pages. This is the single biggest indexing win for ~800
 * static lessons that previously had no sitemap.
 *
 * Generated at build time as a static route, so it costs nothing at request
 * time — consistent with the site's static-content model. URLs resolve
 * against `SITE_URL`.
 *
 * The raw-Markdown mirrors (`*.md`, `/llms/`) and the dev-only
 * `/fumadocs-dev` gallery are intentionally omitted to stay consistent with
 * `app/robots.ts`, which disallows them.
 */
import type { MetadataRoute } from "next";
import { courseSource, interviewSource } from "@/lib/source";
import { SITE_URL } from "@/lib/site";
import { getPlaygroundPaths } from "@/lib/playgrounds";

export default function sitemap(): MetadataRoute.Sitemap {
  const abs = (path: string) => new URL(path, SITE_URL).toString();

  // Keyed by absolute URL so no entry is ever emitted twice.
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();

  entries.set(abs("/"), {
    url: abs("/"),
    changeFrequency: "weekly",
    priority: 1,
  });

  // Standalone pricing page (static; reuses the home page's pricing table).
  entries.set(abs("/pricing"), {
    url: abs("/pricing"),
    changeFrequency: "monthly",
    priority: 0.8,
  });

  // The course-catalog index page (app/courses/page.tsx — not a source page,
  // so it's added explicitly).
  entries.set(abs("/courses"), {
    url: abs("/courses"),
    changeFrequency: "weekly",
    priority: 0.9,
  });

  // Every course lesson (content/courses → /courses/<course>/…).
  for (const page of courseSource.getPages()) {
    const url = abs(page.url);
    entries.set(url, {
      url,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Interview Prep collection (content/interview → /interview-prep).
  for (const page of interviewSource.getPages()) {
    const url = abs(page.url);
    const isIndex = page.url === "/interview-prep";
    entries.set(url, {
      url,
      changeFrequency: "monthly",
      priority: isIndex ? 0.9 : 0.7,
    });
  }

  // Playground hub + per-language landing pages (static; high-intent "online
  // <lang> playground" queries). Now indexable — see app/robots.ts.
  for (const path of getPlaygroundPaths()) {
    const url = abs(path);
    entries.set(url, {
      url,
      changeFrequency: "monthly",
      priority: path === "/playground" ? 0.8 : 0.6,
    });
  }

  return [...entries.values()];
}
