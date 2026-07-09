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
import { esmShUrlFor, isBareSpecifier } from "./esmResolve";

// Minimal surface of the esbuild browser API this worker uses,
// esbuild-wasm is intentionally not an npm dependency (the pin in
// cdn.ts is the single source of truth), so the types live here.
interface EsbuildLocation {
  file: string;
  line: number;
  column: number;
}
interface EsbuildMessage {
  text: string;
  location: EsbuildLocation | null;
}
interface EsbuildOutputFile {
  path: string;
  text: string;
}
interface EsbuildOnResolveArgs {
  path: string;
  importer: string;
  kind: string;
}
interface EsbuildOnLoadArgs {
  path: string;
}
interface EsbuildPluginBuild {
  onResolve(
    options: { filter: RegExp },
    callback: (args: EsbuildOnResolveArgs) =>
      | { path: string; namespace?: string; external?: boolean }
      | { errors: { text: string }[] }
      | undefined,
  ): void;
  onLoad(
    options: { filter: RegExp; namespace?: string },
    callback: (args: EsbuildOnLoadArgs) =>
      | { contents: string; loader?: string }
      | undefined,
  ): void;
}
interface EsbuildPlugin {
  name: string;
  setup(build: EsbuildPluginBuild): void;
}
interface EsbuildApi {
  initialize(options: { wasmURL: string; worker?: boolean }): Promise<void>;
  build(options: {
    entryPoints: string[];
    bundle: boolean;
    write: boolean;
    format: string;
    target: string[];
    jsx: string;
    outdir: string;
    sourcemap: string;
    sourceRoot: string;
    define: Record<string, string>;
    plugins: EsbuildPlugin[];
    logLevel: string;
  }): Promise<{ outputFiles: EsbuildOutputFile[]; warnings: EsbuildMessage[] }>;
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

const VFS_NAMESPACE = "ds-vfs";

const LOADERS: Record<string, string> = {
  tsx: "tsx",
  ts: "ts",
  jsx: "jsx",
  js: "js",
  mjs: "js",
  cjs: "js",
  css: "css",
  json: "json",
  txt: "text",
  svg: "text",
};

function loaderFor(path: string): string {
  const dot = path.lastIndexOf(".");
  const ext = dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
  return LOADERS[ext] ?? "tsx";
}

function normalize(path: string): string {
  const segments: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }
  return segments.join("/");
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

/** Resolve a relative import against the VFS, Node-style: exact path,
 *  extension candidates, then index files. */
function resolveInVfs(
  files: Map<string, string>,
  importer: string,
  specifier: string,
): string | null {
  const base = specifier.startsWith("/")
    ? specifier.slice(1)
    : normalize(`${dirname(importer)}/${specifier}`);
  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    `${base}.json`,
    `${base}/index.tsx`,
    `${base}/index.ts`,
    `${base}/index.jsx`,
    `${base}/index.js`,
  ];
  for (const candidate of candidates) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

function vfsPlugin(files: Map<string, string>): EsbuildPlugin {
  return {
    name: "dataslope-vfs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        // Entry points arrive with no importer; treat them as VFS paths.
        if (args.kind === "entry-point") {
          const entry = normalize(args.path);
          if (files.has(entry)) {
            return { path: entry, namespace: VFS_NAMESPACE };
          }
          return {
            errors: [{ text: `Entry file "${args.path}" not found in the workspace.` }],
          };
        }
        if (/^https?:\/\//i.test(args.path)) {
          return { path: args.path, external: true };
        }
        if (isBareSpecifier(args.path)) {
          return { path: esmShUrlFor(args.path), external: true };
        }
        const resolved = resolveInVfs(files, args.importer, args.path);
        if (resolved !== null) {
          return { path: resolved, namespace: VFS_NAMESPACE };
        }
        return {
          errors: [
            {
              text:
                `Cannot resolve "${args.path}" from "${args.importer}", ` +
                `no matching file in the workspace tabs.`,
            },
          ],
        };
      });
      build.onLoad({ filter: /.*/, namespace: VFS_NAMESPACE }, (args) => {
        const contents = files.get(args.path);
        if (contents === undefined) return undefined;
        return { contents, loader: loaderFor(args.path) };
      });
    },
  };
}

function formatBuildError(err: unknown): string {
  const withErrors = err as {
    errors?: { text: string; location?: EsbuildLocation | null }[];
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
      entryPoints: [msg.entry],
      bundle: true,
      write: false,
      format: "esm",
      target: ["es2020"],
      // The automatic runtime imports react/jsx-runtime, which the
      // plugin rewrites to the pinned esm.sh URL like any bare import.
      jsx: "automatic",
      outdir: "/out",
      // Inline sourcemaps so DevTools stack traces and breakpoints point
      // at the user's pane sources (main.tsx:12) instead of bundle
      // offsets. Costs bundle bytes in the srcdoc, fine at snippet
      // scale. (Browser `error` events don't consume sourcemaps, so the
      // output panel still reports bundle positions; DevTools maps.)
      sourcemap: "inline",
      sourceRoot: "dataslope://preview/",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [vfsPlugin(files)],
      logLevel: "silent",
    });
    let js = "";
    let css = "";
    for (const file of result.outputFiles) {
      if (file.path.endsWith(".css")) css += file.text;
      else js += file.text;
    }
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
