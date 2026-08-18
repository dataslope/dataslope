/// <reference lib="webworker" />

// Helpers shared by the JavaScript and TypeScript almostnode workers
// (VirtualFS = in-memory POSIX FS, Runtime = CommonJS executor with shimmed
// Node modules). almostnode is used directly (not `createRuntime`): we're
// already inside a same-origin Web Worker, so another isolation layer buys
// nothing.
//
// Beyond staging and executing, this module owns the parts of Node's run
// semantics almostnode leaves out: the event loop stays alive while timers
// are pending (a run used to end the moment the module body returned,
// silently discarding every `setTimeout` callback), `process.stdout.write`
// reaches the output pane, unhandled promise rejections are reported, and
// error stacks name the user's file and line.

import { VirtualFS, Runtime } from "almostnode";

import {
  createPlaygroundConsole,
  type ConsoleSink,
  type OutputChannel,
  type PlaygroundConsole,
} from "./almostnodeConsole.ts";
import { installNodeDigests, verifyDigestPatch, type CryptoShim } from "./nodeDigest.ts";
import { cleanStack, measureWrapperOffset, withSourceUrl } from "./almostnodeStacks.ts";
import { inspect } from "./nodeInspect.ts";

export type { ConsoleSink, OutputChannel } from "./almostnodeConsole.ts";

/** Default ceiling on a run's wall clock. Without one, a `setInterval` with
 *  no `clearInterval` is a run that never ends. */
export const DEFAULT_RUN_TIMEOUT_MS = 30_000;
/** How often the loop is checked for remaining work once the module body
 *  has returned. */
const DRAIN_POLL_MS = 5;
/** Backstop against a program that prints without bound. */
const MAX_RUN_OUTPUT_CHARS = 2_000_000;

// ─── VFS path helpers ───────────────────────────────────────────────

/** Workspace-relative path → absolute VFS path (almostnode's resolver
 *  works exclusively in absolute terms). */
export function normalizeVfsPath(p: string): string {
  return p.startsWith("/") ? p : `/${p}`;
}

/** Stage files into a freshly-created VirtualFS. Recreating per
 *  `prepare-fs` mirrors UI deletions/renames — no stale entries linger. */
export function stageFiles(
  files: Array<[string, Uint8Array]>,
  transformFile?: (
    path: string,
    bytes: Uint8Array,
  ) => Array<[string, Uint8Array]>,
): VirtualFS {
  const vfs = new VirtualFS();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const write = (path: string, bytes: Uint8Array) => {
    const vfsPath = normalizeVfsPath(path);
    const lastSlash = vfsPath.lastIndexOf("/");
    if (lastSlash > 0) {
      vfs.mkdirSync(vfsPath.slice(0, lastSlash), { recursive: true });
    }
    // Every module the runtime evaluates gets a `//# sourceURL`, so a stack
    // frame names the file the error came from instead of `<anonymous>`.
    const payload = /\.(js|cjs|mjs)$/.test(vfsPath)
      ? encoder.encode(withSourceUrl(decoder.decode(bytes), vfsPath))
      : bytes;
    vfs.writeFileSync(vfsPath, payload);
  };
  for (const [path, bytes] of files) {
    const outputs = transformFile ? transformFile(path, bytes) : [[path, bytes] as [string, Uint8Array]];
    for (const [outPath, outBytes] of outputs) write(outPath, outBytes);
  }
  return vfs;
}

/** Every file in the VFS, as absolute paths. */
function listFiles(vfs: VirtualFS, dir = "/", out: string[] = []): string[] {
  let names: string[];
  try {
    names = vfs.readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    const path = dir === "/" ? `/${name}` : `${dir}/${name}`;
    let isDirectory = false;
    try {
      isDirectory = vfs.statSync(path).isDirectory();
    } catch {
      continue;
    }
    if (isDirectory) listFiles(vfs, path, out);
    else out.push(path);
    if (out.length > 500) return out;
  }
  return out;
}

