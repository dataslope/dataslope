/**
 * Type for the generated image manifest
 * (`lib/generated/images.js`, produced by `scripts/build-images.mjs` from the
 * raster sources in `assets/images/`).
 *
 * Both the `.js` and the optimized assets under `public/images/` are committed
 * (not gitignored) because image encoding is expensive: the script only
 * re-encodes a source whose content hash changed, so deploys serve the
 * committed outputs with no rebuild. This `.d.ts` still gives the `.js` an
 * explicit type for typecheck/lint (same approach as `brand-fallbacks.d.ts` /
 * `search-index.d.ts`).
 *
 * Keys are image slugs (the source filename without extension, e.g. `panda`);
 * values carry the source content hash (used for incremental re-encoding), the
 * optimized image's intrinsic pixel size, and the emitted formats — a WebP
 * plus a raster fallback, e.g. `["webp", "png"]` or `["webp", "jpg"]`, ordered
 * so the last entry is the `<img>` fallback. `<Figure>` uses the size to
 * reserve layout space and the presence of a key to decide whether the image
 * exists yet.
 */
export interface ImageManifestEntry {
  hash: string;
  width: number;
  height: number;
  formats: string[];
}

declare const imageManifest: Record<string, ImageManifestEntry>;

export default imageManifest;
