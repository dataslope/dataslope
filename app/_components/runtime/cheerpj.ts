// Shared CheerpJ (OpenJDK-in-WASM) loader for the Java playground. CheerpJ
// doesn't ship tools.jar, so a Java 8 tools.jar is fetched from unpkg
// (jsDelivr refuses .jar; GitHub releases lack CORS) and injected via
// cheerpjAddStringFile — that's what lets the jar live on an external CDN.
// CheerpJ is a non-module loader script that injects window globals, so it
// goes in via a <script> tag and cheerpjInit runs exactly once per page.
// `status: "none"` suppresses CheerpJ's own loading banner.

import { TOOLS_JAR_CDN } from "./cdn";

const CHEERPJ_VERSION = "4.3";
const CHEERPJ_LOADER_URL = `https://cjrtnc.leaningtech.com/${CHEERPJ_VERSION}/loader.js`;

// tools.jar mount point inside CheerpJ's host-populated read-only /str/
// FS; java.tsx puts this on the classpath.
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

    // Download tools.jar in parallel with CheerpJ's own init (both are
    // large). The no-op `.catch` suppresses an unhandled-rejection warning;
    // the real error surfaces when finishInit awaits the promise.
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

        // Mount tools.jar into /str/ before the first cheerpjRunMain.
        w.cheerpjAddStringFile(TOOLS_JAR_VFS_PATH, await jarBytesPromise);

        resolve({
          cheerpjRunMain: w.cheerpjRunMain.bind(w),
          cheerpjAddStringFile: w.cheerpjAddStringFile.bind(w),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // Reuse an existing loader script tag: avoids "CheerpJ: Already
    // initialized" under React StrictMode's double mount.
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
