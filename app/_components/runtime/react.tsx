import type {
  CompletionRequest,
  CompletionResult,
  EmitOutput,
  EntryFileInfo,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
  HoverResult,
  PositionRequest,
  SignatureHelpResult,
} from "../types";
import { getWebFmt, WEB_FMT_2SPACE } from "./webFmt";
import {
  buildTsCompletionRequest,
  completeWithTsService,
  diagnoseWithTsService,
  formatTsDiagnostic,
  hoverWithTsService,
  signatureHelpWithTsService,
} from "./tsLanguageService";
import { ANALYZABLE_SOURCE_RE } from "./tsAnalysisConfig";
import { bundleLineOf, inlineSourceMapOf } from "./bundleSourceMap";
import {
  externalSpecifiers,
  preflightModules,
} from "./reactModulePreflight";
import {
  cancelPreviewRun,
  composeReactDocument,
  composeReactDocumentWithMeta,
  hasHarnessMarker,
  newPreviewToken,
  runPreviewDocument,
} from "./webPreview";
import { REACT_VERSION } from "./esmResolve";

// The React playground compiles TSX fully client-side: esbuild-wasm
// bundles the workspace in a worker (bare imports rewrite to pinned
// esm.sh URLs, see esmResolve.ts) and the result runs in the same
// sandboxed iframe preview the web adapter uses (runtime/webPreview.ts).

// Default workspace: main.tsx mounts, App.tsx is what the learner edits,
// styles come from a plain CSS import.
const DEFAULT_MAIN = `import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
`;

const DEFAULT_APP = `import { useState } from "react";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="card">
      <h1>You clicked {count} times</h1>
      <button onClick={() => setCount(count + 1)}>Click me</button>
      <p>
        Edit <code>App.tsx</code> and press Run, imports between the
        panes bundle right in your browser.
      </p>
    </main>
  );
}
`;

const DEFAULT_STYLES = `body {
  font-family: system-ui, sans-serif;
  display: grid;
  place-items: center;
  min-height: 90vh;
  background: #f8fafc;
  margin: 0;
}

.card {
  background: white;
  padding: 2rem 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  text-align: center;
  max-width: 26rem;
}

h1 {
  color: #0f172a;
  margin: 0 0 1rem;
}

button {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.5rem;
  font-size: 1.1rem;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}

p {
  color: #64748b;
  font-size: 0.9rem;
}
`;

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Counter",
    desc: "The main/App/styles starter trio",
    code: DEFAULT_MAIN,
    files: [
      { filename: "App.tsx", content: DEFAULT_APP },
      { filename: "styles.css", content: DEFAULT_STYLES },
    ],
    entryFilename: "main.tsx",
  },
  {
    key: "props_lists",
    title: "Props & Lists",
    desc: "Component composition and list rendering",
    code: `import { createRoot } from "react-dom/client";

interface Language {
  name: string;
  year: number;
}

const LANGUAGES: Language[] = [
  { name: "JavaScript", year: 1995 },
  { name: "TypeScript", year: 2012 },
  { name: "React (JSX)", year: 2013 },
];

function LanguageRow({ name, year }: Language) {
  return (
    <li>
      <strong>{name}</strong>, since {year}
    </li>
  );
}

function App() {
  return (
    <main style={{ fontFamily: "system-ui", margin: "2rem" }}>
      <h1>Rendering a list</h1>
      <ul>
        {LANGUAGES.map((lang) => (
          <LanguageRow key={lang.name} {...lang} />
        ))}
      </ul>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
`,
  },
  {
    key: "multi_file",
    title: "Multi-File App",
    desc: "main.tsx + App.tsx + a CSS import",
    code: `import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
`,
    files: [
      {
        filename: "App.tsx",
        content: `import { useState } from "react";

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  return (
    <main className={\`panel \${theme}\`}>
      <h1>Multi-file React</h1>
      <p>
        This component lives in <code>App.tsx</code>; the styles come
        from a plain CSS import.
      </p>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Switch to {theme === "light" ? "dark" : "light"} mode
      </button>
    </main>
  );
}
`,
      },
      {
        filename: "styles.css",
        content: `body {
  font-family: system-ui, sans-serif;
  margin: 0;
}

.panel {
  min-height: 100vh;
  padding: 2rem;
  transition: background 0.3s, color 0.3s;
}

.panel.light {
  background: #f8fafc;
  color: #0f172a;
}

.panel.dark {
  background: #0f172a;
  color: #f8fafc;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
`,
      },
    ],
    entryFilename: "main.tsx",
  },
  {
    key: "effects",
    title: "Effects & Timers",
    desc: "useEffect with setup and cleanup",
    code: `import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    console.log("interval started");
    return () => clearInterval(id);
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", textAlign: "center", marginTop: 48 }}>
      <h1 style={{ fontVariantNumeric: "tabular-nums" }}>
        {now.toLocaleTimeString()}
      </h1>
      <p>Re-rendering once per second via useEffect + setInterval.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Clock />);
`,
  },
  {
    key: "controlled_form",
    title: "Controlled Form",
    desc: "Inputs whose state lives in React",
    code: `import { useState } from "react";
import { createRoot } from "react-dom/client";

function NamePicker() {
  const [name, setName] = useState("");

  return (
    <main style={{ fontFamily: "system-ui", margin: "2rem" }}>
      <h1>{name ? \`Hello, \${name}!\` : "What's your name?"}</h1>
      <input
        style={{ fontSize: 16, padding: "6px 10px" }}
        placeholder="Type your name…"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      {name && (
        <p>
          The heading re-renders on every keystroke, the input's value
          lives in React state.
        </p>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<NamePicker />);
`,
  },
];

