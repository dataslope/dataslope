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
import { Illustration } from "@/app/_components/mdx/illustration";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    CodeBlock: MdxCodeBlock,
    ChallengeCard: MdxChallengeCard,
    SqlChallengeCard: MdxSqlChallengeCard,
    SqlCodeBlock: MdxSqlCodeBlock,
    MultipleChoice: MdxMultipleChoiceQuestion,
    Mermaid,
    // Decorative / informative vector figures. Renders a prompt-bearing
    // placeholder until a generated SVG `src` is supplied. See
    // app/_components/mdx/illustration.tsx and docs/illustrations.md.
    Illustration,
    // Fumadocs Steps/Step — a numbered vertical walkthrough. Registered
    // globally so lessons can drop `<Steps>…<Step>` in without an import,
    // matching the convention used by the components above.
    Steps,
    Step,
    ...components,
  };
}
