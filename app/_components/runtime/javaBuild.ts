/**
 * Compile-side logic for the Java playground: what to launch, what to
 * compile, and how to make javac's output readable.
 *
 * Kept out of `java.tsx` because none of it needs CheerpJ. The launcher
 * source this emits is real Java that a real `javac` can check, which is
 * what `__tests__/javaBuild.test.ts` does.
 */

/** The generated class `cheerpjRunMain` actually starts. */
export const LAUNCHER_CLASS = "__DataslopeMain";
export const LAUNCHER_FILENAME = `${LAUNCHER_CLASS}.java`;

/** Where a run's `.class` files go. Each run gets its own subdirectory so a
 *  class from an earlier compile can never be on the next run's classpath. */
export const CLASSES_ROOT = "/files/ds-classes";

// ─── Source scanning ───────────────────────────────────────────────────

/** Blank out comments and string/char literals so a keyword inside one
 *  can't be mistaken for a declaration. Lengths are preserved where it is
 *  cheap to do so, but callers must not rely on offsets into the result
 *  mapping back to the original. */
function stripLiterals(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

/** Detect whether a Java source file declares a `public static void main`. */
export function hasJavaMain(source: string): boolean {
  return /\b(?:public\s+)?static\s+(?:public\s+)?void\s+main\s*\(/.test(
    stripLiterals(source),
  );
}

/** The file's `package` declaration, or null for the default package. */
export function packageOf(source: string): string | null {
  const match =
    /(^|\n)\s*package\s+([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*;/.exec(
      stripLiterals(source),
    );
  return match ? match[2].replace(/\s+/g, "") : null;
}

/** Pick the class to run: the one declaring `main`, else the public class,
 *  else the first declared. Null when the file declares no class at all. */
export function declaredMainClass(source: string): string | null {
  const cleaned = stripLiterals(source);

  const classRegex =
    /\b(?:public\s+)?(?:final\s+|abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g;
  const classes: { name: string; start: number; isPublic: boolean }[] = [];
  for (let m; (m = classRegex.exec(cleaned)) !== null; ) {
    // Skip nested classes: brace depth > 0 means inside another class body
    // (literals/comments are already stripped, so braces are structural).
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
  if (classes.length === 0) return null;

  // Prefer a class whose "body" (chunk up to the next class declaration)
  // contains `public static void main(`.
  for (let i = 0; i < classes.length; i++) {
    const start = classes[i].start;
    const end = i + 1 < classes.length ? classes[i + 1].start : cleaned.length;
    if (
      /\bpublic\s+static\s+void\s+main\s*\(/.test(cleaned.slice(start, end))
    ) {
      return classes[i].name;
    }
  }

  const pub = classes.find((c) => c.isPublic);
  return (pub ?? classes[0]).name;
}

/** `declaredMainClass` with Java's conventional default, for callers that
 *  need a name to hand javac even when the file declares nothing. */
export function findMainClassName(source: string): string {
  return declaredMainClass(source) ?? "Main";
}

export interface JavaEntryPoint {
  /** Simple class name, e.g. `Main`. */
  className: string;
  /** Declared package, or null for the default package. */
  packageName: string | null;
  /** What javac emits and the launcher loads, e.g. `myapp.Main`. */
  binaryName: string;
}

/**
 * Resolve what a run should start.
 *
 * The filename is a hint of last resort, not the answer. `Main.java` may
 * declare `class Calculator`, and `package myapp;` moves the compiled class
 * to `myapp.Main` — launching the bare filename in either case runs
 * something other than what the editor shows, which is what JV-01 was.
 */
export function resolveEntryPoint(
  source: string,
  filename?: string,
): JavaEntryPoint {
  const fromFilename =
    (filename
      ? (filename.includes("/")
          ? filename.split("/").pop()!
          : filename
        ).replace(/\.java$/, "")
      : "") || null;
  // The declared class wins: it is what javac writes a `.class` for. The
  // filename only decides when the file declares nothing to launch.
  const className = declaredMainClass(source) ?? fromFilename ?? "Main";
  const packageName = packageOf(source);
  return {
    className,
    packageName,
    binaryName: packageName ? `${packageName}.${className}` : className,
  };
}

// ─── Launcher ──────────────────────────────────────────────────────────

export interface LauncherOptions {
  /** Fully-qualified class whose `main` to invoke. */
  binaryName: string;
  /** Virtual path stdin is read from, or null to hand the program EOF. */
  stdinPath: string | null;
  /** Value for `java.vm.version`, which CheerpJ leaves unset. */
  vmVersion: string;
  /** Name of this run's directory under `CLASSES_ROOT`; every sibling is a
   *  finished run and is deleted. */
  classesDirName: string;
}

/** Java string literal for a path we generate (no quotes or backslashes,
 *  but escaped anyway so a surprising workspace name can't break out). */
function javaString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Source for the class CheerpJ actually starts.
 *
 * It exists to do the four things the JVM's own launcher does and CheerpJ's
 * entry point does not: name the thread `main` (so a crash reads
 * `Exception in thread "main"` and not `"Thread-0"`), give `System.in`
 * something that ends (so `new Scanner(System.in)` returns instead of
 * hanging forever), fill in the `java.vm.version` property CheerpJ leaves
 * null, and delete the previous run's class files.
 *
 * It invokes `main` reflectively rather than calling it directly, so a
 * mis-detected entry class is a runtime message the user can read instead
 * of a compile error in a file they never wrote. The frames that costs are
 * taken back out of the trace by `JavaOutputRouter`.
 */
export function buildLauncherSource(options: LauncherOptions): string {
  const { binaryName, stdinPath, vmVersion, classesDirName } = options;
  const stdin = stdinPath
    ? `        java.io.InputStream in;
        try {
            in = new java.io.FileInputStream(${javaString(stdinPath)});
        } catch (Throwable e) {
            in = new java.io.ByteArrayInputStream(new byte[0]);
        }
        System.setIn(in);`
    : `        System.setIn(new java.io.ByteArrayInputStream(new byte[0]));`;

  return `public final class ${LAUNCHER_CLASS} {
    public static void main(String[] args) throws Throwable {
        Thread.currentThread().setName("main");
        try {
            if (System.getProperty("java.vm.version") == null) {
                System.setProperty("java.vm.version", ${javaString(vmVersion)});
            }
        } catch (Throwable ignored) {
        }
        try {
            prune();
        } catch (Throwable ignored) {
        }
${stdin}
        Class<?> target;
        try {
            target = Class.forName(${javaString(binaryName)});
        } catch (Throwable e) {
            System.err.println("Error: could not find or load main class ${binaryName}");
            System.err.println("Check that the class declaring \`public static void main\` is the one this file declares.");
            System.exit(1);
            return;
        }
        java.lang.reflect.Method entry;
        try {
            entry = target.getMethod("main", String[].class);
        } catch (Throwable e) {
            System.err.println("Error: class ${binaryName} has no \`public static void main(String[] args)\`.");
            System.exit(1);
            return;
        }
        try {
            entry.setAccessible(true);
        } catch (Throwable ignored) {
        }
        try {
            entry.invoke(null, (Object) new String[0]);
        } catch (java.lang.reflect.InvocationTargetException e) {
            throw e.getCause();
        }
    }

    /** Delete every finished run's class files, leaving this run's. */
    private static void prune() {
        java.io.File[] runs = new java.io.File(${javaString(CLASSES_ROOT)}).listFiles();
        if (runs == null) {
            return;
        }
        for (int i = 0; i < runs.length; i++) {
            if (!${javaString(classesDirName)}.equals(runs[i].getName())) {
                rmrf(runs[i]);
            }
        }
    }

    private static void rmrf(java.io.File file) {
        java.io.File[] children = file.listFiles();
        if (children != null) {
            for (int i = 0; i < children.length; i++) {
                rmrf(children[i]);
            }
        }
        file.delete();
    }
}
`;
}

/** Source for the throwaway class compiled and run during boot, which also
 *  clears class files left behind by previous page loads. */
export function buildWarmupSource(className: string): string {
  return `public final class ${className} {
    public static void main(String[] args) {
        try {
            rmrf(new java.io.File(${javaString(CLASSES_ROOT)}));
        } catch (Throwable ignored) {
        }
        System.out.print("");
    }

    private static void rmrf(java.io.File file) {
        java.io.File[] children = file.listFiles();
        if (children != null) {
            for (int i = 0; i < children.length; i++) {
                rmrf(children[i]);
            }
        }
        file.delete();
    }
}
`;
}

// ─── Diagnostics ───────────────────────────────────────────────────────

/**
 * Replace the virtual source directory with nothing, so a diagnostic names
 * the file the reader has open.
 *
 * `/str/` is CheerpJ's host-populated mount; the user has never seen it and
 * cannot navigate to it, and it prefixes every error and warning the
 * playground prints. Anchored to the start of a line, which is where javac
 * puts the path and where a line of echoed Java source cannot legally
 * begin.
 */
export function stripSourceDir(text: string, sourceDir: string): string {
  if (!sourceDir) return text;
  const escaped = sourceDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`^${escaped}`, "gm"), "");
}

/** One `symbol:` / `location:` pair that only exists in a newer Java. */
interface SymbolRule {
  symbol: RegExp;
  /** Omitted when the symbol alone identifies the feature. */
  location?: RegExp;
  note: string;
}

// javac reports a missing API as `cannot find symbol`, which reads like a
// typo. These are the ones a 2026 tutorial reaches for first.
const SYMBOL_RULES: SymbolRule[] = [
  { symbol: /^class var$/, note: "`var` (Java 10)" },
  {
    symbol: /^method of\(/,
    location: /^interface (List|Set|Map)\b/,
    note: "`List.of` / `Set.of` / `Map.of` (Java 9)",
  },
  {
    symbol: /^method copyOf\(/,
    location: /^interface (List|Set|Map)\b/,
    note: "`List.copyOf` / `Set.copyOf` / `Map.copyOf` (Java 10)",
  },
  {
    symbol: /^method entry\(/,
    location: /^interface Map\b/,
    note: "`Map.entry` (Java 9)",
  },
  {
    symbol: /^method of\(/,
    location: /^interface Path\b/,
    note: "`Path.of` (Java 11)",
  },
  {
    symbol: /^method (repeat|isBlank|strip|stripLeading|stripTrailing|lines)\(/,
    location: /^class String\b/,
    note: "`String.repeat` / `isBlank` / `strip` / `lines` (Java 11)",
  },
  {
    symbol: /^method formatted\(/,
    location: /^class String\b/,
    note: "`String.formatted` (Java 15)",
  },
  {
    symbol: /^method toList\(\)$/,
    location: /^interface Stream\b/,
    note: "`Stream.toList` (Java 16)",
  },
  {
    symbol: /^method (takeWhile|dropWhile|ofNullable)\(/,
    location: /^interface Stream\b/,
    note: "`Stream.takeWhile` / `dropWhile` / `ofNullable` (Java 9)",
  },
  {
    symbol: /^method toUnmodifiable(List|Set|Map)\(/,
    location: /^class Collectors\b/,
    note: "`Collectors.toUnmodifiableList` and friends (Java 10)",
  },
  {
    symbol: /^method (ifPresentOrElse|or|stream)\(/,
    location: /^class Optional\b/,
    note: "`Optional.ifPresentOrElse` / `or` / `stream` (Java 9)",
  },
  {
    symbol: /^method isEmpty\(\)$/,
    location: /^class Optional\b/,
    note: "`Optional.isEmpty` (Java 11)",
  },
  {
    symbol: /^method (readString|writeString)\(/,
    location: /^class Files\b/,
    note: "`Files.readString` / `writeString` (Java 11)",
  },
  {
    symbol: /^method requireNonNullElse(Get)?\(/,
    location: /^class Objects\b/,
    note: "`Objects.requireNonNullElse` (Java 9)",
  },
  {
    symbol: /^method (getFirst|getLast|reversed)\(\)$/,
    location: /^interface List\b/,
    note: "`List.getFirst` / `getLast` / `reversed` (Java 21)",
  },
];

/** Syntax that fails at parse time, so javac never reaches a `symbol:`
 *  line to attribute it to. Matched against the source instead. */
const SYNTAX_RULES: { test: RegExp; note: string; raw?: boolean }[] = [
  // Matched against the original source: an unterminated `"""` is exactly
  // what Java 8 chokes on, and `stripLiterals` would consume it first.
  { test: /"""/, note: 'text blocks (`"""`) (Java 15)', raw: true },
  {
    test: /(^|\n)[ \t]*(?:(?:public|private|protected|static|final|abstract)[ \t]+)*record[ \t]+[A-Z][\w$]*[ \t]*\(/,
    note: "`record` declarations (Java 16)",
  },
  {
    test: /\bsealed[ \t]+(?:(?:abstract|final|non-sealed|static)[ \t]+)*(?:class|interface)\b/,
    note: "`sealed` types (Java 17)",
  },
  { test: /(^|\n)[ \t]*case\b[^\n:]*->/, note: "arrow `switch` (Java 14)" },
  {
    test: /\binstanceof[ \t]+[A-Z][\w.$]*(?:<[^<>]*>)?(?:\[\])*[ \t]+[a-z_$][\w$]*\b/,
    note: "`instanceof` pattern matching (Java 16)",
  },
];

/**
 * Which newer-Java features the failed compile above was reaching for.
 *
 * Deliberately conservative: every rule is anchored to text javac itself
 * produced, or to syntax that has no other meaning in Java 8. A note that
 * fires on correct Java 8 would be worse than no note at all.
 */
export function java8Notes(diagnostics: string, sources: string[]): string[] {
  const notes: string[] = [];
  const add = (note: string) => {
    if (!notes.includes(note)) notes.push(note);
  };

  const lines = diagnostics.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const symbol = /^\s*symbol:\s+(.*?)\s*$/.exec(lines[i]);
    if (!symbol) continue;
    const next = /^\s*location:\s+(.*?)\s*$/.exec(lines[i + 1] ?? "");
    const location = next ? next[1] : null;
    for (const rule of SYMBOL_RULES) {
      if (!rule.symbol.test(symbol[1])) continue;
      if (rule.location && !(location && rule.location.test(location)))
        continue;
      add(rule.note);
      break;
    }
  }

  for (const source of sources) {
    const cleaned = stripLiterals(source);
    for (const rule of SYNTAX_RULES) {
      if (rule.test.test(rule.raw ? source : cleaned)) add(rule.note);
    }
  }

  return notes;
}

/** Append the version explanation to a failed compile's diagnostics. */
export function annotateJava8(diagnostics: string, sources: string[]): string {
  const notes = java8Notes(diagnostics, sources);
  if (notes.length === 0) return diagnostics;
  const body = notes.map((n) => `  • ${n}`).join("\n");
  return `${diagnostics}\n\nThis playground runs Java 8, and the code above uses newer Java:\n${body}`;
}
