import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";
import { loadCheerpJ, type CheerpJApi } from "./cheerpj";
import { getClangFormat } from "./clangFormat";

// Run Java in the browser via CheerpJ
// (https://cheerpj.com/) — a full OpenJDK runtime + JIT compiled to
// WebAssembly. CheerpJ does not ship `tools.jar`, so we bundle a
// Java 8 `tools.jar` in `public/tools.jar` (served by Next.js,
// mounted by CheerpJ as `/app/tools.jar`); we then drive `javac`
// (`com.sun.tools.javac.Main`) on user source at runtime and run the
// compiled main class with `cheerpjRunMain` — the JavaFiddle
// approach (https://github.com/leaningtech/javafiddle).
//
// This adapter targets Java 8 because that is what the bundled
// `tools.jar` compiles against. Java 8 is the lingua franca of
// online Java tutorials (lambdas, streams, Optional, java.time are
// all there) — so the playground covers what most learners need
// without pulling in newer-language features (records, var, text
// blocks) that would fail to compile.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "println, math constants, formatted loops",
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java Playground!");
        System.out.println("Compiled with javac and run on OpenJDK in your browser.\\n");

        System.out.printf("PI = %.10f%n", Math.PI);
        System.out.printf("E  = %.10f%n%n", Math.E);

        String[] names = { "Ada", "Linus", "Grace" };
        for (String name : names) {
            System.out.println("  hello, " + name + "!");
        }
    }
}
`,
  },
  {
    key: "generics",
    title: "Generics",
    desc: "A tiny generic Stack<T> with type inference",
    code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    static class Stack<T> {
        private final List<T> data = new ArrayList<>();
        public void push(T value) { data.add(value); }
        public T pop() { return data.remove(data.size() - 1); }
        public boolean isEmpty() { return data.isEmpty(); }
        public int size() { return data.size(); }
    }

    static <T> void drain(Stack<T> s, String label) {
        StringBuilder out = new StringBuilder(label).append(":");
        while (!s.isEmpty()) out.append(' ').append(s.pop());
        System.out.println(out);
    }

    public static void main(String[] args) {
        Stack<Integer> ints = new Stack<>();
        for (int i : Arrays.asList(1, 2, 3, 4, 5)) ints.push(i);
        drain(ints, "ints (LIFO)");

        Stack<String> words = new Stack<>();
        for (String w : Arrays.asList("the", "quick", "brown", "fox")) words.push(w);
        drain(words, "words (LIFO)");
    }
}
`,
  },
  {
    key: "streams",
    title: "Streams & Lambdas",
    desc: "Sort, group and reduce with the Streams API",
    code: `import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class Main {
    static class Student {
        final String name;
        final int score;
        Student(String name, int score) { this.name = name; this.score = score; }
    }

    public static void main(String[] args) {
        List<Student> klass = Arrays.asList(
            new Student("Ada",    92),
            new Student("Linus",  88),
            new Student("Grace",  95),
            new Student("Alan",   81),
            new Student("Edsger", 90)
        );

        System.out.println("Rank  Name      Score");
        System.out.println("----  --------  -----");
        int[] rank = { 1 };
        klass.stream()
            .sorted(Comparator.comparingInt((Student s) -> s.score).reversed())
            .forEach(s -> System.out.printf("%4d  %-8s  %5d%n", rank[0]++, s.name, s.score));

        double avg = klass.stream().mapToInt(s -> s.score).average().orElse(0.0);
        System.out.printf("%nAverage: %.1f%n", avg);

        String topNames = klass.stream()
            .filter(s -> s.score >= 90)
            .map(s -> s.name)
            .collect(Collectors.joining(", "));
        System.out.println("Top performers (>= 90): " + topNames);
    }
}
`,
  },
  {
    key: "optional",
    title: "Optional",
    desc: "Null-safe lookups with Optional<T>",
    code: `import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class Main {
    static Optional<Integer> ageOf(Map<String, Integer> ages, String name) {
        return Optional.ofNullable(ages.get(name));
    }

    public static void main(String[] args) {
        Map<String, Integer> ages = new HashMap<>();
        ages.put("Ada", 36);
        ages.put("Grace", 85);
        ages.put("Linus", 54);

        for (String name : new String[] { "Ada", "Alan", "Grace" }) {
            String summary = ageOf(ages, name)
                .map(a -> name + " is " + a + " years old")
                .orElse(name + " is not in the directory");
            System.out.println(summary);
        }

        int totalAge = ages.values().stream().mapToInt(Integer::intValue).sum();
        System.out.printf("%nTotal known age: %d%n", totalAge);
    }
}
`,
  },
  {
    key: "wordcount",
    title: "Map: Word Count",
    desc: "Word frequency with TreeMap, sorted output",
    code: `import java.util.Map;
import java.util.TreeMap;

public class Main {
    public static void main(String[] args) {
        String text = "the quick brown fox jumps over the lazy dog "
                    + "the dog was not amused by the fox";

        Map<String, Integer> counts = new TreeMap<>();
        for (String word : text.split("\\\\s+")) {
            counts.merge(word, 1, Integer::sum);
        }

        System.out.println("Word frequencies (sorted alphabetically):");
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            StringBuilder bar = new StringBuilder("  ").append(e.getKey()).append(": ");
            for (int i = 0; i < e.getValue(); i++) bar.append('#');
            bar.append(' ').append(e.getValue());
            System.out.println(bar);
        }
    }
}
`,
  },
];

