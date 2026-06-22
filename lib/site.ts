/**
 * Canonical site origin + default social-share image.
 *
 * Shared by the root layout metadata (`metadataBase`), per-page metadata
 * (canonical / OpenGraph / Twitter), the sitemap, and robots.txt so these
 * never drift apart.
 *
 * Setting `metadataBase` from `SITE_URL` (see app/layout.tsx) lets every page
 * emit *relative* OpenGraph image and canonical URLs that Next.js resolves to
 * absolute production URLs at render time.
 *
 * `NEXT_PUBLIC_SITE_URL` can override the origin, but it should normally stay
 * the production domain even on preview deployments: canonical tags must point
 * at the page's canonical (production) location, not at an ephemeral preview
 * host, or search engines may index the preview.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dataslope.com";

/**
 * Default OpenGraph / Twitter share image. A relative URL on purpose — it
 * resolves against `metadataBase`. Dimensions match the asset in `public/`.
 * A dedicated 1200×630 social card (and per-course images) is a later polish
 * item; this is the sensible site-wide default.
 */
export const OG_IMAGE = {
  url: "/dataslope-blue@4x.png",
  width: 951,
  height: 598,
  alt: "DataSlope — interactive, in-browser data & CS learning",
} as const;