// ─── Entry-file wrapping ────────────────────────────────────────────
// almostnode's CommonJS shell makes top-level `await` a syntax error, so
// the entry file's body is rewritten into an async IIFE assigned to
// `module.exports`; the caller awaits that promise before reporting done.

// The `__pgTick` call queues the nextTick drain ahead of any microtask the
// module body goes on to queue, which is what puts `process.nextTick` before
// promise callbacks as Node orders them. It shares the prologue's line so
// the user's line 1 stays line 1.
const WRAP_PROLOGUE =
  "module.exports = (async () => { globalThis.__pgTick && globalThis.__pgTick();\n";
const WRAP_EPILOGUE = "\n})();";

export function wrapEntryAsAsyncIIFE(source: string): string {
  return WRAP_PROLOGUE + source + WRAP_EPILOGUE;
}

/** Lines the wrapper above adds before the user's first line. */
export const ENTRY_WRAP_LINES = WRAP_PROLOGUE.split("\n").length - 1;

// ─── Streamed output ────────────────────────────────────────────────

export interface OutputChunk {
  channel: OutputChannel;
  content: string;
  /** Position of the cell this text belongs to within the run. */
  seq: number;
  /** True when the text continues the cell already sent for `seq`. */
  append: boolean;
}

/**
 * Collects writes into cells and hands them to the surface as they happen.
 *
 * A cell runs until the channel changes, so `console.log` lines and a
 * `process.stdout.write` that ends mid-line land in the same cell exactly as
 * the program wrote them — with no newline inserted anywhere the program
 * didn't put one.
 */
export class BufferedOutput implements ConsoleSink {
  private seq = -1;
  private channel: OutputChannel | null = null;
  private buffer = "";
  private sent = false;
  private written = 0;
  private truncated = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastFlush = 0;
  private posted = false;

  private readonly post: (chunk: OutputChunk) => void;
  /** Batch window; 0 posts every write (used by tests). */
  private readonly flushMs: number;
  /** Timer for the batch window. Called through an arrow so `this` is the
   *  global: a worker's `setTimeout` refuses any other receiver. */
  private readonly schedule: (
    fn: () => void,
    ms: number,
  ) => ReturnType<typeof setTimeout>;

  // Fields rather than parameter properties: the content sweep imports this
  // module through Node's strip-only TypeScript loader, which rejects them.
  constructor(
    post: (chunk: OutputChunk) => void,
    flushMs = 60,
    schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> = (
      fn,
      ms,
    ) => setTimeout(fn, ms),
  ) {
    this.post = post;
    this.flushMs = flushMs;
    this.schedule = schedule;
  }

  write(channel: OutputChannel, text: string): void {
    if (this.truncated || !text) return;
    if (this.written + text.length > MAX_RUN_OUTPUT_CHARS) {
      text = `${text.slice(0, Math.max(0, MAX_RUN_OUTPUT_CHARS - this.written))}\n… further output hidden …\n`;
      this.truncated = true;
    }
    this.written += text.length;
    if (this.channel !== channel) {
      this.flush();
      this.channel = channel;
      this.seq += 1;
      this.sent = false;
    }
    this.buffer += text;
    // Flush on the clock rather than only on a timer: a synchronous loop
    // never yields, so a timer would not fire and everything it printed
    // would be lost with the worker when the user hits Stop. The first
    // write of a run always goes out immediately for the same reason.
    const now = Date.now();
    if (
      this.flushMs <= 0 ||
      !this.posted ||
      this.buffer.length >= 8192 ||
      now - this.lastFlush >= this.flushMs
    ) {
      this.flush();
      return;
    }
    if (this.timer === null) {
      this.timer = this.schedule(() => {
        this.timer = null;
        this.flush();
      }, this.flushMs);
    }
  }

  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.buffer || this.channel === null) return;
    this.post({
      channel: this.channel,
      content: this.buffer,
      seq: this.seq,
      append: this.sent,
    });
    this.sent = true;
    this.posted = true;
    this.lastFlush = Date.now();
    this.buffer = "";
  }

  /** Cell position for anything the surface appends after the run. */
  nextSeq(): number {
    return this.seq + 1;
  }
}

