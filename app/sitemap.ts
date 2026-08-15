/**
 * XML sitemap at `/sitemap.xml`, generated at build time: home, catalog
 * indexes, every prerendered lesson, and the playground landing pages. The
 * raw-Markdown mirrors and dev-only `/fumadocs-dev` gallery are intentionally
 * omitted, consistent with `app/robots.ts`.
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

  entries.set(abs("/pricing"), {
    url: abs("/pricing"),
    changeFrequency: "monthly",
    priority: 0.8,
  });

  // Catalog index pages are not source pages, so they're added explicitly.
  entries.set(abs("/courses"), {
    url: abs("/courses"),
    changeFrequency: "weekly",
    priority: 0.9,
  });

  for (const page of courseSource.getPages()) {
    const url = abs(page.url);
    entries.set(url, {
      url,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  entries.set(abs("/interview-prep"), {
    url: abs("/interview-prep"),
    changeFrequency: "weekly",
    priority: 0.9,
  });

  for (const page of interviewSource.getPages()) {
    const url = abs(page.url);
    entries.set(url, {
      url,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Playground hub + per-language landing pages (indexable, see app/robots.ts).
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
