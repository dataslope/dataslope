import type {
  EmitOutput,
  ExampleSnippet,
  EntryFileInfo,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
} from "../types";
import {
  CHEERPJ_VERSION,
  loadCheerpJ,
  TOOLS_JAR_VFS_PATH,
  type CheerpJApi,
} from "./cheerpj";
import { getClangFormat } from "./clangFormat";
import {
  annotateJava8,
  buildLauncherSource,
  buildWarmupSource,
  CLASSES_ROOT,
  hasJavaMain,
  LAUNCHER_CLASS,
  LAUNCHER_FILENAME,
  resolveEntryPoint,
  stripSourceDir,
} from "./javaBuild";
import { JavaOutputRouter, type JavaChannel } from "./javaOutput";
import { STDIN_FILENAME } from "./stdinFile";

// Java in the browser via CheerpJ (OpenJDK + JIT in WebAssembly). CheerpJ
// doesn't ship tools.jar, so a Java 8 tools.jar is fetched from a CDN and
// mounted in /str/ (see cheerpj.ts); javac compiles user source and
// cheerpjRunMain runs it — the JavaFiddle approach. Targets Java 8 because
// that's what the bundled tools.jar compiles against.

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

const PACKAGES: PackageInfo[] = [
  // Java 8 stdlib highlights; clicking inserts the `import`.
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

const SOURCE_DIR = "/str/";
const COMPILER_MAIN = "com.sun.tools.javac.Main";
/** Boot warm-up classes: a fixed path, rewritten on every page load. */
const BOOT_DIR = "/files/ds-boot/";
/** Where the workspace's `stdin.txt` is staged for the launcher to open. */
const STDIN_VFS_PATH = `${SOURCE_DIR}__dataslope_stdin`;
const WARMUP_CLASS = "__DataslopeWarmup";

/**
 * How long a run may take before the host stops it.
 *
 * CheerpJ executes on the browser's main thread, so this timer only fires
 * for a program that is *waiting* — the case a Stop button would otherwise
 * have to be clicked for. A program spinning in `while (true)` holds the
 * thread and the timer with it; nothing short of running the JVM in a
 * worker fixes that one, and CheerpJ does not support it.
 */
const RUN_TIMEOUT_MS = 20_000;

/** Workspace-relative path reduced to the flat name CheerpJ's `/str/` uses. */
function basename(path: string): string {
  return path.includes("/") ? path.split("/").pop()! : path;
}

class JavaRuntime implements LanguageRuntime {
  // /str/ paths staged by prepareFileSystem; run() adds the active file.
  private stagedJavaPaths: string[] = [];
  /** Staged source text, for the Java 8 notes on a failed compile. */
  private stagedSources: string[] = [];
  /** `stdin.txt`, when the workspace has one. */
  private stdinBytes: Uint8Array | null = null;
  // Warm-up runs once per instance.
  private warmedUp = false;
  /** Run counter; names this run's class directory. */
  private runSeq = 0;
  /** Where CheerpJ's console writes go, or null when no run owns them. */
  private sink: ((channel: JavaChannel, text: string) => void) | null = null;
  /** Rejects the run in flight, for Stop and for the timeout. */
  private abortActiveRun: ((err: Error) => void) | null = null;

  constructor(private api: CheerpJApi) {
    this.interceptConsole();
  }

  /**
   * Route CheerpJ's only System.out/System.err sink through this runtime.
   *
   * Installed once and left in place rather than wrapped around each run:
   * a run that was stopped or timed out is still executing inside the JVM,
   * so a `finally` that restored the console would never run, and the next
   * run would patch the patch. With one permanent hook, dropping `sink` is
   * enough to disown an abandoned program — whatever it prints afterwards
   * goes to the browser console, where it came from, instead of into
   * somebody else's output pane. When no run owns the sink the original
   * console methods are called, so the page behaves normally.
   *
   * Each write arrives as one console call INCLUDING its own newline bytes,
   * so arguments are concatenated verbatim; adding "\n" per call would
   * double-space every program's output.
   */
  private interceptConsole(): void {
    const origLog = console.log.bind(console);
    const origErr = console.error.bind(console);
    console.log = (...args: unknown[]) => {
      if (!this.sink) {
        origLog(...args);
        return;
      }
      this.sink("stdout", args.map(String).join(" "));
    };
    console.error = (...args: unknown[]) => {
      if (!this.sink) {
        origErr(...args);
        return;
      }
      this.sink("stderr", args.map(String).join(" "));
    };
  }

  /** Run one `cheerpjRunMain` with its output collected rather than
   *  streamed — what javac needs, since a diagnostic is only readable once
   *  the whole block has arrived. */
  private async runCollected(
    fn: () => Promise<number>,
  ): Promise<{ exitCode: number; text: string }> {
    let text = "";
    const previous = this.sink;
    this.sink = (_channel, chunk) => {
      text += chunk;
    };
    try {
      const exitCode = await fn();
      return { exitCode, text };
    } finally {
      this.sink = previous;
    }
  }

  /**
   * Stop the running program.
   *
   * CheerpJ offers no way to interrupt a running JVM, so this disowns the
   * run rather than killing it: the `run()` promise rejects, the output
   * already on screen stays (it is the part that says where the program
   * got to), and anything the abandoned program prints later is no longer
   * routed to the pane. That is enough for the case this exists for — a
   * program blocked on input or asleep — and it returns the playground to
   * the user without a page reload.
   */
  async cancelRun(): Promise<void> {
    const abort = this.abortActiveRun;
    this.abortActiveRun = null;
    if (!abort) return;
    const err = new Error("Run stopped.");
    err.name = "RunCancelledError";
    abort(err);
  }

  /** Compile and run a throwaway program so the first-use costs (tools.jar,
   *  javac, core class-load + JIT — all lazy on the first cheerpjRunMain)
   *  happen behind the boot animation instead of on the learner's first
   *  Run. It also deletes class files left behind by earlier page loads,
   *  which is the one moment nothing can be using them. Best-effort:
   *  failures are swallowed. */
  async warmUp(
    report?: (message: string, fraction?: number) => void,
  ): Promise<void> {
    if (this.warmedUp) return;
    this.warmedUp = true;
    try {
      const sourcePath = `${SOURCE_DIR}${WARMUP_CLASS}.java`;
      this.api.cheerpjAddStringFile(
        sourcePath,
        new TextEncoder().encode(buildWarmupSource(WARMUP_CLASS)),
      );
      report?.("Warming up the Java compiler…", 0.55);
      // javac refuses a `-d` that does not exist, and `/files/` starts out
      // empty on a first visit.
      await this.api.mkdirp(BOOT_DIR);
      const compiled = await this.runCollected(() =>
        this.api.cheerpjRunMain(
          COMPILER_MAIN,
          `${TOOLS_JAR_VFS_PATH}:${BOOT_DIR}`,
          sourcePath,
          "-d",
          BOOT_DIR,
        ),
      );
      if (compiled.exitCode === 0) {
        report?.("Warming up the Java runtime…", 0.85);
        await this.runCollected(() =>
          this.api.cheerpjRunMain(WARMUP_CLASS, BOOT_DIR),
        );
      }
    } catch {
      // Warm-up is best-effort, never let it block real runs.
    }
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    this.stagedJavaPaths = [];
    this.stagedSources = [];
    this.stdinBytes = null;
    const decoder = new TextDecoder();
    for (const [path, bytes] of files) {
      // Basename only: CheerpJ's /str/ is a flat virtual filesystem.
      const filename = basename(path);
      if (filename === STDIN_FILENAME) {
        this.stdinBytes = bytes;
        continue;
      }
      if (!filename.endsWith(".java")) continue;
      const virtualPath = `${SOURCE_DIR}${filename}`;
      this.api.cheerpjAddStringFile(virtualPath, bytes);
      if (!this.stagedJavaPaths.includes(virtualPath)) {
        this.stagedJavaPaths.push(virtualPath);
        this.stagedSources.push(decoder.decode(bytes));
      }
    }
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    // What to launch comes from the source, not the filename: `Main.java`
    // may declare `class Calculator`, and a `package` line moves the
    // compiled class somewhere the bare filename does not name.
    const entry = resolveEntryPoint(code, options?.entryFilename);
    const entryFilename = options?.entryFilename
      ? basename(options.entryFilename)
      : `${entry.className}.java`;
    const sourcePath = `${SOURCE_DIR}${entryFilename}`;

    // Mount the user's source; always update the active file so unsaved
    // edits win over an older prepareFileSystem copy.
    const encoder = new TextEncoder();
    this.api.cheerpjAddStringFile(sourcePath, encoder.encode(code));

    // A directory of its own per run. `cheerpjAddStringFile` cannot delete,
    // and `/files/` survives reloads, so a shared output directory meant
    // javac's fresh `myapp/Main.class` sat beside a stale top-level
    // `Main.class` and the launcher found the stale one. Nothing an earlier
    // compile produced is on this run's classpath at all.
    const runDirName = `r${++this.runSeq}`;
    const outputDir = `${CLASSES_ROOT}/${runDirName}/`;
    // Make it first. javac creates the package subdirectories under `-d`
    // but never `-d` itself: pointed at a directory that does not exist it
    // compiles nothing and prints `javac: directory not found`.
    await this.api.mkdirp(outputDir);

    let stdinPath: string | null = null;
    if (this.stdinBytes) {
      this.api.cheerpjAddStringFile(STDIN_VFS_PATH, this.stdinBytes);
      stdinPath = STDIN_VFS_PATH;
    }

    const launcherPath = `${SOURCE_DIR}${LAUNCHER_FILENAME}`;
    this.api.cheerpjAddStringFile(
      launcherPath,
      encoder.encode(
        buildLauncherSource({
          binaryName: entry.binaryName,
          stdinPath,
          vmVersion: CHEERPJ_VERSION,
          classesDirName: runDirName,
        }),
      ),
    );

    // Staged workspace files plus the active file (which may not be staged
    // for single-file workspaces) plus the launcher.
    const filesToCompile = [
      ...this.stagedJavaPaths.filter((p) => p !== sourcePath),
      sourcePath,
      launcherPath,
    ];

    // Compile everything in one javac invocation so cross-file references
    // resolve. `-g:lines,source` is javac's default and is passed anyway,
    // because a stack trace without line numbers is barely a stack trace.
    // `-Xlint` matches JavaFiddle's defaults.
    const javacResult = await this.runCollected(() =>
      this.api.cheerpjRunMain(
        COMPILER_MAIN,
        `${TOOLS_JAR_VFS_PATH}:${outputDir}`,
        ...filesToCompile,
        "-d",
        outputDir,
        "-g:lines,source",
        "-Xlint",
      ),
    );

    // Treat all javac output as compile diagnostics so warnings show too.
    let diag = stripSourceDir(javacResult.text, SOURCE_DIR).replace(/\n+$/, "");
    if (javacResult.exitCode !== 0) {
      diag = annotateJava8(diag, [code, ...this.stagedSources]);
    }
    if (diag) emit({ type: "stderr", content: diag }, 0, false);

    if (javacResult.exitCode !== 0) {
      // Compilation failed; `diag` already explains why.
      return;
    }

    const router = new JavaOutputRouter(
      (chunk) =>
        emit(
          { type: chunk.channel, content: chunk.content },
          chunk.seq,
          chunk.append,
        ),
      { firstSeq: diag ? 1 : 0 },
    );
    this.sink = (channel, text) => router.write(channel, text);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<never>((_resolve, reject) => {
      this.abortActiveRun = reject;
      timer = setTimeout(() => {
        const seconds = Math.round(RUN_TIMEOUT_MS / 1000);
        // Disown first: the JVM keeps running, and nothing it prints from
        // here belongs under a run that has been called off.
        this.sink = null;
        router.flush();
        emit(
          {
            type: "stderr",
            content:
              `Stopped after ${seconds}s: the program was still running. ` +
              "Output it produced before then is above.",
          },
          router.nextSeq,
          false,
        );
        void this.cancelRun();
      }, RUN_TIMEOUT_MS);
    });

    try {
      const running = this.api.cheerpjRunMain(LAUNCHER_CLASS, outputDir);
      // A disowned run must not raise an unhandled rejection later.
      void running.catch(() => {});
      const exitCode = await Promise.race([running, guard]);
      router.flush();
      if (exitCode !== 0) {
        emit(
          {
            type: "stderr",
            content: `Program exited with code ${exitCode}.`,
          },
          router.nextSeq,
          false,
        );
      }
    } catch (err) {
      router.flush();
      throw err;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      this.abortActiveRun = null;
      this.sink = null;
    }
  }
}

export const javaAdapter: LanguageAdapter = {
  id: "java",
  displayName: "Java Playground",
  logoText: "Jv",
  documentTitle: "Java Playground",
  readyStatus: "Java 8 ready",
  runtimeInfo: {
    language: "Java",
    version: "8 (Update 492)",
    engine: "CheerpJ (OpenJDK + javac, WebAssembly)",
    engineUrl: "https://cheerpj.com/",
    notes:
      "Java is compiled in your browser by `javac` (com.sun.tools.javac.Main) and the resulting bytecode is then JIT-compiled to JavaScript and executed by CheerpJ, a full OpenJDK runtime in WebAssembly. No server roundtrip. Pure-AOT alternatives like TeaVM aren't a fit for an in-browser playground because they require a JVM at compile time.\n\nThe language level is Java 8, so `var`, `List.of`, records and text blocks don't compile.\n\nFor standard input, add a file named `stdin.txt` to the workspace and it is fed to the program as `System.in`. Without one, a read returns end-of-file straight away rather than waiting for input that can never arrive.\n\nThree things this runtime does not do, all of them CheerpJ's rather than the compiler's. Stack traces carry no line numbers, so every frame reads `Unknown Source` (`javac` does emit the line table). Exceptions thrown by the VM itself (`ArithmeticException: / by zero`, `ArrayIndexOutOfBoundsException: 5`) arrive without their detail message, while exceptions constructed in Java code keep theirs. And some runtime checks the language relies on are not enforced: storing an `Integer` into a `String[]` held as `Object[]` should throw `ArrayStoreException` and does not.\n\nJava runs on the browser's main thread. Output appears as the program writes it, and a program that waits can be stopped, or is stopped for you after 20 seconds. A program spinning in a tight loop is the exception: it holds the thread, so nothing repaints and `while (true)` still needs the tab reloaded.",
  },
  // CodeMirror's clike mode handles Java syntax. `text/x-java` is the
  // standard MIME alias for Java inside that mode.
  codeMirrorMode: "text/x-java",
  // CheerpJ runtime from cjrtnc.leaningtech.com plus the CDN-hosted
  // tools.jar (~18 MB) that provides javac.
  coldDownloadMB: 30,
  // Compiles (javac) on every run, so later runs are faster, not instant.
  compiled: true,
  // `stdin.txt` staged into /str/ and opened as System.in by the launcher.
  supportsStdin: true,
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
      if (!hasJavaMain(f.content)) continue;
      // Label by the class that will actually be launched, package and
      // all, rather than by the filename it happens to live in.
      const { binaryName } = resolveEntryPoint(f.content, f.filename);
      out.push({ filename: f.filename, kind: "main", label: binaryName });
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
