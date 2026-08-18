/// <reference lib="webworker" />

// TypeScript language service in a dedicated Web Worker — the intellisense
// backend for the JS/TS editors. Deliberately separate from the almostnode
// execution workers so analysis never queues behind a running user
// program. typescript.js comes from the CDN via importScripts (bundler
// never touches it); lib.*.d.ts files are fetched on first use, following
// their `/// <reference lib>` graph so the set survives TS upgrades.
// Protocol: one `complete` request/response pair per id; requests carry
// the full workspace snapshot, diffed into a versioned script registry so
// the service reuses incremental state.

import type tsModule from "typescript";
import {
  CSSTYPE_VERSION,
  REACT_DOM_TYPES_VERSION,
  REACT_TYPES_VERSION,
  TYPESCRIPT_CDN_BASE,
} from "./cdn";
import {
  cmTypeForTsKind,
  completionPrefixLength,
  referencedLibFiles,
} from "./tsCompletionKinds";
import {
  ambientFilesFor,
  ANALYZABLE_SOURCE_RE,
  compilerOptionsFor,
  libSeedsFor,
  MAX_DIAGNOSTICS,
  toDiagnosticMessages,
  type TsDiagnosticMessage,
  type TsEnvironment,
} from "./tsAnalysisConfig";

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

export type { TsDiagnosticMessage, TsEnvironment } from "./tsAnalysisConfig";

type InMessage =
  | {
      kind: "complete";
      id: number;
      /** Workspace snapshot: [path, content] with leading-slash paths. */
      files: Array<[string, string]>;
      /** Path of the file the cursor is in. */
      entry: string;
      /** 0-based cursor offset within the entry file. */
      offset: number;
      env?: TsEnvironment;
    }
  | {
      kind: "diagnose";
      id: number;
      files: Array<[string, string]>;
      entry: string;
      env?: TsEnvironment;
      /** False for JavaScript, where only parse errors are meaningful. */
      semantic?: boolean;
    };

type OutMessage =
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

function post(msg: OutMessage) {
  self.postMessage(msg);
}

// ─── Standard library declarations ─────────────────────────────────────

const libFiles = new Map<string, string>();

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

const libsPromises = new Map<TsEnvironment, Promise<void>>();

function ensureLibs(env: TsEnvironment): Promise<void> {
  let pending = libsPromises.get(env);
  if (!pending) {
    // Follow each lib's `/// <reference lib>` graph so the set survives a
    // TypeScript upgrade.
    pending = fetchLibClosure(libSeedsFor(ts, env)).catch((err) => {
      libsPromises.delete(env); // allow a retry on the next request
      throw err;
    });
    libsPromises.set(env, pending);
  }
  return pending;
}

// ─── React type declarations (TSX entries only) ────────────────────────
// For .tsx/.jsx entries, lazily mount the pinned @types/react graph at
// node_modules paths so Node10 resolution finds real typings. The set is
// closed: the only out-of-package imports are csstype and react.
// Best-effort — a failed fetch answers without React typings.

const typeFiles = new Map<string, string>();
let reactTypesPromise: Promise<void> | null = null;

const REACT_TYPE_FILES: Array<{ path: string; url: string }> = [
  {
    path: "/node_modules/@types/react/package.json",
    url: `https://cdn.jsdelivr.net/npm/@types/react@${REACT_TYPES_VERSION}/package.json`,
  },
  {
    path: "/node_modules/@types/react/index.d.ts",
    url: `https://cdn.jsdelivr.net/npm/@types/react@${REACT_TYPES_VERSION}/index.d.ts`,
  },
  {
    path: "/node_modules/@types/react/global.d.ts",
    url: `https://cdn.jsdelivr.net/npm/@types/react@${REACT_TYPES_VERSION}/global.d.ts`,
  },
  {
    path: "/node_modules/@types/react/jsx-runtime.d.ts",
    url: `https://cdn.jsdelivr.net/npm/@types/react@${REACT_TYPES_VERSION}/jsx-runtime.d.ts`,
  },
  {
    path: "/node_modules/@types/react-dom/package.json",
    url: `https://cdn.jsdelivr.net/npm/@types/react-dom@${REACT_DOM_TYPES_VERSION}/package.json`,
  },
  {
    path: "/node_modules/@types/react-dom/index.d.ts",
    url: `https://cdn.jsdelivr.net/npm/@types/react-dom@${REACT_DOM_TYPES_VERSION}/index.d.ts`,
  },
  {
    path: "/node_modules/@types/react-dom/client.d.ts",
    url: `https://cdn.jsdelivr.net/npm/@types/react-dom@${REACT_DOM_TYPES_VERSION}/client.d.ts`,
  },
  {
    path: "/node_modules/csstype/package.json",
    url: `https://cdn.jsdelivr.net/npm/csstype@${CSSTYPE_VERSION}/package.json`,
  },
  {
    path: "/node_modules/csstype/index.d.ts",
    url: `https://cdn.jsdelivr.net/npm/csstype@${CSSTYPE_VERSION}/index.d.ts`,
  },
];

