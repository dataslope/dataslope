import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
} from "../types";
import { getWebFmt, WEB_FMT_2SPACE } from "./webFmt";

// JavaScript runs in a dedicated Web Worker backed by almostnode — a
// browser-native Node.js runtime. The worker stages every open file
// (code tabs + uploaded data) into almostnode's VirtualFS, then
// executes the entry file with CommonJS semantics. `require()` works,
// 40+ Node.js modules are shimmed (`fs`, `path`, `http`, `events`,
// `crypto`, …), and multi-file imports resolve from VirtualFS.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "Basic console output, math & strings",
    code: `// Hello, JavaScript Playground!
console.log("Node-like environment in your browser, powered by almostnode.");
console.log("π ≈", Math.PI);
console.log("e ≈", Math.E);

for (let i = 1; i <= 5; i++) {
  console.log(\`  \${i}: \${"★".repeat(i)}\`);
}

const msg = "Hello, World!";
console.log("\\n" + "─".repeat(30));
console.log(msg.padStart((30 + msg.length) / 2).padEnd(30));
console.log("─".repeat(30));
`,
  },
  {
    key: "array_methods",
    title: "Array Methods",
    desc: "map / filter / reduce on a dataset",
    code: `const sales = [
  { product: "Widget A", region: "North", revenue: 42000 },
  { product: "Widget A", region: "South", revenue: 38000 },
  { product: "Widget B", region: "North", revenue: 51000 },
  { product: "Widget B", region: "South", revenue: 47000 },
  { product: "Widget C", region: "North", revenue: 29000 },
  { product: "Widget C", region: "South", revenue: 33000 },
];

const totalsByProduct = sales.reduce((acc, row) => {
  acc[row.product] = (acc[row.product] ?? 0) + row.revenue;
  return acc;
}, {});

console.log("Revenue by product:");
for (const [name, total] of Object.entries(totalsByProduct)) {
  console.log(\`  \${name.padEnd(10)} $\${total.toLocaleString()}\`);
}

const top = sales
  .filter((r) => r.revenue >= 40000)
  .map((r) => \`\${r.product} (\${r.region})\`);

console.log("\\nTop performers (>= $40k):");
console.log(top.join(", "));
`,
  },
  {
    key: "async_await",
    title: "Async / Await",
    desc: "Top-level await with Promise.all",
    code: `// User code is wrapped in an async function, so top-level
// \`await\` works.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchThing(name, ms) {
  await wait(ms);
  return { name, loadedInMs: ms };
}

console.log("Loading three things in parallel…");
const start = performance.now();
const results = await Promise.all([
  fetchThing("alpha", 80),
  fetchThing("beta", 40),
  fetchThing("gamma", 120),
]);
const elapsed = (performance.now() - start).toFixed(1);

for (const r of results) {
  console.log(\`  \${r.name}: \${r.loadedInMs}ms\`);
}
console.log(\`\\nTotal wall time: \${elapsed}ms (parallel)\`);
`,
  },
  {
    key: "fetch_csv",
    title: "Fetch CSV from URL",
    desc: "Read a remote CSV with fetch()",
    code: `// raw.githubusercontent.com sends permissive CORS headers, so fetch()
// works directly. User code is wrapped in an async function, so
// top-level await is fine.
const url =
  "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/penguins.csv";
const text = await (await fetch(url)).text();

// Minimal CSV parse — this dataset has no quoted/embedded commas.
const [header, ...rows] = text.trim().split(/\\r?\\n/);
const cols = header.split(",");
const data = rows.map((line) => {
  const cells = line.split(",");
  return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
});

console.log(\`\${data.length} rows × \${cols.length} columns\`);
console.log("columns:", cols.join(", "));
console.log("first 5 rows:", data.slice(0, 5));
`,
  },
  {
    key: "node_modules",
    title: "Node.js Modules",
    desc: "require('path'), require('crypto'), require('os')",
    code: `// almostnode shims Node.js core modules — require() them just
// like in a Node script.
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");

console.log("path.join =>", path.join("/users", "ada", "notes.txt"));
console.log("path.basename =>", path.basename("/users/ada/notes.txt"));

const hash = crypto.createHash("sha256").update("hello").digest("hex");
console.log("sha256('hello') =>", hash);

console.log("platform =>", os.platform());
console.log("EOL bytes =>", JSON.stringify(os.EOL));
`,
  },
  {
    key: "multi_file",
    title: "Multi-File Modules",
    desc: "Split logic across files with require()",
    code: `// utils.js sits alongside this file in the workspace — \`require\`
// resolves it from the VFS. Edit either tab and re-run.
const utils = require("./utils");

console.log(utils.greet("almostnode"));
console.log(utils.shout("multi-file modules just work"));
`,
    files: [
      {
        filename: "utils.js",
        content: `exports.greet = (name) => \`Hello, \${name}!\`;
exports.shout = (s) => s.toUpperCase() + "!";
`,
      },
    ],
    entryFilename: "index.js",
  },
  {
    key: "classes",
    title: "Classes & Iterators",
    desc: "Generator-based iteration",
    code: `class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }
  *[Symbol.iterator]() {
    for (let i = this.start; i < this.end; i += this.step) yield i;
  }
  map(fn) {
    return [...this].map(fn);
  }
}

const r = new Range(0, 10, 2);
console.log("Range:", [...r].join(", "));
console.log("Squared:", r.map((x) => x * x).join(", "));
`,
  },
  {
    key: "json",
    title: "JSON Manipulation",
    desc: "Parse, transform, and stringify",
    code: `const raw = \`[
  {"id": 1, "name": "Ada",   "score": 92},
  {"id": 2, "name": "Linus", "score": 88},
  {"id": 3, "name": "Grace", "score": 95},
  {"id": 4, "name": "Alan",  "score": 81}
]\`;

const people = JSON.parse(raw);
const ranked = people
  .slice()
  .sort((a, b) => b.score - a.score)
  .map((p, idx) => ({ rank: idx + 1, ...p }));

console.log(JSON.stringify(ranked, null, 2));

const avg = people.reduce((s, p) => s + p.score, 0) / people.length;
console.log(\`\\nAverage score: \${avg.toFixed(1)}\`);
`,
  },
  {
    key: "multifile",
    title: "Multi-file Project",
    desc: "require() a helper module alongside index.js",
    code: `const { hello, bye } = require("./greetings");

console.log(hello("JavaScript Playground"));
console.log(bye("JavaScript Playground"));
`,
    files: [
      {
        filename: "greetings.js",
        content: `function hello(name) {
  return \`Hello, \${name}!\`;
}

function bye(name) {
  return \`Goodbye, \${name}!\`;
}

module.exports = { hello, bye };
`,
      },
    ],
    entryFilename: "index.js",
  },
];

