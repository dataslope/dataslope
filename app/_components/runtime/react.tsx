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
// to pinned esm.sh URLs and stay external, see esmResolve.ts), and the
// resulting ES module runs inside the same sandboxed iframe preview the
// web adapter uses (runtime/webPreview.ts). React itself is fetched by
// the preview document from esm.sh as a native ES module.

// The default workspace: a real multi-file project shape. main.tsx
// mounts, App.tsx is the component the learner edits, styles come from
// a plain CSS import, the structure every React tutorial and template
// uses, one tab per file in the playground's tabbed editor.
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

// A curated starter set for the packages drawer. Nothing here is
// "installed", any bare npm import already resolves through esm.sh,
// these entries exist for discoverability, each with a runnable
// example. Versions are what esm.sh serves for the unpinned specifier.
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
        // Undecodable bytes, the bundler just won't see this file.
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
    // entry with the code actually passed to this run, it may carry a
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

/** Entry points are the files that MOUNT the app, the ones calling
 *  `createRoot`/`hydrateRoot` (or legacy `ReactDOM.render`). Running a
 *  component-only file as the entry would bundle fine but render
 *  nothing, so the Run button resolves to the mounting file even while
 *  the user is editing `App.tsx`. */
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
  // web_fmt at 2-space indentation, keep in sync with formatCode.
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
  // Fresh workspaces open as the standard main/App/styles project shape
  // in the regular tabbed editor + files pane layout (like JS/TS): the
  // mount point stays fixed in main.tsx while the learner works in
  // App.tsx, and Run always resolves to the mounting file via
  // findReactEntryFiles below.
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
      // Deadline backstop: the worker reports its own boot failures via
      // `init-error`, but if the worker chunk itself dies before the
      // protocol is up (and the bundler's bootstrap swallows the `error`
      // event), nothing would ever settle, fail loudly instead of
      // leaving surfaces stuck on "Loading…" forever. Generous budget:
      // the ~10 MB WASM download must fit on slow connections.
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
