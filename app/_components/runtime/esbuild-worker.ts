/// <reference lib="webworker" />

// esbuild-wasm bundling worker, the transform step behind the React
// playground. Mirrors the TS language worker's loading strategy: the
// heavy dependency (esbuild's browser build + its WASM binary) is pulled
// from the pinned jsDelivr package with `importScripts`, so the bundler
// never touches it and nothing lands in the client chunks; the download
// happens once, when a React block/playground first boots.
//
// Per bundle request the worker runs esbuild's in-memory `build` over
// the workspace snapshot with two resolution rules supplied by a plugin:
//
//   - relative imports resolve against the virtual file system (the
//     playground's tabs), trying the usual extension/index candidates;
//   - bare imports (`react`, `react-dom/client`, any npm package)
//     rewrite to pinned esm.sh URLs and stay external, the browser
//     fetches them as native ES modules inside the preview iframe.
//
// CSS imported from user code comes back as a separate output file that
// the adapter inlines into the preview document's <style>.
//
// Protocol: `bundle` request / `bundle-done` | `bundle-error` response
// correlated by id, plus the usual `ready` boot signal.

import { ESBUILD_WASM_CDN_BASE } from "./cdn";
// The bundling contract itself — resolution rules, loader table and build
// options — lives in a module the Node-side generator imports too, so a
// block's precomputed preview and its in-browser Run cannot drift apart.
import {
  REACT_BUILD_OPTIONS,
  splitBundleOutput,
  vfsPlugin,
  type EsbuildOutputFile,
} from "./reactBundle";

// The one part of the esbuild surface that stays local: `initialize` is
// browser-only, and the build signature is loose because the options
// themselves come from the shared module (REACT_BUILD_OPTIONS).
interface EsbuildMessage {
  text: string;
  location: { file: string; line: number; column: number } | null;
}
interface EsbuildApi {
  initialize(options: { wasmURL: string; worker?: boolean }): Promise<void>;
  build(
    options: Record<string, unknown>,
  ): Promise<{ outputFiles: EsbuildOutputFile[]; warnings: EsbuildMessage[] }>;
}

declare const self: DedicatedWorkerGlobalScope & {
  esbuild: EsbuildApi;
};

// Boot failures (CDN unreachable, WASM instantiation error) must be
// reported through the message protocol: a top-level throw here does
// NOT reliably surface as an `error` event on the page's Worker handle
// once Turbopack's worker bootstrap wraps this module, so an uncaught
// throw would leave the adapter waiting on `ready` forever.
const initPromise = (async () => {
  self.importScripts(`${ESBUILD_WASM_CDN_BASE}/lib/browser.min.js`);
  // `worker: false`, we ARE the worker; esbuild would otherwise nest one.
  await self.esbuild.initialize({
    wasmURL: `${ESBUILD_WASM_CDN_BASE}/esbuild.wasm`,
    worker: false,
  });
  return self.esbuild;
})();

type InMessage = {
  kind: "bundle";
  id: number;
  /** Workspace snapshot: [path, content] with plain relative paths. */
  files: Array<[string, string]>;
  /** Path (within `files`) of the entry module. */
  entry: string;
};

type OutMessage =
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "bundle-done"; id: number; js: string; css: string }
  | { kind: "bundle-error"; id: number; message: string };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

function formatBuildError(err: unknown): string {
  const withErrors = err as {
    errors?: { text: string; location?: { file: string; line: number; column: number } | null }[];
    message?: string;
  };
  if (Array.isArray(withErrors.errors) && withErrors.errors.length > 0) {
    return withErrors.errors
      .map((e) => {
        const loc = e.location
          ? `${e.location.file}:${e.location.line}:${e.location.column}: `
          : "";
        return `${loc}${e.text}`;
      })
      .join("\n");
  }
  return withErrors.message ?? String(err);
}

async function bundle(msg: InMessage): Promise<void> {
  try {
    const esbuild = await initPromise;
    const files = new Map(msg.files);
    const result = await esbuild.build({
      ...REACT_BUILD_OPTIONS,
      entryPoints: [msg.entry],
      plugins: [vfsPlugin(files)],
    });
    const { js, css } = splitBundleOutput(result.outputFiles);
    post({ kind: "bundle-done", id: msg.id, js, css });
  } catch (err) {
    post({ kind: "bundle-error", id: msg.id, message: formatBuildError(err) });
  }
}

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  const msg = ev.data;
  if (msg.kind !== "bundle") return;
  void bundle(msg);
});

// `ready` only once the WASM toolchain is actually usable, so the boot
// overlay covers the whole download/instantiation wait.
initPromise.then(
  () => post({ kind: "ready" }),
  (err) =>
    post({
      kind: "init-error",
      message: err instanceof Error ? err.message : String(err),
    }),
);
