// Shared types for the playground component and language adapters.

export type OutputCellType = "stdout" | "stderr" | "html" | "image" | "plot";

export interface OutputCell {
  id: number;
  type: OutputCellType;
  /** Plain text for stdout/stderr, HTML string for html, base64 PNG for image,
   *  arbitrary value (e.g. Plotly figure JSON) for plot. */
  content: string;
  /** For "plot" cells, the parsed Plotly figure JSON. */
  plot?: PlotlyFigure;
  elapsed: string;
}

export interface PlotlyFigure {
  data: unknown[];
  layout?: Record<string, unknown>;
}

export interface ExampleSnippet {
  key: string;
  title: string;
  desc: string;
  code: string;
}

export interface PackageInfo {
  cat: string;
  icon: string;
  color: string;
  name: string;
  ver: string;
  desc: string;
  /** Optional short example snippet that demonstrates the package.
   *  When present, the packages drawer renders an "Example" icon button
   *  that loads this snippet into the editor (with the standard
   *  discard-confirm dialog). */
  example?: string;
}

export interface RuntimeInfo {
  language: string;
  version: string;
  engine: string;
  engineUrl?: string;
  notes?: string;
}

export interface ExportFormat {
  /** File extension without the leading dot, e.g. "py" or "r". */
  extension: string;
  /** Label shown in the export dropdown, e.g. "Python (.py)". */
  label: string;
  /** MIME type used when constructing the download Blob. */
  mimeType: string;
}

/** Emitter passed to `runtime.run` so the adapter can stream cells as they
 *  become available. */
export type EmitOutput = (cell: Omit<OutputCell, "id" | "elapsed">) => void;

export interface CompletionResult {
  /** Suggested completions for the current cursor prefix. */
  list: string[];
  /** Number of characters before the cursor that should be replaced when
   *  inserting a completion (i.e. the length of the matched prefix). */
  replaceLength: number;
}

export interface LanguageRuntime {
  run(code: string, emit: EmitOutput): Promise<void>;
  /** Optional: compute completions for the given line up to ``column``.
   *  Adapters that don't implement autocomplete simply omit this. */
  complete?(line: string, column: number): Promise<CompletionResult>;
}

export interface LanguageAdapter {
  /** Stable id used for localStorage keys. */
  id: string;
  /** Title shown in the header (e.g. "Python Playground"). */
  displayName: string;
  /** Two-character logo glyph (e.g. "py", "R"). */
  logoText: string;
  /** Document <title>. */
  documentTitle: string;
  /** Status text shown after init succeeds. */
  readyStatus: string;
  /** Human-readable runtime details shown by the header's info popup
   *  (e.g. "Python 3.13 via Pyodide", "R 4.4 via WebR"). */
  runtimeInfo: RuntimeInfo;
  /** CodeMirror language mode (e.g. "python", "r"). */
  codeMirrorMode: string;
  examples: ExampleSnippet[];
  packages: PackageInfo[];
  /** Output channels that this runtime can emit beyond plain text.
   *  Used by the playground's empty-state blurb so we don't promise
   *  capabilities the runtime can't deliver (e.g. Java only emits
   *  text). All runtimes implicitly support text. */
  outputCapabilities?: {
    dataframes?: boolean;
    charts?: boolean;
    figures?: boolean;
  };
  /** Formats offered by the "Export" dropdown. The editor's current contents
   *  are written to a client-side download with the chosen extension. */
  exportFormats: ExportFormat[];
  /** Base filename (without extension) used when exporting, e.g. "script". */
  exportBaseFilename: string;
  /** Default file extension (no dot) for new tabs in this playground —
   *  e.g. "py", "js", "cpp". Used to seed the initial workspace file
   *  and to suggest names for "+" new tabs. */
  defaultFileExtension: string;
  /** Filename treated as the entry point for multi-file runs. When
   *  unset, the active tab's file is the entry point. */
  entryPoint?: string;
  /** Render-only: footer note shown at the bottom of the packages drawer. */
  packagesFooter: React.ReactNode;
  /** Build the snippet inserted at the top of the editor when the user
   *  clicks a package in the packages drawer. */
  importSnippet(packageName: string): string;
  /** Returns true if `code` already imports `packageName` — used to skip
   *  the insertion (and surface a "already imported" toast) when the
   *  relevant import statement is present. */
  hasImport(code: string, packageName: string): boolean;
  /** Initialise the runtime. Called once after scripts/stylesheets load. */
  init(setLoadingMessage: (message: string) => void): Promise<LanguageRuntime>;
  /** Optional: auto-format the given source code and return the formatted
   *  string. Implemented by adapters that ship a browser-side formatter
   *  (e.g. the C adapter uses clang-format via WASM). The playground UI
   *  surfaces a "Format code" icon button when this method is present. */
  formatCode?: (code: string) => Promise<string>;
}
