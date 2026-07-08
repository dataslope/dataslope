import type {
  EmitOutput,
  ExampleSnippet,
  EntryFileInfo,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
} from "../types";
import { loadCheerpJ, TOOLS_JAR_VFS_PATH, type CheerpJApi } from "./cheerpj";
import { getClangFormat } from "./clangFormat";

// Run Java in the browser via CheerpJ
// (https://cheerpj.com/), a full OpenJDK runtime + JIT compiled to
// WebAssembly. CheerpJ does not ship `tools.jar`, so we fetch a Java 8
// `tools.jar` from a CDN and mount it in CheerpJ's /str/ filesystem at
// runtime (see cheerpj.ts); we then drive `javac`
// (`com.sun.tools.javac.Main`) on user source and run the compiled main
// class with `cheerpjRunMain`, the JavaFiddle approach
// (https://github.com/leaningtech/javafiddle).
//
// This adapter targets Java 8 because that is what the bundled
// `tools.jar` compiles against. Java 8 is the lingua franca of
// online Java tutorials (lambdas, streams, Optional, java.time are
// all there), so the playground covers what most learners need
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
  {
    key: "multifile",
    title: "Multi-file Project",
    desc: "Use a Greeter class defined in a separate Greeter.java",
    code: `public class Main {
    public static void main(String[] args) {
        Greeter g = new Greeter("Java Playground");
        System.out.println(g.hello());
        System.out.println(g.bye());
    }
}
`,
    files: [
      {
        filename: "Greeter.java",
        content: `public class Greeter {
    private final String name;

    public Greeter(String name) {
        this.name = name;
    }

    public String hello() {
        return "Hello, " + name + "!";
    }

    public String bye() {
        return "Goodbye, " + name + "!";
    }
}
`,
      },
    ],
    entryFilename: "Main.java",
  },
];

