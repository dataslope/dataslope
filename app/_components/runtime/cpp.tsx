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

// C++ runs inside a dedicated Web Worker via browsercc — see browsercc-worker.ts.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "iostream with a range-based for over an array",
    code: `#include <iostream>

int main() {
    std::cout << "Hello, C++ Playground!\\n";
    std::cout << "Compiled with clang -> WebAssembly, run in your browser.\\n\\n";

    const char *names[] = {"Ada", "Linus", "Grace"};
    for (const char *name : names) {
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
  {
    key: "multifile",
    title: "Multi-file Project",
    desc: "Split a Greeter class into a header + source file",
    code: `#include <iostream>
#include "greeter.hpp"

int main() {
    Greeter g("C++ Playground");
    std::cout << g.hello() << "\\n";
    std::cout << g.bye() << "\\n";
    return 0;
}
`,
    files: [
      {
        filename: "greeter.hpp",
        content: `#ifndef GREETER_HPP
#define GREETER_HPP

#include <string>

class Greeter {
public:
    explicit Greeter(std::string name);
    std::string hello() const;
    std::string bye() const;

private:
    std::string name_;
};

#endif
`,
      },
      {
        filename: "greeter.cpp",
        content: `#include "greeter.hpp"

Greeter::Greeter(std::string name) : name_(std::move(name)) {}

std::string Greeter::hello() const { return "Hello, " + name_ + "!"; }
std::string Greeter::bye() const   { return "Goodbye, " + name_ + "!"; }
`,
      },
    ],
    entryFilename: "main.cpp",
  },
];

/** Detect whether a C++ source file declares a `main()` function. */
function hasCppMain(source: string): boolean {
  const cleaned = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
  return /\bint\s+main\s*\(/.test(cleaned);
}

const PACKAGES: PackageInfo[] = [
  // Highlights from the C++ standard library — always available, no
  // install step. Clicking inserts the corresponding `#include` at the
  // top of the editor.
  {
    cat: "I/O",
    icon: "🖨️",
    color: "#facc15",
    name: "iostream",
    ver: "C++20",
    desc: "std::cin, std::cout, std::cerr stream I/O.",
    example: `#include <iostream>

int main() {
    std::cout << "Hello, iostream!" << std::endl;
    std::cout << "1 + 2 = " << 1 + 2 << std::endl;
    return 0;
}
`,
  },
  {
    cat: "I/O",
    icon: "📝",
    color: "#facc15",
    name: "iomanip",
    ver: "C++20",
    desc: "std::setw, std::setprecision, std::fixed manipulators.",
    example: `#include <iostream>
#include <iomanip>

int main() {
    std::cout << std::fixed << std::setprecision(3);
    std::cout << "pi  = " << 3.1415926535 << "\\n";
    std::cout << std::setw(8) << 42 << "|" << std::setw(8) << "hi" << "\\n";
    return 0;
}
`,
  },
  {
    cat: "I/O",
    icon: "🧵",
    color: "#facc15",
    name: "sstream",
    ver: "C++20",
    desc: "std::istringstream, std::ostringstream string streams.",
    example: `#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::istringstream in("10 20 30");
    int sum = 0, x;
    while (in >> x) sum += x;
    std::ostringstream out;
    out << "sum = " << sum;
    std::cout << out.str() << std::endl;
    return 0;
}
`,
  },
  {
    cat: "Strings",
    icon: "🔤",
    color: "#fb923c",
    name: "string",
    ver: "C++20",
    desc: "std::string and std::string_view.",
    example: `#include <iostream>
#include <string>

int main() {
    std::string s = "Hello";
    s += ", world!";
    std::cout << s << " (length " << s.size() << ")\\n";
    std::cout << "upper-H index = " << s.find('H') << "\\n";
    return 0;
}
`,
  },
  {
    cat: "Containers",
    icon: "📦",
    color: "#34d399",
    name: "vector",
    ver: "C++20",
    desc: "std::vector dynamic array.",
    example: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{3, 1, 4, 1, 5, 9, 2, 6};
    v.push_back(5);
    for (int x : v) std::cout << x << ' ';
    std::cout << "\\nsize = " << v.size() << std::endl;
    return 0;
}
`,
  },
  {
    cat: "Containers",
    icon: "🗺️",
    color: "#34d399",
    name: "map",
    ver: "C++20",
    desc: "Ordered std::map and std::multimap.",
    example: `#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> ages{{"ada", 36}, {"linus", 54}};
    ages["grace"] = 40;
    for (auto& [name, age] : ages) {
        std::cout << name << " -> " << age << "\\n";
    }
    return 0;
}
`,
  },
  {
    cat: "Containers",
    icon: "🪣",
    color: "#34d399",
    name: "unordered_map",
    ver: "C++20",
    desc: "Hash-based std::unordered_map.",
    example: `#include <iostream>
