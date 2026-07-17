// Local ambient declarations for runtimes that are loaded from a CDN at
// runtime and are NOT installed from npm (they were dropped from
// package.json to keep `npm ci` lean — php-wasm alone is ~190 MB unpacked).
// Each block declares only the slice of the real package's API that the
// workers actually touch; the version each CDN URL pins is the compat
// contract (see cdn.ts / the per-worker *_VERSION constants).

// plotly.js-dist-min has no shipped types; we only use a tiny slice
// (described in `Playground.tsx` as `PlotlyAPI`).
declare module "plotly.js-dist-min" {
  const Plotly: unknown;
  export default Plotly;
}

// pyodide: the runtime module is fetched from jsDelivr inside
// pyodide-worker.ts (loadPyodideModule); this mirrors the members of the
// real PyodideInterface the worker calls. PyProxy values cross this
// boundary as `any`, matching the loosely-typed proxies the real package
// exposes.
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

// php-wasm: the runtime module is fetched from unpkg inside php-worker.ts
// (see PHP_WASM_ENTRY); this mirrors the PhpWeb members the worker calls.
// PhpWeb extends EventTarget ("output"/"error" CustomEvents carry the
// program's stdout/stderr).
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
