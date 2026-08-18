"use client";

// Main-thread client for the shared TypeScript language service worker
// (ts-language-worker.ts). One worker serves both the JavaScript and
// TypeScript adapters, it's spawned lazily on the first completion
// request and reused for the page's lifetime. If the worker can't boot
// (CDN blocked, importScripts failure) the module remembers the failure
// and answers every request with an empty result instead of respawning.

import type { CompletionResult } from "../types";
import type { TsDiagnosticMessage, TsEnvironment } from "./tsAnalysisConfig";

export type { TsDiagnosticMessage, TsEnvironment } from "./tsAnalysisConfig";

interface CompletionItemMessage {
  label: string;
  type?: string;
  apply?: string;
  boost?: number;
}

type WorkerOutMessage =
  | { kind: "ready" }
  | {
      kind: "complete-result";
      id: number;
      completions: CompletionItemMessage[];
      replaceLength: number;
    }
  | {
      kind: "diagnose-result";
      id: number;
      diagnostics: TsDiagnosticMessage[];
    };

/** Analysis request: the workspace, and which globals it runs against. */
export interface TsDiagnosticsRequest {
  files: Array<[string, string]>;
  entry: string;
  env: TsEnvironment;
  /** False for JavaScript, where only parse errors are meaningful. */
  semantic?: boolean;
  /** Override the wait. Locating an error the user is already looking at
   *  deserves less patience than checking a whole workspace. */
  timeoutMs?: number;
}

export interface TsCompletionRequest {
  /** Workspace snapshot: [path, content]; paths need not be
   *  slash-prefixed (normalised here). */
  files: Array<[string, string]>;
  /** Path (within `files`) of the file the cursor is in. */
  entry: string;
  /** 0-based cursor offset within the entry file. */
  offset: number;
  /** Globals the code runs against; defaults to the browser's. */
  env?: TsEnvironment;
}

const EMPTY: CompletionResult = { list: [], replaceLength: 0 };

let worker: Worker | null = null;
let failed = false;
let nextId = 0;

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function getWorker(): Worker | null {
  if (failed) return null;
  if (!worker) {
    try {
      worker = new Worker(new URL("./ts-language-worker.ts", import.meta.url));
    } catch {
      failed = true;
      return null;
    }
    worker.addEventListener("error", () => {
      // Boot failure (typescript.js unreachable), stop asking; the
      // static keyword/snippet sources still serve these editors.
      failed = true;
      worker?.terminate();
      worker = null;
      readiness = null;
    });
  }
  return worker;
}

/** How long the service gets to answer its first hello. A worker whose
 *  `importScripts` fails can surface that as a page-level error rather than
 *  one this module can see, so silence past this point counts as failure —
 *  otherwise every request would sit out its own timeout. */
const WORKER_READY_TIMEOUT_MS = 5000;

let readiness: Promise<boolean> | null = null;

/** Resolves true once the service has said hello, false if it never does.
 *  A false result is remembered: later requests answer empty immediately. */
function ensureReady(w: Worker): Promise<boolean> {
  if (!readiness) {
    readiness = new Promise<boolean>((resolve) => {
      const settle = (ok: boolean) => {
        clearTimeout(timer);
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        if (!ok) {
          failed = true;
          w.terminate();
          if (worker === w) worker = null;
        }
        resolve(ok);
      };
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        if (ev.data?.kind === "ready") settle(true);
      };
      const onError = () => settle(false);
      const timer = setTimeout(() => settle(false), WORKER_READY_TIMEOUT_MS);
      w.addEventListener("message", onMessage);
      w.addEventListener("error", onError);
    });
  }
  return readiness;
}

// Extensions the language service can analyse, everything else in the
// workspace (CSVs, images, …) is irrelevant to completion.
const ANALYZABLE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|json)$/i;

/** Decode the analysable text files out of a `prepareFileSystem`
 *  snapshot, for use as cross-file completion context. */