#include <unordered_map>
#include <string>

int main() {
    std::unordered_map<std::string, int> counts;
    for (auto w : {"red", "blue", "red", "green", "blue", "red"}) counts[w]++;
    for (auto& [k, v] : counts) std::cout << k << ": " << v << "\\n";
    return 0;
}
`,
  },
  {
    cat: "Algorithms",
    icon: "🔁",
    color: "#60a5fa",
    name: "algorithm",
    ver: "C++20",
    desc: "std::sort, std::find, std::for_each, ...",
    example: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> v{5, 2, 8, 1, 9, 3};
    std::sort(v.begin(), v.end());
    auto it = std::find(v.begin(), v.end(), 8);
    for (int x : v) std::cout << x << ' ';
    std::cout << "\\nfound 8 at index "
              << std::distance(v.begin(), it) << "\\n";
    return 0;
}
`,
  },
  {
    cat: "Algorithms",
    icon: "➕",
    color: "#60a5fa",
    name: "numeric",
    ver: "C++20",
    desc: "std::accumulate, std::iota, std::reduce.",
    example: `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> v(5);
    std::iota(v.begin(), v.end(), 1);
    int sum = std::accumulate(v.begin(), v.end(), 0);
    std::cout << "sum(1..5) = " << sum << std::endl;
    return 0;
}
`,
  },
  {
    cat: "Memory",
    icon: "🧠",
    color: "#a78bfa",
    name: "memory",
    ver: "C++20",
    desc: "std::unique_ptr, std::shared_ptr, std::make_unique.",
    example: `#include <iostream>
#include <memory>

struct Point { int x, y; };

int main() {
    auto p = std::make_unique<Point>(Point{3, 4});
    std::cout << "p = (" << p->x << ", " << p->y << ")\\n";
    return 0;
}
`,
  },
  {
    cat: "Memory",
    icon: "🧰",
    color: "#a78bfa",
    name: "utility",
    ver: "C++20",
    desc: "std::move, std::pair, std::swap.",
    example: `#include <iostream>
#include <utility>
#include <string>

int main() {
    std::pair<std::string, int> kv{"answer", 42};
    int a = 1, b = 2;
    std::swap(a, b);
    std::cout << kv.first << " = " << kv.second
              << " (a=" << a << ", b=" << b << ")\\n";
    return 0;
}
`,
  },
  {
    cat: "Math",
    icon: "🎲",
    color: "#60a5fa",
    name: "cmath",
    ver: "C++20",
    desc: "std::sin, std::cos, std::sqrt, std::pow.",
    example: `#include <iostream>
#include <cmath>

int main() {
    std::cout << "sqrt(2) = " << std::sqrt(2.0) << "\\n";
    std::cout << "2^10    = " << std::pow(2, 10) << "\\n";
    std::cout << "sin(0)  = " << std::sin(0.0) << "\\n";
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
  | { kind: "run-status"; id: number; message: string; preparing: boolean }
  | { kind: "output"; id: number; cell: { type: string; content: string } }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string };

class CppWorkerRuntime implements LanguageRuntime {
  private nextId = 0;
  /** Staged workspace files (path → text content). Populated by
   *  `prepareFileSystem` before each run so other `.cpp`/`.h`/`.hpp`
   *  files in the workspace are available to the compiler. */
  private stagedFiles: Map<string, string> = new Map();

    constructor(private worker: Worker) {}

  /** Free the runtime by terminating its worker. Registry-eviction hook —
   *  the instance must not be used after this. */
  dispose(): void {
    this.worker.terminate();
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    const decoder = new TextDecoder();
    this.stagedFiles = new Map();
    for (const [path, bytes] of files) {
      // Only stage C++ source and header files for the compiler VFS.
      if (
        path.endsWith(".cpp") ||
        path.endsWith(".cc") ||
        path.endsWith(".cxx") ||
        path.endsWith(".h") ||
        path.endsWith(".hpp")
      ) {
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
    // entry filename via `options.entryFilename` (e.g. "main2.cpp") when
    // the user clicks "Run" on a non-active tab; in that case we must
    // compile the staged copy of that file because `code` (the active
    // editor's doc) belongs to a different translation unit.
    //
    // When `options.entryFilename` is not provided (CodeBlock, single-
    // file ChallengeCard runs) we ALWAYS use `code` as the authoritative
    // entry source. Reading from `stagedFiles` here would pick up stale
    // content from a previous ChallengeCard/Playground run on the same
    // shared per-page runtime, which is why C++ CodeBlocks were silently
    // running the wrong source instead of the user's `main()`.
    const explicitEntry = options?.entryFilename;
    const entry = explicitEntry ?? "main.cpp";
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
        if (
          msg.kind !== "output" &&
          msg.kind !== "done" &&
          msg.kind !== "error" &&
          msg.kind !== "run-status"
        )
          return;
        if (msg.id !== id) return;
        if (msg.kind === "run-status") {
          // Mid-run wait (the first C++ run awaiting the precompiled
          // header) — surface the boot notice for the duration.
          options?.onStatus?.(msg.message, msg.preparing);
          return;
        }
        if (msg.kind === "output") {
          emit(msg.cell as Parameters<EmitOutput>[0]);
          return;
        }
        this.worker.removeEventListener("message", onMessage);
        if (msg.kind === "done") resolve();
        else reject(new Error(msg.message));
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({ kind: "run", id, code: source, language: "cpp", files });
    });
  }
}

export const cppAdapter: LanguageAdapter = {
  id: "cpp",
  displayName: "C++ Playground",
  logoText: "C++",
  documentTitle: "C++ Playground",
  readyStatus: "C++ ready",
  runtimeInfo: {
    language: "C++",
    version: "20 (202002L)",
    engine: "browsercc (clang + lld + WASI sysroot)",
    engineUrl: "https://github.com/BertalanD/browsercc",
    notes:
      "C++ is compiled in your browser by a precompiled clang/lld toolchain (browsercc), and the resulting WASI binary is then executed with @bjorn3/browser_wasi_shim — no server roundtrip. Code is built at -O2 with -fno-exceptions, which lets the playground reuse browsercc's prebuilt libc++ precompiled header so iostream- and STL-heavy snippets compile quickly.",
  },
  // CodeMirror's clike mode handles C++ syntax. `text/x-c++src` is the
  // standard MIME alias for C++ inside that mode.
  codeMirrorMode: "text/x-c++src",
  // clang + lld WASM, the sysroot, and the C++ precompiled header
  // from jsDelivr, compressed transfer.
  coldDownloadMB: 45,
  // Compiles (clang) on every run, so later runs are faster, not instant.
  compiled: true,
  // clang-format LLVM style (see formatCode) — keep in sync.
  indentWidth: 2,
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "cpp", label: "C++ source (.cpp)", mimeType: "text/x-c++src" },
    { extension: "hpp", label: "C++ header (.hpp)", mimeType: "text/x-c++hdr" },
  ],
  exportBaseFilename: "main",
  defaultFileExtension: "cpp",
  findEntryFiles(files): EntryFileInfo[] {
    const out: EntryFileInfo[] = [];
    for (const f of files) {
      if (
        !f.filename.endsWith(".cpp") &&
        !f.filename.endsWith(".cc") &&
        !f.filename.endsWith(".cxx")
      ) {
        continue;
      }
      if (hasCppMain(f.content)) out.push({ filename: f.filename, kind: "main" });
    }
    return out;
  },
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
    return format(code, "main.cpp", "LLVM");
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Starting C++ runtime…", 0.02);
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
          resolve(new CppWorkerRuntime(worker));
        } else if (msg.kind === "init-error") {
          worker.removeEventListener("message", onMessage);
          worker.terminate();
          reject(new Error(msg.message));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (ev) => {
        worker.removeEventListener("message", onMessage);
        reject(new Error(ev.message || "C++ worker failed to start"));
      });
      worker.postMessage({ kind: "init" });
    });
  },
};
