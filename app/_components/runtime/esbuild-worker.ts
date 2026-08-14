/// <reference lib="webworker" />

// esbuild-wasm bundling worker for the React playground. The heavy
// dependency comes from jsDelivr via importScripts (never bundled). Per
// request it runs esbuild's in-memory build with the shared vfsPlugin
// rules (relative → VFS, bare → external esm.sh URLs); imported CSS comes
// back as a separate output the adapter inlines. Protocol: bundle /
// bundle-done | bundle-error by id, plus a ready boot signal.

import { ESBUILD_WASM_CDN_BASE } from "./cdn";
// The bundling contract lives in a module the Node-side generator imports
// too, so precomputed previews and in-browser Runs cannot drift apart.
import {
  REACT_BUILD_OPTIONS,
  splitBundleOutput,
  vfsPlugin,
  type EsbuildOutputFile,
} from "./reactBundle";

// Local esbuild surface: `initialize` is browser-only, and the build
// signature stays loose (options come from the shared module).
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

// Boot failures MUST go through the message protocol: a top-level throw
// doesn't reliably surface as an `error` event once Turbopack's worker
// bootstrap wraps this module, and would leave the adapter waiting forever.
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

// `ready` only once the toolchain is actually usable, so the boot overlay
// covers the whole wait.
initPromise.then(
  () => post({ kind: "ready" }),
  (err) =>
    post({
      kind: "init-error",
      message: err instanceof Error ? err.message : String(err),
    }),
);
