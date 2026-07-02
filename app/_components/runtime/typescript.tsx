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
} from "./tsLanguageService";

// TypeScript runs in a dedicated Web Worker (typescript-worker.ts):
//   1. Every .ts/.tsx file in the workspace is transpiled to JavaScript
//      via the official TypeScript compiler.
//   2. The transpiled .js files are staged into almostnode's VirtualFS.
//   3. almostnode's Runtime executes the entry file with CommonJS
//      semantics, so require()/module.exports across files Just Works.
//
// almostnode's resolver doesn't recognise .ts paths, so we do the
// transpile-then-stage dance ourselves rather than handing raw .ts to
// the runtime.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "Types, generics & template literals",
    code: `// Hello, TypeScript Playground!
const greet = (name: string, times: number = 1): void => {
  for (let i = 0; i < times; i++) {
    console.log(\`Hello, \${name}! (\${i + 1}/\${times})\`);
  }
};

greet("TypeScript", 3);

console.log("\\nπ ≈", Math.PI);
console.log("e ≈", Math.E);

const stars: string[] = Array.from({ length: 5 }, (_, i) => "★".repeat(i + 1));
stars.forEach((s, i) => console.log(\`  \${i + 1}: \${s}\`));
`,
  },
  {
    key: "interfaces",
    title: "Interfaces & Generics",
    desc: "Typed data manipulation",
    code: `interface Sale {
  product: string;
  region: "North" | "South" | "East" | "West";
  revenue: number;
}

const sales: Sale[] = [
  { product: "Widget A", region: "North", revenue: 42_000 },
  { product: "Widget A", region: "South", revenue: 38_000 },
  { product: "Widget B", region: "North", revenue: 51_000 },
  { product: "Widget B", region: "South", revenue: 47_000 },
  { product: "Widget C", region: "East",  revenue: 29_000 },
  { product: "Widget C", region: "West",  revenue: 33_000 },
];

function groupBy<T, K extends string | number>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

const byProduct = groupBy(sales, (s) => s.product);
for (const [product, rows] of Object.entries(byProduct)) {
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  console.log(\`\${product.padEnd(10)} $\${total.toLocaleString()}\`);
}
`,
  },
  {
    key: "discriminated_unions",
    title: "Discriminated Unions",
    desc: "Exhaustive switch over a tagged union",
    code: `type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rect":
      return shape.width * shape.height;
    case "triangle":
      return (shape.base * shape.height) / 2;
    default: {
      // \`never\` enforces exhaustiveness at compile time.
      const _exhaustive: never = shape;
      throw new Error(\`Unhandled shape \${JSON.stringify(_exhaustive)}\`);
    }
  }
}

const shapes: Shape[] = [
  { kind: "circle", radius: 3 },
  { kind: "rect", width: 4, height: 5 },
  { kind: "triangle", base: 6, height: 4 },
];

shapes.forEach((s) => {
  console.log(\`\${s.kind.padEnd(8)} area = \${area(s).toFixed(3)}\`);
});
`,
  },
  {
    key: "async",
    title: "Async / Await",
    desc: "Typed promises with top-level await",
    code: `interface Resource<T> {
  name: string;
  data: T;
  loadedInMs: number;
}

const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

async function load<T>(name: string, ms: number, data: T): Promise<Resource<T>> {
  await wait(ms);
  return { name, data, loadedInMs: ms };
}

console.log("Loading three resources in parallel…");
const start = performance.now();
const results = await Promise.all([
  load("alpha", 80, [1, 2, 3]),
  load("beta", 40, { ok: true }),
  load("gamma", 120, "payload"),
]);
const elapsed = (performance.now() - start).toFixed(1);

for (const r of results) {
  console.log(\`  \${r.name}: \${r.loadedInMs}ms — \${JSON.stringify(r.data)}\`);
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
const text: string = await (await fetch(url)).text();

// Minimal CSV parse — this dataset has no quoted/embedded commas.
const [header, ...rows] = text.trim().split(/\\r?\\n/);
const cols: string[] = header.split(",");

type Penguin = Record<string, string>;
const data: Penguin[] = rows.map((line) => {
  const cells = line.split(",");
  return Object.fromEntries(cols.map((c, i) => [c, cells[i]])) as Penguin;
});

console.log(\`\${data.length} rows × \${cols.length} columns\`);
console.log("columns:", cols.join(", "));
console.log("first 5 rows:", data.slice(0, 5));
`,
  },
  {
    key: "node_modules",
    title: "Node.js Modules",
    desc: "Typed access to crypto, path, os",
    code: `// almostnode shims Node.js core modules. We import via require()
// so types come from declaration merging at runtime — the TS compiler
// emits this exactly as written.
const path: typeof import("node:path") = require("node:path");
const crypto: typeof import("node:crypto") = require("node:crypto");
const os: typeof import("node:os") = require("node:os");

console.log("join =>", path.join("/users", "ada", "notes.txt"));
console.log("basename =>", path.basename("/users/ada/notes.txt"));

const hash: string = crypto.createHash("sha256").update("hello").digest("hex");
console.log("sha256('hello') =>", hash);

console.log("platform =>", os.platform());
`,
  },
  {
    key: "multi_file",
    title: "Multi-File Modules",
    desc: "Split logic across .ts files",
    code: `// utils.ts sits alongside this file in the workspace — the import
// resolves through almostnode's VirtualFS via TypeScript's CommonJS
// emit. Edit either tab and re-run.
import { greet, shout } from "./utils";

console.log(greet("almostnode"));
console.log(shout("multi-file TypeScript just works"));
`,
    files: [
      {
        filename: "utils.ts",
        content: `export const greet = (name: string): string => \`Hello, \${name}!\`;
export const shout = (s: string): string => s.toUpperCase() + "!";
`,
      },
    ],
    entryFilename: "index.ts",
  },
  {
    key: "utility_types",
    title: "Utility Types",
    desc: "Pick / Omit / Record in action",
    code: `interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

type PublicUser = Omit<User, "passwordHash">;
type UserSummary = Pick<User, "id" | "name">;
type UsersById = Record<number, PublicUser>;

const users: User[] = [
  { id: 1, name: "Ada",   email: "ada@example.com",   passwordHash: "***", createdAt: new Date("2024-01-15") },
  { id: 2, name: "Linus", email: "linus@example.com", passwordHash: "***", createdAt: new Date("2024-02-08") },
  { id: 3, name: "Grace", email: "grace@example.com", passwordHash: "***", createdAt: new Date("2024-03-22") },
];

const safe: UsersById = users.reduce<UsersById>((acc, u) => {
  const { passwordHash: _ph, ...pub } = u;
  acc[u.id] = pub;
  return acc;
}, {});

const summaries: UserSummary[] = users.map(({ id, name }) => ({ id, name }));

console.log("Summaries:", JSON.stringify(summaries));
console.log("\\nFirst safe user:");
console.log(JSON.stringify(safe[1], null, 2));
`,
  },
  {
    key: "multifile",
    title: "Multi-file Project",
    desc: "Import a typed helper module alongside index.ts",
    code: `import { hello, bye } from "./greetings";

console.log(hello("TypeScript Playground"));
console.log(bye("TypeScript Playground"));
`,
    files: [
      {
        filename: "greetings.ts",
        content: `export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}

export function bye(name: string): string {
  return \`Goodbye, \${name}!\`;
}
`,
      },
    ],
    entryFilename: "index.ts",
  },
];