/** Detect whether a Java source file declares a `public static void main`. */
function hasJavaMain(source: string): boolean {
  const cleaned = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
  return /\b(?:public\s+)?static\s+(?:public\s+)?void\s+main\s*\(/.test(cleaned);
}

const PACKAGES: PackageInfo[] = [
  // Highlights from the Java 8 standard library, always available, no
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
    desc: "Stream, Collectors, IntStream, functional pipelines.",
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

// CheerpJ's classpath: tools.jar is fetched from the CDN and mounted in
// CheerpJ's /str/ FS at TOOLS_JAR_VFS_PATH (see cheerpj.ts), it contains
// com.sun.tools.javac.Main, and we compile user code into /files/. Both
// must be on the classpath when running both javac and the user's main
// class.
const CLASSPATH = `${TOOLS_JAR_VFS_PATH}:/files/`;
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
    // Skip nested classes, count unmatched `{` before this match to get
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
  // Paths inside CheerpJ's /str/ virtual filesystem that have been
  // staged by prepareFileSystem. The active file (from run()) is
  // always added to this set so javac sees all workspace files.
  private stagedJavaPaths: string[] = [];
  // Set once the JVM has compiled + run a throwaway program (see
  // `warmUp`) so the warm-up only runs on the first init per instance.
  private warmedUp = false;

  constructor(private api: CheerpJApi) {}

  // Capture javac's diagnostics + a program's output by intercepting
  // console.log / console.error for the duration of one cheerpjRunMain
  // invocation. CheerpJ writes Java's System.out/System.err to those
  // globals (verified in cj3.js, there's no other println sink to
  // hook); it forwards each underlying `write` as one console.log call
  // and includes the chunk's own newline bytes (so `println("x")`
  // arrives as "x\n"). We therefore concatenate the args verbatim,
  // adding our own "\n" per call would produce a blank line between
  // every chunk. The wrap+restore is in a try/finally so a thrown error
  // during `await` can't leave the page's console permanently patched.
  private async runWithCapture(
    fn: () => Promise<number>,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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
  }

  /** Compile and run a tiny throwaway program so the expensive
   *  first-use costs happen now, behind the boot animation, instead of
   *  on the learner's first Run.
   *
   *  `cheerpjInit` (in `loadCheerpJ`) only bootstraps the CheerpJ
   *  runtime, it does NOT load `tools.jar`, `javac`, or the core
   *  OpenJDK classes. Those are pulled in (and JIT-compiled) lazily on
   *  the *first* `cheerpjRunMain` call, which without this warm-up is
   *  the user's first Run: that one execution paid the whole
   *  tools.jar + javac + runtime class-load + JIT bill while later runs
   *  were instant. Running a no-op `main` here moves that cost into
   *  `init()` (covered by the loading notice). Best-effort: any failure
   *  is swallowed so a warm-up hiccup never blocks running real code. */
  async warmUp(
    report?: (message: string, fraction?: number) => void,
  ): Promise<void> {
    if (this.warmedUp) return;
    this.warmedUp = true;
    try {
      const warmupClass = "__DataslopeWarmup";
      const source = `public class ${warmupClass} { public static void main(String[] args) { System.out.print(""); } }`;
      const sourcePath = `${SOURCE_DIR}${warmupClass}.java`;
      this.api.cheerpjAddStringFile(
        sourcePath,
        new TextEncoder().encode(source),
      );
      report?.("Warming up the Java compiler…", 0.55);
      const compiled = await this.runWithCapture(() =>
        this.api.cheerpjRunMain(
          "com.sun.tools.javac.Main",
          CLASSPATH,
          sourcePath,
          "-d",
          OUTPUT_DIR,
        ),
      );
      if (compiled.exitCode === 0) {
        report?.("Warming up the Java runtime…", 0.85);
        await this.runWithCapture(() =>
          this.api.cheerpjRunMain(warmupClass, CLASSPATH),
        );
      }
    } catch {
      // Warm-up is best-effort, never let it block real runs.
    }
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    this.stagedJavaPaths = [];
    for (const [path, bytes] of files) {
      // Only stage .java files; skip binary data files.
      if (!path.endsWith(".java")) continue;
      // Use only the basename (no subdirectory), CheerpJ's /str/
      // is a flat virtual filesystem, and javac is invoked with
      // individual file paths rather than a source root.
      const filename = path.includes("/") ? path.split("/").pop()! : path;
      const virtualPath = `${SOURCE_DIR}${filename}`;
      this.api.cheerpjAddStringFile(virtualPath, bytes);
      if (!this.stagedJavaPaths.includes(virtualPath)) {
        this.stagedJavaPaths.push(virtualPath);
      }
    }
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    // The Playground passes the chosen entry file's contents as `code`
    // and its filename via `options.entryFilename` so the user can pick
    // which class with a `main` method to execute. When omitted, fall
    // back to detecting the main class from `code` (legacy single-file
    // behaviour).
    let className: string;
    if (options?.entryFilename) {
      const base = options.entryFilename.includes("/")
        ? options.entryFilename.split("/").pop()!
        : options.entryFilename;
      className = base.replace(/\.java$/, "");
    } else {
      className = findMainClassName(code);
    }
    const sourcePath = `${SOURCE_DIR}${className}.java`;

    // 1) Mount the user's source under /str/<Class>.java so javac can
    //    read it. CheerpJ's `cheerpjAddStringFile` takes raw bytes.
    //    Always update the active file so unsaved edits are visible
    //    even if prepareFileSystem was already called with an older copy.
    const encoder = new TextEncoder();
    this.api.cheerpjAddStringFile(sourcePath, encoder.encode(code));

    // 2) Build the full list of source files to compile. Start with
    //    the files staged by prepareFileSystem (all .java workspace
    //    files), then ensure the active file's path is included too
    //    (it may not be in stagedJavaPaths if prepareFileSystem wasn't
    //    called, e.g. for single-file workspaces).
    const filesToCompile = [...this.stagedJavaPaths];
    if (!filesToCompile.includes(sourcePath)) {
      filesToCompile.push(sourcePath);
    }

    // 3) Capture javac's diagnostics + the program's output via the
    //    shared `runWithCapture` helper (which intercepts console.log /
    //    console.error, CheerpJ's only println sink). `printf("%a
    //    %b%n", …)` triggers several writes per logical line, so the
    //    helper concatenates chunks verbatim rather than adding newlines.

    // 4) Compile all staged .java files together. Passing every source
    //    file in a single javac invocation lets the compiler resolve
    //    cross-file references (e.g. Main.java using Dog from Dog.java)
    //    in one pass. `-Xlint` matches JavaFiddle's defaults.
    const javacResult = await this.runWithCapture(() =>
      this.api.cheerpjRunMain(
        "com.sun.tools.javac.Main",
        CLASSPATH,
        ...filesToCompile,
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
      // Compilation failed, `diag` already explains why; nothing to
      // run.
      return;
    }

    // 5) Run the user's main() with /files/ on the classpath.
    const runResult = await this.runWithCapture(() =>
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
      "Java is compiled in your browser by `javac` (com.sun.tools.javac.Main) and the resulting bytecode is then JIT-compiled to JavaScript and executed by CheerpJ, a full OpenJDK runtime in WebAssembly. No server roundtrip. Pure-AOT alternatives like TeaVM aren't a fit for an in-browser playground because they require a JVM at compile time.",
  },
  // CodeMirror's clike mode handles Java syntax. `text/x-java` is the
  // standard MIME alias for Java inside that mode.
  codeMirrorMode: "text/x-java",
  // CheerpJ runtime from cjrtnc.leaningtech.com plus the CDN-hosted
  // tools.jar (~18 MB) that provides javac.
  coldDownloadMB: 30,
  // Compiles (javac) on every run, so later runs are faster, not instant.
  compiled: true,
  // clang-format LLVM style (see formatCode), keep in sync.
  indentWidth: 2,
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
  defaultFileExtension: "java",
  findEntryFiles(files): EntryFileInfo[] {
    const out: EntryFileInfo[] = [];
    for (const f of files) {
      if (!f.filename.endsWith(".java")) continue;
      if (hasJavaMain(f.content)) out.push({ filename: f.filename, kind: "main" });
    }
    return out;
  },
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
      and ship with CheerpJ&apos;s OpenJDK runtime, no install step needed.
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
      "Loading Java runtime…",
      0.08,
    );
    const api = await loadCheerpJ();
    const runtime = new JavaRuntime(api);
    // Compile + run a throwaway program now so the first user Run
    // doesn't pay the one-time tools.jar + javac + runtime class-load +
    // JIT cost (see `JavaRuntime.warmUp`). Done before resolving init so
    // the boot notice stays up, and `isRuntimeReady` only reports ready
    //, once the JVM can actually run code without a multi-second stall.
    await runtime.warmUp(setLoadingMessage);
    return runtime;
  },
};