function ensureReactTypes(): Promise<void> {
  if (!reactTypesPromise) {
    reactTypesPromise = Promise.all(
      REACT_TYPE_FILES.map(async ({ path, url }) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        typeFiles.set(path, await res.text());
      }),
    ).then(
      () => undefined,
      (err) => {
        reactTypesPromise = null; // allow a retry on the next request
        throw err;
      },
    );
  }
  return reactTypesPromise;
}

// ─── Language service host over an in-memory workspace ─────────────────

/** Environment of the request being served; the host reads it for settings. */
let environment: TsEnvironment = "dom";

const scripts = new Map<string, { content: string; version: number }>();

const host: tsModule.LanguageServiceHost = {
  getScriptFileNames: () => [...scripts.keys()],
  getScriptVersion: (f) => String(scripts.get(f)?.version ?? 0),
  getScriptSnapshot: (f) => {
    const content =
      scripts.get(f)?.content ?? libFiles.get(f) ?? typeFiles.get(f);
    return content === undefined
      ? undefined
      : ts.ScriptSnapshot.fromString(content);
  },
  getCurrentDirectory: () => "/",
  getCompilationSettings: () => compilerOptionsFor(ts, environment),
  getDefaultLibFileName: (opts) =>
    `/__lib/${opts.lib?.[0] ?? ts.getDefaultLibFileName(opts)}`,
  fileExists: (f) => scripts.has(f) || libFiles.has(f) || typeFiles.has(f),
  readFile: (f) =>
    scripts.get(f)?.content ?? libFiles.get(f) ?? typeFiles.get(f),
  readDirectory: () => [],
  directoryExists: () => true,
  getDirectories: () => [],
};

const service = ts.createLanguageService(host, ts.createDocumentRegistry());

/** Mirror the snapshot into the script registry, bumping versions only for
 *  changed files so the service reuses incremental state. */
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

async function complete(msg: Extract<InMessage, { kind: "complete" }>): Promise<void> {
  const env = msg.env ?? "dom";
  environment = env;
  await ensureLibs(env);
  // JSX entries also get React typings, best-effort.
  if (/\.(tsx|jsx)$/i.test(msg.entry)) {
    await ensureReactTypes().catch(() => {});
  }
  syncScripts([...msg.files, ...ambientFilesFor(env)]);

  const entryContent = scripts.get(msg.entry)?.content ?? "";
  const info = service.getCompletionsAtPosition(msg.entry, msg.offset, {});
  if (!info) {
    post({ kind: "complete-result", id: msg.id, completions: [], replaceLength: 0 });
    return;
  }

  const completions: CompletionItemMessage[] = [];
  for (const entry of info.entries) {
    // Entries with bespoke replacement ranges don't fit the simple
    // prefix-replace contract of `LanguageRuntime.complete`.
    if (entry.replacementSpan) continue;
    if (entry.kind === "warning") continue;
    completions.push({
      label: entry.name,
      type: cmTypeForTsKind(entry.kind),
      apply: entry.insertText,
      // sortText "11" is the service's "local / most relevant" tier.
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

/**
 * Type-check the workspace and report what tsc would.
 *
 * The TypeScript playground used to run `transpileModule`, which strips
 * types without checking them, so every type error passed silently — the one
 * thing that playground exists to catch. The same service that backs
 * completions answers this, so the checker is already loaded.
 */
async function diagnose(msg: Extract<InMessage, { kind: "diagnose" }>): Promise<void> {
  const env = msg.env ?? "dom";
  environment = env;
  await ensureLibs(env);
  syncScripts([...msg.files, ...ambientFilesFor(env)]);

  const diagnostics: TsDiagnosticMessage[] = [];
  for (const [path] of msg.files) {
    if (!ANALYZABLE_SOURCE_RE.test(path)) continue;
    const raw = [
      ...service.getSyntacticDiagnostics(path),
      ...(msg.semantic === false ? [] : service.getSemanticDiagnostics(path)),
    ];
    diagnostics.push(...toDiagnosticMessages(ts, raw, path));
    if (diagnostics.length >= MAX_DIAGNOSTICS) break;
  }
  diagnostics.length = Math.min(diagnostics.length, MAX_DIAGNOSTICS);

  post({ kind: "diagnose-result", id: msg.id, diagnostics });
}

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  const msg = ev.data;
  if (msg.kind === "complete") {
    void complete(msg).catch(() => {
      // Best-effort: analyzer/network hiccups answer empty, never throw.
      post({ kind: "complete-result", id: msg.id, completions: [], replaceLength: 0 });
    });
  } else if (msg.kind === "diagnose") {
    void diagnose(msg).catch(() => {
      // A failed analysis must never invent errors in the user's program.
      post({ kind: "diagnose-result", id: msg.id, diagnostics: [] });
    });
  }
});

post({ kind: "ready" });
