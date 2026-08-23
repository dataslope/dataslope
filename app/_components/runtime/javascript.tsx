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
  decodeWorkspaceTextFiles,
  diagnoseWithTsService,
  sourceExcerpt,
} from "./tsLanguageService";

// JavaScript runs in a dedicated Web Worker backed by almostnode (a
// browser-native Node.js runtime): workspace files stage into VirtualFS
// and the entry executes with CommonJS semantics; 40+ Node modules are
// shimmed.

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

// Minimal CSV parse, this dataset has no quoted/embedded commas.
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
    code: `// almostnode shims Node.js core modules, require() them just
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
    code: `// utils.js sits alongside this file in the workspace, \`require\`
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
  // npm install via the drawer is a future feature; almostnode's Node
  // shims are always require()-able.
];

type WorkerOutMessage =
  | { kind: "ready" }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string }
  | {
      kind: "output";
      id: number;
      channel: "stdout" | "stderr";
      content: string;
      seq: number;
      append: boolean;
    }
  | {
      kind: "done";
      id: number;
      error: string | null;
      createdFiles: Array<[string, Uint8Array]>;
    };

class JavaScriptWorkerRuntime implements LanguageRuntime {
  private nextId = 0;
  // Last snapshot's text files: cross-file context for completions.
  private stagedText = new Map<string, string>();
  // Files the last run wrote, handed to the Files panel once collected.
  private createdFiles: Array<[string, Uint8Array]> = [];
  /** Rejects the in-flight `run()` when Stop terminates the worker. */
  private abortActiveRun: ((err: Error) => void) | null = null;
  /** Non-null between the Stop that killed the worker and its replacement
   *  reporting ready; every entry point waits on it. */
  private restartPromise: Promise<void> | null = null;

  constructor(private worker: Worker) {}

  /** Terminate the worker (registry-eviction hook; unusable after). */
  dispose(): void {
    this.worker.terminate();
  }

  /**
   * Stop the running program.
   *
   * A Web Worker is the simplest cancellation story on the site: no
   * interrupt buffer, no cooperative polling — terminate it and stand up a
   * replacement. Whatever the program printed before the Stop stays on
   * screen; the run itself rejects with a RunCancelledError, which the
   * surface renders as "Run stopped.".
   */
  async cancelRun(): Promise<void> {
    if (this.restartPromise) return this.restartPromise;
    const abort = this.abortActiveRun;
    this.abortActiveRun = null;
    this.worker.terminate();
    if (abort) {
      const err = new Error("Run stopped.");
      err.name = "RunCancelledError";
      abort(err);
    }
    this.restartPromise = (async () => {
      try {
        this.worker = await spawnJavaScriptWorker();
      } finally {
        this.restartPromise = null;
      }
    })();
    return this.restartPromise;
  }

  /** Files the program wrote (`fs.writeFileSync`, …), for the Files panel. */
  async collectCreatedFiles(): Promise<Map<string, Uint8Array>> {
    const created = new Map(this.createdFiles);
    this.createdFiles = [];
    return created;
  }

  /** Intellisense via the shared TS language service worker, separate from
   *  execution so analysis never queues behind a running user program. */
  async complete(request: CompletionRequest): Promise<CompletionResult> {
    return completeWithTsService({
      ...buildTsCompletionRequest(
        this.stagedText,
        request.doc,
        request.filename,
        "index.js",
        request.offset,
      ),
      // Node globals and the shimmed modules, not the DOM: `process` and
      // `require` exist here, `document` and `alert` do not.
      env: "node",
    });
  }

