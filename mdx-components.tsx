/**
 * Default MDX components for the Fumadocs lessons, extending Fumadocs's
 * standard set with the lesson widgets (e.g. `<CodeBlock>`).
 *
 * This map is handed to `<MDX>` on every render, so a statically imported
 * client widget joins the route's client bundle whether or not the lesson
 * uses it — that once put the whole widget surface (~3.1 MB) on every lesson.
 * Interactive widgets therefore come from app/_components/mdx/lazyWidgets.ts,
 * one async chunk each; the `dynamic()` calls MUST live in that "use client"
 * module — from here they type-check but split nothing (see lazyWidgets.ts
 * before moving one back). Server Components (`Figure`, `Chart`, diagrams,
 * `<Steps>`) stay statically imported on purpose: they never reach the
 * browser, so splitting them buys nothing.
 */
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Step, Steps } from "fumadocs-ui/components/steps";
import type { MDXComponents } from "mdx/types";
import { SvgLabel } from "@/app/_components/mdx/SvgLabel";
import { Figure } from "@/app/_components/mdx/Figure";
import { Chart } from "@/app/_components/mdx/Chart";
import {
  BoxModel,
  CrcCard,
  MemoryCells,
  SyntaxBreakdown,
} from "@/app/_components/mdx/diagrams";
import { CalloutWithCodeTitle } from "@/app/_components/mdx/CalloutWithCodeTitle";
import { reactDemoComponents } from "@/app/_components/mdx/reactDemoComponents";
import { withSearchAnchor } from "@/app/_components/mdx/withSearchAnchor";
// Interactive widgets, one async chunk each (see header note).
import {
  MdxCodeBlock,
  MdxChallengeCard,
  MdxSqlChallengeCard,
  MdxSqlCodeBlock,
  GitBlock,
  GitChallengeCard,
  BashBlock,
  BashChallengeCard,
  MdxMultipleChoiceQuestion,
  Mermaid,
  IllustrationPrompt,
  LoadingAnimationsGallery,
  RuntimeLoadingStates,
  LivePreview,
  ReactPreview,
} from "@/app/_components/mdx/lazyWidgets";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  // `withSearchAnchor` renders the deterministic `id` injected by
  // `remarkComponentAnchors` so search results can deep-link to the matched
  // component. The wrapped set must mirror ANCHOR_COMPONENTS in
  // lib/search/anchors.mjs.
  return {
    ...defaultMdxComponents,
    CodeBlock: withSearchAnchor(MdxCodeBlock),
    ChallengeCard: withSearchAnchor(MdxChallengeCard),
    SqlChallengeCard: withSearchAnchor(MdxSqlChallengeCard),
    SqlCodeBlock: withSearchAnchor(MdxSqlCodeBlock),
    GitBlock: withSearchAnchor(GitBlock),
    GitChallengeCard: withSearchAnchor(GitChallengeCard),
    BashBlock: withSearchAnchor(BashBlock),
    BashChallengeCard: withSearchAnchor(BashChallengeCard),
    MultipleChoice: withSearchAnchor(MdxMultipleChoiceQuestion),
    // Not fumadocs' Callout directly: MDX passes `title` as a plain string,
    // leaving backticks literal. See CalloutWithCodeTitle.
    Callout: withSearchAnchor(CalloutWithCodeTitle),
    Mermaid,
    SvgLabel,
    IllustrationPrompt,
    Figure: withSearchAnchor(Figure),
    Chart: withSearchAnchor(Chart),
    // Lesson diagrams (see app/_components/mdx/diagrams.tsx); Server
    // Components, so statically imported.
    BoxModel,
    MemoryCells,
    SyntaxBreakdown,
    CrcCard,
    LoadingAnimationsGallery,
    RuntimeLoadingStates,
    // React demo components are spread in so lessons can use e.g.
    // <CounterDemo /> as <ReactPreview>'s child without an import.
    LivePreview: withSearchAnchor(LivePreview),
    ReactPreview: withSearchAnchor(ReactPreview),
    ...reactDemoComponents,
    // Registered globally so lessons can use <Steps>/<Step> without imports.
    Steps,
    Step,
    ...components,
  };
}