// Curated starter set for the packages drawer — nothing is "installed";
// any bare npm import already resolves through esm.sh. Versions are what
// esm.sh serves for the unpinned specifier.
const PACKAGES: PackageInfo[] = [
  {
    cat: "UI Effects", icon: "🎉", color: "#f59e0b", name: "canvas-confetti", ver: "latest",
    desc: "Performant confetti bursts on a canvas overlay",
    example: `import confetti from "canvas-confetti";
import { createRoot } from "react-dom/client";

function Party() {
  return (
    <main style={{ fontFamily: "system-ui", textAlign: "center", marginTop: 60 }}>
      <button
        style={{ fontSize: 18, padding: "10px 24px", cursor: "pointer" }}
        onClick={() => confetti({ particleCount: 120, spread: 70 })}
      >
        Celebrate 🎉
      </button>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Party />);
`,
  },
  {
    cat: "State Management", icon: "🐻", color: "#8b5cf6", name: "zustand", ver: "latest",
    desc: "Tiny hook-based global state store",
    example: `import { create } from "zustand";
import { createRoot } from "react-dom/client";

const useCounter = create<{ n: number; up: () => void }>((set) => ({
  n: 0,
  up: () => set((s) => ({ n: s.n + 1 })),
}));

function Display() {
  const n = useCounter((s) => s.n);
  return <h1>Count: {n}</h1>;
}

function Controls() {
  const up = useCounter((s) => s.up);
  return <button onClick={up}>Increment (shared store)</button>;
}

createRoot(document.getElementById("root")!).render(
  <main style={{ fontFamily: "system-ui", margin: 24 }}>
    <Display />
    <Controls />
  </main>,
);
`,
  },
  {
    cat: "Utilities", icon: "🧵", color: "#0ea5e9", name: "clsx", ver: "latest",
    desc: "Conditionally join className strings",
    example: `import clsx from "clsx";
import { useState } from "react";
import { createRoot } from "react-dom/client";

function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <button
      className={clsx("pill", { active: on })}
      style={{
        fontSize: 16,
        padding: "8px 20px",
        borderRadius: 999,
        border: "1px solid #cbd5e1",
        background: on ? "#2563eb" : "white",
        color: on ? "white" : "#0f172a",
        cursor: "pointer",
      }}
      onClick={() => setOn(!on)}
    >
      {on ? "On" : "Off"}, classes: {clsx("pill", { active: on })}
    </button>
  );
}

createRoot(document.getElementById("root")!).render(
  <main style={{ fontFamily: "system-ui", margin: 24 }}>
    <Toggle />
  </main>,
);
`,
  },
  {
    cat: "Dates & Time", icon: "📅", color: "#16a34a", name: "dayjs", ver: "latest",
    desc: "2 KB immutable date library with a chainable API",
    example: `import dayjs from "dayjs";
import { createRoot } from "react-dom/client";

const now = dayjs();

createRoot(document.getElementById("root")!).render(
  <main style={{ fontFamily: "system-ui", margin: 24 }}>
    <h1>{now.format("dddd, MMMM D")}</h1>
    <ul>
      <li>ISO: {now.toISOString()}</li>
      <li>In 30 days: {now.add(30, "day").format("YYYY-MM-DD")}</li>
      <li>Start of week: {now.startOf("week").format("YYYY-MM-DD")}</li>
    </ul>
  </main>,
);
`,
  },
  {
    cat: "Animation", icon: "🎞️", color: "#ec4899", name: "motion", ver: "latest",
    desc: "Production-grade animation (Framer Motion's engine)",
    example: `import { motion } from "motion/react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <main
    style={{
      fontFamily: "system-ui",
      display: "grid",
      placeItems: "center",
      minHeight: "80vh",
    }}
  >
    <motion.div
      initial={{ scale: 0, rotate: 0 }}
      animate={{ scale: 1, rotate: 360 }}
      transition={{ type: "spring", bounce: 0.4, duration: 1.2 }}
      style={{
        width: 120,
        height: 120,
        borderRadius: 24,
        background: "linear-gradient(135deg, #6366f1, #ec4899)",
      }}
    />
  </main>,
);
`,
  },
];