// ─── The event loop ─────────────────────────────────────────────────

type TimerHandle = unknown;

/**
 * Keeps the run alive while timers are pending, the way Node keeps a process
 * alive while the loop has referenced handles.
 *
 * The global timer functions are wrapped once (almostnode wraps them too, to
 * give ids Node's `ref`/`unref` shape; ours goes on top and marks itself so
 * a later Runtime doesn't wrap it again). Everything scheduled while a run
 * is in flight is counted, and anything still pending when the run ends is
 * cleared so one run's interval can't print into the next one's output.
 */
class EventLoopKeeper {
  private live = new Set<TimerHandle>();
  private unrefed = new Set<TimerHandle>();
  private active = false;
  private installed = false;
  /** Callbacks queued by `process.nextTick`, drained before microtasks in
   *  each turn we control (Node drains this queue first). */
  private nextTicks: Array<() => void> = [];
  /** First error thrown out of a timer callback: it ends the run, as an
   *  uncaught exception ends a Node process. */
  error: unknown = null;

  readonly realSetTimeout: typeof setTimeout;
  private readonly realSetInterval: typeof setInterval;
  private readonly realClearTimeout: typeof clearTimeout;
  private readonly realClearInterval: typeof clearInterval;

  constructor() {
    const g = globalThis as unknown as Record<string, unknown>;
    this.realSetTimeout = (g.setTimeout as typeof setTimeout).bind(globalThis);
    this.realSetInterval = (g.setInterval as typeof setInterval).bind(globalThis);
    this.realClearTimeout = (g.clearTimeout as typeof clearTimeout).bind(globalThis);
    this.realClearInterval = (g.clearInterval as typeof clearInterval).bind(globalThis);
  }

  install(): void {
    if (this.installed) return;
    this.installed = true;
    const g = globalThis as unknown as Record<string, unknown>;

    const track = (handle: TimerHandle): TimerHandle => {
      if (!this.active) return handle;
      this.live.add(handle);
      // `unref()` means "don't hold the loop open for me", as in Node.
      if (handle && typeof handle === "object") {
        const timer = handle as { unref?: () => unknown; ref?: () => unknown };
        const originalUnref = timer.unref?.bind(timer);
        const originalRef = timer.ref?.bind(timer);
        timer.unref = () => {
          this.unrefed.add(handle);
          originalUnref?.();
          return timer;
        };
        timer.ref = () => {
          this.unrefed.delete(handle);
          originalRef?.();
          return timer;
        };
      }
      return handle;
    };

    const invoke = (fn: (...args: unknown[]) => unknown, args: unknown[]): void => {
      this.drainNextTicks();
      try {
        fn(...args);
      } catch (err) {
        if (this.error === null) this.error = err;
        this.clearAll();
      }
      this.drainNextTicks();
    };

    const setTimeoutPatched = ((fn: unknown, ms?: number, ...args: unknown[]) => {
      if (typeof fn !== "function") return this.realSetTimeout(fn as TimerHandler, ms);
      const handle: TimerHandle = this.realSetTimeout(
        () => {
          this.live.delete(handle);
          this.unrefed.delete(handle);
          invoke(fn as (...a: unknown[]) => unknown, args);
        },
        ms,
      );
      return track(handle);
    }) as typeof setTimeout;

    const setIntervalPatched = ((fn: unknown, ms?: number, ...args: unknown[]) => {
      if (typeof fn !== "function") return this.realSetInterval(fn as TimerHandler, ms);
      const handle = this.realSetInterval(
        () => invoke(fn as (...a: unknown[]) => unknown, args),
        ms,
      );
      return track(handle);
    }) as typeof setInterval;

    const clearTimeoutPatched = ((handle: TimerHandle) => {
      this.live.delete(handle);
      this.unrefed.delete(handle);
      this.realClearTimeout(handle as Parameters<typeof clearTimeout>[0]);
    }) as typeof clearTimeout;

    const clearIntervalPatched = ((handle: TimerHandle) => {
      this.live.delete(handle);
      this.unrefed.delete(handle);
      this.realClearInterval(handle as Parameters<typeof clearInterval>[0]);
    }) as typeof clearInterval;

    // almostnode skips its own timer patch when it sees this flag, so ours
    // stays the outermost wrapper for the worker's lifetime.
    (setTimeoutPatched as unknown as Record<string, unknown>).__patched = true;
    (setIntervalPatched as unknown as Record<string, unknown>).__patched = true;

    g.setTimeout = setTimeoutPatched;
    g.setInterval = setIntervalPatched;
    g.clearTimeout = clearTimeoutPatched;
    g.clearInterval = clearIntervalPatched;
    g.setImmediate = ((fn: unknown, ...args: unknown[]) =>
      setTimeoutPatched(fn as TimerHandler, 0, ...args)) as unknown as typeof setImmediate;
    g.clearImmediate = clearTimeoutPatched;
  }

