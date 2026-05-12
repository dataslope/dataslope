import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";
import {
  loadBrowsercc,
  loadCppPch,
  loadWasiShim,
  runWasiModule,
  type BrowserccApi,
  type WasiShim,
} from "./browsercc";
import { getClangFormat } from "./clangFormat";

// Run C++ in the browser via `browsercc`
// (https://github.com/BertalanD/browsercc) — same toolchain as the C
// playground (see `./c.tsx` for the long-form notes), but the input
// file name uses a `.cpp` extension so clang's driver picks C++ mode
// (auto-linking libc++/libc++abi and accepting C++-only syntax like
// templates, iostream, RAII, ...).
//
// Compile speed: parsing the libc++ headers (iostream, vector, map,
// ...) on every run would make each Run click feel slow. browsercc
// ships a prebuilt `bits/stdc++.h.pch` that pre-parses the entire
// standard library; calling `getPrecompiledHeader(flags)` returns its
// bytes when the supplied flags are PCH-compatible (currently exactly
// `-O2 -std=c++20 -fno-exceptions`). We pin this playground to those
// flags so every user compile gets the fast path.
//
// The PCH is a 19 MB download, so we kick it off in the background as
// soon as the toolchain is available and reuse the same buffer for
// every subsequent compile via `loadCppPch` in `./browsercc.ts`.

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
];

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
  {
    cat: "Diagnostics",
    icon: "🛑",
    color: "#f472b6",
    name: "stdexcept",
    ver: "C++20",
    desc: "Standard exception types: runtime_error, logic_error, ...",
    example: `#include <iostream>
#include <stdexcept>

int safe_divide(int a, int b) {
    if (b == 0) throw std::runtime_error("division by zero");
    return a / b;
}

int main() {
    try {
        std::cout << safe_divide(10, 0) << std::endl;
    } catch (const std::exception& e) {
        std::cout << "caught: " << e.what() << std::endl;
    }
    return 0;
}
`,
  },
];

// Compile flags for every C++ run. These are pinned to the exact set
// that browsercc's `getPrecompiledHeader` accepts so the prebuilt
// libc++ PCH gets used on every compile (see the file-header note).
// Changing any of these three flags would silently disable the PCH and
// make every Run noticeably slower.
const CPP_COMPILE_FLAGS = ["-O2", "-std=c++20", "-fno-exceptions"];

// Path inside the compiler sandbox where the PCH is mounted. The user
// code never sees this path; we just point clang at it via
// `-include-pch` so libc++ headers don't have to be re-parsed on every
// run.
const PCH_VFS_PATH = "/include/bits/stdc++.h.pch";

class CppRuntime implements LanguageRuntime {
  // Resolves to the PCH ArrayBuffer when ready, or `null` if the PCH
  // download failed (in which case we just compile without it — slower
  // but still correct).
  private pchPromise: Promise<ArrayBuffer | null>;

  constructor(
    private api: BrowserccApi,
    private shim: WasiShim,
  ) {
    // Kick off the PCH download in the background so it's almost
    // certainly cached by the time the user clicks Run.
    this.pchPromise = loadCppPch(api, CPP_COMPILE_FLAGS);
  }

  async run(code: string, emit: EmitOutput): Promise<void> {
    // Wait for the background PCH download to settle. In the steady
    // state this is already resolved and adds no measurable latency;
    // on the very first run it just absorbs whatever's left of the
    // one-time fetch.
    const pch = await this.pchPromise;

    const flags = [...CPP_COMPILE_FLAGS];
    const extraFiles: Record<string, string | ArrayBuffer> = {};
    if (pch) {
      flags.push("-include-pch", PCH_VFS_PATH);
      extraFiles[PCH_VFS_PATH] = pch;
    }

    // 1) Compile main.cpp -> WebAssembly module via browsercc. The
    //    `.cpp` extension is what tells clang to use C++ driver mode
    //    (auto-link libc++, accept C++-only syntax).
    const { compileOutput, module } = await this.api.compile({
      source: code,
      fileName: "main.cpp",
      flags,
      extraFiles,
    });

    const trimmedDiag = compileOutput.replace(/\n+$/, "");
    if (trimmedDiag) {
      emit({ type: "stderr", content: trimmedDiag });
    }
    if (!module) {
      // `module === null` means clang or wasm-ld returned a non-zero
      // exit code; the diagnostics above already say why.
      return;
    }

    // 2) Run the compiled module in a WASI sandbox.
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
    setLoadingMessage(
      "Loading browsercc clang toolchain (this can take a moment on first load)…",
    );
    const [api, shim] = await Promise.all([loadBrowsercc(), loadWasiShim()]);
    return new CppRuntime(api, shim);
  },
};
