import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";

// Run C in the browser via @wasmer/sdk + the `clang/clang` package
// from the Wasmer registry. The user's source is written into a
// virtual filesystem mounted at `/home`, clang compiles it to a
// WASI-targeted `.wasm`, then we re-load that binary as a fresh
// Wasmer module and execute it via `runWasix`.
//
// The Wasmer SDK uses a Web Worker threadpool backed by
// `SharedArrayBuffer`, which means the document hosting this
// playground must be cross-origin-isolated. The `/c` route gets the
// required COOP/COEP headers from `next.config.ts`.

const WASMER_SDK_VERSION = "0.10.0";
const WASMER_SDK_CDN = `https://cdn.jsdelivr.net/npm/@wasmer/sdk@${WASMER_SDK_VERSION}/dist`;

// Narrow shape of the @wasmer/sdk module we consume. The SDK ships its
// own `.d.ts`, but we import it dynamically (it touches `Worker` /
// `SharedArrayBuffer` at module init time) so we describe just the
// pieces we actually use here.
type DirectoryInit = Record<string, string | Uint8Array>;
interface WasmerDirectory {
  writeFile(path: string, contents: string | Uint8Array): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
}
interface WasmerOutput {
  code: number;
  ok: boolean;
  stdout: string;
  stderr: string;
}
interface WasmerInstance {
  wait(): Promise<WasmerOutput>;
}
interface WasmerCommand {
  run(options?: WasmerSpawnOptions): Promise<WasmerInstance>;
}
interface WasmerSpawnOptions {
  args?: string[];
  env?: Record<string, string>;
  mount?: Record<string, DirectoryInit | WasmerDirectory>;
  cwd?: string;
}
interface WasmerPackage {
  readonly entrypoint?: WasmerCommand;
  readonly commands: Record<string, WasmerCommand>;
}
interface WasmerSdk {
  init(options?: {
    module?: URL | string;
    workerUrl?: URL | string;
    log?: string;
  }): Promise<unknown>;
  Wasmer: {
    fromRegistry(specifier: string): Promise<WasmerPackage>;
    fromWasm(binary: Uint8Array): WasmerPackage;
  };
  Directory: new (init?: DirectoryInit) => WasmerDirectory;
}

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "printf, math.h constants, formatted output",
    code: `#include <stdio.h>
#include <math.h>

int main(void) {
    printf("Hello, C Playground!\\n");
    printf("Compiled with clang -> WebAssembly, run in your browser.\\n\\n");

    printf("M_PI ~= %.10f\\n", M_PI);
    printf("M_E  ~= %.10f\\n\\n", M_E);

    for (int i = 1; i <= 5; ++i) {
        printf("  %d:", i);
        for (int j = 0; j < i; ++j) printf(" *");
        printf("\\n");
    }

    return 0;
}
`,
  },
  {
    key: "arrays",
    title: "Arrays & Pointers",
    desc: "Sort an array of structs with qsort",
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char name[16];
    int  score;
} Student;

static int by_score_desc(const void *a, const void *b) {
    const Student *sa = a, *sb = b;
    return sb->score - sa->score;
}

int main(void) {
    Student class[] = {
        {"Ada",   92},
        {"Linus", 88},
        {"Grace", 95},
        {"Alan",  81},
        {"Edsger", 90},
    };
    size_t n = sizeof class / sizeof class[0];

    qsort(class, n, sizeof(Student), by_score_desc);

    printf("Rank  Name      Score\\n");
    printf("----  --------  -----\\n");
    for (size_t i = 0; i < n; ++i) {
        printf(" %2zu   %-8s    %3d\\n", i + 1, class[i].name, class[i].score);
    }

    long sum = 0;
    for (size_t i = 0; i < n; ++i) sum += class[i].score;
    printf("\\nAverage: %.1f\\n", (double)sum / (double)n);

    return 0;
}
`,
  },
  {
    key: "strings",
    title: "String Manipulation",
    desc: "Word & letter frequency without any libraries",
    code: `#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main(void) {
    const char *text =
        "the quick brown fox jumps over the lazy dog "
        "pack my box with five dozen liquor jugs";

    int counts[26] = {0};
    for (const char *p = text; *p; ++p) {
        unsigned char c = (unsigned char)*p;
        if (isalpha(c)) counts[tolower(c) - 'a']++;
    }

    printf("Letter histogram:\\n");
    for (int i = 0; i < 26; ++i) {
        if (counts[i] == 0) continue;
        printf("  %c: ", 'a' + i);
        for (int j = 0; j < counts[i]; ++j) putchar('#');
        printf(" %d\\n", counts[i]);
    }

    return 0;
}
`,
  },
  {
    key: "fib",
    title: "Recursion",
    desc: "Recursive vs iterative Fibonacci",
    code: `#include <stdio.h>