  /** Queue a `process.nextTick` callback (drained ahead of microtasks). */
  queueNextTick(callback: () => void): void {
    this.nextTicks.push(callback);
  }

  drainNextTicks(): void {
    while (this.nextTicks.length > 0) {
      const callback = this.nextTicks.shift();
      try {
        callback?.();
      } catch (err) {
        if (this.error === null) this.error = err;
      }
    }
  }

  beginRun(): void {
    this.install();
    this.active = true;
    this.error = null;
    this.live.clear();
    this.unrefed.clear();
    this.nextTicks.length = 0;
  }

  endRun(): void {
    this.active = false;
    this.clearAll();
    this.nextTicks.length = 0;
  }

  /** Handles that still hold the loop open. */
  get pending(): number {
    let count = 0;
    for (const handle of this.live) if (!this.unrefed.has(handle)) count += 1;
    return count;
  }

  clearAll(): void {
    for (const handle of this.live) {
      this.realClearTimeout(handle as Parameters<typeof clearTimeout>[0]);
      this.realClearInterval(handle as Parameters<typeof clearInterval>[0]);
    }
    this.live.clear();
    this.unrefed.clear();
  }
}

// ─── Runtime bootstrap ──────────────────────────────────────────────

interface Bootstrap {
  keeper: EventLoopKeeper;
  /** Lines almostnode's module wrapper adds above the user's first line. */
  lineOffset: number;
  /** False when the crypto shim could not be corrected (see nodeDigest). */
  digestsCorrect: boolean;
}

let bootstrap: Bootstrap | null = null;
/** Where the active run's output goes; null between runs. */
let activeSink: ConsoleSink | null = null;
/** Rejections seen during the active run, by promise so a late `.catch()`
 *  can retract them the way Node's `rejectionHandled` does. */
let unhandledRejections = new Map<unknown, unknown>();

/** Format a value the way `console.log` would, for error reporting. */
function describe(value: unknown, cleanStackText: (stack: string) => string): string {
  if (value instanceof Error) {
    const stack = value.stack ?? `${value.name}: ${value.message}`;
    return cleanStackText(stack);
  }
  return typeof value === "string" ? value : inspect(value);
}

/**
 * One-time worker setup: correct digests, a console that reaches the output
 * pane, an event loop that stays alive for pending timers, and the wrapper
 * line offset used to map stacks back to user code.
 */
