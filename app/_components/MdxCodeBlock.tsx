"use client";

/**
 * MDX-friendly wrapper around `<CodeBlock>`. MDX authors can't import
 * TypeScript modules, so this takes a string `adapter` id and resolves it to
 * the `LanguageAdapter` instance from `runtime/adapters`; all other props
 * forward unchanged.
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
  /** Importable module names to pre-install alongside the runtime,
   *  see `CodeBlockProps.packages`. */
  packages?: string[];
  /** Inject the pinned Tailwind in-browser compiler into the preview,
   *  see `CodeBlockProps.tailwind`. Preview adapters (web/react) only. */
  tailwind?: boolean;
  /** Marks a block whose lesson is the failure, see
   *  `CodeBlockProps.expectError`. */
  expectError?: boolean;
  /** Height of the live-preview stage (number → px), see
   *  `CodeBlockProps.previewHeight`. Preview adapters (web/react) only. */
  previewHeight?: number | string;
  /** Render the preview before the reader presses Run, see
   *  `CodeBlockProps.autoPreview`. Defaults to the adapter's own answer
   *  (on for web, off for react); pass `false` to opt a block out. */
  autoPreview?: boolean;
  /** Standard input for the program, shown in an editable STDIN panel and
   *  staged as `stdin.txt`, see `CodeBlockProps.stdin`. Adapters whose
   *  runtime can be fed only (c, cpp, java, csharp). */
  stdin?: string;
}

export default function MdxCodeBlock({
  adapter,
  files,
  entryFilename,
  datasets,
  label,
  showFileTabBar,
  packages,
  tailwind,
  expectError,
  previewHeight,
  autoPreview,
  stdin,
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
      expectError={expectError}
      packages={packages}
      tailwind={tailwind}
      previewHeight={previewHeight}
      autoPreview={autoPreview}
      stdin={stdin}
    />
  );
}
