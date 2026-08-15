/**
 * Build-time lookup into the generated React-bundle manifest. Deliberately a
 * separate file from lib/blockOutputs.ts: the two are filled by different
 * generators, and a single manifest makes entry ownership ambiguous (see
 * AGENTS.md — that ambiguity once cost 689 deleted entries). Same rules as
 * that file: read with `fs` so the bytes never join the Worker bundle,
 * memoise the parse, and treat every miss as "no bundle" (degrades to the
 * empty preview panel; Run is unaffected).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** One block's precompiled bundle. `css` is absent when the workspace has
 *  no stylesheet, which is most of them. */
export interface ReactBundle {
  js: string;
  css?: string;
}

/** Block key (see `lib/blockOutputKey.ts`) → bundle. */
export type LessonReactBundles = Record<string, ReactBundle>;

let cache: Record<string, LessonReactBundles> | null = null;

function manifest(): Record<string, LessonReactBundles> {
  if (cache) return cache;
  try {
    const path = join(process.cwd(), "lib", "generated", "react-bundles.json");
    cache = JSON.parse(readFileSync(path, "utf8")) as Record<
      string,
      LessonReactBundles
    >;
  } catch {
    cache = {};
  }
  return cache;
}

/**
 * Bundles for one lesson, or null.
 *
 * `contentPath` is the lesson's path relative to the repository root, e.g.
 * `content/courses/react-from-the-ground-up/props.mdx`, which is how the
 * generator keys them.
 */
export function lessonReactBundles(
  contentPath: string,
): LessonReactBundles | null {
  return manifest()[contentPath] ?? null;
}