const PACKAGES: PackageInfo[] = [
  // No installable packages are surfaced yet — npm package install in
  // the packages drawer is a future feature (see the integration plan
  // in agent-outputs/). almostnode's bundled Node.js shims (`fs`,
  // `path`, `crypto`, …) are always available via require() without
  // any UI plumbing.
];

type WorkerOutMessage =
  | { kind: "ready" }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string }
  | { kind: "stdout"; id: number; content: string }
  | { kind: "stderr"; id: number; content: string }
  | { kind: "done"; id: number };

class JavaScriptWorkerRuntime implements LanguageRuntime {
  private nextId = 0;
    constructor(private worker: Worker) {}

  /** Free the runtime by terminating its worker. Registry-eviction hook —
   *  the instance must not be used after this. */
  dispose(): void {
    this.worker.terminate();
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    const id = ++this.nextId;
    const payload: Array<[string, Uint8Array]> = [];
    for (const [path, bytes] of files) payload.push([path, bytes]);
    return new Promise<void>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind !== "prepare-fs-done" && msg.kind !== "prepare-fs-error") {
          return;
        }
        if (msg.id !== id) return;
        this.worker.removeEventListener("message", onMessage);
        if (msg.kind === "prepare-fs-done") resolve();
        else reject(new Error(msg.message));
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({ kind: "prepare-fs", id, files: payload });
    });
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    const id = ++this.nextId;
    return new Promise<void>((resolve) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind === "stdout" || msg.kind === "stderr") {
          if (msg.id === id) emit({ type: msg.kind, content: msg.content });
          return;
        }
        if (msg.kind === "done" && msg.id === id) {
          this.worker.removeEventListener("message", onMessage);
          resolve();
        }
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({
        kind: "run",
        id,
        code,
        // The Playground passes the active file's path. Falling back
        // to "index.js" preserves single-file behaviour for callers
        // that don't supply options (e.g. tests / legacy bootstraps).
        entryPath: options?.entryFilename ?? "index.js",
      });
    });
  }
}

