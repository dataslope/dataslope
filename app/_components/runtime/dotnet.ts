// Shared loader for the .NET WebAssembly runtime. The C# playground
// uses Microsoft's official Mono-based .NET WebAssembly runtime to
// run user code entirely in the browser (no server roundtrip), in
// the same spirit as Pyodide for Python, WebR for R, browsercc for
// C/C++, CheerpJ for Java and php-wasm for PHP.
//
// We load the runtime + a precompiled C# script host bundle from
// jsDelivr — the bundle ships:
//   - dotnet.js              (Microsoft's public Mono boot script)
//   - dotnet.runtime.js      (the JS half of the runtime)
//   - dotnet.native.wasm     (the WASM half of the runtime)
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
// The runtime is loaded as a non-module IIFE script so it can attach
// `globalThis.dotnet` regardless of bundler hoisting; we then read
// that global, call `dotnet.create()`, and pull the JS-exported
// `ScriptRunner.RunScript` out of it.

const RUNTIME_VERSION = "9.0.0";
const RUNTIME_BUNDLE_BASE = `https://cdn.jsdelivr.net/npm/@dataslope/csharp-script-runner@${RUNTIME_VERSION}/dist/`;
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

interface DotnetBootHostBuilder {
  withConfig(config: Record<string, unknown>): DotnetBootHostBuilder;
  withResourceLoader(
    loader: (type: string, name: string, defaultUri: string) => string,
  ): DotnetBootHostBuilder;
  create(): Promise<DotnetBootHost>;
}

/** Mono's `getAssemblyExports` returns a deeply nested record keyed by
 *  namespace segments and class names, with the leaves being the
 *  exported `[JSExport]` methods. We model it loosely so callers can
 *  walk into whatever depth their bundle uses. */
type AssemblyExportNode =
  | ((...args: unknown[]) => unknown)
  | { [key: string]: AssemblyExportNode };

interface DotnetBootHost {
  setModuleImports(moduleName: string, imports: Record<string, unknown>): void;
  getAssemblyExports(
    assemblyName: string,
  ): Promise<Record<string, AssemblyExportNode>>;
  runMain(mainAssemblyName: string, args: string[]): Promise<number>;
}

interface DotnetGlobal {
  /** Mono's documented JS API entry-point: returns a host-builder
   *  that we configure and then `.create()` to start the runtime. */
  dotnet: DotnetBootHostBuilder;
}

let dotnetPromise: Promise<DotnetApi> | null = null;

/** Inject the bootstrap script (once per page), build a host with the
 *  bundled C# script runner, and resolve with a `runScript` function
 *  the C# adapter calls for every Run press. */
export function loadDotnet(
  setLoadingMessage: (message: string) => void,
): Promise<DotnetApi> {
  if (dotnetPromise) return dotnetPromise;
  dotnetPromise = (async () => {
    if (typeof window === "undefined") {
      throw new Error(".NET runtime requires a browser environment.");
    }

    setLoadingMessage("Loading .NET runtime (Mono WebAssembly)…");
    await injectBootScript();

    const dotnetGlobal = (window as unknown as Partial<DotnetGlobal>).dotnet;
    if (!dotnetGlobal) {
      throw new Error(
        "Failed to load .NET runtime: `dotnet` global was not registered after the boot script ran.",
      );
    }

    setLoadingMessage("Initialising .NET runtime…");
    const host = await dotnetGlobal
      .withResourceLoader((_type, _name, defaultUri) => {
        // Resolve every framework asset against our CDN bundle so the
        // runtime never hits a relative `_framework/` URL.
        try {
          const url = new URL(defaultUri, RUNTIME_BUNDLE_BASE);
          return url.toString();
        } catch {
          return RUNTIME_BUNDLE_BASE + defaultUri;
        }
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

function injectBootScript(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${BOOT_SCRIPT_URL}"]`,
    );
    if (existing) {
      if ((window as unknown as Partial<DotnetGlobal>).dotnet) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${BOOT_SCRIPT_URL}`)),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = BOOT_SCRIPT_URL;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load ${BOOT_SCRIPT_URL}`)),
      { once: true },
    );
    document.head.appendChild(script);
  });
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
