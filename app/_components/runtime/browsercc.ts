// Shared browsercc + WASI loader for the C and C++ playgrounds.
// browsercc is a precompiled clang/lld toolchain + WASI sysroot; compiled
// modules run under @bjorn3/browser_wasi_shim, which needs no
// SharedArrayBuffer, so the document needn't be cross-origin-isolated.
// Both libraries load from a CDN (browsercc resolves its siblings against
// import.meta.url, so importing index.js from jsDelivr is enough) as
// page-lifetime singletons, so /c and /cpp share the ~95 MB of assets.

const BROWSERCC_VERSION = "0.1.1";
const BROWSERCC_URL = `https://cdn.jsdelivr.net/npm/browsercc@${BROWSERCC_VERSION}/dist/index.js`;

const WASI_SHIM_VERSION = "0.4.2";
const WASI_SHIM_URL = `https://esm.sh/@bjorn3/browser_wasi_shim@${WASI_SHIM_VERSION}`;

// ─── Public types ──────────────────────────────────────────────────────

export interface BrowserccCompileJob {
  source: string;
  fileName: string;
  flags: string[];
  extraFiles?: Record<string, string | ArrayBuffer>;
}

export interface BrowserccCompileResult {
  compileOutput: string;
  module: WebAssembly.Module | null;
}

export interface BrowserccApi {
  compile(job: BrowserccCompileJob): Promise<BrowserccCompileResult>;
  /** Returns the prebuilt `bits/stdc++.h` PCH when `flags` are
   *  PCH-compatible (`-O2 -std=c++20 -fno-exceptions`), else `null`. */
  getPrecompiledHeader(flags: string[]): Promise<ArrayBuffer | null>;
}

interface WasiInstance {
  readonly wasiImport: WebAssembly.ModuleImports;
  start(instance: WebAssembly.Instance): number | undefined;
}

export interface WasiShim {
  WASI: new (
    args: string[],
    env: string[],
    fds: unknown[],
  ) => WasiInstance;
  File: new (data: Uint8Array | number[]) => unknown;
  OpenFile: new (file: unknown) => unknown;
  ConsoleStdout: new (cb: (data: Uint8Array) => void) => unknown;
}

// ─── CDN loaders (page-lifetime singletons) ────────────────────────────

// `new Function` hides the import from the bundler's static analysis,
// which would otherwise refuse to fetch a remote URL at build time.
const dynamicImport = new Function(
  "url",
  "return import(url);",
) as (url: string) => Promise<unknown>;

let browserccPromise: Promise<BrowserccApi> | null = null;
export function loadBrowsercc(): Promise<BrowserccApi> {
  if (browserccPromise) return browserccPromise;
  browserccPromise = dynamicImport(BROWSERCC_URL) as Promise<BrowserccApi>;
  return browserccPromise;
}

let wasiShimPromise: Promise<WasiShim> | null = null;
export function loadWasiShim(): Promise<WasiShim> {
  if (wasiShimPromise) return wasiShimPromise;
  wasiShimPromise = dynamicImport(WASI_SHIM_URL) as Promise<WasiShim>;
  return wasiShimPromise;
}

// ─── Run a compiled WASI module and capture its stdout/stderr ──────────

export interface WasiRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** Instantiate a browsercc-produced WASI module and run `_start`. Stdin is
 *  empty; stdout/stderr are captured and returned as strings. */
export async function runWasiModule(
  module: WebAssembly.Module,
  shim: WasiShim,
): Promise<WasiRunResult> {
  const decoder = new TextDecoder("utf-8");
  let stdout = "";
  let stderr = "";
  const writeOut = (data: Uint8Array) => {
    stdout += decoder.decode(data, { stream: true });
  };
  const writeErr = (data: Uint8Array) => {
    stderr += decoder.decode(data, { stream: true });
  };

  const stdinFd = new shim.OpenFile(new shim.File(new Uint8Array(0)));
  const stdoutFd = new shim.ConsoleStdout(writeOut);
  const stderrFd = new shim.ConsoleStdout(writeErr);

  const wasi = new shim.WASI([], [], [stdinFd, stdoutFd, stderrFd]);
  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });

  let exitCode = 0;
  try {
    const result = wasi.start(instance);
    if (typeof result === "number") exitCode = result;
  } catch (err) {
    // `_exit(n)` surfaces as a WASIProcExit-shaped error with a numeric
    // `.code`; anything else is a real crash.
    const code = (err as { code?: unknown })?.code;
    if (typeof code === "number") {
      exitCode = code;
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      stderr += `Runtime error: ${msg}\n`;
      exitCode = 1;
    }
  }

  return { exitCode, stdout, stderr };
}

// ─── Shared C++ PCH cache ──────────────────────────────────────────────
// getPrecompiledHeader triggers a 19 MB download browsercc doesn't cache;
// cache it here for the page lifetime (callers slice, since extraFiles may
// be consumed destructively).

let pchPromise: Promise<ArrayBuffer | null> | null = null;
export function loadCppPch(api: BrowserccApi, flags: string[]): Promise<ArrayBuffer | null> {
  if (pchPromise) return pchPromise;
  pchPromise = api.getPrecompiledHeader(flags).catch((err) => {
    console.warn("[browsercc] PCH fetch failed; falling back to per-run header parsing.", err);
    return null;
  });
  return pchPromise;
}
