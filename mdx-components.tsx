/**
 * Default MDX components for the Fumadocs-powered `/learn` route.
 *
 * Fumadocs's `getMDXComponents()` provides the standard set (headings,
 * tables, callouts, code blocks, etc.). We extend it with our own
 * `<CodeBlock>` so MDX authors can drop an executable code block into
 * any lesson:
 *
 * ```mdx
 * <CodeBlock adapter="python" starterCode={`print("hello")`} />
 * ```
 *
 * ## Why the interactive widgets are loaded with `next/dynamic`
 *
 * This map names every component a lesson *may* use, and it is handed to
 * `<MDX>` on every render, so a statically imported widget joins the route's
 * client bundle whether or not the lesson mentions it. That put the entire
 * widget surface — the CodeMirror editor stack behind `<CodeBlock>` and the
 * challenge cards, the SQL variants, the 33 React-course demos — on every
 * page of every course. Measured on 2026-08-09, a prose-only lesson
 * (`modern-css-layout/next-steps`, zero widgets) shipped a byte-identical
 * 41 chunks / 3.1 MB (919 kB gzipped) to a lesson with eight runnable code
 * blocks. That JavaScript is the dominant cost of a lesson load: it is
 * parsed and hydrated on the main thread, and the incremental cache cannot
 * touch it.
 *
 * `app/_components/mdx/lazyWidgets.ts` puts each widget in its own async
 * chunk, so a lesson downloads only the widgets it actually renders. Server
 * rendering stays ON, so the prerendered HTML still contains every widget: no
 * SEO loss, no blank frame, no layout shift.
 *
 * Those `dynamic()` calls have to live in that `"use client"` module and not
 * here — calling `dynamic()` from this file type-checks, builds, and splits
 * nothing, because a client reference reached from a Server Component joins
 * the route's client entry however it was imported. `lazyWidgets.ts` has the
 * full explanation; read it before moving a widget back into this file.
 *
 * `Figure`, `Chart`, `SvgLabel` and the `<Steps>` pair stay statically
 * imported on purpose: they are Server Components (or render no client code),
 * so they never reach the browser and splitting them would buy nothing.
 */
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Step, Steps } from "fumadocs-ui/components/steps";
import type { MDXComponents } from "mdx/types";
import { SvgLabel } from "@/app/_components/mdx/SvgLabel";
import { Figure } from "@/app/_components/mdx/Figure";
import { Chart } from "@/app/_components/mdx/Chart";
import { reactDemoComponents } from "@/app/_components/mdx/reactDemoComponents";
import { withSearchAnchor } from "@/app/_components/mdx/withSearchAnchor";
// Interactive widgets, one async chunk each. The `dynamic()` calls live in
// that module rather than here because the directive at its top is what makes
// them split at all; see the note there before moving one back.
import {
  MdxCodeBlock,
  MdxChallengeCard,
  MdxSqlChallengeCard,
  MdxSqlCodeBlock,
  MdxMultipleChoiceQuestion,
  Mermaid,
  IllustrationPrompt,
  LoadingAnimationsGallery,
  RuntimeLoadingStates,
  LivePreview,
  ReactPreview,
} from "@/app/_components/mdx/lazyWidgets";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  // `withSearchAnchor` renders the deterministic `id` that
  // `remarkComponentAnchors` (lib/search/anchors.mjs) injects into these
  // components, so search results can deep-link to the exact quiz, code
  // block, or figure that matched rather than to the heading above it. The
  // wrapped set must mirror ANCHOR_COMPONENTS in that module.
  return {
    ...defaultMdxComponents,
    CodeBlock: withSearchAnchor(MdxCodeBlock),
    ChallengeCard: withSearchAnchor(MdxChallengeCard),
    SqlChallengeCard: withSearchAnchor(MdxSqlChallengeCard),
    SqlCodeBlock: withSearchAnchor(MdxSqlCodeBlock),
    MultipleChoice: withSearchAnchor(MdxMultipleChoiceQuestion),
    Callout: withSearchAnchor(defaultMdxComponents.Callout),
    Mermaid,
    SvgLabel,
    IllustrationPrompt,
    Figure: withSearchAnchor(Figure),
    Chart: withSearchAnchor(Chart),
    LoadingAnimationsGallery,
    RuntimeLoadingStates,
    // Live, no-Run lesson widgets: <LivePreview> renders HTML/CSS in a
    // Shadow DOM inline (Modern CSS course); <ReactPreview> renders a real
    // interactive component with its TSX shown below (React course). The
    // React demo components are spread in so lessons can use e.g.
    // <CounterDemo /> as <ReactPreview>'s child without an import.
    LivePreview: withSearchAnchor(LivePreview),
    ReactPreview: withSearchAnchor(ReactPreview),
    ...reactDemoComponents,
    // Fumadocs Steps/Step, a numbered vertical walkthrough. Registered
    // globally so lessons can drop `<Steps>…<Step>` in without an import,
    // matching the convention used by the components above.
    Steps,
    Step,
    ...components,
  };
}
