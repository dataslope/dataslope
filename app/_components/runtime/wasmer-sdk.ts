// Shared @wasmer/sdk loader used by both the C and the C++ playgrounds.
//
// `@wasmer/sdk` is a singleton at the JavaScript-module level: it owns
// a global Web Worker threadpool plus internal state (worker URL, SDK
// URL, the cached `wasmer_js_bg.wasm` instance) that lives for the
// lifetime of the page. Calling its top-level `init(...)` more than
// once does NOT re-initialize anything — the wasm module is cached —
// but it DOES clobber the global worker/SDK URLs with whatever was
// passed in the second call.
//
// When each adapter (`c.tsx`, `cpp.tsx`) had its own copy of the init
// helper, navigating between `/c` and `/cpp` in the same tab caused
// the second adapter to call `init(...)` again with a freshly-created
// blob URL for `workerUrl`. The already-running threadpool's spawned
// commands then ended up referring to a worker URL that no longer
// matched the one the threadpool had been bootstrapped against,
// leaving newly-spawned commands (notably the C++ compile, which is
// heavier than the C compile) waiting forever for a response from a
// worker that never picked up the job.
//
// Sharing a single module-level promise here guarantees `init(...)`
// is called exactly once per page load, no matter which playground
// is visited first or which order the user navigates through them —
// so the C and C++ playgrounds operate fully independently.

const WASMER_SDK_VERSION = "0.10.0";
const WASMER_SDK_CDN = `https://cdn.jsdelivr.net/npm/@wasmer/sdk@${WASMER_SDK_VERSION}/dist`;

// Narrow shape of the @wasmer/sdk module we consume. The SDK ships its
// own `.d.ts`, but we import it dynamically (it touches `Worker` /
// `SharedArrayBuffer` at module init time) so we describe just the
// pieces we actually use here.
export type DirectoryInit = Record<string, string | Uint8Array>;
export interface WasmerDirectory {
  writeFile(path: string, contents: string | Uint8Array): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
}
export interface WasmerOutput {
  code: number;
  ok: boolean;
  stdout: string;
  stderr: string;
}
export interface WasmerInstance {
  wait(): Promise<WasmerOutput>;
}
export interface WasmerSpawnOptions {
  args?: string[];
  env?: Record<string, string>;
  mount?: Record<string, DirectoryInit | WasmerDirectory>;
  cwd?: string;
}
export interface WasmerCommand {
  run(options?: WasmerSpawnOptions): Promise<WasmerInstance>;
}
export interface WasmerPackage {
  readonly entrypoint?: WasmerCommand;
  readonly commands: Record<string, WasmerCommand>;
}
export interface WasmerSdk {
  init(options?: {
    module?: URL | string;
    workerUrl?: URL | string;
    sdkUrl?: URL | string;
    log?: string;
  }): Promise<unknown>;
  Wasmer: {
    fromRegistry(specifier: string): Promise<WasmerPackage>;
    fromWasm(binary: Uint8Array): WasmerPackage;
  };
  Directory: new (init?: DirectoryInit) => WasmerDirectory;
}

// Shared, page-lifetime singleton. Both `c.tsx` and `cpp.tsx` import
// this same module, so they share the same promise — first caller
// performs the work, subsequent callers await the same result.
let sdkInitPromise: Promise<WasmerSdk> | null = null;

export function loadWasmerSdk(): Promise<WasmerSdk> {
  if (sdkInitPromise) return sdkInitPromise;
  sdkInitPromise = (async () => {
    // Dynamic import keeps the SDK out of the SSR bundle — at module
    // init it touches `Worker` and `SharedArrayBuffer`.
    const mod = (await import("@wasmer/sdk")) as unknown as WasmerSdk;

    // `workerUrl` must resolve to a same-origin URL: the threadpool
    // spawns its workers via `new Worker(url, { type: "module" })`,
    // and some browsers refuse cross-origin module worker scripts even
    // when the CDN sends permissive CORS headers. Failing the spawn
    // drops the task's response channel, surfacing as "oneshot
    // canceled" the moment the user clicks Run.
    //
    // We sidestep that by fetching the bootstrap from the CDN once and
    // re-serving it as a `blob:` URL, which counts as same-origin to
    // the document that created it. The bootstrap then dynamically
    // imports the main SDK from `sdkUrl` (still on jsDelivr — module
    // worker `import()` honours CORS, so cross-origin is fine here).
    const workerSource = await fetch(`${WASMER_SDK_CDN}/worker.mjs`).then(
      (r) => {
        if (!r.ok) {
          throw new Error(
            `Failed to fetch Wasmer worker bootstrap (HTTP ${r.status}).`,
          );
        }
        return r.text();
      },
    );
    const workerBlobUrl = URL.createObjectURL(
      new Blob([workerSource], { type: "text/javascript" }),
    );

    await mod.init({
      // Resolve the SDK's own `.wasm` against jsDelivr so we don't
      // have to teach webpack how to emit it. jsDelivr serves it with
      // permissive CORS / CORP headers, which is what COEP=require-corp
      // needs.
      module: new URL(`${WASMER_SDK_CDN}/wasmer_js_bg.wasm`),
      workerUrl: workerBlobUrl,
      sdkUrl: new URL(`${WASMER_SDK_CDN}/index.mjs`),
    });
    return mod;
  })();
  return sdkInitPromise;
}

// Shared cache for the `clang/clang` package. Both the C and the C++
// playgrounds use the exact same package — only the per-run compile
// arguments differ — so we resolve it once and reuse the result.
let clangPackagePromise: Promise<WasmerPackage> | null = null;

export function loadClangPackage(sdk: WasmerSdk): Promise<WasmerPackage> {
  if (clangPackagePromise) return clangPackagePromise;
  clangPackagePromise = sdk.Wasmer.fromRegistry("clang/clang");
  return clangPackagePromise;
}
