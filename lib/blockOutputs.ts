/**
 * Server-side lookup into the generated block-output manifest.
 *
 * Imported only by the two MDX routes, which run at build time: the manifest
 * covers the whole site and never crosses to the browser, only the single
 * lesson's slice a page selects does.
 *
 * The generated module is written by `scripts/build-block-outputs.mjs` and is
 * gitignored, so a checkout that has not run the generator resolves to an
 * empty manifest and every block falls back to the empty output panel it had
 * before this existed. That fallback is deliberate: a missing manifest must
 * degrade the page, never break the build.
 */
import type { LessonBlockOutputs } from "@/app/_components/mdx/BlockOutputs";

// The generator always writes the file (the build chain runs it before
// `next build`), but a bare `tsc`/vitest run in a fresh clone may not have
// one yet, hence the defensive shape rather than a hard import failure.
import generated from "./generated/block-outputs";

const manifest = (generated ?? {}) as Record<string, LessonBlockOutputs>;

/**
 * Outputs for one lesson, or null.
 *
 * `contentPath` is the lesson's path relative to the repository root, e.g.
 * `content/courses/python-basics/loops.mdx`, which is how the generator keys
 * them. Fumadocs hands each route a path relative to *its* collection root,
 * so the routes prepend their own directory.
 */
export function lessonBlockOutputs(
  contentPath: string,
): LessonBlockOutputs | null {
  return manifest[contentPath] ?? null;
}