type WorkerOutMessage =
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "bundle-done"; id: number; js: string; css: string }
  | { kind: "bundle-error"; id: number; message: string };

// Files worth shipping to the bundler / completion service.
const TEXT_FILE_RE = /\.(tsx|ts|jsx|js|mjs|cjs|json|css|txt|svg|html?)$/i;

class ReactPreviewRuntime implements LanguageRuntime {
  private nextId = 0;
  private stagedText = new Map<string, string>();
  /** Slot the run in flight is rendering into, for `cancelRun`. */
  private activeHost: HTMLElement | null = null;

  constructor(private worker: Worker) {}

  /** Stop the page: the frame IS the program, so removing it ends the run
   *  even when the document has wedged itself in a loop. */
  async cancelRun(): Promise<void> {
    cancelPreviewRun(this.activeHost);
  }

  /** Free the runtime by terminating the esbuild worker. */
  dispose(): void {
    this.worker.terminate();
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    const text = new Map<string, string>();
    const decoder = new TextDecoder();
    for (const [path, bytes] of files) {
      if (!TEXT_FILE_RE.test(path)) continue;
      try {
        text.set(path, decoder.decode(bytes));
      } catch {
        // Undecodable bytes, the bundler just won't see this file.
      }
    }
    this.stagedText = text;
  }

  /** TSX intellisense via the shared TS language-service worker (its
   *  compiler options enable the react-jsx transform). */
  async complete(request: CompletionRequest): Promise<CompletionResult> {
    return completeWithTsService(this.serviceRequest(request));
  }

  hover(request: PositionRequest): Promise<HoverResult | null> {
    return hoverWithTsService(this.serviceRequest(request));
  }

  signatureHelp(request: PositionRequest): Promise<SignatureHelpResult | null> {
    return signatureHelpWithTsService(this.serviceRequest(request));
  }

  private serviceRequest(request: PositionRequest) {
    return buildTsCompletionRequest(
      this.stagedText,
      request.doc,
      request.filename,
      "main.tsx",
      request.offset,
    );
  }

  private bundle(
    files: Map<string, string>,
    entry: string,
  ): Promise<{ js: string; css: string }> {
    const id = ++this.nextId;
    const payload: Array<[string, string]> = [...files];
    return new Promise((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind === "bundle-done" && msg.id === id) {
          this.worker.removeEventListener("message", onMessage);
          resolve({ js: msg.js, css: msg.css });
        } else if (msg.kind === "bundle-error" && msg.id === id) {
          this.worker.removeEventListener("message", onMessage);
          reject(new Error(msg.message));
        }
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({ kind: "bundle", id, files: payload, entry });
    });
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    const entry = options?.entryFilename ?? "main.tsx";
    // Consume-and-clear (see the web adapter). The entry is overlaid with
    // `code`, which may carry an init prelude or challenge harness the
    // staged copy lacks.
    const files = this.stagedText;
    this.stagedText = new Map();
    files.set(entry, code);

