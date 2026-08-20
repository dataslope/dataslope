/**
 * The runtime both C/C++ playgrounds drive, over the shared browsercc
 * worker.
 *
 * It used to exist twice, once per adapter, differing only in which file
 * extensions it staged. The run lifecycle is the same either way, and it
 * is the part the audit found wanting: there was no way to stop a run, no
 * time limit, and a program that trapped could leave the worker unable to
 * compile anything afterwards, so every later run hung too. Stopping is
 * the same story as the JavaScript and PHP playgrounds: terminate the
 * worker, stand a fresh one up.
 */
import type {
  EmitOutput,
  LanguageRuntime,
  RunOptions,
} from "../types";
import { STDIN_FILENAME, type CFamilyLanguage } from "./browserccBuild";

export type WorkerOutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "run-status"; id: number; message: string; preparing: boolean }
  | {
      kind: "output";
      id: number;
      cell: { type: string; content: string };
      seq: number;
      append: boolean;
    }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string };

/** Files worth handing the compiler, per language, plus the stdin buffer. */
const STAGED_FILE_RE: Record<CFamilyLanguage, RegExp> = {
  c: /\.(c|h)$/i,
  cpp: /\.(cpp|cc|cxx|c\+\+|h|hpp|hh|hxx|h\+\+)$/i,
};

/**
 * How long a program may run before the host stops it.
 *
 * A `while (1) {}` used to run forever: no Stop control, no watchdog, and
 * the only way out was reloading the page, which also discarded whatever
 * the program had printed. Output streams now, so the cap costs the reader
 * nothing but the hang.
 */
export const RUN_TIMEOUT_MS = 20_000;

/** Boot a browsercc worker and wait for it to be usable. */
export function spawnBrowserccWorker(
  onLoadingMessage?: (message: string) => void,
): Promise<Worker> {
  // Classic worker, as before: the CDN imports go through `new Function`
  // rather than static ones, so a module worker buys nothing here.
  const worker = new Worker(new URL("./browsercc-worker.ts", import.meta.url));
  return new Promise<Worker>((resolve, reject) => {
    const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
      const msg = ev.data;
      if (msg.kind === "loading") {
        onLoadingMessage?.(msg.message);
      } else if (msg.kind === "ready") {
        worker.removeEventListener("message", onMessage);
        resolve(worker);
      } else if (msg.kind === "init-error") {
        worker.removeEventListener("message", onMessage);
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", (ev) => {
      worker.removeEventListener("message", onMessage);
      reject(new Error(ev.message || "Compiler worker failed to start"));
    });
    worker.postMessage({ kind: "init" });
  });
}

export class BrowserccRuntime implements LanguageRuntime {
  private nextId = 0;
  /** Staged workspace files (path → text) for the compiler's VFS. */
  private stagedFiles = new Map<string, string>();
  /** Rejects the run in flight, for Stop and for the time limit. */
  private abortActiveRun: ((err: Error) => void) | null = null;
  /** Set while a replacement worker is booting after a terminate. */
  private restartPromise: Promise<void> | null = null;

  constructor(
    private worker: Worker,
    private language: CFamilyLanguage,
  ) {}

  /** Terminate the worker (registry-eviction hook; unusable after). */
  dispose(): void {
    this.worker.terminate();
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    const staged = new Map<string, string>();
    const keep = STAGED_FILE_RE[this.language];
    for (const [path, bytes] of files) {
      // stdin.txt is not compiled; it is what the program reads.
      if (keep.test(path) || path === STDIN_FILENAME) {
        staged.set(path, decoder.decode(bytes));
      }
    }
    this.stagedFiles = staged;
  }

  /**
   * Stop the running program.
   *
   * A wasm program cannot be interrupted from inside, so stopping is
   * terminating the worker. That also clears the state a trapped program
   * used to leave behind, which is what made every run after a trap hang.
   */
  async cancelRun(): Promise<void> {
    if (this.restartPromise) return this.restartPromise;
    const abort = this.abortActiveRun;
    this.abortActiveRun = null;
    if (abort) {
      const err = new Error("Run stopped.");
      err.name = "RunCancelledError";
      abort(err);
    }
    return this.restart();
  }

  private restart(): Promise<void> {
    if (this.restartPromise) return this.restartPromise;
    this.worker.terminate();
    this.restartPromise = (async () => {
      try {
        this.worker = await spawnBrowserccWorker();
      } finally {
        this.restartPromise = null;
      }
    })();
    return this.restartPromise;
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    if (this.restartPromise) await this.restartPromise;
    const id = ++this.nextId;
    const worker = this.worker;

    // With `options.entryFilename` (Run on a non-active tab), compile the
    // staged copy: `code` belongs to a different file. Without it, ALWAYS
    // use `code`, since a staged copy could be stale.
    const explicitEntry = options?.entryFilename;
    const defaultEntry = this.language === "c" ? "main.c" : "main.cpp";
    const entryPath = explicitEntry ?? defaultEntry;
    const source = explicitEntry
      ? (this.stagedFiles.get(entryPath) ?? code)
      : code;

    // Non-entry staged files ride along for `#include` resolution and the
    // other sources of a multi-file build, plus the stdin buffer. Only in
    // explicit multi-file mode, else a stale staged file could pollute a
    // single-file run.
    const files: Array<[string, string]> = [];
    if (explicitEntry) {
      for (const [path, content] of this.stagedFiles) {
        if (path !== entryPath) files.push([path, content]);
      }
    } else {
      const stdin = this.stagedFiles.get(STDIN_FILENAME);
      if (stdin !== undefined) files.push([STDIN_FILENAME, stdin]);
    }

    await new Promise<void>((resolve, reject) => {
      let timer: number | null = null;
      const finish = (settle: () => void) => {
        if (timer !== null) window.clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        this.abortActiveRun = null;
        settle();
      };
      this.abortActiveRun = (err) => finish(() => reject(err));

      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (
          msg.kind !== "output" &&
          msg.kind !== "done" &&
          msg.kind !== "error" &&
          msg.kind !== "run-status"
        ) {
          return;
        }
        if (msg.id !== id) return;
        if (msg.kind === "run-status") {
          // Mid-run wait (the first C++ run awaiting the precompiled
          // header); surface the boot notice for the duration.
          options?.onStatus?.(msg.message, msg.preparing);
          return;
        }
        if (msg.kind === "output") {
          emit(
            msg.cell as Parameters<EmitOutput>[0],
            msg.seq,
            msg.append,
          );
          return;
        }
        if (msg.kind === "done") finish(resolve);
        else finish(() => reject(new Error(msg.message)));
      };
      worker.addEventListener("message", onMessage);

      timer = window.setTimeout(() => {
        const seconds = Math.round(RUN_TIMEOUT_MS / 1000);
        emit({
          type: "stderr",
          content:
            `Stopped after ${seconds}s: the program never finished, so it is probably ` +
            "stuck in a loop. Output it produced before then is above.",
        });
        void this.cancelRun();
      }, RUN_TIMEOUT_MS);

      worker.postMessage({
        kind: "run",
        id,
        code: source,
        language: this.language,
        entryPath,
        files,
      });
    });
  }
}
