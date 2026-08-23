/// <reference lib="webworker" />
export {};

// PhpWeb (ENVIRONMENT=web build) reads `document`/`window` during module
// evaluation, so stub them before any imports. Object.defineProperty is
// required: `self.window = self` can be a silent no-op when browsers define
// `window` non-configurably on WorkerGlobalScope.prototype. PHP execution
// never touches the real DOM.
{
  function defineGlobalIfMissing(name: string, value: unknown): void {
    if (typeof (globalThis as Record<string, unknown>)[name] !== "undefined") return;
    try {
      Object.defineProperty(globalThis, name, {
        value,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    } catch {
      // Already defined and non-configurable, nothing we can do; PhpWeb will
      // fail to init if the value is wrong, and the error message will say why.
    }
  }

  const docStub = {
    currentScript: null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag: string) => {
      const el: Record<string, unknown> = { style: {}, tagName: tag.toUpperCase() };
      if (tag === "canvas") el.getContext = () => null;
      return el;
    },
    createElementNS: (_ns: string, tag: string) => docStub.createElement(tag),
    addEventListener: () => {},
    removeEventListener: () => {},
    body: { appendChild: () => {}, removeChild: () => {} },
  };

  defineGlobalIfMissing("document", docStub);
  defineGlobalIfMissing("window", globalThis);
}

// PHP (php-wasm) runs in a dedicated Web Worker so execution and Emscripten
// init stay off the main thread. Protocol: see In/OutMessage below.

import {
  buildEntryScript,
  PGLITE_ABORT_RE,
  PGLITE_EXPLANATION,
} from "./phpEntry";
import { PhpOutputRouter } from "./phpOutput";

declare const self: DedicatedWorkerGlobalScope;

const PHP_WASM_VERSION = "0.1.0";
// php-wasm 0.1.0 exceeds jsDelivr's 150 MB package limit, so jsDelivr returns
// 403 for every file in the package, see seanmorris/php-wasm#103. unpkg has
// no such limit and is the upstream-recommended CDN until that's resolved.
const PHP_WASM_CDN = `https://unpkg.com/php-wasm@${PHP_WASM_VERSION}/`;

// PhpWeb loads from the CDN, not the bundle: its constructor dynamically
// imports the chosen PHP build via relative specifiers the bundler can't
// rewrite, so the whole module graph must stay on unpkg where locateFile
// and the relative imports agree on the base URL.
const PHP_WASM_ENTRY = `${PHP_WASM_CDN}PhpWeb.mjs`;

interface PhpOutputEvent extends Event {
  detail: string[];
}

// Mirrors the subset of OutputCellType in ../types that PHP produces.
type OutputCellType = "stdout" | "stderr" | "log" | "html";
interface OutputCellMessage {
  type: OutputCellType;
  content: string;
}

type InMessage =
  | { kind: "init" }
  | { kind: "run"; id: number; code: string; entryPath: string }
  | { kind: "prepare-fs"; id: number; files: Array<[string, Uint8Array]> }
  | { kind: "collect-created-files"; id: number };

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | {
      kind: "output";
      id: number;
      cell: OutputCellMessage;
      /** Position of the cell within the run's output. Posted as produced,
       *  so one `seq` can arrive repeatedly while its cell is still
       *  growing (see `append`). */
      seq: number;
      /** True when `cell.content` extends the cell already sent for `seq`. */
      append: boolean;
    }
  | { kind: "created-files"; id: number; files: Array<[string, Uint8Array]> }
  | { kind: "done"; id: number }
  | {
      kind: "error";
      id: number;
      message: string;
      /** The runtime is no longer usable and must be replaced. */
      fatal?: boolean;
    }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

// ─── PHP state ───────────────────────────────────────────────────────────

type PhpWebClass = typeof import("php-wasm/PhpWeb").PhpWeb;

let php: InstanceType<PhpWebClass> | null = null;
let initPromise: Promise<void> | null = null;

async function initPhp(): Promise<void> {
  post({ kind: "loading", message: "Loading PHP runtime…" });
  const mod = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ PHP_WASM_ENTRY
  )) as { PhpWeb: PhpWebClass };

  post({ kind: "loading", message: "Initialising PHP runtime…" });
  php = new mod.PhpWeb({
    // `libxml2.so` must resolve to undefined: PhpBase suppresses it with a
    // data: URL, and a CDN URL 404s on every init.
    locateFile: (path: string) =>
      path === "libxml2.so" ? undefined : PHP_WASM_CDN + path,
  });
  await php.binary;

  post({ kind: "ready" });
}

/** Does this text look like a document rather than incidental markup? */
function looksLikeHtml(text: string): boolean {
  return (
    /<!doctype\s+html/i.test(text) ||
    /<html[\s>]/i.test(text) ||
    (/<[a-z][a-z0-9]*[\s>/]/i.test(text) && /<\/[a-z][a-z0-9]*>/i.test(text))
  );
}