    let bundled: { js: string; css: string };
    try {
      bundled = await this.bundle(files, entry);
    } catch (err) {
      // Compile errors: stderr cell, no preview swap (previous page stays).
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: "stderr", content: message });
      return;
    }

    // Every bare import left the bundler as an esm.sh URL, so a mistyped
    // package survives the build and fails inside the frame with no
    // specifier and no message. Check them here, where the message can
    // still name the package.
    const failures = await preflightModules(externalSpecifiers(bundled.js));
    for (const failure of failures) {
      emit({ type: "stderr", content: failure.message });
    }
    if (failures.some((f) => f.status === 404)) {
      // A package that does not exist cannot be fixed by running it.
      return;
    }

    // Type checking runs alongside the render rather than ahead of it, so
    // the preview is not held behind the checker's lib downloads.
    const analysis = options?.diagnostics
      ? diagnoseWithTsService({
          files: this.analysisFiles(files, entry, code),
          entry,
          env: "dom",
        })
      : Promise.resolve([]);

    const token = newPreviewToken();
    const { doc, bundleStartLine } = composeReactDocumentWithMeta({
      js: bundled.js,
      css: bundled.css || undefined,
      token,
      tailwind: options?.previewTailwind,
    });
    const sourceMap = inlineSourceMapOf(bundled.js);
    this.activeHost = options?.previewHost ?? null;
    await runPreviewDocument({
      doc,
      token,
      emit,
      previewHost: options?.previewHost,
      waitForHarness: hasHarnessMarker(code),
      locate: sourceMap
        ? (line, column) => {
            const at = sourceMap.lookup(
              bundleLineOf(line, bundleStartLine),
              column,
            );
            return at ? `${at.file}:${at.line}:${at.column}` : null;
          }
        : undefined,
    });

    // Reported after the page has rendered, where the eye is.
    const errors = (await analysis).filter((d) => d.category === "error");
    if (errors.length > 0) {
      emit({
        type: "stderr",
        content: errors.map(formatTsDiagnostic).join("\n"),
      });
      // esbuild strips types without checking them, so the page runs — but
      // the run is not a success and says so instead of a plain "Done".
      throw new Error(
        `Found ${errors.length} TypeScript error${errors.length === 1 ? "" : "s"}.`,
      );
    }
  }

  /** Workspace snapshot for the checker: the staged files with the entry
   *  overlaid, since `code` may carry a prelude the staged copy lacks. */
  private analysisFiles(
    files: Map<string, string>,
    entry: string,
    code: string,
  ): Array<[string, string]> {
    const out = new Map(files);
    out.set(entry, code);
    return [...out].filter(([path]) => ANALYZABLE_SOURCE_RE.test(path));
  }
}

/**
 * The document this workspace renders, composed from a bundle compiled at
 * build time by `scripts/build-react-bundles.mjs` — TSX needs translating
 * and the translator is a ~3 MB download a reader shouldn't pay for
 * scrolling past a lesson. No bundle, no preview. `sources` is unused on
 * purpose: deriving a second answer from them would be the drift this
 * design exists to avoid.
 */
function composeStaticReactPreview(
  _sources: { filename: string; source: string }[],
  options: {
    entryFilename: string;
    token: string;
    tailwind?: boolean;
    bundle?: { js: string; css?: string };
  },
): string | null {
  if (!options.bundle) return null;
  return composeReactDocument({
    js: options.bundle.js,
    css: options.bundle.css || undefined,
    token: options.token,
    tailwind: options.tailwind,
  });
}