const PACKAGES: PackageInfo[] = [
  // Highlights from the Java 8 standard library — always available, no
  // install step. Clicking inserts the corresponding `import` at the
  // top of the editor.
  {
    cat: "Collections",
    icon: "📦",
    color: "#34d399",
    name: "java.util",
    ver: "Java 8",
    desc: "List, Map, Set, ArrayList, HashMap, TreeMap, Optional, ...",
    example: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> ages = new HashMap<>();
        ages.put("Ada", 36);
        ages.put("Linus", 54);
        ages.put("Grace", 40);
        for (Map.Entry<String, Integer> e : ages.entrySet()) {
            System.out.println(e.getKey() + " -> " + e.getValue());
        }
    }
}
`,
  },
  {
    cat: "Collections",
    icon: "🌊",
    color: "#34d399",
    name: "java.util.stream",
    ver: "Java 8",
    desc: "Stream, Collectors, IntStream — functional pipelines.",
    example: `import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> nums = Arrays.asList(5, 2, 8, 1, 9, 3, 7, 4, 6);
        int sumOfEvens = nums.stream()
            .filter(n -> n % 2 == 0)
            .mapToInt(Integer::intValue)
            .sum();
        System.out.println("sum of evens = " + sumOfEvens);
    }
}
`,
  },
  {
    cat: "Collections",
    icon: "🔁",
    color: "#34d399",
    name: "java.util.function",
    ver: "Java 8",
    desc: "Function, Predicate, Supplier, Consumer functional interfaces.",
    example: `import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        Function<Integer, Integer> square = x -> x * x;
        Predicate<Integer> isEven = n -> n % 2 == 0;
        for (int i = 1; i <= 5; i++) {
            System.out.println(i + "^2 = " + square.apply(i)
                + " (even? " + isEven.test(i) + ")");
        }
    }
}
`,
  },
  {
    cat: "Concurrency",
    icon: "🧵",
    color: "#a78bfa",
    name: "java.util.concurrent",
    ver: "Java 8",
    desc: "ExecutorService, ConcurrentHashMap, CompletableFuture.",
    example: `import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
        for (String w : new String[]{"red", "blue", "red", "green", "red"}) {
            map.merge(w, 1, Integer::sum);
        }
        map.forEach((k, v) -> System.out.println(k + ": " + v));
    }
}
`,
  },
  {
    cat: "I/O",
    icon: "🖨️",
    color: "#facc15",
    name: "java.io",
    ver: "Java 8",
    desc: "PrintStream, BufferedReader, InputStream, OutputStream.",
    example: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        pw.println("line 1");
        pw.println("line 2");
        pw.flush();
        System.out.print(sw.toString());
    }
}
`,
  },
  {
    cat: "I/O",
    icon: "📁",
    color: "#facc15",
    name: "java.nio.file",
    ver: "Java 8",
    desc: "Path, Paths, Files modern file APIs.",
    example: `import java.nio.file.*;

public class Main {
    public static void main(String[] args) {
        Path p = Paths.get("/tmp/example/data.txt");
        System.out.println("path     = " + p);
        System.out.println("filename = " + p.getFileName());
        System.out.println("parent   = " + p.getParent());
    }
}
`,
  },
  {
    cat: "Time",
    icon: "📅",
    color: "#60a5fa",
    name: "java.time",
    ver: "Java 8",
    desc: "LocalDate, LocalDateTime, Duration, Instant.",
    example: `import java.time.*;
import java.time.format.DateTimeFormatter;

public class Main {
    public static void main(String[] args) {
        LocalDateTime now = LocalDateTime.now();
        System.out.println("now: " + now.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        Duration d = Duration.ofHours(36).plusMinutes(15);
        System.out.println("36h15m = " + d.toMinutes() + " minutes");
    }
}
`,
  },
  {
    cat: "Strings",
    icon: "🔤",
    color: "#fb923c",
    name: "java.text",
    ver: "Java 8",
    desc: "DecimalFormat, NumberFormat, MessageFormat formatters.",
    example: `import java.text.*;

public class Main {
    public static void main(String[] args) {
        DecimalFormat df = new DecimalFormat("#,##0.00");
        System.out.println(df.format(1234567.891));
        System.out.println(MessageFormat.format(
            "{0} ordered {1} item(s).", "Ada", 3));
    }
}
`,
  },
  {
    cat: "Strings",
    icon: "🔍",
    color: "#fb923c",
    name: "java.util.regex",
    ver: "Java 8",
    desc: "Pattern and Matcher for regular expressions.",
    example: `import java.util.regex.*;

public class Main {
    public static void main(String[] args) {
        Pattern p = Pattern.compile("\\\\d+");
        Matcher m = p.matcher("Order 123 placed on 2024-05-12.");
        while (m.find()) {
            System.out.println("matched: " + m.group() + " @ " + m.start());
        }
    }
}
`,
  },
  {
    cat: "Math",
    icon: "🎲",
    color: "#60a5fa",
    name: "java.math",
    ver: "Java 8",
    desc: "BigInteger and BigDecimal arbitrary-precision arithmetic.",
    example: `import java.math.*;

public class Main {
    public static void main(String[] args) {
        BigInteger fact = BigInteger.ONE;
        for (int i = 1; i <= 30; i++) fact = fact.multiply(BigInteger.valueOf(i));
        System.out.println("30! = " + fact);

        BigDecimal a = new BigDecimal("0.1").add(new BigDecimal("0.2"));
        System.out.println("0.1 + 0.2 = " + a);
    }
}
`,
  },
];

