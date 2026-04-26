import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";
import {
  loadClangPackage,
  loadWasmerSdk,
  type WasmerPackage,
  type WasmerSdk,
} from "./wasmer-sdk";

// Run C++ in the browser via @wasmer/sdk + the `clang/clang` package
// from the Wasmer registry. Same machinery as the C playground (see
// `./c.tsx` for the long-form notes), but the clang driver is put into
// C++ mode via `--driver-mode=g++` so it auto-links libc++/libc++abi
// and accepts C++-only syntax (templates, iostream, RAII, ...).
//
// The Wasmer SDK uses a Web Worker threadpool backed by
// `SharedArrayBuffer`, which means the document hosting this
// playground must be cross-origin-isolated. The `/cpp` route gets the
// required COOP/COEP headers from `next.config.ts`.
//
// SDK initialization and the `clang/clang` package fetch are both
// handled by `./wasmer-sdk.ts`, which is shared with the C playground.
// That keeps `init(...)` truly singleton across the page lifetime so
// navigating between `/c` and `/cpp` doesn't disturb the
// already-running threadpool — without this sharing, the second
// adapter to load would clobber the threadpool's worker URL and
// newly-spawned commands (notably the heavier C++ compile) would hang
// waiting for a worker that never picked up the job.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "iostream, std::string, range-based for",
    code: `#include <iostream>
#include <string>

int main() {
    std::cout << "Hello, C++ Playground!\\n";
    std::cout << "Compiled with clang -> WebAssembly, run in your browser.\\n\\n";

    for (const std::string &name : {"Ada", "Linus", "Grace"}) {
        std::cout << "  hello, " << name << "!\\n";
    }

    return 0;
}
`,
  },
  {
    key: "vector",
    title: "Vectors & Algorithms",
    desc: "Sort with a lambda and accumulate over a vector",
    code: `#include <algorithm>
#include <iomanip>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>

struct Student {
    std::string name;
    int score;
};

int main() {
    std::vector<Student> klass = {
        {"Ada", 92}, {"Linus", 88}, {"Grace", 95},
        {"Alan", 81}, {"Edsger", 90},
    };

    std::sort(klass.begin(), klass.end(),
              [](const Student &a, const Student &b) {
                  return a.score > b.score;
              });

    std::cout << "Rank  Name      Score\\n";
    std::cout << "----  --------  -----\\n";
    int rank = 1;
    for (const auto &s : klass) {
        std::cout << std::setw(4) << rank++ << "  "
                  << std::left << std::setw(8) << s.name << std::right
                  << "  " << std::setw(5) << s.score << "\\n";
    }

    int total = std::accumulate(klass.begin(), klass.end(), 0,
        [](int acc, const Student &s) { return acc + s.score; });
    std::cout << "\\nAverage: "
              << std::fixed << std::setprecision(1)
              << static_cast<double>(total) / klass.size() << "\\n";

    return 0;
}
`,
  },
  {
    key: "templates",
    title: "Templates",
    desc: "A tiny generic Stack<T> with type deduction",
    code: `#include <iostream>
#include <string>
#include <vector>

template <typename T>
class Stack {
public:
    void push(T value) { data_.push_back(std::move(value)); }
    T pop() {
        T top = std::move(data_.back());
        data_.pop_back();
        return top;
    }
    bool empty() const { return data_.empty(); }
    std::size_t size() const { return data_.size(); }

private:
    std::vector<T> data_;
};

template <typename T>
void drain(Stack<T> &s, const char *label) {
    std::cout << label << ":";
    while (!s.empty()) std::cout << " " << s.pop();
    std::cout << "\\n";
}

int main() {
    Stack<int> ints;
    for (int i : {1, 2, 3, 4, 5}) ints.push(i);
    drain(ints, "ints (LIFO)");

    Stack<std::string> words;
    for (const std::string &w : {"the", "quick", "brown", "fox"}) words.push(w);
    drain(words, "words (LIFO)");

    return 0;
}
`,
  },
  {
    key: "map",
    title: "STL Maps",
    desc: "Word-frequency count with std::map",
    code: `#include <iostream>
#include <map>
#include <sstream>
#include <string>

int main() {
    const std::string text =
        "the quick brown fox jumps over the lazy dog "
        "the dog was not amused by the fox";

    std::map<std::string, int> counts;
    std::istringstream in(text);
    for (std::string word; in >> word; ) {
        ++counts[word];
    }

    std::cout << "Word frequencies (sorted alphabetically):\\n";
    for (const auto &[word, n] : counts) {
        std::cout << "  " << word << ": ";
        for (int i = 0; i < n; ++i) std::cout << '#';
        std::cout << ' ' << n << "\\n";
    }

    return 0;
}
`,
  },
  {
    key: "smart-ptr",
    title: "Smart Pointers",
    desc: "std::unique_ptr managing a small linked list",
    code: `#include <iostream>
#include <memory>
#include <utility>

struct Node {
    int value;
    std::unique_ptr<Node> next;
    Node(int v, std::unique_ptr<Node> n)
        : value(v), next(std::move(n)) {}
};

static std::unique_ptr<Node> prepend(std::unique_ptr<Node> head, int v) {
    return std::make_unique<Node>(v, std::move(head));
}

static void print_list(const Node *head) {
    for (const Node *n = head; n; n = n->next.get()) {
        std::cout << n->value << (n->next ? " -> " : "\\n");
    }
}

int main() {
    std::unique_ptr<Node> head;
    for (int i = 1; i <= 5; ++i) head = prepend(std::move(head), i * i);

    std::cout << "List (head -> tail): ";
    print_list(head.get());

    // No manual delete: unique_ptr unwinds the whole chain automatically.
    return 0;
}
`,
  },
];

