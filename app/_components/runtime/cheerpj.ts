// Shared CheerpJ (OpenJDK-in-WASM) loader for the Java playground. CheerpJ
// doesn't ship tools.jar, so a Java 8 tools.jar is fetched from unpkg
// (jsDelivr refuses .jar; GitHub releases lack CORS) and injected via
// cheerpjAddStringFile — that's what lets the jar live on an external CDN.
// CheerpJ is a non-module loader script that injects window globals, so it
// goes in via a <script> tag and cheerpjInit runs exactly once per page.
// `status: "none"` suppresses CheerpJ's own loading banner.

import { TOOLS_JAR_CDN } from "./cdn";

export const CHEERPJ_VERSION = "4.3";
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
  /** Create `path` and any missing parent under `/files/`, like
   *  `mkdir -p`. Rejects if the directory could not be created. */
  mkdirp(path: string): Promise<void>;
}

/**
 * CheerpJ's `mkdir`, defined as a page global by `cheerpOS.js` alongside
 * `cheerpOSAddStringFile`.
 *
 * It creates one level, and answers through the object it is handed rather
 * than through its callback: `exists` comes back 5 (`S_IFDIR`) when a
 * directory is there afterwards, and 0 when the parent is missing or is not
 * a directory. The callback carries no arguments and may be called
 * synchronously.
 */
type CheerpOSCreateDir = (
  path: string,
  result: { exists?: number },
  mode: number,
  done: () => void,
) => void;

/** CheerpJ's writable mount: IndexedDB-backed, so it survives a reload, and
 *  empty apart from the mount point itself on a first visit. */
const FILES_MOUNT = "/files/";

/** `result.exists` when the path holds a directory. */
const DIR_EXISTS = 5;

/**
 * `mkdir -p` for `/files/`.
 *
 * The playground needs this because javac will not make its own output
 * directory: `-d` has to name one that already exists (javac creates the
 * package subdirectories *under* it and nothing else), and a `-d` that does
 * not exist fails the compile with `javac: directory not found`. CheerpJ's
 * `mkdir` is one level deep, so walk down from the mount point.
 */
function makeMkdirp(createDir: CheerpOSCreateDir) {
  return async function mkdirp(path: string): Promise<void> {
    if (!path.startsWith(FILES_MOUNT)) {
      throw new Error(
        `Cannot create ${path}: only ${FILES_MOUNT} is writable in CheerpJ.`,
      );
    }
    // "/files/a/b/" → ["a", "b"], starting from the mount point, which
    // exists from init and is not ours to create.
    const parts = path.slice(FILES_MOUNT.length).split("/").filter(Boolean);
    let dir = FILES_MOUNT.slice(0, -1);
    for (const part of parts) {
      dir += `/${part}`;
      const exists = await new Promise<number | undefined>((resolve) => {
        const result: { exists?: number } = {};
        createDir(dir, result, 0o777, () => resolve(result.exists));
      });
      if (exists !== DIR_EXISTS) {
        throw new Error(`CheerpJ could not create the directory ${dir}.`);
      }
    }
  };
}

// ─── Globals injected by loader.js ─────────────────────────────────────

interface CheerpJWindow extends Window {
  cheerpjInit?: (options?: Record<string, unknown>) => Promise<unknown>;
  cheerpjRunMain?: CheerpJApi["cheerpjRunMain"];
  cheerpjAddStringFile?: CheerpJApi["cheerpjAddStringFile"];
  cheerpOSCreateDir?: CheerpOSCreateDir;
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
          typeof w.cheerpjAddStringFile !== "function" ||
          typeof w.cheerpOSCreateDir !== "function"
        ) {
          throw new Error("CheerpJ globals missing after init.");
        }

        // Mount tools.jar into /str/ before the first cheerpjRunMain.
        w.cheerpjAddStringFile(TOOLS_JAR_VFS_PATH, await jarBytesPromise);

        resolve({
          cheerpjRunMain: w.cheerpjRunMain.bind(w),
          cheerpjAddStringFile: w.cheerpjAddStringFile.bind(w),
          mkdirp: makeMkdirp(w.cheerpOSCreateDir.bind(w)),
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