function ensureBootstrap(): Bootstrap {
  if (bootstrap) return bootstrap;

  // A throwaway runtime: its VFS is discarded, but the shims it hands back
  // are the module-level singletons every later runtime shares.
  const probeVfs = new VirtualFS();
  const probeRuntime = new Runtime(probeVfs);
  let digestsCorrect = false;
  try {
    const { exports } = probeRuntime.execute(
      `module.exports = { crypto: require("crypto"), Buffer: require("buffer").Buffer };`,
      "/__pg_bootstrap.js",
    );
    const shims = exports as { crypto: CryptoShim; Buffer: { from(b: Uint8Array): unknown } };
    installNodeDigests(shims.crypto, shims.Buffer);
    digestsCorrect = verifyDigestPatch(shims.crypto);
  } catch {
    digestsCorrect = false;
  }

  // Measure the wrapper rather than assume it: an almostnode upgrade that
  // changes the prologue would otherwise shift every reported line. The
  // probe is a bare module (no async IIFE), so this counts almostnode's
  // prologue only; the run adds ENTRY_WRAP_LINES for its own wrapper.
  let lineOffset = 0;
  try {
    const measureVfs = new VirtualFS();
    const measureRuntime = new Runtime(measureVfs);
    const { exports } = measureRuntime.execute(
      `module.exports = new Error("offset probe").stack;`,
      "/__pg_offset.js",
    );
    lineOffset =
      (typeof exports === "string" ? measureWrapperOffset(exports) : null) ?? 0;
  } catch {
    lineOffset = 0;
  }

  const keeper = new EventLoopKeeper();
  keeper.install();
  (globalThis as unknown as { __pgTick: () => void }).__pgTick = () => {
    queueMicrotask(() => keeper.drainNextTicks());
  };

  bootstrap = { keeper, lineOffset, digestsCorrect };
  return bootstrap;
}

/** The console user code writes through, created once. */
let playgroundConsole: PlaygroundConsole | null = null;

/** Install the playground console as the worker's global console. Called
 *  once, before any module is compiled: almostnode's console wrapper binds
 *  `table`/`group`/`count`/`time` to whatever `console` is at that moment. */
function ensureConsole(
  entryPath: () => string,
  cleanStackText: (stack: string) => string,
): PlaygroundConsole {
  if (playgroundConsole) return playgroundConsole;
  void entryPath;
  const host = globalThis.console as unknown as Record<
    string,
    (...args: unknown[]) => void
  >;
  playgroundConsole = createPlaygroundConsole({
    sink: () => activeSink,
    cleanStack: cleanStackText,
    hostConsole: host,
  });
  (globalThis as unknown as { console: unknown }).console = playgroundConsole.global;
  return playgroundConsole;
}

/** Record a rejection nothing handled. Called by the worker's global
 *  listener; exposed so tests can drive the same path. */
export function reportUnhandledRejection(reason: unknown, promise?: unknown): void {
  if (!activeSink) return;
  unhandledRejections.set(promise ?? reason, reason);
}

/** A `.catch()` attached after the fact retracts the report, as in Node. */
export function retractUnhandledRejection(promise: unknown): void {
  unhandledRejections.delete(promise);
}

/** Wire the worker's global rejection events into the active run. */
export function installRejectionReporting(): void {
  const scope = globalThis as unknown as {
    addEventListener?: (type: string, listener: (ev: never) => void) => void;
    __pgRejections?: boolean;
  };
  if (scope.__pgRejections || typeof scope.addEventListener !== "function") return;
  scope.__pgRejections = true;
  scope.addEventListener("unhandledrejection", ((ev: PromiseRejectionEvent) => {
    reportUnhandledRejection(ev.reason, ev.promise);
    // The report belongs in the output pane, not in the browser console.
    ev.preventDefault();
  }) as (ev: never) => void);
  scope.addEventListener("rejectionhandled", ((ev: PromiseRejectionEvent) => {
    retractUnhandledRejection(ev.promise);
  }) as (ev: never) => void);
}

// ─── Running ────────────────────────────────────────────────────────

export interface RunResult {
  /** Message for a run that ended in an uncaught error, else null. */
  error: string | null;
  /** Files the run created or rewrote, keyed by workspace-relative path. */
  createdFiles: Array<[string, Uint8Array]>;
}