static long fib_rec(int n) {
    if (n < 2) return n;
    return fib_rec(n - 1) + fib_rec(n - 2);
}

static long fib_iter(int n) {
    long a = 0, b = 1;
    for (int i = 0; i < n; ++i) {
        long t = a + b;
        a = b;
        b = t;
    }
    return a;
}

int main(void) {
    printf("  n  rec        iter\\n");
    printf("  -  ---------  ---------\\n");
    for (int n = 0; n <= 20; ++n) {
        printf(" %2d  %9ld  %9ld\\n", n, fib_rec(n), fib_iter(n));
    }
    return 0;
}
`,
  },
  {
    key: "pointers",
    title: "Pointers & Heap",
    desc: "malloc / free with a small linked list",
    code: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

static Node *prepend(Node *head, int v) {
    Node *n = malloc(sizeof *n);
    if (!n) { perror("malloc"); exit(1); }
    n->value = v;
    n->next  = head;
    return n;
}

static void print_list(const Node *head) {
    for (const Node *n = head; n; n = n->next) {
        printf("%d%s", n->value, n->next ? " -> " : "\\n");
    }
}

static void free_list(Node *head) {
    while (head) {
        Node *next = head->next;
        free(head);
        head = next;
    }
}

int main(void) {
    Node *head = NULL;
    for (int i = 1; i <= 5; ++i) head = prepend(head, i * i);

    printf("List (head -> tail): ");
    print_list(head);

    free_list(head);
    return 0;
}
`,
  },
];

const PACKAGES: PackageInfo[] = [
  // Highlights from the C standard library — always available, no
  // install step. Clicking inserts the corresponding `#include` at the
  // top of the editor.
  { cat: "I/O", icon: "🖨️", color: "#facc15", name: "stdio.h", ver: "C99", desc: "printf, scanf, fopen, fread, fwrite, ..." },
  { cat: "Memory", icon: "📦", color: "#34d399", name: "stdlib.h", ver: "C99", desc: "malloc / free, qsort, atoi, exit, rand." },
  { cat: "Strings", icon: "🔤", color: "#fb923c", name: "string.h", ver: "C99", desc: "memcpy, memset, strlen, strcmp, strcpy, ..." },
  { cat: "Strings", icon: "🔠", color: "#fb923c", name: "ctype.h", ver: "C99", desc: "isalpha, isdigit, tolower, toupper, ..." },
  { cat: "Math", icon: "🎲", color: "#60a5fa", name: "math.h", ver: "C99", desc: "sin, cos, sqrt, pow, log, M_PI, M_E." },
  { cat: "Math", icon: "🔢", color: "#60a5fa", name: "stdint.h", ver: "C99", desc: "Fixed-width integer types: int32_t, uint64_t, ..." },
  { cat: "Math", icon: "✅", color: "#60a5fa", name: "stdbool.h", ver: "C99", desc: "The bool, true, and false macros." },
  { cat: "Time", icon: "📅", color: "#a78bfa", name: "time.h", ver: "C99", desc: "time, clock, strftime, struct tm." },
  { cat: "Diagnostics", icon: "🛑", color: "#f472b6", name: "assert.h", ver: "C99", desc: "assert(condition) for runtime checks." },
  { cat: "Diagnostics", icon: "❗", color: "#f472b6", name: "errno.h", ver: "C99", desc: "errno + perror for system error reporting." },
];

class CRuntime implements LanguageRuntime {
  constructor(
    private sdk: WasmerSdk,
    private clang: WasmerPackage,
  ) {}

