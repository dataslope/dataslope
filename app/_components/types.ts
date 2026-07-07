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
  /** Identifies the run that produced this cell, so the UI can render
   *  one merged output frame per run (cells of one run stack inside a
   *  single OUTPUT cell, notebook-style). Surfaces that clear outputs
   *  on every run can omit it. */
  runId?: number;
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
  /** Host element for live page previews (web / react adapters). The
   *  surface owns this element (an always-mounted slot in its output
   *  area); the runtime replaces its children with a sandboxed iframe
   *  on every run, which doubles as the teardown story — swapping the
   *  document kills the previous run's scripts. Adapters without a
   *  preview channel ignore it; preview adapters fall back to a hidden
   *  off-DOM host when the surface doesn't supply one (code still
   *  runs and console output is still captured, just invisibly). */
  previewHost?: HTMLElement | null;
  /** Inject the pinned Tailwind CSS browser compiler
   *  (`@tailwindcss/browser`) into the preview document before user
   *  code, so utility classes in the learner's markup compile
   *  client-side. Only meaningful for preview adapters; see
   *  `TAILWIND_BROWSER_CDN` in `runtime/cdn.ts` for the pin. */
  previewTailwind?: boolean;
  /** Optional transient status line for waits that happen *inside* a
   *  run — e.g. Python's deferred package set still installing on the
   *  first run after the two-phase boot, or R installing a `library()`
   *  on demand. Surfaces in the caller's status text; adapters that
   *  never wait mid-run simply ignore it.
   *
   *  `preparing` marks a *blocking* wait (a download/install before the
   *  user's code runs) so the surface can show the runtime boot notice
   *  for the duration and drop it once execution starts. Omit / false
   *  for ordinary status text. */
  onStatus?: (message: string, preparing?: boolean) => void;
}

/** A single completion suggestion with optional editor metadata. Plain
 *  strings are accepted everywhere an item is expected so lightweight
 *  providers can return bare identifiers. */
export interface CompletionItemDetail {
  label: string;
  /** CodeMirror completion kind ("function", "variable", "class",
   *  "keyword", "property", "namespace", …) — drives the popup icon. */
  type?: string;
  /** Short annotation rendered after the label (e.g. a type or
   *  signature), the way desktop IDEs annotate suggestions. */
  detail?: string;
  /** Longer documentation shown in the completion info panel. */
  info?: string;
  /** Text inserted on accept when it differs from `label`. */
  apply?: string;
  /** Ranking nudge (-99..99); higher sorts above equal matches. */
  boost?: number;
}

export type CompletionListItem = string | CompletionItemDetail;

/** Cursor snapshot handed to `LanguageRuntime.complete`. Carries both
 *  the full document (for whole-file analyzers like jedi or the
 *  TypeScript language service) and the line/column pair (for
 *  line-based engines like R's `utils` completion). */
export interface CompletionRequest {
  /** Full text of the editor document. */
  doc: string;
  /** 0-based cursor offset within `doc`. */
  offset: number;
  /** Text of the line containing the cursor. */
  line: string;
  /** 0-based cursor column within `line`. */
  column: number;
  /** 1-based line number of the cursor within `doc`. */
  lineNumber: number;
  /** True when the user explicitly requested completion (Ctrl-Space)
   *  rather than a trigger character opening it. */
  explicit: boolean;
  /** Workspace-relative path of the file being edited, when the
   *  surface knows it (multi-file playgrounds). */
  filename?: string;
}

export interface CompletionResult {
  /** Suggested completions for the current cursor prefix. */
  list: CompletionListItem[];
  /** Number of characters before the cursor that should be replaced when
   *  inserting a completion (i.e. the length of the matched prefix). */
  replaceLength: number;
}