async function runCode(
  id: number,
  code: string,
  entryPath: string,
): Promise<void> {
  if (!php) throw new Error("PHP runtime is not initialised");

  // Output goes out as it is produced. That matters most when a run does
  // not finish: a script stuck in a loop is terminated by the host, and
  // everything it printed first is already on screen, which is what tells
  // the reader where it hung.
  let sawPgliteAbort = false;
  // What each cell holds so far. A cell is addressed by its position, so
  // re-posting a `seq` replaces it: that is how a run that turned out to
  // be an HTML document gets re-typed, and how the last cell loses the
  // trailing newline that would otherwise show as a blank line.
  const cells = new Map<number, { channel: string; content: string }>();
  const router = new PhpOutputRouter(
    (chunk) => {
      const prev = chunk.append ? (cells.get(chunk.seq)?.content ?? "") : "";
      cells.set(chunk.seq, {
        channel: chunk.channel,
        content: prev + chunk.content,
      });
      post({
        kind: "output",
        id,
        cell: { type: chunk.channel, content: chunk.content },
        seq: chunk.seq,
        append: chunk.append,
      });
    },
    { entryPath },
  );

  const onOutput = (event: Event) => {
    const detail = (event as PhpOutputEvent).detail;
    if (!detail) return;
    const text = detail.join("");
    if (PGLITE_ABORT_RE.test(text)) sawPgliteAbort = true;
    router.write("stdout", text);
  };
  const onError = (event: Event) => {
    const detail = (event as PhpOutputEvent).detail;
    if (!detail) return;
    const text = detail.join("");
    if (PGLITE_ABORT_RE.test(text)) sawPgliteAbort = true;
    router.write("stderr", text);
  };

  php.addEventListener("output", onOutput);
  php.addEventListener("error", onError);

  let thrown: string | null = null;
  try {
    try {
      await php.refresh();
    } catch {
      /* refresh is best-effort */
    }
    // The entry runs from the VFS so it has a real path; `code` is written
    // there first, because the editor's buffer is what Run means.
    await writeEntryFile(entryPath, code);
    await php.run(buildEntryScript(entryPath));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (PGLITE_ABORT_RE.test(message)) sawPgliteAbort = true;
    else thrown = message;
  } finally {
    php.removeEventListener("output", onOutput);
    php.removeEventListener("error", onError);
    router.flush();
    finalizeCells();
  }

  /** Revisions only possible once the run's output is complete: PHP that
   *  printed a page should render as one, and the last line should not
   *  leave a blank line under it. */
  function finalizeCells(): void {
    const lastSeq = Math.max(-1, ...cells.keys());
    for (const [seq, cell] of cells) {
      const isHtml = cell.channel === "stdout" && looksLikeHtml(cell.content);
      const content =
        seq === lastSeq ? cell.content.replace(/\n+$/, "") : cell.content;
      if (!isHtml && content === cell.content) continue;
      post({
        kind: "output",
        id,
        cell: { type: isHtml ? "html" : (cell.channel as OutputCellType), content },
        seq,
        append: false,
      });
    }
  }

  if (sawPgliteAbort) {
    // An abort is not a successful run, and the message php-wasm printed
    // describes its own embedding API rather than anything a PHP author
    // can act on. The abort also leaves the interpreter unusable, so the
    // host is told to replace it.
    const err = new Error(PGLITE_EXPLANATION);
    err.name = "PhpRuntimeAborted";
    throw err;
  }
  if (thrown) throw new Error(thrown);
}

// Serialise run requests, Emscripten PHP is not reentrant.
let workQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = workQueue.then(task, task);
  workQueue = next.catch(() => {});
  return next;
}

// ─── Multi-file VFS staging ────────────────────────────────────────────
// Files supplied to `prepareFs` are written to PHP's Emscripten MEMFS at
// `/` (the default working directory) so user code can `require`,
// `include`, and open files with relative paths.

interface PhpFsStat {
  mode: number;
}

interface PhpFS {
  writeFile(path: string, data: Uint8Array | string): void;
  readFile(path: string, opts?: { encoding?: string }): Uint8Array;
  unlink(path: string): void;
  mkdir(path: string): void;
  readdir(path: string): string[];
  stat(path: string): PhpFsStat;
  isDir(mode: number): boolean;
}

interface PhpBinary {
  FS: PhpFS;
}

// Staging root matches PHP's default Emscripten CWD so that
// `require 'math_utils.php'` resolves to `/math_utils.php`.
const stagedPaths = new Set<string>();

function joinStagedPath(relPath: string): string {
  const trimmed = relPath.replace(/^\/+/, "");
  if (!trimmed) throw new Error("Invalid empty file path");
  return `/${trimmed}`;
}

function ensureDirs(FS: PhpFS, absFilePath: string): void {
  const idx = absFilePath.lastIndexOf("/");
  if (idx < 0) return;
  const parent = absFilePath.slice(0, idx);
  const parts = parent.split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur += `/${part}`;
    try {
      FS.mkdir(cur);
    } catch {
      // Directory already exists -- ignore.
    }
  }
}

