/**
 * Fumadocs source configuration.
 *
 * Defines the MDX content collection that powers the `/learn` route.
 * The collection lives under `content/learn/` at the repo root and is
 * surfaced via `lib/source.ts` using Fumadocs's `loader()`.
 *
 * Plays the same role here as `source.config.ts` does in the official
 * Fumadocs starter — keeps schema definitions and any future remark/rehype
 * plugin wiring in one place so the Next.js app code can stay focused on
 * routing and rendering.
 */
import { defineDocs, defineConfig } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/learn",
});

export default defineConfig();
