/// <reference lib="webworker" />

// TypeScript language service in a dedicated Web Worker — the
// intellisense backend for the JavaScript and TypeScript editors.
//
// This is deliberately a *separate* worker from the almostnode execution
// workers (public/_workers/*.js): analysis must never queue behind a
// long-running user program, and the execution workers are pre-bundled
// outside Next's pipeline. Like the Pyodide worker, the heavy dependency
// (typescript.js, ~2 MB gz) is pulled from the CDN with `importScripts`
// so the bundler never touches it and nothing lands in the client
// chunks; the standard-library `lib.*.d.ts` files are fetched from the
// same pinned package on first use, following their
// `/// <reference lib="…" />` graph so the set stays correct across
// TypeScript upgrades.
//
// Protocol: a single `complete` request/response pair correlated by id.
// Requests carry the full workspace snapshot (playground files are a few
// KB); the worker diffs contents into a versioned script registry so the
// language service can reuse its incremental program state.

import type tsModule from "typescript";
import { TYPESCRIPT_CDN_BASE } from "./cdn";
import {
  cmTypeForTsKind,
  completionPrefixLength,
  referencedLibFiles,
} from "./tsCompletionKinds";

declare const self: DedicatedWorkerGlobalScope & {
  ts: typeof tsModule;
};

self.importScripts(`${TYPESCRIPT_CDN_BASE}/lib/typescript.js`);
const ts = self.ts;

interface CompletionItemMessage {
  label: string;
  type?: string;
  apply?: string;
  boost?: number;
}

type InMessage = {
  kind: "complete";
  id: number;
  /** Workspace snapshot: [path, content] with leading-slash paths. */
  files: Array<[string, string]>;
  /** Path of the file the cursor is in. */
  entry: string;
  /** 0-based cursor offset within the entry file. */
  offset: number;
};

type OutMessage =
  | { kind: "ready" }
  | {
      kind: "complete-result";
      id: number;
      completions: CompletionItemMessage[];
      replaceLength: number;
    };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

// ─── Standard library declarations ─────────────────────────────────────

const libFiles = new Map<string, string>();
let libsPromise: Promise<void> | null = null;

async function fetchLibClosure(seed: string[]): Promise<void> {
  const pending = new Set(seed);
  const done = new Set<string>();
  while (pending.size > 0) {
    const batch = [...pending];
    batch.forEach((n) => {
      pending.delete(n);
      done.add(n);
    });
    await Promise.all(
      batch.map(async (name) => {
        const res = await fetch(`${TYPESCRIPT_CDN_BASE}/lib/${name}`);
        if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
        const text = await res.text();
        libFiles.set(`/__lib/${name}`, text);
        for (const ref of referencedLibFiles(text)) {
          if (!done.has(ref)) pending.add(ref);
        }
      }),
    );
  }
}

function ensureLibs(): Promise<void> {
  if (!libsPromise) {
    // The target-derived default lib (`lib.es2022.full.d.ts`) references
    // the whole ES chain plus DOM — which supplies console/fetch/timers,
    // matching what almostnode actually provides at runtime.
    libsPromise = fetchLibClosure([
      ts.getDefaultLibFileName(COMPILER_OPTIONS),
    ]).catch((err) => {
      libsPromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return libsPromise;
}

// ─── Language service host over an in-memory workspace ─────────────────

const COMPILER_OPTIONS: tsModule.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  // almostnode executes CommonJS output; Node10 resolution makes
  // `./utils` find /utils.ts without package.json machinery.
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  allowJs: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  noEmit: true,
};

const scripts = new Map<string, { content: string; version: number }>();

const host: tsModule.LanguageServiceHost = {
  getScriptFileNames: () => [...scripts.keys()],
  getScriptVersion: (f) => String(scripts.get(f)?.version ?? 0),
  getScriptSnapshot: (f) => {
    const content = scripts.get(f)?.content ?? libFiles.get(f);
    return content === undefined
      ? undefined
      : ts.ScriptSnapshot.fromString(content);
  },
  getCurrentDirectory: () => "/",
  getCompilationSettings: () => COMPILER_OPTIONS,
  getDefaultLibFileName: (opts) => `/__lib/${ts.getDefaultLibFileName(opts)}`,
  fileExists: (f) => scripts.has(f) || libFiles.has(f),
  readFile: (f) => scripts.get(f)?.content ?? libFiles.get(f),
  readDirectory: () => [],
  directoryExists: () => true,
  getDirectories: () => [],
};

const service = ts.createLanguageService(host, ts.createDocumentRegistry());

/** Mirror the request's workspace snapshot into the script registry,
 *  bumping versions only for files whose content actually changed so
 *  the language service reuses its incremental state. */
function syncScripts(files: Array<[string, string]>): void {
  const seen = new Set<string>();
  for (const [path, content] of files) {
    seen.add(path);
    const existing = scripts.get(path);
    if (!existing) {
      scripts.set(path, { content, version: 1 });
    } else if (existing.content !== content) {
      existing.content = content;
      existing.version += 1;
    }
  }
  for (const path of [...scripts.keys()]) {
    if (!seen.has(path)) scripts.delete(path);
  }
}

const MAX_COMPLETIONS = 300;

async function complete(msg: InMessage): Promise<void> {
  await ensureLibs();
  syncScripts(msg.files);

  const entryContent = scripts.get(msg.entry)?.content ?? "";
  const info = service.getCompletionsAtPosition(msg.entry, msg.offset, {});
  if (!info) {
    post({ kind: "complete-result", id: msg.id, completions: [], replaceLength: 0 });
    return;
  }

  const completions: CompletionItemMessage[] = [];
  for (const entry of info.entries) {
    // Entries with bespoke replacement ranges (optional-chain fixups,
    // string-literal rewrites, …) don't fit the simple prefix-replace
    // contract of `LanguageRuntime.complete` — drop them.
    if (entry.replacementSpan) continue;
    if (entry.kind === "warning") continue;
    completions.push({
      label: entry.name,
      type: cmTypeForTsKind(entry.kind),
      apply: entry.insertText,
      // sortText "11" is the service's own "local / most relevant"
      // tier; nudge those above the global soup of equal fuzzy matches.
      boost: entry.sortText === "11" ? 2 : undefined,
    });
    if (completions.length >= MAX_COMPLETIONS) break;
  }

  post({
    kind: "complete-result",
    id: msg.id,
    completions,
    replaceLength: completionPrefixLength(entryContent, msg.offset),
  });
}

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  const msg = ev.data;
  if (msg.kind !== "complete") return;
  void complete(msg).catch(() => {
    // Best-effort: analyzer/network hiccups answer empty, never throw.
    post({ kind: "complete-result", id: msg.id, completions: [], replaceLength: 0 });
  });
});

post({ kind: "ready" });
