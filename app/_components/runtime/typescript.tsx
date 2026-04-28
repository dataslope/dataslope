import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";

// TypeScript runs in a two-step pipeline:
//   1. Use the official TypeScript compiler API (loaded dynamically from
//      the `typescript` npm package) to transpile the user's source down
//      to ES2022 JavaScript. We deliberately stick to `transpileModule`
//      so we get the same behaviour as `tsc --isolatedModules` — no
//      cross-file type-checking is needed for a single-file playground.
//   2. Hand the resulting JS to an `AsyncFunction` so top-level `await`
//      works, with `console.*` overridden so output streams into the
//      playground's output pane.
//
// TypeScript's bundle is ~10MB unminified, so we lazy-load it on the
// first run via dynamic import — that keeps the playground UI from
// having to wait on it during the initial page load.

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
];

const PACKAGES: PackageInfo[] = [
  // TypeScript is transpiled in-browser by the official TypeScript
  // compiler, then executed natively. All standard browser globals
  // (console, Math, Date, Promise, fetch, etc.) are always available
  // without any import statement, so there are no packages to list here.
];

function formatArg(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "function") return value.toString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, jsonReplacer, 2);
    } catch {
      try {
        return String(value);
      } catch {
        return "[object]";
      }
    }
  }
  if (typeof value === "bigint") return `${value.toString()}n`;
  return String(value);
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return `${value.toString()}n`;
  if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`;
  if (typeof value === "undefined") return "undefined";
  return value;
}

function formatArgs(args: unknown[]): string {
  return args.map(formatArg).join(" ");
}

/** Minimal slice of the `typescript` module surface we use. Declaring
 *  it locally keeps the import boundary explicit and means downstream
 *  TS users of this file aren't forced to take a `typescript` type
 *  dependency. */
interface TsCompilerModule {
  transpileModule(
    input: string,
    options: {
      compilerOptions: Record<string, unknown>;
      reportDiagnostics?: boolean;
      fileName?: string;
    },
  ): {
    outputText: string;
    diagnostics?: Array<{
      messageText: string | { messageText: string };
      category: number;
    }>;
  };
  ScriptTarget: { ES2022: number };
  ModuleKind: { ESNext: number };
  JsxEmit: { Preserve: number };
  flattenDiagnosticMessageText(
    diag: string | { messageText: string } | undefined,
    newLine: string,
  ): string;
}

class TypeScriptRuntime implements LanguageRuntime {
  constructor(private ts: TsCompilerModule) {}

  async run(code: string, emit: EmitOutput): Promise<void> {
    // 1) Transpile TS → JS. transpileModule does syntactic-only checks,
    // which is the right trade-off for a single-file playground.
    let outputText: string;
    try {
      const result = this.ts.transpileModule(code, {
        compilerOptions: {
          target: this.ts.ScriptTarget.ES2022,
          module: this.ts.ModuleKind.ESNext,
          // Allow top-level `await` in the generated JS so user code
          // can use it without wrapping it in an IIFE.
          isolatedModules: true,
          esModuleInterop: true,
          allowJs: true,
          strict: false,
          // Keep the output clean — strip type-only constructs.
          removeComments: false,
        },
        reportDiagnostics: true,
        fileName: "playground.ts",
      });

      const diagnostics = result.diagnostics ?? [];
      const errors = diagnostics
        .map((d) => this.ts.flattenDiagnosticMessageText(d.messageText, "\n"))
        .filter(Boolean);
      if (errors.length > 0) {
        emit({
          type: "stderr",
          content: errors.map((m) => `TS: ${m}`).join("\n"),
        });
      }
      outputText = result.outputText;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: "stderr", content: `TypeScript transpile error: ${message}` });
      return;
    }

    // 2) Execute the transpiled JS in an AsyncFunction with a captured
    // console. This mirrors what the JavaScript playground does.
    let stdoutBuf = "";
    let stderrBuf = "";

    const flushStdout = () => {
      if (stdoutBuf) {
        emit({ type: "stdout", content: stdoutBuf.replace(/\n$/, "") });
        stdoutBuf = "";
      }
    };
    const flushStderr = () => {
      if (stderrBuf) {
        emit({ type: "stderr", content: stderrBuf.replace(/\n$/, "") });
        stderrBuf = "";
      }
    };

    const sandboxConsole = {
      log: (...args: unknown[]) => {
        stdoutBuf += formatArgs(args) + "\n";
      },
      info: (...args: unknown[]) => {
        stdoutBuf += formatArgs(args) + "\n";
      },
      debug: (...args: unknown[]) => {
        stdoutBuf += formatArgs(args) + "\n";
      },
      warn: (...args: unknown[]) => {
        stderrBuf += formatArgs(args) + "\n";
      },
      error: (...args: unknown[]) => {
        stderrBuf += formatArgs(args) + "\n";
      },
      table: (value: unknown) => {
        stdoutBuf += formatArg(value) + "\n";
      },
      dir: (value: unknown) => {
        stdoutBuf += formatArg(value) + "\n";
      },
    };

    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor as new (...args: string[]) => (
      console: typeof sandboxConsole,
    ) => Promise<unknown>;

    try {
      // Prepend "use strict" so implicit-global assignments fail loudly
      // instead of leaking onto `globalThis` between runs — the
      // playground's contract is "fresh state per execution".
      const fn = new AsyncFunction("console", `"use strict";\n${outputText}`);
      const result = await fn(sandboxConsole);
      flushStdout();
      flushStderr();
      if (result !== undefined) {
        emit({ type: "stdout", content: formatArg(result) });
      }
    } catch (err) {
      flushStdout();
      flushStderr();
      const message =
        err instanceof Error
          ? err.stack || `${err.name}: ${err.message}`
          : String(err);
      emit({ type: "stderr", content: message });
    }
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
    engine: "TypeScript compiler (in-browser) + native JS",
    engineUrl: "https://www.typescriptlang.org/",
    notes:
      "Your code is transpiled to JavaScript in the browser using the official TypeScript compiler, then executed natively.",
  },
  // The JS CodeMirror mode handles TypeScript via a typescript flag —
  // CodeMirror v5 exposes that as the `text/typescript` MIME alias.
  codeMirrorMode: "text/typescript",
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "ts", label: "TypeScript (.ts)", mimeType: "text/typescript" },
  ],
  exportBaseFilename: "script",
  packagesFooter: (
    <>
      Code is transpiled in-browser by the official{" "}
      <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer">
        TypeScript compiler
      </a>
      , then executed natively. Type-checking is{" "}
      <em>syntactic-only</em> (the equivalent of{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
        tsc --isolatedModules
      </code>
      ), so cross-file type errors aren&apos;t reported.
    </>
  ),
  importSnippet: (name) => `// ${name} is a built-in global — no import needed.`,
  hasImport(code, name) {
    return code.includes(
      `// ${name} is a built-in global — no import needed.`,
    );
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Loading TypeScript compiler…");
    // Dynamic import keeps the ~10MB compiler out of the initial page
    // bundle — it's only fetched on the first visit to /typescript.
    const tsMod = (await import("typescript")) as unknown as {
      default?: TsCompilerModule;
    } & TsCompilerModule;
    const ts: TsCompilerModule = tsMod.default ?? tsMod;
    setLoadingMessage("Initialising TypeScript runtime…");
    return new TypeScriptRuntime(ts);
  },
};
