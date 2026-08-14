// Shared loader for Microsoft's Mono-based .NET WebAssembly runtime.
// The bundle lives in cdn-assets/_dotnet/ (served via jsDelivr, see
// cdn.ts): dotnet.js + runtime/native JS, dotnet.native.wasm, the boot
// config, System.*/Roslyn assemblies, and a tiny ScriptRunner.dll that
// exposes CSharpScript.RunAsync via [JSExport]. The bootstrap (>30 MB
// gzipped) is cached across strict-mode mounts and navigations. dotnet.js
// is imported dynamically so its internal relative imports resolve against
// the CDN path, with an explicit boot-config URL + resource loader so
// assemblies never fall back to the app origin.

import { CDN_BASE_URL } from "./cdn";

const RUNTIME_BUNDLE_BASE = `${CDN_BASE_URL}/_dotnet/`;
const BOOT_SCRIPT_URL = `${RUNTIME_BUNDLE_BASE}dotnet.js`;
const BOOT_CONFIG_URL = `${RUNTIME_BUNDLE_BASE}dotnet.boot.js`;

export interface CSharpScriptResult {
  stdout: string;
  stderr: string;
  /** Non-zero if the script threw. */
  exitCode: number;
}

export interface DotnetApi {
  /** Compile + run a C# script (top-level statements allowed) via
   *  CSharpScript.RunAsync. */
  runScript(code: string): Promise<CSharpScriptResult>;
}

/** dotnet.js exports a `dotnet` DotnetHostBuilder as an ES-module named export. */
interface DotnetHostBuilder {
  withConfig(config: Record<string, unknown>): DotnetHostBuilder;
  withConfigSrc(configSrc: string): DotnetHostBuilder;
  withResourceLoader(
    loader: (
      type: string,
      name: string,
      defaultUri: string,
      integrity: string,
      behavior: string,
    ) => string | null | undefined,
  ): DotnetHostBuilder;
  create(): Promise<RuntimeAPI>;
}

/** Mono's `getAssemblyExports` tree: nested records keyed by namespace and
 *  class names, leaves being [JSExport] methods. Modelled loosely. */
type AssemblyExportNode =
  | ((...args: unknown[]) => unknown)
  | { [key: string]: AssemblyExportNode };

interface RuntimeAPI {
  setModuleImports(moduleName: string, imports: Record<string, unknown>): void;
  getAssemblyExports(
    assemblyName: string,
  ): Promise<Record<string, AssemblyExportNode>>;
  runMain(mainAssemblyName?: string, args?: string[]): Promise<number>;
  runMainAndExit(mainAssemblyName?: string, args?: string[]): Promise<void>;
}

/** Shape of dotnet.js's ES-module named exports. */
interface DotnetModule {
  dotnet: DotnetHostBuilder;
}

let dotnetPromise: Promise<DotnetApi> | null = null;

/** Import the boot script once per page, point the runtime at the jsDelivr
 *  bundle, and resolve with the `runScript` function used on every Run. */
export function loadDotnet(
  setLoadingMessage: (message: string, fraction?: number) => void,
): Promise<DotnetApi> {
  if (dotnetPromise) return dotnetPromise;
  dotnetPromise = (async () => {
    if (typeof window === "undefined") {
      throw new Error(".NET runtime requires a browser environment.");
    }

    setLoadingMessage("Loading C# runtime…", 0.05);

    // BOTH ignore comments matter: without `turbopackIgnore`, Turbopack
    // resolves the jsDelivr URL to the local cdn-assets/_dotnet copy and
    // bundles dotnet.js + the ~3 MB wasm into the Worker build.
    const dotnetModule = (await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ BOOT_SCRIPT_URL
    )) as DotnetModule;
    const dotnetBuilder = dotnetModule.dotnet;
    if (!dotnetBuilder) {
      throw new Error(
        "Failed to load .NET runtime: `dotnet` export was not found in dotnet.js.",
      );
    }

    // create() is the heavy stage: streams the ~35 MB assembly bundle and
    // instantiates the Mono WASM runtime.
    setLoadingMessage("Initialising C# runtime…", 0.15);
    const host = await dotnetBuilder
      .withConfigSrc(BOOT_CONFIG_URL)
      .withResourceLoader((_type, name) => {
        // Redirect every framework asset fetch to our jsDelivr CDN bundle.
        return new URL(name.replace(/^\.?\//, ""), RUNTIME_BUNDLE_BASE).href;
      })
      .create();
    host.setModuleImports("main.js", {
      // Lets Runner.cs fetch metadata reference DLLs from jsDelivr, not
      // the app origin.
      getDotnetBundleBaseUrl: () => RUNTIME_BUNDLE_BASE,
    });

    setLoadingMessage("Preparing C# compiler…", 0.85);
    const exports = await host.getAssemblyExports("ScriptRunner");
    const runScriptExport = lookupExport(exports, [
      "ScriptRunner",
      "Runner",
      "RunScript",
    ]);
    if (typeof runScriptExport !== "function") {
      throw new Error(
        "ScriptRunner.dll did not expose RunScript. The published runtime bundle may be missing or out of date.",
      );
    }

    return {
      async runScript(code: string): Promise<CSharpScriptResult> {
        const raw = (await runScriptExport(code)) as unknown;
        return parseScriptResult(raw);
      },
    };
  })().catch((err) => {
    // Reset the singleton so a retry re-runs the bootstrap.
    dotnetPromise = null;
    throw err;
  });
  return dotnetPromise;
}

/** Walk a `getAssemblyExports` tree; undefined when the path is missing
 *  or the leaf isn't callable. */
function lookupExport(
  root: Record<string, AssemblyExportNode>,
  path: string[],
): ((...args: unknown[]) => unknown) | undefined {
  let cursor: AssemblyExportNode | undefined = root[path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!cursor || typeof cursor === "function") return undefined;
    cursor = cursor[path[i]];
  }
  return typeof cursor === "function" ? cursor : undefined;
}

function parseScriptResult(raw: unknown): CSharpScriptResult {
  // RunScript returns JSON so Mono's JS interop needs no custom struct.
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Partial<CSharpScriptResult>;
      return {
        stdout: typeof parsed.stdout === "string" ? parsed.stdout : "",
        stderr: typeof parsed.stderr === "string" ? parsed.stderr : "",
        exitCode: typeof parsed.exitCode === "number" ? parsed.exitCode : 0,
      };
    } catch {
      return { stdout: raw, stderr: "", exitCode: 0 };
    }
  }
  if (raw && typeof raw === "object") {
    const r = raw as Partial<CSharpScriptResult>;
    return {
      stdout: typeof r.stdout === "string" ? r.stdout : "",
      stderr: typeof r.stderr === "string" ? r.stderr : "",
      exitCode: typeof r.exitCode === "number" ? r.exitCode : 0,
    };
  }
  return { stdout: "", stderr: "", exitCode: 0 };
}