export interface RunSettings {
  /** Wall-clock ceiling; the run is stopped and says so when it is hit. */
  timeLimitMs?: number;
  /** Output batching window in ms (0 = post every write). */
  flushMs?: number;
}

// Per-run isolation: all blocks on a page share ONE long-lived worker per
// language, so a reused VirtualFS would leak one block's files (including
// the entry) into the next block's run (see __tests__/almostnodeRunner.test.ts).
// AlmostNodeRunner gives each run a VFS holding ONLY that run's files:
// multi-file callers stage() right before run(); single-file callers get a
// brand-new empty FS. The staged snapshot is consumed by the run.

export class AlmostNodeRunner {
  // Snapshot from the most recent stage(); null once a run consumes it, so
  // an un-staged run starts from a clean, empty filesystem.
  private stagedVfs: VirtualFS | null = null;
  // Paths (and sizes) staged for the next run, so files the program writes
  // can be told apart from the workspace it was given.
  private stagedFiles = new Map<string, number>();
  private entryPath = "/index.js";

  /** Stage a complete workspace snapshot for the NEXT run. Rebuilt from
   *  scratch each call so UI deletions/renames propagate. `transformFile`
   *  lets the TypeScript worker transpile `.ts` to `.js` while staging. */
  stage(
    files: Array<[string, Uint8Array]>,
    transformFile?: (
      path: string,
      bytes: Uint8Array,
    ) => Array<[string, Uint8Array]>,
  ): void {
    this.stagedVfs = stageFiles(files, transformFile);
    this.stagedFiles = new Map(
      listFiles(this.stagedVfs).map((path) => [
        path,
        this.stagedVfs?.readFileSync(path).length ?? 0,
      ]),
    );
  }

