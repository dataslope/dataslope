// Shared CheerpJ loader used by the Java playground.
//
// CheerpJ (https://cheerpj.com/) is a full OpenJDK runtime + JIT
// compiled to WebAssembly that runs entirely in the browser, the same
// "everything in the browser" approach used by Pyodide (Python),
// WebR (R), php-wasm (PHP), and browsercc (C/C++) elsewhere in this
// repo. CheerpJ itself does not ship `tools.jar`, so we supply a Java 8
// `tools.jar` (which contains `com.sun.tools.javac.Main`) and load it
// into CheerpJ's in-memory `/str/` filesystem at runtime; we then drive
// `javac` on user source and run the resulting class with
// `cheerpjRunMain`, exactly what JavaFiddle does
// (https://github.com/leaningtech/javafiddle). Without it `cheerpjRunMain`
// fails with "Could not find or load main class
// com.sun.tools.javac.Main".
//
// The jar is fetched cross-origin from unpkg (the `dataslope-tools-jar`
// npm package, see TOOLS_JAR_CDN in cdn.ts) rather than served from this
// app's own origin, which never handles its ~18 MB. We
// fetch the bytes ourselves and inject them via `cheerpjAddStringFile`
// instead of relying on CheerpJ's `/app` → origin mapping; that is what
// lets the jar live on an external CDN. jsDelivr refuses .jar files and
// GitHub release assets omit CORS headers, so unpkg (which serves .jar
// with `access-control-allow-origin: *`) is the host.
//
// CheerpJ is distributed as a non-module loader script that injects
// globals (`cheerpjInit`, `cheerpjRunMain`, `cheerpjAddStringFile`,
// ...) onto `window`. We therefore inject it via a `<script src=...>`
// tag (rather than `import()`), wait for it to fire `onload`, then
// call `cheerpjInit` exactly once per page.
//
// `status: "none"` suppresses CheerpJ's own loading banner, the
// playground UI already renders its own.

import { TOOLS_JAR_CDN } from "./cdn";

const CHEERPJ_VERSION = "4.3";
const CHEERPJ_LOADER_URL = `https://cjrtnc.leaningtech.com/${CHEERPJ_VERSION}/loader.js`;

// Where we mount tools.jar inside CheerpJ's in-memory /str/ filesystem;
// java.tsx puts this on the classpath. `/str/` is CheerpJ's
// host-populated, read-only FS, the same one user .java sources are
// staged into.
export const TOOLS_JAR_VFS_PATH = "/str/tools.jar";
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

    // Start downloading tools.jar from the CDN immediately, in parallel
    // with loading + initialising CheerpJ's (separately hosted) runtime,
    // both are large. The bytes are injected into /str/ once init
    // completes, before any cheerpjRunMain call. The no-op `.catch`
    // suppresses an "unhandled rejection" warning during the window before
    // `finishInit` awaits the promise; the real error is surfaced by that
    // await, which rejects the whole loadCheerpJ promise.
    const jarBytesPromise = fetch(TOOLS_JAR_CDN).then(async (res) => {
      if (!res.ok) {
        throw new Error(
          `Failed to fetch tools.jar from ${TOOLS_JAR_CDN} (HTTP ${res.status}).`,
        );
      }
      return new Uint8Array(await res.arrayBuffer());
    });
    void jarBytesPromise.catch(() => {});

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

        // Mount tools.jar (javac) into CheerpJ's /str/ FS before the first
        // cheerpjRunMain, java.tsx references it via TOOLS_JAR_VFS_PATH on
        // the classpath.
        w.cheerpjAddStringFile(TOOLS_JAR_VFS_PATH, await jarBytesPromise);

        resolve({
          cheerpjRunMain: w.cheerpjRunMain.bind(w),
          cheerpjAddStringFile: w.cheerpjAddStringFile.bind(w),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // Reuse an existing loader script tag if some other module already
    // injected it, avoids the "CheerpJ: Already initialized" error
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
