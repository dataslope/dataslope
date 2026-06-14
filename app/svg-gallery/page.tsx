/**
 * `/svg-gallery` — a build-time review page for every custom inline `<svg>`
 * graphic used across the `/learn` courses (Mermaid diagrams excluded).
 *
 * Each graphic is rendered alongside its globally-unique ID (the same label
 * shown under the graphic on its lesson page, e.g.
 * `svg-intro-sql-postgres-filtering-rows-f4f4db`), the lesson route, and a deep
 * link to the lesson — so the whole set can be skimmed in one place to spot
 * graphics that need replacing or removing.
 *
 * Cost note: this page is deliberately just a tiny prerendered shell. The
 * heavy payload (every SVG in every course) is generated at build time by
 * `scripts/build-svg-gallery-data.mjs` into `public/svg-gallery/data.json`
 * and fetched client-side — a plain static asset served from the CDN that
 * never touches Vercel's metered ISR store. Loading is slower than inlining
 * the data, which is fine for a development-only review tool.
 */
import type { Metadata } from "next";
import { SvgGalleryFromStaticData } from "./SvgGalleryClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "SVG graphics gallery",
  description: "Every custom SVG graphic used across the Dataslope courses.",
  robots: { index: false, follow: false },
};

export default function SvgGalleryPage() {
  return <SvgGalleryFromStaticData />;
}
