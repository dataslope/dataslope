/**
 * XML sitemap — emitted at `/sitemap.xml`.
 *
 * Lists the home page, the `/learn` course index, every prerendered lesson
 * resolved from the Fumadocs `source` loader (the same page set behind
 * `generateStaticParams`), and the static playground landing pages. This is
 * the single biggest indexing win for ~800 static lessons that previously had
 * no sitemap.
 *
 * Generated at build time as a static route, so it costs nothing at request
 * time — consistent with the site's static-content model. URLs resolve
 * against `SITE_URL`.
 *
 * The raw-Markdown mirrors (`*.md`, `/llms/`) are intentionally omitted to
 * stay consistent with `app/robots.ts`, which disallows them.
 */
import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { SITE_URL } from "@/lib/site";
import { getPlaygroundPaths } from "@/lib/playgrounds";

export default function sitemap(): MetadataRoute.Sitemap {
  const abs = (path: string) => new URL(path, SITE_URL).toString();

  // Keyed by absolute URL so the `/learn` index (returned by getPages() *and*
  // added explicitly below) is never emitted twice.
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();

  entries.set(abs("/"), {
    url: abs("/"),
    changeFrequency: "weekly",
    priority: 1,
  });

  for (const page of source.getPages()) {
    const url = abs(page.url);
    const isIndex = page.url === "/learn";
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
