/**
 * Type for the generated course-art manifest
 * (`lib/generated/course-art.js`, produced by `scripts/build-course-art.mjs`
 * from the transparent PNGs in `assets/course-art/`).
 *
 * Both the `.js` and the optimized assets under `public/course-art/` are
 * committed (not gitignored) because image encoding is expensive: the script
 * only re-encodes a source whose content hash changed, so deploys serve the
 * committed outputs with no rebuild. This `.d.ts` still gives the `.js` an
 * explicit type for typecheck/lint (same approach as `brand-fallbacks.d.ts` /
 * `search-index.d.ts`).
 *
 * Keys are image slugs (the source filename without extension, e.g. `panda`);
 * values carry the source content hash (used for incremental re-encoding), the
 * optimized image's intrinsic pixel size, and the emitted formats (always
 * `["webp", "png"]`). `<Illustration>` uses the size to reserve layout space
 * and the presence of a key to decide whether the image exists yet.
 */
export interface CourseArtEntry {
  hash: string;
  width: number;
  height: number;
  formats: string[];
}

declare const courseArt: Record<string, CourseArtEntry>;

export default courseArt;
