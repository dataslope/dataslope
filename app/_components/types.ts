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
}

/** Emitter passed to `runtime.run` so the adapter can stream cells as they
 *  become available. */
export type EmitOutput = (cell: Omit<OutputCell, "id" | "elapsed">) => void;

export interface LanguageRuntime {
  run(code: string, emit: EmitOutput): Promise<void>;
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
  /** CodeMirror language mode (e.g. "python", "r"). */
  codeMirrorMode: string;
  examples: ExampleSnippet[];
  packages: PackageInfo[];
  /** Render-only: footer note shown at the bottom of the packages drawer. */
  packagesFooter: React.ReactNode;
  /** Build the snippet that the "import" copy button puts on the clipboard. */
  importSnippet(packageName: string): string;
  /** Initialise the runtime. Called once after scripts/stylesheets load. */
  init(setLoadingMessage: (message: string) => void): Promise<LanguageRuntime>;
}
