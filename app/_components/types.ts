// Shared types for the playground component and language adapters.

/**
 * `log` is deliberately distinct from `stderr`. In PHP (and in Unix
 * generally) stderr is a destination, not a severity: `error_log()` and
 * `fwrite(STDERR, …)` carry progress notes as often as failures. Painting
 * them the same red as a warning turns a script's debug log into what
 * looks like a wall of errors, so `log` renders neutrally and does not
 * mark a run as failed.
 */
export type OutputCellType =
  | "stdout"
  | "stderr"
  | "log"
  | "html"
  | "image"
  | "plot";

export interface OutputCell {
  id: number;
  type: OutputCellType;
  /** Plain text (stdout/stderr), HTML string (html), base64 PNG (image),
   *  or e.g. Plotly figure JSON (plot). */
  content: string;
  /** For image/plot cells: URL to fetch the payload from instead of carrying
   *  it in `content`. Set only by prepopulated output
   *  (`scripts/build-block-outputs.mjs`) so heavy payloads load lazily;
   *  a run's own charts stay inline. */
  src?: string;
  /** For "plot" cells, the parsed Plotly figure JSON. */
  plot?: PlotlyFigure;
  elapsed: string;
  /** Run that produced this cell, so cells of one run stack in a single
   *  OUTPUT frame. Surfaces that clear outputs every run can omit it. */
  runId?: number;
  /** Wall-clock ms when the producing run finished. */
  finishedAt?: number;
}

export interface PlotlyFigure {
  data: unknown[];
  layout?: Record<string, unknown>;
  /** Animation frames (`animation_frame=`). Without these the play button
   *  still renders (it lives in `layout`) but does nothing when clicked. */
  frames?: unknown[];
}

export interface EntryFileInfo {
  /** Workspace-relative filename. */
  filename: string;
  /** `"main"` = explicit main()/Main(); `"topLevel"` (C# only) = top-level
   *  statements outside any class. */
  kind: "main" | "topLevel";
  /**
   * What the Run button should call this entry point, when the filename is
   * not it. Java launches the class that declares `main`, which a `package`
   * line or a class/file mismatch can put somewhere the filename does not
   * name; a button reading "Run App" for a program that starts
   * `myapp.Main` is asserting something nobody checked.
   */
  label?: string;
}

export interface ExampleSnippet {
  key: string;
  title: string;
  desc: string;
  code: string;
  /** Extra files for multi-file examples; loading then replaces the whole
   *  workspace with `code` (entry file) plus these. */
  files?: ExampleFile[];
  /** Filename for `code` when `files` is set; defaults to the adapter's
   *  primary entry filename. */
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
  /** Example snippet; when present the packages drawer shows an "Example"
   *  button that loads it into the editor. */
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

/**
 * Emitter passed to `runtime.run` for streaming cells as they arrive.
 *
 * With no `seq` the cell is appended, which is all a runtime that emits
 * once-per-complete-cell needs. Runtimes that stream a cell while it is
 * still growing (Python's stdout during a long loop) pass `seq`, the cell's
 * position in the run's output, and set `append` on every chunk after the
 * first — so the surface can grow one cell instead of accumulating
 * fragments.
 */
export type EmitOutput = (
  cell: Omit<OutputCell, "id" | "elapsed">,
  seq?: number,
  append?: boolean,
) => void;

/** Per-run context passed to `runtime.run`. */
export interface RunOptions {
  /** Workspace-relative path of the chosen entry file (multi-entry adapters). */
  entryFilename?: string;
  /** Host element for live page previews (web/react). The surface owns it;
   *  the runtime replaces its children with a sandboxed iframe each run,
   *  which doubles as teardown. Preview adapters fall back to a hidden
   *  off-DOM host when absent (code runs, output captured, invisibly). */
  previewHost?: HTMLElement | null;
  /** Inject the pinned Tailwind browser compiler into the preview before
   *  user code (see `TAILWIND_BROWSER_CDN` in runtime/cdn.ts). */
  previewTailwind?: boolean;
  /** Transient status line for waits *inside* a run (e.g. mid-run package
   *  installs). `preparing` marks a blocking wait, so the surface shows the
   *  boot notice until execution starts; omit/false for ordinary status. */
  onStatus?: (message: string, preparing?: boolean) => void;
  /** Report what a type checker finds, and fail the run when it finds
   *  errors. Set by the full playground; embedded lesson blocks leave it
   *  off, because a snippet written to illustrate one idea is not a
   *  standalone program and its dangling references are not the reader's
   *  bug. Only the TypeScript runtime reads it today. */
  diagnostics?: boolean;
}

/** A completion suggestion. Plain strings are accepted anywhere an item is
 *  expected, for lightweight providers. */
export interface CompletionItemDetail {
  label: string;
  /** CodeMirror completion kind ("function", "variable", …); drives the icon. */
  type?: string;
  /** Short annotation after the label (e.g. type or signature). */
  detail?: string;
  /** Longer documentation shown in the completion info panel. */
  info?: string;
  /** Text inserted on accept when it differs from `label`. */
  apply?: string;
  /** Ranking nudge (-99..99); higher sorts above equal matches. */
  boost?: number;
}

export type CompletionListItem = string | CompletionItemDetail;

/** Cursor snapshot for `LanguageRuntime.complete`: full document for
 *  whole-file analyzers plus line/column for line-based engines. */
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
  /** True for an explicit request (Ctrl-Space) vs a trigger character. */
  explicit: boolean;
  /** Workspace-relative path of the file being edited, when known. */
  filename?: string;
}