async function phpFs(): Promise<PhpFS> {
  if (!php) throw new Error("PHP runtime is not initialised");
  // FS lives on the resolved Emscripten module (await php.binary), not on
  // the PhpWeb instance.
  const phpModule = await (php as unknown as { binary: Promise<PhpBinary> }).binary;
  return phpModule.FS;
}

/** Write the entry file, so the reader's buffer is what Run executes even
 *  when staging and the editor have drifted. */
async function writeEntryFile(entryPath: string, code: string): Promise<void> {
  const FS = await phpFs();
  ensureDirs(FS, entryPath);
  FS.writeFile(entryPath, new TextEncoder().encode(code));
  stagedPaths.add(entryPath);
}

// Emscripten's own furniture, plus php-wasm's. None of it is the reader's.
const SYSTEM_PATHS = new Set([
  "/dev",
  "/proc",
  "/tmp",
  "/home",
  "/preload",
  "/php.ini",
]);

/** Caps: a runaway script should not be able to push a gigabyte of
 *  generated files through postMessage. */
const MAX_CREATED_FILES = 50;
const MAX_CREATED_BYTES = 64 * 1024 * 1024;

/**
 * Files the run wrote that are not part of the workspace.
 *
 * `file_put_contents('report.csv', …)` succeeded and `scandir` could see
 * the result, but the Files rail never did, so the output was real and
 * unreachable, and gone on reload. Generating a file is an ordinary PHP
 * exercise, so the VFS is diffed against what was staged.
 */
async function collectCreatedFiles(): Promise<Array<[string, Uint8Array]>> {
  const FS = await phpFs();
  const found: Array<[string, Uint8Array]> = [];
  let bytes = 0;

  const walk = (dir: string): void => {
    if (found.length >= MAX_CREATED_FILES || bytes >= MAX_CREATED_BYTES) return;
    let entries: string[];
    try {
      entries = FS.readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === "." || name === "..") continue;
      const path = dir === "/" ? `/${name}` : `${dir}/${name}`;
      if (SYSTEM_PATHS.has(path)) continue;
      let isDir = false;
      try {
        isDir = FS.isDir(FS.stat(path).mode);
      } catch {
        continue;
      }
      if (isDir) {
        walk(path);
        continue;
      }
      if (stagedPaths.has(path)) continue;
      try {
        const data = FS.readFile(path);
        if (bytes + data.length > MAX_CREATED_BYTES) return;
        bytes += data.length;
        found.push([path.replace(/^\//, ""), data]);
      } catch {
        // Unreadable (a device node the walk reached anyway); skip it.
      }
      if (found.length >= MAX_CREATED_FILES) return;
    }
  };

  walk("/");
  return found;
}

async function prepareFs(files: Array<[string, Uint8Array]>): Promise<void> {
  if (!php) return;
  // FS lives on the resolved Emscripten module (await php.binary), not on
  // the PhpWeb instance.
  const phpModule = await (php as unknown as { binary: Promise<PhpBinary> }).binary;
  const FS = phpModule.FS;

  const nextPaths = new Set<string>();
  for (const [relPath, bytes] of files) {
    const abs = joinStagedPath(relPath);
    nextPaths.add(abs);
    ensureDirs(FS, abs);
    try {
      FS.writeFile(abs, bytes);
    } catch (err) {
      throw new Error(
        `Failed to write ${relPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Remove paths from a previous run that are no longer in the snapshot.
  for (const prev of stagedPaths) {
    if (!nextPaths.has(prev)) {
      try {
        FS.unlink(prev);
      } catch {
        /* file may already be gone -- ignore */
      }
    }
  }
  stagedPaths.clear();
  for (const p of nextPaths) stagedPaths.add(p);
}

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  const msg = ev.data;

  if (msg.kind === "init") {
    if (!initPromise) {
      initPromise = initPhp().catch((err) => {
        post({
          kind: "init-error",
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      });
    }
    return;
  }

  if (msg.kind === "prepare-fs") {
    const { id } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await prepareFs(msg.files);
        post({ kind: "prepare-fs-done", id });
      } catch (err) {
        post({
          kind: "prepare-fs-error",
          id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
    return;
  }

  if (msg.kind === "collect-created-files") {
    const { id } = msg;
    enqueue(async () => {
      let files: Array<[string, Uint8Array]> = [];
      try {
        if (initPromise) await initPromise;
        files = await collectCreatedFiles();
      } catch {
        // Best-effort: a run that produced no reachable files is not a
        // failure of the run.
      }
      post({ kind: "created-files", id, files });
    });
    return;
  }

  if (msg.kind === "run") {
    const { id, code } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await runCode(id, code, msg.entryPath);
        post({ kind: "done", id });
      } catch (err) {
        post({
          kind: "error",
          id,
          message: err instanceof Error ? err.message : String(err),
          fatal: err instanceof Error && err.name === "PhpRuntimeAborted",
        });
      }
    });
    return;
  }
});
