// Minimal global type declarations for the third-party scripts we load from
// CDNs. We only declare the surface area that the playground actually uses.

export interface CodeMirrorEditor {
  setValue(value: string): void;
  getValue(): string;
  setOption(name: string, value: unknown): void;
  setSize(width: string | number | null, height: string | number | null): void;
  getWrapperElement(): HTMLElement;
  refresh(): void;
  focus(): void;
}

export interface CodeMirrorOptions {
  mode: string;
  theme: string;
  lineNumbers?: boolean;
  indentUnit?: number;
  tabSize?: number;
  indentWithTabs?: boolean;
  keyMap?: string;
  autoCloseBrackets?: boolean;
  matchBrackets?: boolean;
  lineWrapping?: boolean;
  extraKeys?: Record<string, () => void>;
}

export interface CodeMirrorAPI {
  fromTextArea(
    el: HTMLTextAreaElement,
    options: CodeMirrorOptions,
  ): CodeMirrorEditor;
}

export interface PlotlyAPI {
  newPlot(
    el: HTMLElement,
    data: unknown[],
    layout?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ): Promise<unknown>;
}

export interface PyodideInterface {
  loadPackage(packages: string | string[]): Promise<unknown>;
  pyimport(name: string): {
    install(name: string | string[]): Promise<void>;
  };
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(opts: { batched: (s: string) => void }): void;
  setStderr(opts: { batched: (s: string) => void }): void;
  globals: {
    get(name: string): {
      toJs(opts?: { dict_converter?: (e: Iterable<[string, unknown]>) => unknown }): unknown;
      destroy(): void;
    };
  };
}

export type LoadPyodideFn = (opts: { indexURL: string }) => Promise<PyodideInterface>;

// WebR — narrow surface we use from the ESM module loaded at runtime.
export interface WebRShelter {
  captureR(
    code: string,
    options?: { captureGraphics?: boolean | { width?: number; height?: number } },
  ): Promise<{
    result: WebRObject;
    output: { type: "stdout" | "stderr"; data: string }[];
    images: ImageBitmap[];
  }>;
  purge(): Promise<void>;
}

export interface WebRObject {
  type: string;
  toJs(): Promise<unknown>;
}

export interface WebRInstance {
  init(): Promise<void>;
  installPackages(names: string[]): Promise<void>;
  evalRVoid(code: string): Promise<void>;
  Shelter: new () => WebRShelter;
}

export type WebRConstructor = new (options?: Record<string, unknown>) => WebRInstance;

declare global {
  interface Window {
    CodeMirror?: CodeMirrorAPI;
    Plotly?: PlotlyAPI;
    loadPyodide?: LoadPyodideFn;
    __WebR?: WebRConstructor;
  }
}
