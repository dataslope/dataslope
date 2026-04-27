// Shared CheerpJ loader used by the Java playground.
//
// CheerpJ (https://cheerpj.com/) is a full OpenJDK runtime + JIT
// compiled to WebAssembly that runs entirely in the browser — the same
// "everything in the browser" approach used by Pyodide (Python),
// WebR (R), php-wasm (PHP), and browsercc (C/C++) elsewhere in this
// repo. We bundle a Java 8 `tools.jar` under `public/tools.jar`
// (served by Next.js at `/tools.jar`) and pre-load it into CheerpJ's
// virtual FS at `/app/tools.jar`, so we can drive `javac`
// (`com.sun.tools.javac.Main`) on user source at runtime, then run
// the resulting class with `cheerpjRunMain` — exactly what JavaFiddle
// does (https://github.com/leaningtech/javafiddle). CheerpJ itself
// does not ship `tools.jar`; without our bundled copy `cheerpjRunMain`
// would fail with "Could not find or load main class
// com.sun.tools.javac.Main".
//
// tools.jar lives in `public/` (rather than `cdn-assets/` like the
// .NET runtime bundle) because jsDelivr does not serve `.jar` files,
// so we cannot host it on a GitHub-tag-backed CDN.
//
// CheerpJ is distributed as a non-module loader script that injects
// globals (`cheerpjInit`, `cheerpjRunMain`, `cheerpjAddStringFile`,
// ...) onto `window`. We therefore inject it via a `<script src=...>`
// tag (rather than `import()`), wait for it to fire `onload`, then
// call `cheerpjInit` exactly once per page.
//
// `status: "none"` suppresses CheerpJ's own loading banner — the
// playground UI already renders its own.

const CHEERPJ_VERSION = "4.3";
const CHEERPJ_LOADER_URL = `https://cjrtnc.leaningtech.com/${CHEERPJ_VERSION}/loader.js`;
// Served by Next.js from public/tools.jar — jsDelivr does not support
// .jar files, so we cannot host this on the same GitHub-tag-backed
// CDN as the .NET runtime bundle (see cdn.ts).
const TOOLS_JAR_URL = "/tools.jar";

// ─── Public types ──────────────────────────────────────────────────────

/** Narrow slice of the CheerpJ globals we actually consume. */
export interface CheerpJApi {
  /** Run a Java main method.
   *  Returns the JVM exit code (0 = success). */
  cheerpjRunMain(mainClass: string, classPath: string, ...args: string[]): Promise<number>;
  /** Add a file to CheerpJ's read-only `/str/` virtual filesystem so
   *  Java code (or javac) can read it as if it were on disk. */
  cheerpjAddStringFile(path: string, data: Uint8Array): void;
}

// ─── Globals injected by loader.js ─────────────────────────────────────

interface CheerpJWindow extends Window {
  cheerpjInit?: (options?: Record<string, unknown>) => Promise<unknown>;
  cheerpjRunMain?: CheerpJApi["cheerpjRunMain"];
  cheerpjAddStringFile?: CheerpJApi["cheerpjAddStringFile"];
}

// ─── Page-lifetime singleton loader ────────────────────────────────────

let cheerpjPromise: Promise<CheerpJApi> | null = null;

/** Inject CheerpJ's loader script (once per page), call `cheerpjInit`,
 *  and resolve with the global API surface used by the Java adapter. */
export function loadCheerpJ(): Promise<CheerpJApi> {
  if (cheerpjPromise) return cheerpjPromise;
  cheerpjPromise = new Promise<CheerpJApi>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("CheerpJ requires a browser environment."));
      return;
    }
    const w = window as CheerpJWindow;

    const finishInit = async () => {
      try {
        if (typeof w.cheerpjInit !== "function") {
          throw new Error("CheerpJ loader did not register `cheerpjInit`.");
        }
        await w.cheerpjInit({ status: "none" });
        if (
          typeof w.cheerpjRunMain !== "function" ||
          typeof w.cheerpjAddStringFile !== "function"
        ) {
          throw new Error("CheerpJ globals missing after init.");
        }

        // Fetch tools.jar from /tools.jar (Next.js public/) and mount it
        // in CheerpJ's virtual FS at /app/tools.jar so javac
        // (com.sun.tools.javac.Main) can find it on the classpath.
        // tools.jar lives in public/ because jsDelivr does not serve
        // .jar files, so we cannot host it on the same GitHub-tag-backed
        // CDN as the .NET runtime bundle.
        const toolsJarResp = await fetch(TOOLS_JAR_URL);
        if (!toolsJarResp.ok) {
          throw new Error(
            `Failed to fetch tools.jar (HTTP ${toolsJarResp.status}): ${TOOLS_JAR_URL}`,
          );
        }
        w.cheerpjAddStringFile(
          "/app/tools.jar",
          new Uint8Array(await toolsJarResp.arrayBuffer()),
        );

        resolve({
          cheerpjRunMain: w.cheerpjRunMain.bind(w),
          cheerpjAddStringFile: w.cheerpjAddStringFile.bind(w),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // Reuse an existing loader script tag if some other module already
    // injected it — avoids the "CheerpJ: Already initialized" error
    // from cheerpjInit if React StrictMode mounts twice in dev.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHEERPJ_LOADER_URL}"]`,
    );
    if (existing && typeof w.cheerpjInit === "function") {
      finishInit();
      return;
    }

    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = CHEERPJ_LOADER_URL;
      script.async = true;
      script.addEventListener("error", () =>
        reject(new Error(`Failed to load CheerpJ loader from ${CHEERPJ_LOADER_URL}`)),
      );
      document.head.appendChild(script);
    }
    script.addEventListener("load", finishInit, { once: true });
  });
  return cheerpjPromise;
}
