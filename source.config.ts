/**
 * Fumadocs source configuration: the MDX collections under `content/` that
 * power `/courses`, `/fumadocs-dev`, and `/interview-prep` (surfaced via
 * `lib/source.ts`).
 *
 * `rehypeKatex` MUST run before Fumadocs's default rehype plugins: otherwise
 * Shiki (`rehypeCode`) sees the `$$` block-math nodes first, reads their
 * language as "math", and fails the build with "Language `math` not found" —
 * hence the function form of `rehypePlugins`, which prepends KaTeX.
 * `throwOnError: false` degrades stray non-LaTeX dollar signs to a visible
 * inline error instead of failing the build. KaTeX inside `<MultipleChoice>`
 * is handled by that component's own ReactMarkdown pipeline.
 */
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { remarkPreserveCodeIndent } from "./lib/remarkPreserveCodeIndent";
import { remarkSvgLabels } from "./lib/remarkSvgLabels";
import { remarkComponentAnchors } from "./lib/search/anchors.mjs";

export const courses = defineDocs({
  dir: "content/courses",
  docs: {
    // Compile lesson bodies on demand at request time: the default statically
    // imports all ~800 lessons, so the first request compiles every body
    // before anything renders. `dynamic` keeps bodies out of the bundler;
    // body/TOC load via `page.data.load()` and the collection is consumed
    // from `.source/dynamic` (see lib/source.ts).
    dynamic: true,
  },
});

// Development-only component-gallery pages, surfaced at `/fumadocs-dev`.
// Same `dynamic` rationale as above.
export const fumadocsDev = defineDocs({
  dir: "content/fumadocs-dev",
  docs: {
    dynamic: true,
  },
});

// Interview Prep, surfaced at `/interview-prep`. Same `dynamic` rationale.
// Collections are named after their export, so `interview` gets its own
// `?collection=interview` entries in `.source` and never collides.
export const interview = defineDocs({
  dir: "content/interview",
  docs: {
    dynamic: true,
  },
});

export default defineConfig({
  mdxOptions: {
    // `remarkPreserveCodeIndent` MUST run: @mdx-js strips authored
    // indentation from multi-line code template literals; this restores it
    // from the original source offsets.
    // `remarkComponentAnchors` MUST run before `remarkMdxMermaid` and
    // `remarkSvgLabels`: it numbers the *authored* components, and the search
    // indexer replays the same numbering over the raw MDX, so components
    // synthesised by later plugins must not be visible to it.
    remarkPlugins: [
      remarkPreserveCodeIndent,
      remarkComponentAnchors,
      remarkMath,
      remarkMdxMermaid,
      remarkSvgLabels,
    ],
    rehypePlugins: (plugins) => [
      [rehypeKatex, { throwOnError: false, errorColor: "#ef4444" }],
      ...plugins,
    ],
  },
});
