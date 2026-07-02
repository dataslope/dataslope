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
 * its own `initCode` and `starterCode`; an optional `datasets` array
 * stages remote files from the dataslope/datasets repo into the
 * runtime's working directory before each run):
 * ```mdx
 * <CodeBlock
 *   adapter="python"
 *   datasets={[{ path: "csv/penguins.csv", stageAs: "penguins.csv" }]}
 *   files={[
 *     {
 *       filename: "main.py",
 *       initCode: `import pandas as pd\npenguins = pd.read_csv("penguins.csv")`,
 *       starterCode: `penguins.head()`,
 *     },
 *   ]}
 * />
 * ```
 */

import CodeBlock, { type CodeBlockFile } from "./CodeBlock";
import { getAdapterById, type AdapterId } from "./runtime/adapters";
import type { DatasetStageSpec } from "./runtime/remoteDatasets";

interface MdxCodeBlockProps {
  adapter: AdapterId;
  files: CodeBlockFile[];
  entryFilename?: string;
  datasets?: DatasetStageSpec[];
  label?: string;
  showFileTabBar?: boolean;
  /** Importable module names to pre-install alongside the runtime —
   *  see `CodeBlockProps.packages`. */
  packages?: string[];
}

export default function MdxCodeBlock({
  adapter,
  files,
  entryFilename,
  datasets,
  label,
  showFileTabBar,
  packages,
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
      datasets={datasets}
      label={label}
      showFileTabBar={showFileTabBar}
      packages={packages}
    />
  );
}