  /** Execute the entry against a VFS holding only this run's files (the
   *  staged snapshot, else a new empty FS). `resolveEntrySource` returns
   *  the entry's source text, which is wrapped for top-level `await` and
   *  written at `entryVfsPath`. The snapshot is consumed up front so the
   *  next un-staged run stays isolated even if this one throws. */
  async run(
    entryVfsPath: string,
    resolveEntrySource: (vfs: VirtualFS) => string,
    sink: ConsoleSink,
    settings: RunSettings = {},
  ): Promise<RunResult> {
    const boot = ensureBootstrap();
    this.entryPath = entryVfsPath;

    const vfs = this.stagedVfs ?? new VirtualFS();
    const staged = this.stagedFiles;
    this.stagedVfs = null;
    this.stagedFiles = new Map();

    const entrySource = resolveEntrySource(vfs);
    // `//# sourceURL` is what makes V8 report the user's filename instead of
    // `<anonymous>` for every frame in the entry module.
    vfs.writeFileSync(
      entryVfsPath,
      withSourceUrl(wrapEntryAsAsyncIIFE(entrySource), entryVfsPath),
    );

    const userPaths = new Set<string>([entryVfsPath, ...staged.keys()]);
    const clean = (stack: string) =>
      cleanStack(stack, {
        entryPath: entryVfsPath,
        lineOffset: boot.lineOffset + ENTRY_WRAP_LINES,
        userPaths,
      });

    const keeper = boot.keeper;
    const timeLimitMs = settings.timeLimitMs ?? DEFAULT_RUN_TIMEOUT_MS;
    activeSink = sink;
    unhandledRejections = new Map();
    keeper.beginRun();

    let error: string | null = null;
    if (!boot.digestsCorrect) {
      sink.write(
        "stderr",
        "Warning: crypto digests could not be verified in this build; treat createHash/createHmac output as unreliable.\n",
      );
    }

    // The console is created once and reads `clean` through this closure, so
    // every run's stacks are mapped with that run's own file set.
    const consoleForRun = ensureConsole(
      () => this.entryPath,
      (stack) => clean(stack),
    );

    const runtime = new Runtime(vfs, {
      // User-code console calls only: almostnode's own logging goes through
      // the global console, which drops these methods.
      onConsole: (method: string, args: unknown[]) =>
        consoleForRun.onConsole(method, args),
      // `process.stdout.write` / `process.stderr.write` used to be dropped
      // on the floor and report success. No implicit newline: writing
      // without one is the whole point of `write`.
      onStdout: (data: string) => sink.write("stdout", data),
      onStderr: (data: string) => sink.write("stderr", data),
    });
    // Node drains the nextTick queue before promise microtasks; almostnode
    // maps it onto queueMicrotask, which puts it last.
    const process = runtime.getProcess() as unknown as {
      nextTick: (cb: (...a: unknown[]) => void, ...args: unknown[]) => void;
    };
    process.nextTick = (callback, ...args) => {
      keeper.queueNextTick(() => callback(...args));
      queueMicrotask(() => keeper.drainNextTicks());
    };

    const startedAt = Date.now();
    try {
      const result = await runtime.runFileAsync(entryVfsPath);
      const exports = result.exports;
      // Await the wrapper IIFE's promise so top-level `await` completes and
      // thrown errors surface here instead of going unhandled.
      if (
        exports !== null &&
        typeof exports === "object" &&
        typeof (exports as { then?: unknown }).then === "function"
      ) {
        await exports;
      }
      keeper.drainNextTicks();
      // The module body returning is not the program ending: Node keeps
      // going while the loop has work, and so does this.
      const stopped = await this.drain(keeper, startedAt, timeLimitMs);
      if (keeper.error !== null) {
        error = describe(keeper.error, clean);
      } else if (stopped) {
        const pending = keeper.pending;
        sink.write(
          "stderr",
          `Stopped after ${Math.round(timeLimitMs / 1000)}s with ${pending} timer${pending === 1 ? "" : "s"} still pending.\n`,
        );
      }
    } catch (err) {
      error = describe(err, clean);
    } finally {
      keeper.endRun();
    }

    // A rejection nobody handled is the most common async mistake there is,
    // and it used to be completely silent.
    if (error === null && unhandledRejections.size > 0) {
      const [reason] = [...unhandledRejections.values()];
      error = `Uncaught (in promise) ${describe(reason, clean)}`;
    }
    unhandledRejections = new Map();

    const createdFiles = collectCreatedFiles(vfs, staged, entryVfsPath);
    activeSink = null;
    runtime.clearCache();
    return { error, createdFiles };
  }

  /** Wait for the loop to go quiet. Resolves true when the time limit was
   *  reached with work still pending. */
  private async drain(
    keeper: EventLoopKeeper,
    startedAt: number,
    timeLimitMs: number,
  ): Promise<boolean> {
    while (keeper.pending > 0 && keeper.error === null) {
      if (Date.now() - startedAt > timeLimitMs) return true;
      await new Promise((resolve) => keeper.realSetTimeout(resolve, DRAIN_POLL_MS));
      keeper.drainNextTicks();
    }
    return false;
  }
}

/** Files the run wrote that were not part of the workspace it was given. */
function collectCreatedFiles(
  vfs: VirtualFS,
  staged: Map<string, number>,
  entryVfsPath: string,
): Array<[string, Uint8Array]> {
  const created: Array<[string, Uint8Array]> = [];
  let bytes = 0;
  for (const path of listFiles(vfs)) {
    // The entry is rewritten (wrapper + sourceURL) before every run, so it
    // always looks changed; it is the run's input, never its output.
    if (path === entryVfsPath) continue;
    if (path.startsWith("/__pg_")) continue;
    let data: Uint8Array;
    try {
      data = vfs.readFileSync(path);
    } catch {
      continue;
    }
    const stagedSize = staged.get(path);
    if (stagedSize !== undefined && stagedSize === data.length) continue;
    if (created.length >= 50 || bytes + data.length > 64 * 1024 * 1024) break;
    bytes += data.length;
    created.push([path.replace(/^\//, ""), new Uint8Array(data)]);
  }
  return created;
}
