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
 *   initialCode={`display(df)`}
 * />
 * ```
 */

import CodeBlock, { type CodeBlockFile } from "./CodeBlock";
import { getAdapterById, type AdapterId } from "./runtime/adapters";

interface MdxCodeBlockProps {
  adapter: AdapterId;
  initialCode?: string;
  files?: CodeBlockFile[];
  entryFilename?: string;
  initCode?: string;
  label?: string;
}

export default function MdxCodeBlock({
  adapter,
  initialCode,
  files,
  entryFilename,
  initCode,
  label,
}: MdxCodeBlockProps) {
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
      initialCode={initialCode}
      files={files}
      entryFilename={entryFilename}
      initCode={initCode}
      label={label}
    />
  );
}