function findReactEntryFiles(
  files: { filename: string; content: string }[],
): EntryFileInfo[] {
  return files
    .filter(
      (f) =>
        /\.(tsx|ts|jsx|js|mjs)$/i.test(f.filename) &&
        /\b(createRoot|hydrateRoot|ReactDOM\.render)\s*\(/.test(f.content),
    )
    .map((f) => ({ filename: f.filename, kind: "main" as const }));
}

function identifierFor(packageName: string): string {
  const leaf = packageName.split("/").pop() ?? packageName;
  const cleaned = leaf.replace(/[^a-zA-Z0-9_$]+(.)?/g, (_, c: string | undefined) =>
    c ? c.toUpperCase() : "",
  );
  return /^[a-zA-Z_$]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

export const reactAdapter: LanguageAdapter = {
  id: "react",
  displayName: "React Playground",
  logoText: "⚛",
  documentTitle: "React Playground",
  readyStatus: "React toolchain ready",
  runtimeInfo: {
    language: "React",
    version: REACT_VERSION,
    engine: "esbuild-wasm (in-browser bundler) + esm.sh modules",
    engineUrl: "https://esbuild.github.io/",
    notes:
      "TSX compiles and bundles fully client-side in a Web Worker; bare npm imports resolve " +
      "to pinned esm.sh ES modules fetched by the sandboxed preview iframe. No build server, " +
      "no cross-origin isolation requirements. Types are checked alongside the render and " +
      "errors report the .tsx line they came from. The opaque origin means localStorage and " +
      "sessionStorage are emulated in memory and reset with the preview.",
  },
  codeMirrorMode: "tsx",
  codeMirrorModeForFile(filename) {
    if (/\.css$/i.test(filename)) return "css";
    if (/\.html?$/i.test(filename)) return "htmlmixed";
    if (/\.(js|mjs|cjs|json)$/i.test(filename)) return "javascript";
    if (/\.ts$/i.test(filename)) return "text/typescript";
    return undefined; // .tsx/.jsx → the adapter's "tsx" mode
  },
  // web_fmt at 2-space indentation, keep in sync with formatCode.
  indentWidth: 2,
  examples: EXAMPLES,
  packages: PACKAGES,
  outputCapabilities: { preview: true, autoPreview: true },
  composeStaticPreview: composeStaticReactPreview,
  // One entry per file, matching what the file actually is. The old
  // "React JSX (.jsx)" option renamed a .tsx file without transforming
  // it, so the download still carried `interface Props` and `: number`
  // and no bundler would accept it.
  exportFormats: [
    { extension: "tsx", label: "React TSX (.tsx)", mimeType: "text/plain" },
  ],
  exportFormatsForFile(filename) {
    if (/\.css$/i.test(filename)) {
      return [{ extension: "css", label: "CSS (.css)", mimeType: "text/css" }];
    }
    if (/\.jsx$/i.test(filename)) {
      return [{ extension: "jsx", label: "React JSX (.jsx)", mimeType: "text/plain" }];
    }
    if (/\.ts$/i.test(filename)) {
      return [{ extension: "ts", label: "TypeScript (.ts)", mimeType: "text/plain" }];
    }
    if (/\.js$/i.test(filename)) {
      return [{ extension: "js", label: "JavaScript (.js)", mimeType: "text/javascript" }];
    }
    return undefined;
  },
  exportBaseFilename: "main",
  defaultFileExtension: "tsx",
  // Standard main/App/styles project shape; Run always resolves to the
  // mounting file via findReactEntryFiles (a component-only entry would
  // bundle fine but render nothing).
  defaultWorkspace: [
    { filename: "main.tsx", content: DEFAULT_MAIN },
    { filename: "App.tsx", content: DEFAULT_APP },
    { filename: "styles.css", content: DEFAULT_STYLES },
  ],
  findEntryFiles: findReactEntryFiles,
  // The bundle step runs per Run (fast at snippet scale, but real work).
  compiled: true,
  // esbuild.wasm from jsDelivr, compressed.
  coldDownloadMB: 3,
  packagesFooter: (
    <>
      Import any npm package by name,{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
        import confetti from &quot;canvas-confetti&quot;
      </code>{" "}
, and the bundler resolves it to an ES module from{" "}
      <a href="https://esm.sh" target="_blank" rel="noreferrer">
        esm.sh
      </a>
      . React {REACT_VERSION} is pinned for reproducible lessons.
    </>
  ),
  importSnippet: (name) => `import ${identifierFor(name)} from "${name}";`,
  hasImport(code, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(from\\s*|import\\s*)["']${escaped}["']`);
    return re.test(code);
  },
  async formatCode(code: string, filename?: string): Promise<string> {
    const { format } = await getWebFmt();
    return format(code, filename ?? "main.tsx", WEB_FMT_2SPACE);
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Downloading the React build toolchain…", 0.05);
    // Bundler-analyzed worker (small source; the heavy esbuild payload
    // arrives via importScripts + WASM streaming inside the worker).
    const worker = new Worker(new URL("./esbuild-worker.ts", import.meta.url));
    return new Promise<LanguageRuntime>((resolve, reject) => {
      // Deadline backstop: if the worker chunk dies before the protocol is
      // up, nothing would ever settle — fail loudly instead of hanging on
      // "Loading…". Generous budget for the ~10 MB WASM on slow links.
      const deadline = window.setTimeout(() => {
        cleanup();
        worker.terminate();
        reject(
          new Error(
            "The React build toolchain did not finish loading, check your connection and try again.",
          ),
        );
      }, 120_000);
      const cleanup = () => {
        window.clearTimeout(deadline);
        worker.removeEventListener("message", onMessage);
      };
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        if (ev.data.kind === "ready") {
          cleanup();
          resolve(new ReactPreviewRuntime(worker));
        } else if (ev.data.kind === "init-error") {
          cleanup();
          worker.terminate();
          reject(new Error(ev.data.message));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (ev) => {
        cleanup();
        reject(new Error(ev.message || "React build worker failed to start"));
      });
    });
  },
};
