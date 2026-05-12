import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";
import { getWebFmt } from "./webFmt";

// JavaScript runs natively in the browser — no WebAssembly runtime is
// needed. We wrap user code in an `AsyncFunction` so top-level `await`
// works, and override `console.*` for the duration of the run so we can
// stream output into the playground's output pane.

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

/** Format `console.log`-style argument lists the way browsers/Node do:
 *  primitives via String(), objects via JSON with a fallback to a tag. */
function formatArg(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "function") {
    return value.toString();
  }
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

/** Replacer used to make objects with circular references / non-JSON values
 *  (BigInt, undefined, functions) survive `JSON.stringify`. */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return `${value.toString()}n`;
  if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`;
  if (typeof value === "undefined") return "undefined";
  return value;
}

function formatArgs(args: unknown[]): string {
  return args.map(formatArg).join(" ");
}

class JavaScriptRuntime implements LanguageRuntime {
  async run(code: string, emit: EmitOutput): Promise<void> {
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

    // Build a console proxy that streams into our buffers. We deliberately
    // don't replace the global `console` — instead we pass our proxy in
    // as a parameter so concurrent tabs / unrelated UI logging is
    // unaffected by user code.
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

    // `AsyncFunction` lets user code use top-level `await`. Wrapping in
    // its own scope means user `var`/`let` declarations don't leak onto
    // `globalThis`. We also enable strict mode so implicit-global
    // assignments (`foo = 1` without `var`/`let`) throw instead of
    // silently persisting onto `globalThis` between runs — keeping the
    // playground's "fresh state per execution" guarantee.
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor as new (...args: string[]) => (
      console: typeof sandboxConsole,
    ) => Promise<unknown>;

    try {
      const fn = new AsyncFunction("console", `"use strict";\n${code}`);
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
      "Runs natively in your browser via the AsyncFunction constructor — top-level await is supported.",
  },
  codeMirrorMode: "javascript",
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "js", label: "JavaScript (.js)", mimeType: "text/javascript" },
    { extension: "mjs", label: "ES Module (.mjs)", mimeType: "text/javascript" },
  ],
  exportBaseFilename: "script",
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
    setLoadingMessage("Preparing JavaScript runtime…");
    return new JavaScriptRuntime();
  },
};