export const javascriptAdapter: LanguageAdapter = {
  id: "javascript",
  displayName: "JavaScript Playground",
  logoText: "JS",
  documentTitle: "JavaScript Playground",
  readyStatus: "JavaScript ready",
  runtimeInfo: {
    language: "JavaScript",
    version: "ES2023+",
    engine: "almostnode (browser-native Node.js)",
    engineUrl: "https://almostnode.dev/",
    notes:
      "Runs in a Web Worker on top of almostnode — multi-file projects, require(), and 40+ shimmed Node.js modules (fs, path, http, crypto, …) work in the browser.",
  },
  codeMirrorMode: "javascript",
  // web_fmt configured for 2-space indentation (see formatCode) — keep in sync.
  indentWidth: 2,
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "js", label: "JavaScript (.js)", mimeType: "text/javascript" },
    { extension: "mjs", label: "ES Module (.mjs)", mimeType: "text/javascript" },
  ],
  exportBaseFilename: "index",
  defaultFileExtension: "js",
  packagesFooter: (
    <>
      JavaScript runs via{" "}
      <a href="https://almostnode.dev/" target="_blank" rel="noreferrer">
        almostnode
      </a>{" "}
      in a Web Worker. Built-in browser globals (console, fetch, Promise,
      …) are always available, and Node.js core modules can be brought in
      with{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
        require(&apos;node:fs&apos;)
      </code>{" "}
      style imports.
    </>
  ),
  importSnippet: (name) => `const ${name} = require("${name}");`,
  hasImport(code, name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match `require("name")` or `require('name')` anywhere in the file.
    // We don't require the const/let binding so users who write
    // `require("x").doThing()` aren't pestered to insert again.
    const re = new RegExp(`require\\(\\s*["'\`]${escapedName}["'\`]\\s*\\)`);
    return re.test(code);
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getWebFmt();
    return format(code, "script.js", WEB_FMT_2SPACE);
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Starting JavaScript runtime…");
    // The worker is pre-bundled by `scripts/build-almostnode-workers
    // .mjs` to `public/_workers/javascript-worker.js`. We point the
    // Worker constructor at the resulting static URL (not at
    // `new URL("./javascript-worker.ts", import.meta.url)`) so
    // Turbopack never sees the import — Turbopack's worker bundler
    // splits almostnode's ~16 MB tree across many chunks loaded via
    // `importScripts`, where colliding minified top-level identifiers
    // throw `Identifier 'e1' has already been declared` at startup.
    // The pre-bundled file is a single self-contained ES module, so
    // no chunking, no collision, and `{ type: "module" }` is honoured
    // by the browser directly.
    const worker = new Worker("/_workers/javascript-worker.js", {
      type: "module",
    });
    return new Promise<LanguageRuntime>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        if (ev.data.kind === "ready") {
          worker.removeEventListener("message", onMessage);
          resolve(new JavaScriptWorkerRuntime(worker));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (ev) => {
        worker.removeEventListener("message", onMessage);
        reject(new Error(ev.message || "JavaScript worker failed to start"));
      });
    });
  },
};
