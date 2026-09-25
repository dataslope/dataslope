/**
 * `srcset` for an image whose manifest entry carries downscaled variants
 * (`widths`, written by scripts/build-images.mjs into `public/images/sized/`).
 * Only the course and interview-prep thumbnails have them: they are promoted
 * at up to 1536px and painted at around a hundred.
 */
import type { ImageManifestEntry } from "@/lib/generated/images";

/** Where build-images writes a variant (mirrors its `variantFile`). */
export function imageVariantSrc(slug: string, width: number): string {
  return `/images/sized/${slug}-${width}w.webp`;
}

/**
 * Every variant plus the original as the widest candidate, or `undefined`
 * when the entry has none, so the `<img>` keeps its plain `src`. Variants are
 * WebP, so they are offered only for a WebP-only entry.
 */
export function imageSrcSet(
  slug: string,
  entry: ImageManifestEntry,
): string | undefined {
  if (!entry.widths?.length || entry.formats.join() !== "webp") return undefined;
  return [
    ...entry.widths.map((w) => `${imageVariantSrc(slug, w)} ${w}w`),
    `/images/${slug}.webp ${entry.width}w`,
  ].join(", ");
}
