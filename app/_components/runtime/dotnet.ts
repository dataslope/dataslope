// Shared loader for the .NET WebAssembly runtime. The C# playground
// uses Microsoft's official Mono-based .NET WebAssembly runtime to
// run user code entirely in the browser (no server roundtrip), in
// the same spirit as Pyodide for Python, WebR for R, browsercc for
// C/C++, CheerpJ for Java and php-wasm for PHP.
//
// The runtime bundle lives in public/_dotnet/ and ships:
//   - dotnet.js              (Microsoft's Mono boot script, ES module)
//   - dotnet.runtime.js      (the JS half of the runtime)
//   - dotnet.native.js       (the Emscripten-generated JS)
//   - dotnet.native.wasm     (the WASM half of the runtime)
//   - dotnet.boot.js         (boot config listing all required assemblies)
//   - System.* / Microsoft.CodeAnalysis.* assemblies
//   - a tiny ScriptRunner.dll that wraps Microsoft.CodeAnalysis.CSharp
//     .Scripting.CSharpScript.RunAsync and exposes it to JS via the
//     [JSExport] attribute.
//
// Once the runtime boots we get a function `runScript(code)` that
// returns an object containing the captured stdout + stderr from
// running the user's C# code. Because the runtime is large (>30MB
// gzipped) we cache the bootstrap across React strict-mode mounts
// and across navigation between the home page and the C# playground.
//
// dotnet.js is an ES module; we load it with a dynamic import() so
// the module's internal relative imports (dotnet.runtime.js, etc.)
// resolve correctly against the /_dotnet/ public path.

const RUNTIME_BUNDLE_BASE = "/_dotnet/";
const BOOT_SCRIPT_URL = `${RUNTIME_BUNDLE_BASE}dotnet.js`;

export interface CSharpScriptResult {
  stdout: string;
  stderr: string;
  /** Non-zero if the script threw. */
  exitCode: number;
}

export interface DotnetApi {
  /** Compile + run a C# script. Top-level statements are allowed; the
   *  runner internally calls `Microsoft.CodeAnalysis.CSharp.Scripting
   *  .CSharpScript.RunAsync(code)`. */
  runScript(code: string): Promise<CSharpScriptResult>;
}

/** dotnet.js exports a `dotnet` DotnetHostBuilder as an ES-module named export. */
interface DotnetHostBuilder {
  withConfig(config: Record<string, unknown>): DotnetHostBuilder;
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

/** Mono's `getAssemblyExports` returns a deeply nested record keyed by
 *  namespace segments and class names, with the leaves being the
 *  exported `[JSExport]` methods. We model it loosely so callers can
 *  walk into whatever depth their bundle uses. */
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

/** Dynamically import the boot script (once per page), configure the
 *  runtime to load all assets from /_dotnet/, and resolve with a
 *  `runScript` function the C# adapter calls for every Run press. */
export function loadDotnet(
  setLoadingMessage: (message: string) => void,
): Promise<DotnetApi> {
  if (dotnetPromise) return dotnetPromise;
  dotnetPromise = (async () => {
    if (typeof window === "undefined") {
      throw new Error(".NET runtime requires a browser environment.");
    }

    setLoadingMessage("Loading .NET runtime (Mono WebAssembly)…");

    // dotnet.js is an ES module that exports a `dotnet` DotnetHostBuilder.
    // Dynamic import() lets the module's internal relative imports
    // (dotnet.runtime.js, dotnet.native.js) resolve against /_dotnet/.
    const dotnetModule = (await import(
      /* webpackIgnore: true */ BOOT_SCRIPT_URL
    )) as DotnetModule;
    const dotnetBuilder = dotnetModule.dotnet;
    if (!dotnetBuilder) {
      throw new Error(
        "Failed to load .NET runtime: `dotnet` export was not found in dotnet.js.",
      );
    }

    setLoadingMessage("Initialising .NET runtime…");
    const host = await dotnetBuilder
      .withResourceLoader((_type, name, _defaultUri, _integrity, _behavior) => {
        // Redirect every framework asset fetch to our /_dotnet/ bundle.
        // The runtime auto-discovers dotnet.boot.js relative to dotnet.js,
        // so all asset names (including "dotnet.boot.js") map here correctly.
        return `${RUNTIME_BUNDLE_BASE}${name}`;
      })
      .create();

    setLoadingMessage("Loading Roslyn (C# scripting engine)…");
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
    // Reset the singleton so a subsequent reload attempt re-runs the
    // full bootstrap rather than rejecting with the cached error.
    dotnetPromise = null;
    throw err;
  });
  return dotnetPromise;
}

/** Walk a nested `getAssemblyExports` tree by namespace + class +
 *  method names. Returns `undefined` if the path is missing or the
 *  leaf is not callable. */
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
  // ScriptRunner.RunScript returns a JSON-encoded string so we don't
  // have to teach Mono's JS interop about a custom struct.
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
