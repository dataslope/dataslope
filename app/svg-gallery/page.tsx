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
 * Generated entirely at build time: `force-static` pre-renders the route, and
 * `getSvgGallery()` reads the MDX content from disk during that render. The
 * interactive shell (theme toggle, pagination, copy buttons) lives in the
 * client component below. The page is intended for development but is harmless
 * if publicly reachable.
 */
import type { Metadata } from "next";
import { getSvgGallery } from "@/lib/svgGallery";
import { SvgGalleryClient } from "./SvgGalleryClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "SVG graphics gallery",
  description: "Every custom SVG graphic used across the Dataslope courses.",
  robots: { index: false, follow: false },
};

export default function SvgGalleryPage() {
  return <SvgGalleryClient courses={getSvgGallery()} />;
}