  /**
   * A parse error with the location V8 does not give us.
   *
   * `eval`-compiled code reports a SyntaxError with no file, line or column
   * at all, so the message alone leaves a multi-file project with nothing to
   * go on. The language service parses the same file and knows exactly where
   * it stopped; V8's wording is kept because it is the better description.
   */
  private async locateSyntaxError(
    message: string,
    code: string,
    entry: string,
  ): Promise<string> {
    const diagnostics = await diagnoseWithTsService({
      files: [[entry, code]],
      entry,
      // Plain JavaScript has no types to check; only the parse matters.
      env: "node",
      semantic: false,
      timeoutMs: 3000,
    });
    const first = diagnostics[0];
    if (!first) return message;
    const excerpt = sourceExcerpt(code, first.line, first.column);
    const location = `${entry}:${first.line}:${first.column}`;
    return excerpt ? `${location} - ${message}\n${excerpt}` : `${location} - ${message}`;
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    if (this.restartPromise) await this.restartPromise;
    this.stagedText = decodeWorkspaceTextFiles(files);
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
    // A Stop leaves the runtime rebuilding itself; the next run belongs on
    // the fresh worker, so wait rather than race it.
    if (this.restartPromise) await this.restartPromise;
    const id = ++this.nextId;
    const worker = this.worker;
    // "index.js" preserves single-file behaviour for callers that don't
    // supply options.
    const entryPath = options?.entryFilename ?? "index.js";
    this.createdFiles = [];
    return new Promise<void>((resolve, reject) => {
      const finish = (settle: () => void) => {
        worker.removeEventListener("message", onMessage);
        this.abortActiveRun = null;
        settle();
      };
      // Stop terminates the worker, so no `done` ever arrives for this run:
      // the promise has to be settled from there.
      this.abortActiveRun = (err) => finish(() => reject(err));
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind === "output") {
          if (msg.id === id) {
            emit({ type: msg.channel, content: msg.content }, msg.seq, msg.append);
          }
          return;
        }
        if (msg.kind === "done" && msg.id === id) {
          this.createdFiles = msg.createdFiles;
          const error = msg.error;
          if (!error) {
            finish(resolve);
            return;
          }
          // A parse error is the one failure whose location the runtime
          // cannot report; ask the parser before giving up on it.
          if (error.startsWith("SyntaxError")) {
            const located = this.locateSyntaxError(error, code, entryPath);
            finish(() => {
              void located.then(
                (message) => reject(new Error(message)),
                () => reject(new Error(error)),
              );
            });
            return;
          }
          finish(() => reject(new Error(error)));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage({ kind: "run", id, code, entryPath });
    });
  }
}

/** Spawn the pre-bundled worker and resolve once it reports ready. Shared
 *  by the first boot and by the respawn a Stop triggers. */
function spawnJavaScriptWorker(): Promise<Worker> {
  // Pre-bundled by scripts/build-almostnode-workers.mjs and loaded via
  // static URL so Turbopack never sees the import: its worker bundler
  // chunks almostnode's ~16 MB tree and colliding minified identifiers
  // throw "Identifier 'e1' has already been declared" at startup.
  const worker = new Worker("/_workers/javascript-worker.js", { type: "module" });
  return new Promise<Worker>((resolve, reject) => {
    const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
      if (ev.data.kind === "ready") {
        worker.removeEventListener("message", onMessage);
        resolve(worker);
      }
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", (ev) => {
      worker.removeEventListener("message", onMessage);
      reject(new Error(ev.message || "JavaScript worker failed to start"));
    });
  });
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
      "Runs in a Web Worker on top of almostnode, multi-file projects, require(), and 40+ shimmed Node.js modules (fs, path, http, crypto, …) work in the browser.",
  },
  codeMirrorMode: "javascript",
  // web_fmt configured for 2-space indentation (see formatCode), keep in sync.
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
    // Match bare `require("name")` too, so `require("x").doThing()` users
    // aren't pestered to insert again.
    const re = new RegExp(`require\\(\\s*["'\`]${escapedName}["'\`]\\s*\\)`);
    return re.test(code);
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getWebFmt();
    return format(code, "script.js", WEB_FMT_2SPACE);
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Starting JavaScript runtime…");
    return new JavaScriptWorkerRuntime(await spawnJavaScriptWorker());
  },
};
