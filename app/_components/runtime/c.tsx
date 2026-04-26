import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";
import {
  loadBrowsercc,
  loadWasiShim,
  runWasiModule,
  type BrowserccApi,
  type WasiShim,
} from "./browsercc";

// Run C in the browser via `browsercc`
// (https://github.com/BertalanD/browsercc), which ships a precompiled
// clang/lld toolchain plus a WASI sysroot (libc, headers) as plain
// static assets. The user's source is handed to browsercc's `compile`,
// which produces a WebAssembly module; we then execute it with
// `@bjorn3/browser_wasi_shim` to capture stdout/stderr.
//
// Browsercc's `compile` infers the language from the input file name's
// extension, so we pass `main.c` here and clang treats the input as C
// (the C++ adapter does the same with `main.cpp`).
//
// Library + WASI-shim loading is centralised in `./browsercc.ts`, and
// the resulting module is a process-wide singleton so navigating
// between `/c` and `/cpp` reuses the same already-fetched ~95 MB
// toolchain instead of re-downloading it.

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

// Compile flags shared across every C run. browsercc invokes the
// underlying compiler as `clang++`, which puts the driver into g++
// mode and would otherwise compile `.c` files as C++ — that breaks
// idiomatic C like the implicit `void*` -> `T*` conversion from
// `malloc`. `--driver-mode=gcc` flips the driver back to plain clang
// so the `.c` extension is honoured and C-only flags are accepted.
// We use `-std=gnu17` (rather than `-std=c17`) so common GNU
// extensions in the standard headers — most visibly `M_PI`, `M_E`
// and friends in `<math.h>` — remain visible to user code.
// `-O2` matches what browsercc's PCH was built against (and produces
// nicer binaries than `-O0` without measurable extra wait), and
// `-Wall` surfaces obvious bugs in the user's snippet.
const C_COMPILE_FLAGS = ["--driver-mode=gcc", "-O2", "-Wall", "-std=gnu17"];

class CRuntime implements LanguageRuntime {
  constructor(
    private api: BrowserccApi,
    private shim: WasiShim,
  ) {}

  async run(code: string, emit: EmitOutput): Promise<void> {
    // 1) Compile main.c -> WebAssembly module via browsercc. The
    //    extension on `fileName` is what tells clang to treat the input
    //    as C (rather than the default C++ driver mode).
    const { compileOutput, module } = await this.api.compile({
      source: code,
      fileName: "main.c",
      flags: C_COMPILE_FLAGS,
    });

    // browsercc combines clang's stdout and stderr in `compileOutput`.
    // Surface non-empty diagnostics so warnings + errors are visible
    // even on a successful build.
    const trimmedDiag = compileOutput.replace(/\n+$/, "");
    if (trimmedDiag) {
      emit({ type: "stderr", content: trimmedDiag });
    }
    if (!module) {
      // `module === null` means clang or wasm-ld returned a non-zero
      // exit code; the diagnostics above already say why.
      return;
    }

    // 2) Run the compiled module in a WASI sandbox and forward
    //    stdout/stderr. We emit each stream as a single cell to match
    //    the rest of the playground adapters.
    const { exitCode, stdout, stderr } = await runWasiModule(module, this.shim);
    if (stdout) {
      emit({ type: "stdout", content: stdout.replace(/\n+$/, "") });
    }
    if (stderr) {
      emit({ type: "stderr", content: stderr.replace(/\n+$/, "") });
    }
    if (exitCode !== 0) {
      emit({
        type: "stderr",
        content: `Program exited with code ${exitCode}.`,
      });
    }
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
    version: "C17 (clang via browsercc)",
    engine: "browsercc (clang + lld + WASI sysroot)",
    engineUrl: "https://github.com/BertalanD/browsercc",
    notes:
      "C is compiled in your browser by a precompiled clang/lld toolchain (browsercc), and the resulting WASI binary is then executed with @bjorn3/browser_wasi_shim — no server roundtrip.",
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
      and ship with browsercc&apos;s WASI sysroot — no install step needed.
    </>
  ),
  importSnippet: (name) => `#include <${name}>`,
  hasImport(code, name) {
    // Match `#include <name>` allowing arbitrary whitespace.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`#\\s*include\\s*<\\s*${escaped}\\s*>`).test(code);
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Loading browsercc clang toolchain (this can take a moment on first load)…");
    const [api, shim] = await Promise.all([loadBrowsercc(), loadWasiShim()]);
    return new CRuntime(api, shim);
  },
};
