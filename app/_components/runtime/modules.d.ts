// Ambient declarations for CDN-loaded runtimes NOT installed from npm
// (php-wasm alone is ~190 MB unpacked). Each block declares only the API
// slice the workers touch; the pinned CDN version is the compat contract.

// plotly.js-dist-min has no shipped types; only a tiny slice is used.
declare module "plotly.js-dist-min" {
  const Plotly: unknown;
  export default Plotly;
}

// pyodide: mirrors the PyodideInterface members the worker calls. PyProxy
// values cross as `any`, matching the real package's loose proxies.
declare module "pyodide" {
  interface LoadPackageOptions {
    messageCallback?: (message: string) => void;
    errorCallback?: (message: string) => void;
  }
  export interface PyodideInterface {
    globals: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get(name: string): any;
      set(name: string, value: unknown): void;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pyimport(name: string): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runPython(code: string): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runPythonAsync(code: string): Promise<any>;
    loadPackage(
      names: string | string[],
      options?: LoadPackageOptions,
    ): Promise<unknown>;
    loadPackagesFromImports(
      code: string,
      options?: LoadPackageOptions,
    ): Promise<unknown>;
    setStdout(options?: { batched?: (output: string) => void }): void;
    setStderr(options?: { batched?: (output: string) => void }): void;
  }
}

// php-wasm: mirrors the PhpWeb members the worker calls. PhpWeb extends
// EventTarget ("output"/"error" CustomEvents carry stdout/stderr).
declare module "php-wasm/PhpWeb" {
  export class PhpWeb extends EventTarget {
    constructor(options?: {
      locateFile?: (path: string) => string | undefined;
    });
    binary: Promise<unknown>;
    run(code: string): Promise<unknown>;
    refresh(): Promise<unknown>;
  }
}
