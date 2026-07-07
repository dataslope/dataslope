/**
 * Type for the generated course-art manifest
 * (`lib/generated/course-art.js`, produced by `scripts/build-course-art.mjs`
 * from the transparent PNGs in `assets/course-art/`).
 *
 * Committed even though the `.js` it describes is gitignored: it keeps
 * typecheck/lint green on a fresh checkout before the build script has run
 * (same approach as `brand-fallbacks.d.ts` / `search-index.d.ts`).
 *
 * Keys are image slugs (the source filename without extension, e.g. `panda`);
 * values carry the optimized image's intrinsic pixel size and the emitted
 * formats (always `["webp", "png"]`). `<Illustration>` uses the size to
 * reserve layout space and the presence of a key to decide whether the image
 * exists yet.
 */
export interface CourseArtEntry {
  width: number;
  height: number;
  formats: string[];
}

declare const courseArt: Record<string, CourseArtEntry>;

export default courseArt;
