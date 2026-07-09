"use client";

// Main-thread client for the shared TypeScript language service worker
// (ts-language-worker.ts). One worker serves both the JavaScript and
// TypeScript adapters, it's spawned lazily on the first completion
// request and reused for the page's lifetime. If the worker can't boot
// (CDN blocked, importScripts failure) the module remembers the failure
// and answers every request with an empty result instead of respawning.

import type { CompletionResult } from "../types";

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
    };

export interface TsCompletionRequest {
  /** Workspace snapshot: [path, content]; paths need not be
   *  slash-prefixed (normalised here). */
  files: Array<[string, string]>;
  /** Path (within `files`) of the file the cursor is in. */
  entry: string;
  /** 0-based cursor offset within the entry file. */
  offset: number;
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
    });
  }
  return worker;
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
export function completeWithTsService(
  req: TsCompletionRequest,
): Promise<CompletionResult> {
  const w = getWorker();
  if (!w) return Promise.resolve(EMPTY);

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
    });
  });
}