// CheerpJ's classpath: tools.jar is fetched from /tools.jar (see
// cheerpj.ts) and pre-mounted in CheerpJ's virtual FS at
// `/app/tools.jar` — it contains com.sun.tools.javac.Main — and we
// compile user code into /files/. Both must be on the classpath when
// running both javac and the user's main class.
const CLASSPATH = "/app/tools.jar:/files/";
const SOURCE_DIR = "/str/";
const OUTPUT_DIR = "/files/";

/** Pick the class that has `main` so we know what to run. Falls back
 *  to the first declared class, then to "Main". Defensive against the
 *  many shapes user input can take (no class, multiple classes, only
 *  a non-public class, ...). */
function findMainClassName(source: string): string {
  // Strip block comments + line comments + string/char literals so we
  // don't match `class` inside them. Cheap and good enough for picking
  // the main class out of a user snippet.
  const cleaned = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");

  const classRegex =
    /\b(?:public\s+)?(?:final\s+|abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g;
  const classes: { name: string; start: number; isPublic: boolean }[] = [];
  for (let m; (m = classRegex.exec(cleaned)) !== null; ) {
    // Skip nested classes — count unmatched `{` before this match to get
    // brace depth; depth > 0 means we are inside another class body.
    // String/char literals and comments have already been stripped from
    // `cleaned`, so stray braces from those sources are not a concern.
    const prefix = cleaned.slice(0, m.index);
    const depth =
      (prefix.match(/\{/g) ?? []).length - (prefix.match(/\}/g) ?? []).length;
    if (depth > 0) continue;

    const before = cleaned.slice(Math.max(0, m.index - 16), m.index);
    classes.push({
      name: m[1],
      start: m.index,
      isPublic:
        /\bpublic\s+(?:final\s+|abstract\s+)?$/.test(before) ||
        /\bpublic\s+/.test(cleaned.slice(m.index, m.index + m[0].length)),
    });
  }
  if (classes.length === 0) return "Main";

  // Prefer a class whose body contains `public static void main(`.
  // We approximate "body" as the chunk from this class to the next
  // class declaration (or end of file).
  for (let i = 0; i < classes.length; i++) {
    const start = classes[i].start;
    const end = i + 1 < classes.length ? classes[i + 1].start : cleaned.length;
    if (
      /\bpublic\s+static\s+void\s+main\s*\(/.test(cleaned.slice(start, end))
    ) {
      return classes[i].name;
    }
  }

  // Fall back to the public class (Java requires it match the file
  // name), then to the first class declared.
  const pub = classes.find((c) => c.isPublic);
  return (pub ?? classes[0]).name;
}

class JavaRuntime implements LanguageRuntime {
  constructor(private api: CheerpJApi) {}

  async run(code: string, emit: EmitOutput): Promise<void> {
    const className = findMainClassName(code);
    const sourcePath = `${SOURCE_DIR}${className}.java`;

    // 1) Mount the user's source under /str/<Class>.java so javac can
    //    read it. CheerpJ's `cheerpjAddStringFile` takes raw bytes.
    const encoder = new TextEncoder();
    this.api.cheerpjAddStringFile(sourcePath, encoder.encode(code));

    // 2) Capture javac's diagnostics + the program's output by
    //    intercepting console.log / console.error for the duration of
    //    each invocation. CheerpJ writes Java's System.out/System.err
    //    to those globals (verified in cj3.js — there's no other
    //    println sink to hook). We wrap+restore in a try/finally so a
    //    thrown error during `await` can't leave the page's console
    //    permanently patched.
    //
    //    CheerpJ forwards each underlying `write` call as one
    //    `console.log` invocation and includes the chunk's own newline
    //    bytes in the string (so `println("x")` arrives as "x\n").
    //    `printf("%a %b%n", …)` triggers several writes per logical
    //    line. We therefore concatenate the args verbatim — adding our
    //    own "\n" per call would produce a blank line between every
    //    chunk (the bug fixed here).
    const runWithCapture = async (
      fn: () => Promise<number>,
    ): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
      const origLog = console.log;
      const origErr = console.error;
      let stdout = "";
      let stderr = "";
      console.log = (...args: unknown[]) => {
        stdout += args.map(String).join(" ");
      };
      console.error = (...args: unknown[]) => {
        stderr += args.map(String).join(" ");
      };
      try {
        const exitCode = await fn();
        return { exitCode, stdout, stderr };
      } finally {
        console.log = origLog;
        console.error = origErr;
      }
    };

    // 3) Compile <Class>.java -> /files/<Class>.class. `-Xlint` matches
    //    JavaFiddle's defaults so common pitfalls (unchecked casts,
    //    deprecated APIs) surface as warnings.
    const javacResult = await runWithCapture(() =>
      this.api.cheerpjRunMain(
        "com.sun.tools.javac.Main",
        CLASSPATH,
        sourcePath,
        "-d",
        OUTPUT_DIR,
        "-Xlint",
      ),
    );

    // javac writes diagnostics to stderr; treat any combined output as
    // "compile diagnostics" so warnings show up alongside errors.
    const diag = (javacResult.stdout + javacResult.stderr).replace(/\n+$/, "");
    if (diag) emit({ type: "stderr", content: diag });

    if (javacResult.exitCode !== 0) {
      // Compilation failed — `diag` already explains why; nothing to
      // run.
      return;
    }

    // 4) Run the user's main() with /files/ on the classpath.
    const runResult = await runWithCapture(() =>
      this.api.cheerpjRunMain(className, CLASSPATH),
    );

    const stdout = runResult.stdout.replace(/\n+$/, "");
    const stderr = runResult.stderr.replace(/\n+$/, "");
    if (stdout) emit({ type: "stdout", content: stdout });
    if (stderr) emit({ type: "stderr", content: stderr });
    if (runResult.exitCode !== 0) {
      emit({
        type: "stderr",
        content: `Program exited with code ${runResult.exitCode}.`,
      });
    }
  }
}

export const javaAdapter: LanguageAdapter = {
  id: "java",
  displayName: "Java Playground",
  logoText: "Jv",
  documentTitle: "Java Playground",
  readyStatus: "Java ready",
  runtimeInfo: {
    language: "Java",
    version: "8 (Update 492)",
    engine: "CheerpJ (OpenJDK + javac, WebAssembly)",
    engineUrl: "https://cheerpj.com/",
    notes:
      "Java is compiled in your browser by `javac` (com.sun.tools.javac.Main) and the resulting bytecode is then JIT-compiled to JavaScript and executed by CheerpJ — a full OpenJDK runtime in WebAssembly. No server roundtrip. Pure-AOT alternatives like TeaVM aren't a fit for an in-browser playground because they require a JVM at compile time.",
  },
  // CodeMirror's clike mode handles Java syntax. `text/x-java` is the
  // standard MIME alias for Java inside that mode.
  codeMirrorMode: "text/x-java",
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    {
      extension: "java",
      label: "Java source (.java)",
      mimeType: "text/x-java-source",
    },
  ],
  exportBaseFilename: "Main",
  packagesFooter: (
    <>
      Packages above are part of the{" "}
      <a
        href="https://docs.oracle.com/javase/8/docs/api/"
        target="_blank"
        rel="noreferrer"
      >
        Java SE 8 standard library
      </a>{" "}
      and ship with CheerpJ&apos;s OpenJDK runtime — no install step needed.
    </>
  ),
  importSnippet: (name) => `import ${name}.*;`,
  hasImport(code, name) {
    // Match `import <name>.*;` or `import <name>.<Anything>;` allowing
    // arbitrary whitespace, and `import static` variants.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `\\bimport\\s+(?:static\\s+)?${escaped}\\s*\\.\\s*(?:\\*|[A-Za-z_$][\\w$]*)\\s*;`,
    ).test(code);
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getClangFormat();
    return format(code, "Main.java", "LLVM");
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage(
      "Loading CheerpJ (OpenJDK + javac in WebAssembly — this can take a moment on first load)…",
    );
    const api = await loadCheerpJ();
    return new JavaRuntime(api);
  },
};