const PACKAGES: PackageInfo[] = [
  // Highlights from the C++ standard library — always available, no
  // install step. Clicking inserts the corresponding `#include` at the
  // top of the editor.
  { cat: "I/O", icon: "🖨️", color: "#facc15", name: "iostream", ver: "C++17", desc: "std::cin, std::cout, std::cerr stream I/O." },
  { cat: "I/O", icon: "📝", color: "#facc15", name: "iomanip", ver: "C++17", desc: "std::setw, std::setprecision, std::fixed manipulators." },
  { cat: "I/O", icon: "🧵", color: "#facc15", name: "sstream", ver: "C++17", desc: "std::istringstream, std::ostringstream string streams." },
  { cat: "Strings", icon: "🔤", color: "#fb923c", name: "string", ver: "C++17", desc: "std::string and std::string_view." },
  { cat: "Containers", icon: "📦", color: "#34d399", name: "vector", ver: "C++17", desc: "std::vector dynamic array." },
  { cat: "Containers", icon: "🗺️", color: "#34d399", name: "map", ver: "C++17", desc: "Ordered std::map and std::multimap." },
  { cat: "Containers", icon: "🪣", color: "#34d399", name: "unordered_map", ver: "C++17", desc: "Hash-based std::unordered_map." },
  { cat: "Algorithms", icon: "🔁", color: "#60a5fa", name: "algorithm", ver: "C++17", desc: "std::sort, std::find, std::for_each, ..." },
  { cat: "Algorithms", icon: "➕", color: "#60a5fa", name: "numeric", ver: "C++17", desc: "std::accumulate, std::iota, std::reduce." },
  { cat: "Memory", icon: "🧠", color: "#a78bfa", name: "memory", ver: "C++17", desc: "std::unique_ptr, std::shared_ptr, std::make_unique." },
  { cat: "Memory", icon: "🧰", color: "#a78bfa", name: "utility", ver: "C++17", desc: "std::move, std::pair, std::swap." },
  { cat: "Math", icon: "🎲", color: "#60a5fa", name: "cmath", ver: "C++17", desc: "std::sin, std::cos, std::sqrt, std::pow." },
  { cat: "Diagnostics", icon: "🛑", color: "#f472b6", name: "stdexcept", ver: "C++17", desc: "Standard exception types: runtime_error, logic_error, ..." },
];

class CppRuntime implements LanguageRuntime {
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
    await home.writeFile("main.cpp", code);

    // 1) Compile main.cpp -> main.wasm with clang in C++ driver mode
    //    (--driver-mode=g++) targeting WASI. C++ driver mode is what
    //    makes clang treat inputs as C++ AND auto-link libc++/libc++abi
    //    — without it, we'd have to pass `-x c++ -lc++ -lc++abi`
    //    ourselves.
    const compile = await clangCmd.run({
      args: [
        "--driver-mode=g++",
        "--target=wasm32-wasi",
        "-std=c++17",
        "-O2",
        "-o",
        "main.wasm",
        "main.cpp",
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
// navigation back to /cpp) doesn't try to call the SDK's `init()`
// twice — it throws if invoked more than once per page load. The
// promise itself is a process-wide singleton kept in `./wasmer-sdk.ts`
// and shared with the C playground.

export const cppAdapter: LanguageAdapter = {
  id: "cpp",
  displayName: "C++ Playground",
  logoText: "C++",
  documentTitle: "C++ Playground",
  readyStatus: "C++ ready",
  runtimeInfo: {
    language: "C++",
    version: "C++17 (clang)",
    engine: "Wasmer + clang/clang",
    engineUrl: "https://wasmer.io/clang/clang",
    notes:
      "C++ is compiled in your browser by clang (WebAssembly) in C++ driver mode, and the resulting WASI binary is then executed in a sandboxed Wasmer runtime — no server roundtrip.",
  },
  // CodeMirror's clike mode handles C++ syntax. `text/x-c++src` is the
  // standard MIME alias for C++ inside that mode.
  codeMirrorMode: "text/x-c++src",
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "cpp", label: "C++ source (.cpp)", mimeType: "text/x-c++src" },
    { extension: "hpp", label: "C++ header (.hpp)", mimeType: "text/x-c++hdr" },
  ],
  exportBaseFilename: "main",
  packagesFooter: (
    <>
      Headers above are part of the{" "}
      <a
        href="https://en.cppreference.com/w/cpp/header"
        target="_blank"
        rel="noreferrer"
      >
        C++ standard library
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
    const clang = await loadClangPackage(sdk);

    return new CppRuntime(sdk, clang);
  },
};