const PACKAGES: PackageInfo[] = [
  // npm package installation through the packages drawer is a future
  // feature. Node.js core modules (fs, path, crypto, …) are reachable
  // via require() out of the box thanks to almostnode's shims.
];

type WorkerOutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string }
  | { kind: "stdout"; id: number; content: string }
  | { kind: "stderr"; id: number; content: string }
  | { kind: "done"; id: number };

class TypeScriptWorkerRuntime implements LanguageRuntime {
  private nextId = 0;
  // Text files from the last `prepareFileSystem` snapshot — cross-file
  // context for the language-service completions (imports of sibling
  // workspace files resolve against these).
  private stagedText = new Map<string, string>();

  constructor(private worker: Worker) {}

  /** Intellisense via the shared TS language service worker — separate
   *  from the execution worker so analysis never queues behind a
   *  long-running user program. */
  async complete(request: CompletionRequest): Promise<CompletionResult> {
    return completeWithTsService(
      buildTsCompletionRequest(
        this.stagedText,
        request.doc,
        request.filename,
        "index.ts",
        request.offset,
      ),
    );
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
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
        // to "index.ts" preserves single-file behaviour for callers
        // that don't supply options.
        entryPath: options?.entryFilename ?? "index.ts",
      });
    });
  }
}

export const typescriptAdapter: LanguageAdapter = {
  id: "typescript",
  displayName: "TypeScript Playground",
  logoText: "TS",
  documentTitle: "TypeScript Playground",
  readyStatus: "TypeScript ready",
  runtimeInfo: {
    language: "TypeScript",
    version: "5.7",
    engine: "TypeScript 5.7 → almostnode (browser-native Node.js)",
    engineUrl: "https://almostnode.dev/",
    notes:
      "Code is transpiled in a Web Worker by the official TypeScript compiler, then executed by almostnode. Multi-file projects, require(), and 40+ shimmed Node.js modules (fs, path, http, crypto, …) work in the browser.",
  },
  // CodeMirror v5 exposes TypeScript via the `text/typescript` MIME alias.
  codeMirrorMode: "text/typescript",
  // web_fmt configured for 2-space indentation (see formatCode) — keep in sync.
  indentWidth: 2,
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "ts", label: "TypeScript (.ts)", mimeType: "text/typescript" },
  ],
  exportBaseFilename: "index",
  defaultFileExtension: "ts",
  packagesFooter: (
    <>
      Code is transpiled in-browser by the official{" "}
      <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
        TypeScript compiler
      </a>{" "}
      and executed by{" "}
      <a href="https://almostnode.dev/" target="_blank" rel="noreferrer">
        almostnode
      </a>
      . Type-checking is <em>syntactic-only</em> (the equivalent of{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
        tsc --isolatedModules
      </code>
      ), so cross-file type errors aren&apos;t reported.
    </>
  ),
  importSnippet: (name) => `import * as ${name} from "${name}";`,
  hasImport(code, name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match either an ES `import ... from "name"` or a CJS
    // `require("name")` so users with either style aren't pestered.
    const importRe = new RegExp(
      `(^|\\n)\\s*import[^;]*from\\s*["'\`]${escapedName}["'\`]`,
    );
    const requireRe = new RegExp(
      `require\\(\\s*["'\`]${escapedName}["'\`]\\s*\\)`,
    );
    return importRe.test(code) || requireRe.test(code);
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getWebFmt();
    return format(code, "script.ts", WEB_FMT_2SPACE);
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Starting TypeScript runtime…");
    // Pre-bundled by `scripts/build-almostnode-workers.mjs`; see
    // javascript.tsx for the rationale (Turbopack's worker bundler
    // chunks almostnode's tree and load-collides on minified
    // identifiers, so we route around it with a static URL).
    const worker = new Worker("/_workers/typescript-worker.js", {
      type: "module",
    });
    return new Promise<LanguageRuntime>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind === "loading") {
          setLoadingMessage(msg.message);
        } else if (msg.kind === "ready") {
          worker.removeEventListener("message", onMessage);
          resolve(new TypeScriptWorkerRuntime(worker));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (ev) => {
        worker.removeEventListener("message", onMessage);
        reject(new Error(ev.message || "TypeScript worker failed to start"));
      });
    });
  },
};
