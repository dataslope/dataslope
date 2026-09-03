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
import { EXCEPTION_HOOK_SOURCE } from "./csharpBuild";

const RUNTIME_BUNDLE_BASE = `${CDN_BASE_URL}/_dotnet/`;

/**
 * What the bundle actually is, read back from the runtime itself with
 * `RuntimeInformation.FrameworkDescription` and locked in by
 * `__tests__/csharpBuild.test.ts`.
 *
 * It was hard-coded as ".NET 9" / "C# 13" in two places, understating the
 * playground by a whole major version — which is the sort of thing that
 * quietly costs a panel its credibility.
 */
export const DOTNET_VERSION = "10.0.7";
/** The language version that .NET 10's Roslyn compiles by default. */
export const CSHARP_VERSION = "14";
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
  /** Roslyn completions at a 0-based offset, as the JSON `Complete` in
   *  Runner.cs returns. Absent when the published bundle predates that
   *  export, in which case the editor keeps its static tier. */
  complete?(code: string, position: number, otherFilesJson: string): Promise<string>;
  /** True once the warm-up compile has finished, which is what makes a
   *  run's duration predictable enough to put a cap on. */
  isWarm(): boolean;
  /**
   * Resolves when the warm-up compile is done, reporting what it is doing
   * while it runs. Resolves either way: a warm-up that failed leaves the
   * work to the run that follows, exactly as it was before.
   *
   * Awaited at the top of every run, which also keeps two scripts from
   * being in the host at once — they would fight over the console it
   * redirects.
   */
  whenWarm(onProgress?: (message: string) => void): Promise<void>;
}

/**
 * Count the reference assemblies the compiler pulls, for the boot notice.
 *
 * The first compile downloads one metadata reference per loaded assembly,
 * sequentially, from inside .NET. They do not pass through the host's
 * resource loader — they are `HttpClient` calls, which on this runtime are
 * `fetch` — so the only place to see them is `fetch` itself. Wrapped for
 * the duration of the warm-up and put back afterwards.
 */
function countBundleFetches(onCount: (count: number) => void): () => void {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return () => {};
  }
  const original = window.fetch;
  let count = 0;
  const patched: typeof window.fetch = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.startsWith(RUNTIME_BUNDLE_BASE) && url.endsWith(".dll")) {
      onCount(++count);
    }
    return original(input, init);
  };
  window.fetch = patched;
  return () => {
    // Only restore what is still ours: another patch layered on top of
    // this one has its own idea of what the original was.
    if (window.fetch === patched) window.fetch = original;
  };
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

/** Compiles and runs, touching nothing the reader can see, so the
 *  reference assemblies are downloaded and Roslyn is warm before Run is
 *  pressed — and the one AppDomain-lifetime hook is in place. */
export const WARMUP_SCRIPT = `${EXCEPTION_HOOK_SOURCE}\nSystem.Console.Write("");`;

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
    setLoadingMessage("Downloading the .NET runtime…", 0.15);
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

    setLoadingMessage("Preparing the C# compiler…", 0.6);
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

    let warm = false;
    let reportWarmProgress: ((message: string) => void) | null = null;

    const runScript = async (code: string): Promise<CSharpScriptResult> => {
      const raw = (await runScriptExport(code)) as unknown;
      return parseScriptResult(raw);
    };

    /**
     * The first compile is the expensive one: it fetches a metadata
     * reference per loaded assembly, one at a time, and it used to happen
     * on the reader's first Run — minutes of a blank output pane and a
     * disabled button, with nothing to distinguish it from a hang.
     *
     * Started here so it overlaps with reading and typing, but not
     * awaited: blocking the boot on it would only move the same wait onto
     * a disabled Run button, and onto every lesson page with a C# snippet
     * on it. A run that arrives first joins this and watches it.
     */
    const warmUp = (async () => {
      const stopCounting = countBundleFetches((count) => {
        reportWarmProgress?.(
          `Loading the .NET class library… ${count} assemblies`,
        );
      });
      try {
        await runScript(WARMUP_SCRIPT);
        warm = true;
      } catch {
        // A warm-up that fails costs nothing: the first real Run pays the
        // download instead, exactly as it did before.
      } finally {
        stopCounting();
      }
    })();
    void warmUp;

    setLoadingMessage("C# ready", 1);

    const completeExport = lookupExport(exports, [
      "ScriptRunner",
      "Runner",
      "Complete",
    ]);

    const api: DotnetApi = {
      runScript,
      complete: completeExport
        ? async (code, position, otherFilesJson) => {
            const raw = (await completeExport(code, position, otherFilesJson)) as unknown;
            return typeof raw === "string" ? raw : "";
          }
        : undefined,
      isWarm: () => warm,
      whenWarm(onProgress?: (message: string) => void) {
        if (warm) return Promise.resolve();
        reportWarmProgress = onProgress ?? null;
        return warmUp.finally(() => {
          reportWarmProgress = null;
        });
      },
    };
    return api;
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