export interface LanguageRuntime {
  run(code: string, emit: EmitOutput, options?: RunOptions): Promise<void>;
  /** Optional: compute completions for the cursor described by
   *  `request`. Adapters that don't implement autocomplete simply omit
   *  this. Implementations should be best-effort: resolve with an empty
   *  list rather than rejecting on analyzer errors. */
  complete?(request: CompletionRequest): Promise<CompletionResult>;
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
  /** Optional: after `run()` resolves, return any files the runtime
   *  created during the run that should be surfaced in the Files pane,
   *  keyed by their workspace-relative path (e.g. a CSV fetched by R's
   *  `download.file()`). The playground persists these to OPFS and adds
   *  them to the Files pane so they survive reloads and are re-staged on
   *  subsequent runs. Returns an empty map when nothing was created.
   *
   *  Called once per run (in both the success and error paths, since a
   *  file may have been written before user code later threw), so
   *  implementations must clear their internal tracking after returning
   *  to avoid reporting the same file twice. */
  collectCreatedFiles?(): Promise<Map<string, Uint8Array>>;
  /** Optional: tear the runtime down and free its resources (terminate
   *  the backing Web Worker, close the WASM instance). Called by the
   *  runtime registry when this runtime is evicted to bound how many
   *  language VMs stay resident at once — after it runs, the instance
   *  must not be used again. Runtimes that cannot release their
   *  resources (e.g. CheerpJ's page-level JVM, the .NET runtime) omit
   *  this hook, which also exempts them from eviction. */
  dispose?(): void | Promise<void>;
  /** Optional: hint that the given authored source snippets may run
   *  soon, so the runtime can pre-install heavy optional packages while
   *  the user is still reading (Python's numpy/pandas/scipy/matplotlib/
   *  plotly set). Fire-and-forget and best-effort: runtimes install
   *  missing packages on demand at run time regardless, so a missed or
   *  wrong hint only changes *when* the download happens, never whether
   *  a run succeeds.
   *
   *  `options.packages` adds importable module names (e.g. `"pandas"`,
   *  `"sklearn"`) to warm even though no source imports them — the
   *  escape hatch for content whose instructions ask the learner to
   *  write the import themselves, or for dynamic imports the scan can't
   *  see. `options.force` skips the needs-analysis and warms the full
   *  set (used by the playground, whose future code is unknown). */
  warmPackages?(
    sources: string[],
    options?: { packages?: string[]; force?: boolean },
  ): void;
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
  /** Optional: per-file CodeMirror mode override for adapters whose
   *  workspaces mix languages (the web adapter edits `.html`, `.css`,
   *  and `.js` files side by side). Return `undefined` to fall back to
   *  `codeMirrorMode`. Surfaces re-evaluate this whenever the active
   *  tab changes and reconfigure the editor's language compartment. */
  codeMirrorModeForFile?(filename: string): string | undefined;
  /** Number of spaces used for one indentation level. This MUST match
   *  the indent width produced by the adapter's `formatCode` formatter
   *  so the editor's Tab key inserts exactly what the formatter emits
   *  (e.g. Python/ruff = 4, JS/TS/web_fmt = 2, C/C++/Java/clang LLVM = 2,
   *  C#/clang Microsoft = 4, PHP/mago = 4, R/styler = 2). The editor's
   *  `tabSize` and `indentUnit` are both derived from this value. */
  indentWidth: number;
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
    /** The runtime renders a live page preview (sandboxed iframe) in
     *  addition to console text — the web / react adapters. Surfaces
     *  use this to mount their preview slot and mention the preview
     *  in the empty-state blurb. */
    preview?: boolean;
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
  /** Optional: seed fresh playground workspaces with this multi-file
   *  set instead of a single `<exportBaseFilename>.<ext>` file — the
   *  web adapter uses it for its CodePen-style HTML/CSS/JS trio. The
   *  first entry is the initial active file. */
  defaultWorkspace?: ExampleFile[];
  /** Optional: the playground offers a CodePen-style split view for
   *  this adapter — every workspace file gets its own always-visible
   *  editor (stacked in the editor pane) instead of tabs. The user can
   *  flip between split and tabs; the preference persists per adapter. */
  splitEditors?: boolean;
  /** Optional: hide the playground's Files pane (and its sidebar rail /
   *  mobile sheet) for this adapter. The web playground sets this: its
   *  split view already shows every file as a pane, so a separate
   *  file-tree that can't "open" files anywhere would only confuse. */
  hideFilesPane?: boolean;
  /** Optional: classify which workspace files contain entry points
   *  (i.e. `main()` / `Main()` / top-level statements). Used by the
   *  Run button to populate a split-button dropdown when multiple
   *  entry files exist in the workspace. Files passed in are the
   *  current text contents of every code tab. */
  findEntryFiles?(
    files: { filename: string; content: string }[],
  ): EntryFileInfo[];
  /** Optional: short label used inside the Run button when this
   *  filename is the chosen entry. Defaults to the basename without
   *  extension (e.g. `"main.c"` → `"main"`). */
  entryLabel?: (filename: string) => string;
  /** Approximate compressed download for a cold boot, in MB. Shown in
   *  the first-run boot copy ("Downloading the Python runtime (~6 MB)…")
   *  so long waits come with a size expectation. Keep in sync with the
   *  version pins the adapter maintains; omit for runtimes that boot
   *  from local/bundled assets in well under a second. */
  coldDownloadMB?: number;
  /** True for languages that compile on every run (Java, C, C++, C#), so
   *  the first-run boot copy doesn't promise that "later runs are
   *  instant" — they still pay a per-run compile step even once the
   *  runtime is warm. Omit (falsy) for interpreted runtimes. */
  compiled?: boolean;
  /** Render-only: footer note shown at the bottom of the packages drawer. */
  packagesFooter: React.ReactNode;
  /** Build the snippet inserted at the top of the editor when the user
   *  clicks a package in the packages drawer. */
  importSnippet(packageName: string): string;
  /** Returns true if `code` already imports `packageName` — used to skip
   *  the insertion (and surface a "already imported" toast) when the
   *  relevant import statement is present. */
  hasImport(code: string, packageName: string): boolean;
  /** Initialise the runtime. Called once after scripts/stylesheets load.
   *  `setLoadingMessage` reports boot progress: a human-readable stage
   *  line plus an optional coarse overall fraction (0..1) where the
   *  adapter can estimate one — the UI renders a determinate-ish bar
   *  when fractions arrive and falls back to a spinner when they don't.
   *  Report stage *floors* (the UI animates within a stage) and never
   *  report 1 — resolving the promise is what means "ready". */
  init(
    setLoadingMessage: (message: string, fraction?: number) => void,
  ): Promise<LanguageRuntime>;
  /** Optional: auto-format the given source code and return the formatted
   *  string. Implemented by adapters that ship a browser-side formatter
   *  (e.g. the C adapter uses clang-format via WASM). The playground UI
   *  surfaces a "Format code" icon button when this method is present.
   *  `filename` is the active workspace file, so adapters whose
   *  workspaces mix languages (web: .html/.css/.js) can pick the right
   *  formatter dialect; single-language adapters may ignore it. */
  formatCode?: (code: string, filename?: string) => Promise<string>;
}
