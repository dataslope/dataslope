import type {
  EmitOutput,
  ExampleSnippet,
  EntryFileInfo,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
} from "../types";
import { getClangFormat } from "./clangFormat";

// C runs inside a dedicated Web Worker via browsercc — see browsercc-worker.ts.

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
  {
    key: "multifile",
    title: "Multi-file Project",
    desc: "Split helpers into a header + source file alongside main.c",
    code: `#include <stdio.h>
#include "mathx.h"

int main(void) {
    int a = 6, b = 7;
    printf("add(%d, %d) = %d\\n", a, b, add(a, b));
    printf("mul(%d, %d) = %d\\n", a, b, mul(a, b));
    return 0;
}
`,
    files: [
      {
        filename: "mathx.h",
        content: `#ifndef MATHX_H
#define MATHX_H

int add(int a, int b);
int mul(int a, int b);

#endif
`,
      },
      {
        filename: "mathx.c",
        content: `#include "mathx.h"

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }
`,
      },
    ],
    entryFilename: "main.c",
  },
];

/** Detect whether a C source file declares a `main()` function. */
function hasCMain(source: string): boolean {
  const cleaned = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
  return /\bint\s+main\s*\(/.test(cleaned);
}

const PACKAGES: PackageInfo[] = [
  // Highlights from the C standard library — always available, no
  // install step. Clicking inserts the corresponding `#include` at the
  // top of the editor.
  {
    cat: "I/O",
    icon: "🖨️",
    color: "#facc15",
    name: "stdio.h",
    ver: "C99",
    desc: "printf, scanf, fopen, fread, fwrite, ...",
    example: `#include <stdio.h>

int main(void) {
    printf("Hello, %s! %d squared = %d\\n", "stdio", 7, 7 * 7);
    return 0;
}
`,
  },
  {
    cat: "Memory",
    icon: "📦",
    color: "#34d399",
    name: "stdlib.h",
    ver: "C99",
    desc: "malloc / free, qsort, atoi, exit, rand.",
    example: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *xs = malloc(4 * sizeof(int));
    for (int i = 0; i < 4; i++) xs[i] = (i + 1) * 10;
    for (int i = 0; i < 4; i++) printf("xs[%d] = %d\\n", i, xs[i]);
    free(xs);
    return 0;
}
`,
  },
  {
    cat: "Strings",
    icon: "🔤",
    color: "#fb923c",
    name: "string.h",
    ver: "C99",
    desc: "memcpy, memset, strlen, strcmp, strcpy, ...",
    example: `#include <stdio.h>
#include <string.h>

int main(void) {
    char dst[32];
    strcpy(dst, "hello");
    strcat(dst, ", world!");
    printf("%s (length %zu)\\n", dst, strlen(dst));
    return 0;
}
`,
  },
  {
    cat: "Strings",
    icon: "🔠",
    color: "#fb923c",
    name: "ctype.h",
    ver: "C99",
    desc: "isalpha, isdigit, tolower, toupper, ...",
    example: `#include <stdio.h>
#include <ctype.h>

int main(void) {
    const char *s = "Hello123";
    for (const char *p = s; *p; p++) {
        printf("%c: alpha=%d digit=%d upper=%c\\n",
               *p, isalpha((unsigned char)*p),
               isdigit((unsigned char)*p),
               toupper((unsigned char)*p));
    }
    return 0;
}
`,
  },
  {
    cat: "Math",
    icon: "🎲",
    color: "#60a5fa",
    name: "math.h",
    ver: "C99",
    desc: "sin, cos, sqrt, pow, log, M_PI, M_E.",
    example: `#include <stdio.h>
#include <math.h>

int main(void) {
    printf("pi  = %.6f\\n", M_PI);
    printf("sqrt(2) = %.6f\\n", sqrt(2.0));
    printf("sin(pi/2) = %.6f\\n", sin(M_PI / 2));
    return 0;
}
`,
  },
  {
    cat: "Math",
    icon: "🔢",
    color: "#60a5fa",
    name: "stdint.h",
    ver: "C99",
    desc: "Fixed-width integer types: int32_t, uint64_t, ...",
    example: `#include <stdio.h>
#include <stdint.h>
#include <inttypes.h>

int main(void) {
    int32_t  a = -2147483648;
    uint64_t b = 18000000000000000000ULL;
    printf("a = %" PRId32 "\\n", a);
    printf("b = %" PRIu64 "\\n", b);
    return 0;
}
`,
  },
  {
    cat: "Math",
    icon: "✅",
    color: "#60a5fa",
    name: "stdbool.h",
    ver: "C99",
    desc: "The bool, true, and false macros.",
    example: `#include <stdio.h>
#include <stdbool.h>

bool is_even(int n) { return n % 2 == 0; }

int main(void) {
    for (int i = 0; i < 5; i++) {
        printf("%d is %s\\n", i, is_even(i) ? "even" : "odd");
    }
    return 0;
}
`,
  },
  {
    cat: "Time",
    icon: "📅",
    color: "#a78bfa",
    name: "time.h",
    ver: "C99",
    desc: "time, clock, strftime, struct tm.",
    example: `#include <stdio.h>
#include <time.h>

int main(void) {
    time_t now = time(NULL);
    struct tm *t = gmtime(&now);
    char buf[64];
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S UTC", t);
    printf("Now: %s\\n", buf);
    return 0;
}
`,
  },
  {
    cat: "Diagnostics",
    icon: "🛑",
    color: "#f472b6",
    name: "assert.h",
    ver: "C99",
    desc: "assert(condition) for runtime checks.",
    example: `#include <stdio.h>
#include <assert.h>

int divide(int a, int b) {
    assert(b != 0 && "denominator must be non-zero");
    return a / b;
}

int main(void) {
    printf("10 / 2 = %d\\n", divide(10, 2));
    return 0;
}
`,
  },
  {
    cat: "Diagnostics",
    icon: "❗",
    color: "#f472b6",
    name: "errno.h",
    ver: "C99",
    desc: "errno + perror for system error reporting.",
    example: `#include <stdio.h>
#include <errno.h>
#include <string.h>

int main(void) {
    FILE *f = fopen("/no/such/file", "r");
    if (!f) {
        printf("fopen failed: errno=%d (%s)\\n", errno, strerror(errno));
    }
    return 0;
}
`,
  },
];

// ─── Worker-based runtime ────────────────────────────────────────────────

type WorkerOutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  // C never triggers the PCH wait (C++-only), but the shared browsercc
  // worker's message union includes it — keep the type accurate.
  | { kind: "run-status"; id: number; message: string; preparing: boolean }
  | { kind: "output"; id: number; cell: { type: string; content: string } }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string };

class CWorkerRuntime implements LanguageRuntime {
  private nextId = 0;
  /** Staged workspace files (path → text content). Populated by
   *  `prepareFileSystem` before each run so other `.c`/`.h` files in
   *  the workspace are available to the compiler. */
  private stagedFiles: Map<string, string> = new Map();

  constructor(private worker: Worker) {}

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    this.stagedFiles = new Map();
    for (const [path, bytes] of files) {
      // Only stage C source and header files for the compiler VFS.
      if (path.endsWith(".c") || path.endsWith(".h")) {
        this.stagedFiles.set(path, decoder.decode(bytes));
      }
    }
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    const id = ++this.nextId;
    // Pick the entry translation unit. The Playground passes the chosen
    // entry filename via `options.entryFilename` (e.g. "main2.c") when
    // the user clicks "Run" on a non-active tab; in that case we must
    // compile the staged copy of that file because `code` (the active
    // editor's doc) belongs to a different translation unit.
    //
    // When `options.entryFilename` is not provided (CodeBlock, single-
    // file ChallengeCard runs) we ALWAYS use `code` as the authoritative
    // entry source. Reading from `stagedFiles` here would pick up stale
    // content from a previous ChallengeCard/Playground run on the same
    // shared per-page runtime.
    const explicitEntry = options?.entryFilename;
    const entry = explicitEntry ?? "main.c";
    const source = explicitEntry
      ? (this.stagedFiles.get(entry) ?? code)
      : code;
    // All other staged files (non-entry-point) are provided as extra
    // files so the compiler can resolve #include "..." directives and
    // compile additional translation units. Only forward staged files
    // when the caller explicitly opted into multi-file mode by passing
    // an entry filename — otherwise stale staged files from a prior
    // ChallengeCard/Playground run on the same shared runtime could
    // pollute the build.
    const files: Array<[string, string]> = [];
    if (explicitEntry) {
      for (const [path, content] of this.stagedFiles) {
        if (path !== entry) files.push([path, content]);
      }
    }
    return new Promise<void>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind !== "output" && msg.kind !== "done" && msg.kind !== "error") return;
        if (msg.id !== id) return;
        if (msg.kind === "output") {
          emit(msg.cell as Parameters<EmitOutput>[0]);
          return;
        }
        this.worker.removeEventListener("message", onMessage);
        if (msg.kind === "done") resolve();
        else reject(new Error(msg.message));
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({ kind: "run", id, code: source, language: "c", files });
    });
  }
}


export const cAdapter: LanguageAdapter = {
  id: "c",
  displayName: "C Playground",
  logoText: "C",
  documentTitle: "C Playground",
  readyStatus: "C ready",
  runtimeInfo: {
    language: "C",
    version: "17 (201710L)",
    engine: "browsercc (clang + lld + WASI sysroot)",
    engineUrl: "https://github.com/BertalanD/browsercc",
    notes:
      "C is compiled in your browser by a precompiled clang/lld toolchain (browsercc), and the resulting WASI binary is then executed with @bjorn3/browser_wasi_shim — no server roundtrip.",
  },
  // CodeMirror's clike mode handles C syntax. `text/x-csrc` is the
  // standard MIME alias for C inside that mode.
  codeMirrorMode: "text/x-csrc",
  // clang + lld WASM and the sysroot from jsDelivr, compressed transfer.
  coldDownloadMB: 35,
  // Compiles (clang) on every run, so later runs are faster, not instant.
  compiled: true,
  // clang-format LLVM style (see formatCode) — keep in sync.
  indentWidth: 2,
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "c", label: "C source (.c)", mimeType: "text/x-csrc" },
    { extension: "h", label: "C header (.h)", mimeType: "text/x-chdr" },
  ],
  exportBaseFilename: "main",
  defaultFileExtension: "c",
  findEntryFiles(files): EntryFileInfo[] {
    const out: EntryFileInfo[] = [];
    for (const f of files) {
      if (!f.filename.endsWith(".c")) continue;
      if (hasCMain(f.content)) out.push({ filename: f.filename, kind: "main" });
    }
    return out;
  },
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
      and ship with browsercc&apos;s WASI sysroot — no install step needed.
    </>
  ),
  importSnippet: (name) => `#include <${name}>`,
  hasImport(code, name) {
    // Match `#include <name>` allowing arbitrary whitespace.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`#\\s*include\\s*<\\s*${escaped}\\s*>`).test(code);
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getClangFormat();
    return format(code, "main.c", "LLVM");
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Starting C runtime…", 0.02);
    const worker = new Worker(
      new URL("./browsercc-worker.ts", import.meta.url),
    );
    return new Promise<LanguageRuntime>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind === "loading") {
          // The worker's single loading stage covers the clang/lld
          // toolchain download — the bulk of the boot.
          setLoadingMessage(msg.message, 0.1);
        } else if (msg.kind === "ready") {
          worker.removeEventListener("message", onMessage);
          resolve(new CWorkerRuntime(worker));
        } else if (msg.kind === "init-error") {
          worker.removeEventListener("message", onMessage);
          worker.terminate();
          reject(new Error(msg.message));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (ev) => {
        worker.removeEventListener("message", onMessage);
        reject(new Error(ev.message || "C worker failed to start"));
      });
      worker.postMessage({ kind: "init" });
    });
  },
};
