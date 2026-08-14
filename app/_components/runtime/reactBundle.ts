/**
 * The React playground's bundling contract, shared by esbuild-worker.ts
 * (browser) and scripts/build-react-bundles.mjs (build machine). Both MUST
 * produce the same bundle for the same workspace — a preview that
 * disagrees with the reader's own Run is worse than no preview — so the
 * resolution rules, loader table, and build options live in this one
 * module. Everything here is pure and environment-independent (no self/
 * window/filesystem) so Node can import it; the esbuild instance is
 * supplied by the caller, pinned via ESBUILD_WASM_VERSION on both sides.
 */

import { esmShUrlFor, isBareSpecifier } from "./esmResolve";

/** Namespace the workspace's own files live in, so esbuild never touches
 *  a real filesystem for them. */
export const VFS_NAMESPACE = "ds-vfs";

// ─── Minimal esbuild surface ─────────────────────────────────────────────
// esbuild-wasm is intentionally not an npm dependency (cdn.ts pins the
// version), so the types live here.

export interface EsbuildOutputFile {
  path: string;
  text: string;
}
export interface EsbuildOnResolveArgs {
  path: string;
  importer: string;
  kind: string;
}
export interface EsbuildOnLoadArgs {
  path: string;
}
export interface EsbuildPluginBuild {
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
export interface EsbuildPlugin {
  name: string;
  setup(build: EsbuildPluginBuild): void;
}

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

export function loaderFor(path: string): string {
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
export function resolveInVfs(
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

/**
 * Resolution rules: workspace tabs come from the VFS; bare specifiers
 * rewrite to pinned esm.sh URLs and stay EXTERNAL — which keeps bundles
 * small and lets the browser fetch React itself.
 */
export function vfsPlugin(files: Map<string, string>): EsbuildPlugin {
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

/**
 * Every build option except workspace-dependent `entryPoints`/`plugins`.
 * Spread this rather than restating it: an option that differs between the
 * generator and the worker silently desyncs preview from Run.
 */
export const REACT_BUILD_OPTIONS = {
  bundle: true,
  write: false,
  format: "esm",
  target: ["es2020"],
  // The automatic runtime imports react/jsx-runtime, which the plugin
  // rewrites to the pinned esm.sh URL like any bare import.
  jsx: "automatic",
  outdir: "/out",
  // Inline sourcemaps so DevTools points at pane sources (main.tsx:12).
  // Browser `error` events don't consume sourcemaps, so the output panel
  // still reports bundle positions.
  sourcemap: "inline",
  sourceRoot: "dataslope://preview/",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "silent",
} as const;

/** Split esbuild's output files into the JS and CSS halves the preview
 *  document is composed from. */
export function splitBundleOutput(outputFiles: EsbuildOutputFile[]): {
  js: string;
  css: string;
} {
  let js = "";
  let css = "";
  for (const file of outputFiles) {
    if (file.path.endsWith(".css")) css += file.text;
    else js += file.text;
  }
  return { js, css };
}
