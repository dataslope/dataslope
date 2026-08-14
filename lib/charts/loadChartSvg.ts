/**
 * Load one chart's rendered SVG markup from `public/chart-svgs/<slug>.svg`.
 *
 * The markup used to travel inside `lib/generated/charts.js`, which put the
 * whole 5.7 MB corpus into the Worker bundle; the manifest now carries
 * metadata only (title, caption, dimensions, `svgBytes`) and the markup
 * lives as one static asset per chart, read here via `readPublicAsset`
 * (filesystem at build time, the ASSETS binding on a request-time render).
 *
 * Server-only, like everything that touches `readPublicAsset`.
 */

import { readPublicAsset } from "@/lib/serverAssets";

/** Chart slugs are `charts/<slug>.mjs` basenames; anything else is a typo
 *  (or worse) and must not reach a filesystem path. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;

export async function loadChartSvg(slug: string): Promise<string | null> {
  if (!SLUG_RE.test(slug)) return null;
  return readPublicAsset(`chart-svgs/${slug}.svg`);
}