export function decodeWorkspaceTextFiles(
  files: Map<string, Uint8Array>,
): Map<string, string> {
  const out = new Map<string, string>();
  const decoder = new TextDecoder();
  for (const [path, bytes] of files) {
    if (!ANALYZABLE_RE.test(path)) continue;
    try {
      out.set(path, decoder.decode(bytes));
    } catch {
      // Undecodable bytes, skip; completion just won't see this file.
    }
  }
  return out;
}

/** Assemble a completion request: the staged workspace snapshot (from
 *  the last Run, best-effort context for cross-file imports) with the
 *  live editor doc overlaid on the active file. */
export function buildTsCompletionRequest(
  staged: Map<string, string>,
  doc: string,
  filename: string | undefined,
  fallbackEntry: string,
  offset: number,
): TsCompletionRequest {
  const entry =
    filename && ANALYZABLE_RE.test(filename) ? filename : fallbackEntry;
  const files: Array<[string, string]> = [];
  for (const [path, content] of staged) {
    if (path !== entry) files.push([path, content]);
  }
  files.push([entry, doc]);
  return { files, entry, offset };
}

/** Completions from the TS language service. Best-effort: resolves with
 *  an empty result on any failure. */
export async function completeWithTsService(
  req: TsCompletionRequest,
): Promise<CompletionResult> {
  const w = getWorker();
  if (!w || !(await ensureReady(w))) return EMPTY;

  const id = ++nextId;
  return new Promise<CompletionResult>((resolve) => {
    const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
      const msg = ev.data;
      if (msg.kind !== "complete-result" || msg.id !== id) return;
      w.removeEventListener("message", onMessage);
      resolve({ list: msg.completions, replaceLength: msg.replaceLength });
    };
    w.addEventListener("message", onMessage);
    // If the worker dies mid-request the pending promise would leak,
    // resolve empty on error so callers never hang.
    const onError = () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      resolve(EMPTY);
    };
    w.addEventListener("error", onError);
    w.postMessage({
      kind: "complete",
      id,
      files: req.files.map(([p, c]) => [normalizePath(p), c]),
      entry: normalizePath(req.entry),
      offset: req.offset,
      env: req.env,
    });
  });
}

/** How long to wait for an analysis before running without it. The service
 *  fetches its lib files on first use, so a cold request is the slow one. */
const DIAGNOSTICS_TIMEOUT_MS = 10_000;

/**
 * Type errors and parse errors for a workspace.
 *
 * Best-effort in the strictest sense: a service that fails to boot, a lib
 * fetch that does not answer, or a request that outlives its timeout all
 * resolve empty. Inventing errors in a user's program would be worse than
 * reporting none.
 */
export async function diagnoseWithTsService(
  req: TsDiagnosticsRequest,
): Promise<TsDiagnosticMessage[]> {
  const w = getWorker();
  if (!w || !(await ensureReady(w))) return [];

  const id = ++nextId;
  return new Promise<TsDiagnosticMessage[]>((resolve) => {
    const settle = (diagnostics: TsDiagnosticMessage[]) => {
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      resolve(diagnostics);
    };
    const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
      const msg = ev.data;
      if (msg.kind !== "diagnose-result" || msg.id !== id) return;
      settle(msg.diagnostics);
    };
    const onError = () => settle([]);
    const timer = setTimeout(() => settle([]), req.timeoutMs ?? DIAGNOSTICS_TIMEOUT_MS);
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({
      kind: "diagnose",
      id,
      files: req.files.map(([p, c]) => [normalizePath(p), c]),
      entry: normalizePath(req.entry),
      env: req.env,
      semantic: req.semantic,
    });
  });
}

/** The offending source line with a caret under the column, as Node and tsc
 *  both print it. */
export function sourceExcerpt(
  source: string,
  line: number,
  column: number,
): string {
  const text = source.split("\n")[line - 1];
  if (text === undefined) return "";
  return `${text}\n${" ".repeat(Math.max(0, column - 1))}^`;
}

/** `index.ts:2:15 - error TS2322: …`, the way tsc writes it. */
export function formatTsDiagnostic(d: TsDiagnosticMessage): string {
  const file = d.file.replace(/^\//, "");
  return `${file}:${d.line}:${d.column} - ${d.category} TS${d.code}: ${d.message}`;
}
