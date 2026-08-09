/**
 * Fumadocs source configuration.
 *
 * Defines the MDX content collections that power the `/courses`,
 * `/fumadocs-dev`, and `/interview-prep` routes. The collections live under
 * `content/` at the repo root and are surfaced via `lib/source.ts` using
 * Fumadocs's `loader()`.
 *
 * Plays the same role here as `source.config.ts` does in the official
 * Fumadocs starter, keeps schema definitions and any future remark/rehype
 * plugin wiring in one place so the Next.js app code can stay focused on
 * routing and rendering.
 *
 * Math support: `remarkMath` parses `$...$` (inline) and `$$...$$` (block)
 * LaTeX in MDX bodies, and `rehypeKatex` renders it to HTML/CSS via KaTeX
 * (whose stylesheet is already imported in `app/docs.css`). We pass
 * `throwOnError: false` so a stray dollar sign that is not valid LaTeX
 * degrades to a visible inline error instead of failing the whole build.
 *
 * `rehypeKatex` MUST run before Fumadocs's default rehype plugins, in
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
import { remarkPreserveCodeIndent } from "./lib/remarkPreserveCodeIndent";
import { remarkSvgLabels } from "./lib/remarkSvgLabels";
import { remarkComponentAnchors } from "./lib/search/anchors.mjs";

export const courses = defineDocs({
  dir: "content/courses",
  docs: {
    // Compile each lesson's MDX body on demand at request time instead of
    // bundling all ~800 files into the route graph. By default the generated
    // `.source/server.ts` statically imports every lesson, so the first
    // request to any `/courses` page makes Turbopack compile all ~800 bodies
    // (each through the remark/rehype/Shiki pipeline) before the page can
    // render. `dynamic` keeps the bodies out of the bundler entirely:
    // Fumadocs reads + compiles the requested file with its own MDX compiler
    // at request time, so only the visited page is built. The body and TOC
    // are then loaded via `await page.data.load()` (see `page.tsx`), and the
    // collection is consumed from `.source/dynamic` (see `lib/source.ts`).
    dynamic: true,
  },
});

// Fumadocs Dev, the development-only component-gallery pages (code blocks,
// challenge cards, loading states, …) that used to live loose under the old
// `/learn` route, now under `content/fumadocs-dev/` and surfaced at
// `/fumadocs-dev` (see `lib/source.ts`). Same `dynamic` rationale as above.
export const fumadocsDev = defineDocs({
  dir: "content/fumadocs-dev",
  docs: {
    dynamic: true,
  },
});

// Interview Prep, a docs collection under `content/interview/`, surfaced at
// `/interview-prep` (see `lib/source.ts`). Same `dynamic` rationale as the
// courses collection above. fumadocs-mdx names each collection after its
// export (`interview`), so it gets its own `?collection=interview` entries in
// the generated `.source` and never collides with the other collections.
export const interview = defineDocs({
  dir: "content/interview",
  docs: {
    dynamic: true,
  },
});

export default defineConfig({
  mdxOptions: {
    // `remarkPreserveCodeIndent` MUST run for code blocks/challenge cards to
    // display formatted code: @mdx-js strips the authored indentation from
    // multi-line `starterCode`/`solutionCode`/… template literals during
    // tokenization, and this restores it from the original source offsets.
    //
    // `remarkComponentAnchors` MUST run before `remarkMdxMermaid` and
    // `remarkSvgLabels`: it numbers the *authored* components in document
    // order, and the search indexer replays the same numbering over the raw
    // MDX (lib/search/anchors.mjs), so components synthesised by later
    // plugins must not be visible to it.
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
