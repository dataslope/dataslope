import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";
import { getWebFmt } from "./webFmt";

// JavaScript runs in a dedicated Web Worker via the AsyncFunction constructor
// so that user code (including top-level `await`) never blocks the UI.
// The worker handles console.* interception and streams stdout/stderr back
// to the main thread via postMessage.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "Basic console output, math & strings",
    code: `// Hello, JavaScript Playground!
console.log("Node-like environment? No — this runs in your browser.");
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
];

const PACKAGES: PackageInfo[] = [
  // JavaScript runs natively in the browser — all standard globals
  // (console, Math, Date, Promise, fetch, etc.) are always available
  // without any import statement, so there are no packages to list here.
];

type WorkerOutMessage =
  | { kind: "ready" }
  | { kind: "stdout"; id: number; content: string }
  | { kind: "stderr"; id: number; content: string }
  | { kind: "done"; id: number };

class JavaScriptWorkerRuntime implements LanguageRuntime {
  private nextId = 0;
  constructor(private worker: Worker) {}

  async run(code: string, emit: EmitOutput): Promise<void> {
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
      this.worker.postMessage({ kind: "run", id, code });
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
    engine: "Native browser",
    engineUrl: "https://developer.mozilla.org/docs/Web/JavaScript",
    notes:
      "Runs in a Web Worker via the AsyncFunction constructor — top-level await is supported and the UI stays responsive while your code executes.",
  },
  codeMirrorMode: "javascript",
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "js", label: "JavaScript (.js)", mimeType: "text/javascript" },
    { extension: "mjs", label: "ES Module (.mjs)", mimeType: "text/javascript" },
  ],
  exportBaseFilename: "script",
  defaultFileExtension: "js",
  entryPoint: "index.js",
  packagesFooter: (
    <>
      JavaScript runs natively in your browser — there&apos;s no extra
      runtime to load. The entries above are{" "}
      <a
        href="https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects"
        target="_blank"
        rel="noreferrer"
      >
        built-in globals
      </a>
      , so they&apos;re always available.
    </>
  ),
  // The "import" affordance doesn't really apply to a sandboxed JS
  // environment with no module loader, so we just drop in a pointer to
  // the global. This keeps the packages-drawer click consistent with
  // the other playgrounds.
  importSnippet: (name) => `// ${name} is a built-in global — no import needed.`,
  hasImport(code, name) {
    // Treat the snippet as "already inserted" if the same hint comment
    // is present, so clicking the package twice doesn't duplicate it.
    return code.includes(
      `// ${name} is a built-in global — no import needed.`,
    );
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getWebFmt();
    return format(code, "script.js");
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Starting JavaScript worker…");
    const worker = new Worker(
      new URL("./javascript-worker.ts", import.meta.url),
    );
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
