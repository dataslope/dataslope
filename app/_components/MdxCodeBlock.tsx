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
 * Usage in MDX (every block passes a `files` array; each file carries
 * its own `initCode` and `starterCode`):
 * ```mdx
 * <CodeBlock
 *   adapter="python"
 *   files={[
 *     {
 *       filename: "main.py",
 *       initCode: `import pandas as pd\ndf = pd.DataFrame(...)`,
 *       starterCode: `display(df)`,
 *     },
 *   ]}
 * />
 * ```
 */

import CodeBlock, { type CodeBlockFile } from "./CodeBlock";
import { getAdapterById, type AdapterId } from "./runtime/adapters";

interface MdxCodeBlockProps {
  adapter: AdapterId;
  files: CodeBlockFile[];
  entryFilename?: string;
  label?: string;
  showFileTabBar?: boolean;
}

export default function MdxCodeBlock({
  adapter,
  files,
  entryFilename,
  label,
  showFileTabBar,
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
      files={files}
      entryFilename={entryFilename}
      label={label}
      showFileTabBar={showFileTabBar}
    />
  );
}
