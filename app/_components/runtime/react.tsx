import type {
  CompletionRequest,
  CompletionResult,
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
} from "../types";
import { getWebFmt, WEB_FMT_2SPACE } from "./webFmt";
import {
  buildTsCompletionRequest,
  completeWithTsService,
} from "./tsLanguageService";
import {
  composeReactDocument,
  hasHarnessMarker,
  newPreviewToken,
  runPreviewDocument,
} from "./webPreview";
import { REACT_VERSION } from "./esmResolve";

// The React playground compiles TSX fully client-side: esbuild-wasm
// bundles the workspace tabs in a dedicated worker (bare imports rewrite
// to pinned esm.sh URLs and stay external — see esmResolve.ts), and the
// resulting ES module runs inside the same sandboxed iframe preview the
// web adapter uses (runtime/webPreview.ts). React itself is fetched by
// the preview document from esm.sh as a native ES module.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Counter",
    desc: "useState, events & JSX in one component",
    code: `import { useState } from "react";
import { createRoot } from "react-dom/client";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ fontFamily: "system-ui", textAlign: "center", marginTop: 40 }}>
      <h1>You clicked {count} times</h1>
      <button
        style={{ fontSize: 18, padding: "8px 20px", cursor: "pointer" }}
        onClick={() => setCount(count + 1)}
      >
        Click me
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Counter />);
`,
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
      <strong>{name}</strong> — since {year}
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
          The heading re-renders on every keystroke — the input's value
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

const PACKAGES: PackageInfo[] = [
  // No package drawer entries — bare imports of any npm package resolve
  // through esm.sh automatically (see packagesFooter).
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

  constructor(private worker: Worker) {}

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
        // Undecodable bytes — the bundler just won't see this file.
      }
    }
    this.stagedText = text;
  }

  /** TSX intellisense via the shared TS language-service worker (its
   *  compiler options enable the react-jsx transform). */
  async complete(request: CompletionRequest): Promise<CompletionResult> {
    return completeWithTsService(
      buildTsCompletionRequest(
        this.stagedText,
        request.doc,
        request.filename,
        "main.tsx",
        request.offset,
      ),
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
    // Consume-and-clear (see the web adapter for why), overlaying the
    // entry with the code actually passed to this run — it may carry a
    // merged init prelude or a challenge harness the staged copy lacks.
    const files = this.stagedText;
    this.stagedText = new Map();
    files.set(entry, code);

    let bundled: { js: string; css: string };
    try {
      bundled = await this.bundle(files, entry);
    } catch (err) {
      // Compile errors report like compiler diagnostics elsewhere: a
      // stderr cell, no preview swap (the previous page stays live).
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: "stderr", content: message });
      return;
    }

    const token = newPreviewToken();
    const doc = composeReactDocument({
      js: bundled.js,
      css: bundled.css || undefined,
      token,
      tailwind: options?.previewTailwind,
    });
    await runPreviewDocument({
      doc,
      token,
      emit,
      previewHost: options?.previewHost,
      waitForHarness: hasHarnessMarker(code),
    });
  }
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
    version: `React ${REACT_VERSION} · TypeScript JSX`,
    engine: "esbuild-wasm (in-browser bundler) + esm.sh modules",
    engineUrl: "https://esbuild.github.io/",
    notes:
      "TSX compiles and bundles fully client-side in a Web Worker; bare npm imports resolve " +
      "to pinned esm.sh ES modules fetched by the sandboxed preview iframe. No build server, " +
      "no cross-origin isolation requirements.",
  },
  codeMirrorMode: "tsx",
  codeMirrorModeForFile(filename) {
    if (/\.css$/i.test(filename)) return "css";
    if (/\.html?$/i.test(filename)) return "htmlmixed";
    if (/\.(js|mjs|cjs|json)$/i.test(filename)) return "javascript";
    if (/\.ts$/i.test(filename)) return "text/typescript";
    return undefined; // .tsx/.jsx → the adapter's "tsx" mode
  },
  // web_fmt at 2-space indentation — keep in sync with formatCode.
  indentWidth: 2,
  examples: EXAMPLES,
  packages: PACKAGES,
  outputCapabilities: { preview: true },
  exportFormats: [
    { extension: "tsx", label: "React TSX (.tsx)", mimeType: "text/plain" },
    { extension: "jsx", label: "React JSX (.jsx)", mimeType: "text/plain" },
  ],
  exportBaseFilename: "main",
  defaultFileExtension: "tsx",
  // The bundle step runs per Run (fast at snippet scale, but real work).
  compiled: true,
  // esbuild.wasm from jsDelivr, compressed.
  coldDownloadMB: 3,
  packagesFooter: (
    <>
      Import any npm package by name —{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
        import confetti from &quot;canvas-confetti&quot;
      </code>{" "}
      — and the bundler resolves it to an ES module from{" "}
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
      // Deadline backstop: the worker reports its own boot failures via
      // `init-error`, but if the worker chunk itself dies before the
      // protocol is up (and the bundler's bootstrap swallows the `error`
      // event), nothing would ever settle — fail loudly instead of
      // leaving surfaces stuck on "Loading…" forever. Generous budget:
      // the ~10 MB WASM download must fit on slow connections.
      const deadline = window.setTimeout(() => {
        cleanup();
        worker.terminate();
        reject(
          new Error(
            "The React build toolchain did not finish loading — check your connection and try again.",
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
