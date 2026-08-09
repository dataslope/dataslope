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
 */
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Step, Steps } from "fumadocs-ui/components/steps";
import type { MDXComponents } from "mdx/types";
import MdxCodeBlock from "@/app/_components/MdxCodeBlock";
import MdxChallengeCard from "@/app/_components/MdxChallengeCard";
import MdxSqlChallengeCard from "@/app/_components/MdxSqlChallengeCard";
import MdxSqlCodeBlock from "@/app/_components/MdxSqlCodeBlock";
import MdxMultipleChoiceQuestion from "@/app/_components/multipleChoice/MdxMultipleChoiceQuestion";
import { Mermaid } from "@/app/_components/mdx/mermaid";
import { SvgLabel } from "@/app/_components/mdx/SvgLabel";
import { IllustrationPrompt } from "@/app/_components/mdx/IllustrationPrompt";
import { Figure } from "@/app/_components/mdx/Figure";
import { Chart } from "@/app/_components/mdx/Chart";
import LoadingAnimationsGallery from "@/app/_components/mdx/loadingAnimations";
import RuntimeLoadingStates from "@/app/_components/RuntimeBootNotice";
import { LivePreview } from "@/app/_components/mdx/LivePreview";
import { ReactPreview } from "@/app/_components/mdx/ReactPreview";
import { reactDemoComponents } from "@/app/_components/mdx/reactDemoComponents";
import { withSearchAnchor } from "@/app/_components/mdx/withSearchAnchor";

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
