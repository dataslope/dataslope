"use client";

/**
 * MDX-friendly wrapper around `<CodeBlock>`.
 *
 * MDX authors can't import TypeScript modules, so this component takes
 * a string `adapter` id (e.g. `"python"`, `"javascript"`) and resolves
 * it to the corresponding `LanguageAdapter` instance from
 * `runtime/adapters`. All other props are forwarded to `<CodeBlock>`
 * unchanged.
 *
 * Usage in MDX:
 * ```mdx
 * <CodeBlock
 *   adapter="python"
 *   initCode={`import pandas as pd\ndf = pd.DataFrame(...)`}
 *   starterCode={`display(df)`}
 * />
 * ```
 */

import type { ReactNode } from "react";
import CodeBlock, { type CodeBlockFile } from "./CodeBlock";
import { getAdapterById, type AdapterId } from "./runtime/adapters";
import { codeFromChildren } from "./mdxCodeChildren";

interface MdxCodeBlockProps {
  adapter: AdapterId;
  starterCode?: string;
  files?: CodeBlockFile[];
  entryFilename?: string;
  initCode?: string;
  label?: string;
  /**
   * Preferred authoring style: the starter code as a fenced code block child
   * (indentation-safe — see `mdxCodeChildren`). Falls back to the
   * `starterCode` prop for content not yet migrated.
   */
  children?: ReactNode;
}

export default function MdxCodeBlock({
  adapter,
  starterCode,
  files,
  entryFilename,
  initCode,
  label,
  children,
}: MdxCodeBlockProps) {
  const childCode = codeFromChildren(children);
  const resolvedStarter = childCode ?? starterCode;
  const resolved = getAdapterById(adapter);
  if (!resolved) {
    return (
      <div role="alert" style={{ color: "#ef4444", padding: "0.75rem" }}>
        Unknown CodeBlock adapter id: <code>{adapter}</code>
      </div>
    );
  }
  return (
    <CodeBlock
      adapter={resolved}
      starterCode={resolvedStarter}
      files={files}
      entryFilename={entryFilename}
      initCode={initCode}
      label={label}
    />
  );
}
