/**
 * Default MDX components for the Fumadocs-powered `/learn` route.
 *
 * Fumadocs's `getMDXComponents()` provides the standard set (headings,
 * tables, callouts, code blocks, etc.). We extend it with our own
 * `<CodeBlock>` so MDX authors can drop an executable code block into
 * any lesson:
 *
 * ```mdx
 * <CodeBlock adapter="python" initialCode={`print("hello")`} />
 * ```
 */
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import MdxCodeBlock from "@/app/_components/MdxCodeBlock";
import MdxChallengeCard from "@/app/_components/MdxChallengeCard";
import MdxSqlChallengeCard from "@/app/_components/MdxSqlChallengeCard";
import MdxMultipleChoiceQuestion from "@/app/_components/multipleChoice/MdxMultipleChoiceQuestion";
import { Mermaid } from "@/app/_components/mdx/mermaid";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    CodeBlock: MdxCodeBlock,
    ChallengeCard: MdxChallengeCard,
    SqlChallengeCard: MdxSqlChallengeCard,
    MultipleChoice: MdxMultipleChoiceQuestion,
    Mermaid,
    ...components,
  };
}
