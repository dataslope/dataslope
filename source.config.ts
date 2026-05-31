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
 *
 * Math support: `remarkMath` parses `$...$` (inline) and `$$...$$` (block)
 * LaTeX in MDX bodies, and `rehypeKatex` renders it to HTML/CSS via KaTeX
 * (whose stylesheet is already imported in `app/learn/learn.css`). We pass
 * `throwOnError: false` so a stray dollar sign that is not valid LaTeX
 * degrades to a visible inline error instead of failing the whole build.
 *
 * `rehypeKatex` MUST run before Fumadocs's default rehype plugins — in
 * particular the Shiki syntax highlighter (`rehypeCode`). Otherwise the
 * highlighter encounters the `$$` block-math nodes first, reads their
 * language as "math", and fails the build with "Language `math` not found".
 * The function form of `rehypePlugins` receives Fumadocs's defaults so we
 * can prepend KaTeX ahead of them.
 *
 * KaTeX inside `<MultipleChoice>` is handled separately by that component's
 * own ReactMarkdown pipeline.
 */
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export const docs = defineDocs({
  dir: "content/learn",
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMath, remarkMdxMermaid],
    rehypePlugins: (plugins) => [
      [rehypeKatex, { throwOnError: false, errorColor: "#ef4444" }],
      ...plugins,
    ],
  },
});
