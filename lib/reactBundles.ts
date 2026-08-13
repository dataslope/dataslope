/**
 * Build-time lookup into the generated React-bundle manifest.
 *
 * The sibling of `lib/blockOutputs.ts`, and deliberately a separate file
 * rather than another field on that one: the two are filled by different
 * generators on different workflows, and a single manifest would make
 * "which job owns this entry" a question with no obvious answer. AGENTS.md
 * records what that ambiguity cost the last time (689 entries deleted by the
 * job that did not own them).
 *
 * Everything in that file's header applies here for the same reasons, so
 * read it before changing this one. In short: read the file with `fs`
 * instead of importing it, so the bytes stay at build time and never join
 * the Cloudflare Worker bundle; memoise the parse across prerendered
 * lessons; and treat every miss — absent file, absent lesson, absent entry
 * — as "no bundle", which degrades to the empty preview panel a react block
 * showed before any of this existed. Pressing Run is unaffected either way.
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