export interface CompletionResult {
  list: CompletionListItem[];
  /** Characters before the cursor to replace (length of the matched prefix). */
  replaceLength: number;
}

export interface LanguageRuntime {
  run(code: string, emit: EmitOutput, options?: RunOptions): Promise<void>;
  /** Best-effort completions; resolve with an empty list rather than
   *  rejecting on analyzer errors. */
  complete?(request: CompletionRequest): Promise<CompletionResult>;
  /** Stage workspace files into the runtime's VFS before `run()`, keyed by
   *  workspace-relative path. Must mirror the snapshot exactly: overwrite
   *  entries present in `files`, remove previously created ones absent from
   *  it, so UI renames/deletions propagate. Omit for single-file runtimes. */
  prepareFileSystem?(files: Map<string, Uint8Array>): Promise<void>;
  /** After `run()`, return files the run created (persisted to OPFS and shown
   *  in the Files pane). Called once per run, on both success and error paths,
   *  so implementations must clear their tracking after returning to avoid
   *  double-reporting. */
  collectCreatedFiles?(): Promise<Map<string, Uint8Array>>;
  /** Stop the run in flight, rejecting its `run()` promise with an error
   *  named `RunCancelledError`, and leave the runtime ready for the next
   *  run. Implementing this is what puts a Stop control in the surface, so
   *  omit it unless a runaway program really can be stopped. */
  cancelRun?(): Promise<void>;
  /** Tear down and free resources (worker, WASM heap); called on registry
   *  eviction, after which the instance must not be used. Runtimes that
   *  can't release resources omit this, which also exempts them from
   *  eviction. */
  dispose?(): void | Promise<void>;
  /** Hint that these sources may run soon so heavy packages pre-install.
   *  Fire-and-forget: a missed hint only changes *when* the download happens,
   *  never whether a run succeeds. `options.packages` warms modules no source
   *  imports (learner-writes-the-import content, dynamic imports);
   *  `options.force` skips the scan and warms the full set. */
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
  /** Runtime details for the header's info popup. */
  runtimeInfo: RuntimeInfo;
  /** CodeMirror language mode (e.g. "python", "r"). */
  codeMirrorMode: string;
  /** Per-file mode override for mixed-language workspaces (web:
   *  .html/.css/.js); `undefined` falls back to `codeMirrorMode`. */
  codeMirrorModeForFile?(filename: string): string | undefined;
  /** Spaces per indent level. MUST match the adapter's `formatCode` output
   *  so Tab inserts exactly what the formatter emits; drives the editor's
   *  `tabSize` and `indentUnit`. */
  indentWidth: number;
  examples: ExampleSnippet[];
  packages: PackageInfo[];
  /** Output channels beyond plain text, so the empty-state blurb doesn't
   *  promise capabilities the runtime lacks. Text is implicit. */
  outputCapabilities?: {
    dataframes?: boolean;
    charts?: boolean;
    figures?: boolean;
    /** Renders a live page preview (sandboxed iframe) — web/react. */
    preview?: boolean;
    /** Preview is cheap enough to render before the first Run (see
     *  `composeStaticPreview`). web: yes, pure string composition.
     *  react: no — it boots esbuild-wasm and pulls React from esm.sh. */
    autoPreview?: boolean;
  };
  /**
   * A run compiles and executes the whole workspace, not the focused file.
   *
   * Output is filed per editor tab by default, which is right when each
   * file runs on its own. Where it is not (C and C++ build every source
   * into one program), that split hides results the reader just produced
   * and gives several runs the same number: clicking another tab showed an
   * empty pane, and running from there started its own "Run 1" holding the
   * same program's output. With this set, a run's output belongs to the
   * entry file, the way it already does in split-editor playgrounds.
   */
  projectWideRuns?: boolean;
  /** Formats offered by the "Export" dropdown (client-side download). */
  exportFormats: ExportFormat[];
  /**
   * Formats for the file that is actually open, when a workspace holds
   * more than one kind. Without it, a CSS or JS tab in the web playground
   * downloads as `script.html` with a `text/html` type: the file renamed,
   * not converted. Falls back to `exportFormats`.
   */
  exportFormatsForFile?: (filename: string) => ExportFormat[] | undefined;
  /**
   * The whole workspace as one runnable artifact, when that is a thing the
   * playground can produce. The web playground composes exactly this
   * document on every Run, so its natural deliverable is one self-
   * contained `.html` file.
   */
  exportProject?: {
    label: string;
    description: string;
    extension: string;
    mimeType: string;
    /** `files` is the workspace; returns the artifact's text. */
    compose: (
      files: { filename: string; content: string }[],
      entryFilename: string,
    ) => string | null;
  };
  /** Base filename (without extension) used when exporting, e.g. "script". */
  exportBaseFilename: string;
  /** Default extension (no dot) for new tabs; seeds the initial file and
   *  "+" tab names. */
  defaultFileExtension: string;
  /** Seed fresh workspaces with this multi-file set instead of a single
   *  primary file (web's HTML/CSS/JS trio). First entry is the active file. */
  defaultWorkspace?: ExampleFile[];
  /** Offer a CodePen-style split view (one always-visible editor per file);
   *  the split/tabs preference persists per adapter. */
  splitEditors?: boolean;
  /** Hide the Files pane; the web playground's split view already shows
   *  every file as a pane. */
  hideFilesPane?: boolean;
  /** Disable adding new files (web's fixed trio). Renames still allowed. */
  disableAddFile?: boolean;
  /** Workspace file set is fixed: no close/remove/duplicate/rename, and every
   *  per-tab affordance is dropped. With no Files pane and no add-file, a
   *  closed tab's file would be unreachable; and the web trio is wired
   *  together by name, so a rename silently breaks the composed page. */
  lockWorkspaceFiles?: boolean;
  /** Show a bare "Run" label instead of "Run <file>" (web runs the composed
   *  preview, not a named file). */
  simpleRunLabel?: boolean;
  /** Classify which files contain entry points, to populate the Run button's
   *  split dropdown when several exist. Receives every code tab's current text. */
  findEntryFiles?(
    files: { filename: string; content: string }[],
  ): EntryFileInfo[];
  /** Run-button label for a chosen entry file; defaults to basename without
   *  extension. */
  entryLabel?: (filename: string) => string;
  /** Approximate compressed cold-boot download in MB, shown in first-run boot
   *  copy. Keep in sync with the adapter's version pins; omit for runtimes
   *  that boot from local assets. */
  coldDownloadMB?: number;
  /** True for compile-every-run languages (Java, C, C++, C#), so boot copy
   *  doesn't promise "later runs are instant". */
  compiled?: boolean;
  /** Render-only: footer note shown at the bottom of the packages drawer. */
  packagesFooter: React.ReactNode;
  /** Snippet inserted at the top of the editor when a package is clicked. */
  importSnippet(packageName: string): string;
  /** True if `code` already imports `packageName` (skips insertion). */
  hasImport(code: string, packageName: string): boolean;
  /** Initialise the runtime (called once). `setLoadingMessage` reports boot
   *  progress: stage line + optional coarse fraction (0..1). Report stage
   *  *floors* (the UI animates within a stage) and never report 1 —
   *  resolving the promise is what means "ready". */
  init(
    setLoadingMessage: (message: string, fraction?: number) => void,
  ): Promise<LanguageRuntime>;
  /** Auto-format source; presence enables the "Format code" button.
   *  `filename` lets mixed-language adapters pick the right dialect. */
  formatCode?: (code: string, filename?: string) => Promise<string>;
  /** Compose the document this workspace would render from sources alone —
   *  no runtime/network/DOM — so `<CodeBlock>` can server-render the preview.
   *  Two hard constraints: it must run under Node (SSR calls it first), and
   *  it must be deterministic — server and browser both compose it and React
   *  diffs the two, hence `options.token` is passed in, never generated here.
   *  `sources` are effective sources (init code merged). Return `null` when
   *  nothing renders statically. */
  composeStaticPreview?(
    sources: { filename: string; source: string }[],
    options: {
      entryFilename: string;
      token: string;
      tailwind?: boolean;
      /** Build-time-compiled artifact, for adapters that need one: react's
       *  TSX is precompiled by `scripts/build-react-bundles.mjs` (in-browser
       *  translation would cost a ~3 MB download) and looked up by content
       *  hash. An adapter that needs a bundle and lacks one returns null. */
      bundle?: { js: string; css?: string };
    },
  ): string | null;
}
