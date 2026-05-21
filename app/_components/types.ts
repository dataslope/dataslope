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

export interface EntryFileInfo {
  /** Workspace-relative filename. */
  filename: string;
  /** Kind of entry point. `"main"` denotes an explicit `main()` /
   *  `Main()` function. `"topLevel"` (C# only) denotes top-level
   *  statements outside of any class. */
  kind: "main" | "topLevel";
}

export interface ExampleSnippet {
  key: string;
  title: string;
  desc: string;
  code: string;
  /** Optional additional files for multi-file examples. When present,
   *  loading the example replaces the entire workspace with `code`
   *  (used as the entry file's contents) plus these extra files.
   *  Each file's `filename` should be a workspace-relative path. */
  files?: ExampleFile[];
  /** Filename for the primary `code` snippet when `files` is set.
   *  Defaults to the adapter's primary entry filename when omitted. */
  entryFilename?: string;
}

export interface ExampleFile {
  filename: string;
  content: string;
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

/** Optional context passed to `runtime.run` describing which workspace
 *  file the user chose as the entry point for this run. Used by
 *  multi-entry-point adapters (C, C++, Java, C#). */
export interface RunOptions {
  /** Workspace-relative path of the chosen entry file. Adapters use
   *  this to pick the right translation unit / class to compile and
   *  to exclude that file from the "extra sources" list. */
  entryFilename?: string;
}

export interface CompletionResult {
  /** Suggested completions for the current cursor prefix. */
  list: string[];
  /** Number of characters before the cursor that should be replaced when
   *  inserting a completion (i.e. the length of the matched prefix). */
  replaceLength: number;
}

export interface LanguageRuntime {
  run(code: string, emit: EmitOutput, options?: RunOptions): Promise<void>;
  /** Optional: compute completions for the given line up to ``column``.
   *  Adapters that don't implement autocomplete simply omit this. */
  complete?(line: string, column: number): Promise<CompletionResult>;
  /** Optional: stage workspace files into the runtime's virtual file
   *  system before `run()` is invoked. Called by the playground with the
   *  full set of currently-open files (code tabs and uploaded data
   *  files), keyed by their workspace-relative path
   *  (e.g. `"utils.py"`, `"data/sales.csv"`).
   *
   *  Runtimes that don't support multi-file execution simply omit this
   *  hook — the playground falls back to single-file `run(code, …)`
   *  semantics in that case.
   *
   *  Implementations should mirror the supplied snapshot exactly: files
   *  present in `files` should overwrite existing entries, and files
   *  the runtime created on previous runs that are no longer in `files`
   *  should be removed so renames and deletions in the UI propagate. */
  prepareFileSystem?(files: Map<string, Uint8Array>): Promise<void>;
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
  /** Optional: classify which workspace files contain entry points
   *  (i.e. `main()` / `Main()` / top-level statements). Used by the
   *  Run button to populate a split-button dropdown when multiple
   *  entry files exist in the workspace. Files passed in are the
   *  current text contents of every code tab. */
  findEntryFiles?(
    files: { filename: string; content: string }[],
  ): EntryFileInfo[];
  /** Optional: workspace path of the canonical primary entry file
   *  (e.g. `"main.c"`, `"Program.cs"`). Used as the preferred default
   *  when the active tab is a non-entry file and a primary file
   *  exists. Distinct from `entryPoint` so adapters can mark a
   *  primary even when the runtime supports multiple entries. */
  primaryEntryFilename?: string;
  /** Optional: short label used inside the Run button when this
   *  filename is the chosen entry. Defaults to the basename without
   *  extension (e.g. `"main.c"` → `"main"`). */
  entryLabel?: (filename: string) => string;
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
