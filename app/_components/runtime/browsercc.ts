// Shared browsercc + WASI loader used by both the C and the C++
// playgrounds.
//
// `browsercc` is a precompiled clang/lld toolchain plus a WASI sysroot
// (libc, libc++, headers) wrapped in a small JavaScript surface:
//
//   compile({ source, fileName, flags, extraFiles? })
//     -> { module: WebAssembly.Module | null, compileOutput: string }
//   getPrecompiledHeader(flags)
//     -> ArrayBuffer | null   // returns a prebuilt <bits/stdc++.h> PCH
//                             //   when `flags` is PCH-compatible
//                             //   (-O2 -std=c++20 -fno-exceptions)
//
// The compiled WebAssembly module is a regular WASI binary, which we
// run with `@bjorn3/browser_wasi_shim` (the same WASI runtime the
// upstream browsercc demo uses). Unlike `@wasmer/sdk`, browsercc does
// NOT use SharedArrayBuffer / a Web Worker threadpool, so the hosting
// document does not need to be cross-origin-isolated.
//
// We load both libraries from a CDN at runtime:
//   * browsercc pulls its own siblings (`clang.wasm`, `lld.wasm`,
//     `sysroot.tar`, ...) relative to `import.meta.url`, so importing
//     `index.js` from jsDelivr is enough, every other artefact is
//     resolved against the same jsDelivr path automatically.
//   * `@bjorn3/browser_wasi_shim` is pure JavaScript with no extra
//     assets, so we just import its ESM bundle from esm.sh.
//
// Both loads are page-lifetime singletons so navigating between `/c`
// and `/cpp` reuses the same already-fetched ~95 MB worth of wasm and
// sysroot data.

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

// `import(<literal-string>)` would be statically rewritten by the
// bundler (Turbopack in Next.js 16), which then refuses to fetch a
// remote URL at build time. Wrapping it in `new Function` hides the
// import from static analysis so the URL is resolved at runtime in the
// browser, exactly like `pyodide-worker.ts` sidesteps the same issue
// with `importScripts` inside a Web Worker.
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

/** Instantiate a WASI module produced by browsercc and run its
 *  `_start`. Stdin is empty; stdout/stderr are captured and returned
 *  as strings so the caller can emit them as single playground cells
 *  (matching the stdout-then-stderr pattern of every other adapter). */
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
    // `wasi.start` throws a `WASIProcExit`-shaped error when the
    // program calls `_exit(n)`. The shim's error has a `.code` field
    // with the numeric exit code; treat anything else as a real crash.
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
//
// `getPrecompiledHeader(flags)` triggers a 19 MB download of
// `stdc++.h.pch`. browsercc itself doesn't cache the result, so the
// naive approach would re-download it on every run. We cache the
// fetched ArrayBuffer here (page lifetime) and hand back a fresh slice
// each time, since `extraFiles` may be consumed destructively.

let pchPromise: Promise<ArrayBuffer | null> | null = null;
export function loadCppPch(api: BrowserccApi, flags: string[]): Promise<ArrayBuffer | null> {
  if (pchPromise) return pchPromise;
  pchPromise = api.getPrecompiledHeader(flags).catch((err) => {
    console.warn("[browsercc] PCH fetch failed; falling back to per-run header parsing.", err);
    return null;
  });
  return pchPromise;
}