  async run(code: string, emit: EmitOutput): Promise<void> {
    // Locate the clang command in the package. `clang/clang` exposes
    // its compiler as the package entrypoint, but we also fall back to
    // a named "clang" command so this keeps working if the package
    // layout changes upstream.
    const clangCmd =
      this.clang.commands["clang"] ?? this.clang.entrypoint;
    if (!clangCmd) {
      emit({
        type: "stderr",
        content: "clang/clang package did not expose a clang command.",
      });
      return;
    }

    // Each run gets a fresh virtual filesystem so leftover artifacts
    // from a previous compilation don't bleed in.
    const home = new this.sdk.Directory();
    await home.writeFile("main.c", code);

    // 1) Compile main.c -> main.wasm with clang targeting WASI.
    const compile = await clangCmd.run({
      args: [
        "--target=wasm32-wasi",
        "-O2",
        "-o",
        "main.wasm",
        "main.c",
      ],
      mount: { "/home": home },
      cwd: "/home",
    });
    const compileResult = await compile.wait();

    if (compileResult.stdout) {
      emit({ type: "stdout", content: compileResult.stdout.replace(/\n+$/, "") });
    }
    if (compileResult.stderr) {
      emit({ type: "stderr", content: compileResult.stderr.replace(/\n+$/, "") });
    }
    if (!compileResult.ok) {
      emit({
        type: "stderr",
        content: `clang exited with code ${compileResult.code}.`,
      });
      return;
    }

    // 2) Read the produced .wasm back out of the mounted directory and
    //    instantiate it as a standalone WASI program.
    let wasmBytes: Uint8Array;
    try {
      wasmBytes = await home.readFile("main.wasm");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      emit({ type: "stderr", content: `Could not read compiled binary: ${msg}` });
      return;
    }

    const program = this.sdk.Wasmer.fromWasm(wasmBytes);
    const programCmd = program.entrypoint;
    if (!programCmd) {
      emit({
        type: "stderr",
        content: "Compiled module has no entrypoint to run.",
      });
      return;
    }

    const runInstance = await programCmd.run({});
    const runResult = await runInstance.wait();

    if (runResult.stdout) {
      emit({ type: "stdout", content: runResult.stdout.replace(/\n+$/, "") });
    }
    if (runResult.stderr) {
      emit({ type: "stderr", content: runResult.stderr.replace(/\n+$/, "") });
    }
    if (!runResult.ok) {
      emit({
        type: "stderr",
        content: `Program exited with code ${runResult.code}.`,
      });
    }
  }
}

// Track init across re-renders so React Strict Mode (or repeated
// navigation back to /c) doesn't try to call the SDK's `init()` twice
// — it throws if invoked more than once per page load.
let sdkInitPromise: Promise<WasmerSdk> | null = null;

async function loadWasmerSdk(): Promise<WasmerSdk> {
  if (sdkInitPromise) return sdkInitPromise;
  sdkInitPromise = (async () => {
    // Dynamic import keeps the SDK out of the SSR bundle — at module
    // init it touches `Worker` and `SharedArrayBuffer`.
    const mod = (await import("@wasmer/sdk")) as unknown as WasmerSdk;
    await mod.init({
      // Resolve the SDK's own `.wasm` and worker bootstrap script
      // against jsDelivr instead of Next.js so we don't have to teach
      // webpack how to emit them. jsDelivr serves both with permissive
      // CORS / CORP headers, which is what COEP=require-corp needs.
      module: new URL(`${WASMER_SDK_CDN}/wasmer_js_bg.wasm`),
      workerUrl: new URL(`${WASMER_SDK_CDN}/index.mjs`),
    });
    return mod;
  })();
  return sdkInitPromise;
}

export const cAdapter: LanguageAdapter = {
  id: "c",
  displayName: "C Playground",
  logoText: "C",
  documentTitle: "C Playground",
  readyStatus: "C ready",
  runtimeInfo: {
    language: "C",
    version: "C17 (clang)",
    engine: "Wasmer + clang/clang",
    engineUrl: "https://wasmer.io/clang/clang",
    notes:
      "C is compiled in your browser by clang (WebAssembly), and the resulting WASI binary is then executed in a sandboxed Wasmer runtime — no server roundtrip.",
  },
  // CodeMirror's clike mode handles C syntax. `text/x-csrc` is the
  // standard MIME alias for C inside that mode.
  codeMirrorMode: "text/x-csrc",
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "c", label: "C source (.c)", mimeType: "text/x-csrc" },
    { extension: "h", label: "C header (.h)", mimeType: "text/x-chdr" },
  ],
  exportBaseFilename: "main",
  packagesFooter: (
    <>
      Headers above are part of the{" "}
      <a
        href="https://en.cppreference.com/w/c/header"
        target="_blank"
        rel="noreferrer"
      >
        C standard library
      </a>{" "}
      and ship with clang&apos;s WASI sysroot — no install step needed.
    </>
  ),
  importSnippet: (name) => `#include <${name}>`,
  hasImport(code, name) {
    // Match `#include <name>` allowing arbitrary whitespace.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`#\\s*include\\s*<\\s*${escaped}\\s*>`).test(code);
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Loading Wasmer SDK…");
    const sdk = await loadWasmerSdk();

    setLoadingMessage("Fetching clang from the Wasmer registry (this can take a moment on first load)…");
    const clang = await sdk.Wasmer.fromRegistry("clang/clang");

    return new CRuntime(sdk, clang);
  },
};
