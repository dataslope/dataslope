/**
 * How a C or C++ workspace becomes something browsercc can compile, and
 * how its output is made legible on the way back.
 *
 * browsercc exposes one entry point, `compile({ source, fileName, flags,
 * extraFiles })`: a single source string plus a read-only VFS. There is no
 * way to hand it several sources and link the objects, so a multi-file
 * workspace has to arrive as one translation unit either way.
 *
 * It used to arrive as a *concatenation*, non-entry files first, which
 * left every diagnostic attributed to the entry file at a line number
 * offset by the length of everything pasted in front of it: a warning
 * about `main.c` line 10 was reported as `main.c:18`, in a file 13 lines
 * long. `__LINE__` and `__FILE__` were wrong for the same reason.
 *
 * The sources are `#include`d instead. That is still one translation unit,
 * with the same linkage collisions, but the compiler now does the
 * bookkeeping: every diagnostic, `__LINE__` and `__FILE__` names the file
 * the reader is looking at, at the line they are looking at.
 */

export type CFamilyLanguage = "c" | "cpp";

/** Sources for a language, and the headers that ride along in the VFS. */
const SOURCE_EXTENSIONS: Record<CFamilyLanguage, RegExp> = {
  c: /\.c$/i,
  cpp: /\.(cpp|cc|cxx|c\+\+)$/i,
};

const HEADER_EXTENSIONS: Record<CFamilyLanguage, RegExp> = {
  c: /\.h$/i,
  cpp: /\.(h|hpp|hh|hxx|h\+\+)$/i,
};

/** Name of the synthetic unit. It holds no user code, so it should never
 *  appear in a diagnostic; if it does, the name says what it is. */
export const TRANSLATION_UNIT_NAME: Record<CFamilyLanguage, string> = {
  c: "__dataslope_unit.c",
  cpp: "__dataslope_unit.cpp",
};

/** Path that stdin is read from, when the workspace provides one. */
export const STDIN_FILENAME = "stdin.txt";

export interface TranslationUnit {
  /** The source handed to browsercc. */
  source: string;
  /** Its name, for the compiler's own diagnostics. */
  fileName: string;
  /** VFS contents: every source and header, at its workspace path. */
  extraFiles: Record<string, string>;
  /** Sources included, in order, entry last. */
  includedSources: string[];
}

/** A C string literal for an `#include`, so a path with a quote or a
 *  backslash cannot break out of the directive. */
function quoteIncludePath(path: string): string {
  return `"${path.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Assemble the single translation unit browsercc compiles.
 *
 * `entryCode` wins over any staged copy of the entry: the editor's buffer
 * is what Run means. Non-entry sources come first, as before, so a helper
 * defined without a prior declaration still resolves.
 */
export function composeTranslationUnit(options: {
  language: CFamilyLanguage;
  entryPath: string;
  entryCode: string;
  /** Workspace files as [path, contents]; non-source files are ignored. */
  files: Array<[string, string]>;
}): TranslationUnit {
  const { language, entryPath, entryCode, files } = options;
  const isSource = SOURCE_EXTENSIONS[language];
  const isHeader = HEADER_EXTENSIONS[language];

  const extraFiles: Record<string, string> = {};
  const others: string[] = [];
  for (const [path, content] of files) {
    if (path === entryPath) continue;
    if (isSource.test(path)) {
      extraFiles[path] = content;
      others.push(path);
    } else if (isHeader.test(path)) {
      extraFiles[path] = content;
    }
  }
  others.sort();

  extraFiles[entryPath] = entryCode;
  const includedSources = [...others, entryPath];

  const source =
    includedSources.map((p) => `#include ${quoteIncludePath(p)}`).join("\n") +
    "\n";

  return {
    source,
    fileName: TRANSLATION_UNIT_NAME[language],
    extraFiles,
    includedSources,
  };
}

// ─── Diagnostics ────────────────────────────────────────────────────────

/** lld names the object it was given, which is a build artefact under a
 *  temp path the reader has never seen: `/tmp/main-f0ba80.o`. */
const TEMP_OBJECT_RE = /(?:\/tmp\/)?[\w.-]+-[0-9a-f]{6,}\.o\b/g;

/**
 * Make linker diagnostics name the workspace instead of the build.
 *
 * Everything is one translation unit, so exactly one object exists and it
 * is the whole program: naming it after the entry file is both accurate
 * and navigable.
 */
export function rewriteObjectPaths(text: string, entryPath: string): string {
  return text.replace(TEMP_OBJECT_RE, entryPath);
}

/** Flags a diagnostic recommends that this playground cannot supply, and
 *  what to say instead. Suggesting a flag is worse than saying nothing
 *  when there is nowhere to type one. */
const UNAVAILABLE_FLAG_NOTES: Array<{ match: RegExp; note: string }> = [
  {
    match: /-D_WASI_EMULATED_PROCESS_CLOCKS|-lwasi-emulated-process-clocks/,
    note:
      "note: this playground compiles with a fixed set of flags, so the flag suggested above " +
      "cannot be added. clock() is unavailable here; time(NULL) and clock_gettime() work.",
  },
  {
    match: /-lc-printscan-long-double/,
    note:
      "note: this playground compiles with a fixed set of flags, so the flag suggested above " +
      "cannot be added. Print a long double by casting it to double first.",
  },
  {
    match: /cannot use '(?:throw|try)' with exceptions disabled/,
    note:
      "note: this playground builds C++ with -fno-exceptions, which cannot be turned off here. " +
      "Report failures with return values, std::optional or std::expected instead.",
  },
];

/** Append a note wherever a diagnostic recommends something unreachable. */
export function annotateUnavailableFlags(text: string): string {
  const notes = UNAVAILABLE_FLAG_NOTES.filter(({ match }) => match.test(text))
    .map(({ note }) => note);
  if (notes.length === 0) return text;
  return [text.replace(/\n+$/, ""), ...notes].join("\n");
}

/**
 * Strip the synthetic unit from view.
 *
 * Because the reader's files are included rather than pasted, clang
 * resolves them relative to the includer and prints `./main.c`, and
 * prefixes each group with `In file included from __dataslope_unit.c:2:`.
 * Neither names anything the reader has; both go.
 */
export function hideTranslationUnit(
  text: string,
  language: CFamilyLanguage,
): string {
  const unit = TRANSLATION_UNIT_NAME[language];
  return text
    .split("\n")
    .filter((line) => !line.startsWith(`In file included from ${unit}:`))
    .map((line) => line.replace(/(^|\s|')\.\//g, "$1"))
    .join("\n");
}

/** Compiler and linker output, made to name the reader's own files. */
export function cleanBuildOutput(
  text: string,
  entryPath: string,
  language: CFamilyLanguage,
): string {
  return annotateUnavailableFlags(
    hideTranslationUnit(rewriteObjectPaths(text, entryPath), language),
  );
}

/**
 * Flags the build adds when the toolchain accepts them.
 *
 * Each is verified once against a trivial program and dropped if the
 * toolchain refuses it, so a flag this build does not support costs one
 * probe rather than breaking every compile.
 */
export const OPTIONAL_FLAGS: Record<CFamilyLanguage, string[]> = {
  c: [
    // `__FILE__` should read `main.c`, not `./main.c`: the reader's file is
    // included from the synthetic unit, so clang resolves it relatively.
    "-fmacro-prefix-map=./=",
    // Catches the sprintf-into-a-4-byte-buffer class at compile time,
    // which matters more here than on a real machine: nothing traps at
    // runtime in wasm.
    "-D_FORTIFY_SOURCE=2",
    // printf("%Lf") otherwise traps at runtime with advice to add exactly
    // this flag, which there is nowhere to type.
    "-lc-printscan-long-double",
  ],
  cpp: [
    "-fmacro-prefix-map=./=",
    // The C build has had -Wall all along; the C++ build had no warning
    // flags at all.
    "-Wall",
    "-D_FORTIFY_SOURCE=2",
    "-lc-printscan-long-double",
  ],
};

/** A program small enough to compile instantly, for probing flags. */
export const FLAG_PROBE_SOURCE: Record<CFamilyLanguage, string> = {
  c: "int main(void) { return 0; }\n",
  cpp: "int main() { return 0; }\n",
};

// ─── Exit status ────────────────────────────────────────────────────────

export interface ExitReport {
  /** True when the program did not finish normally. */
  failed: boolean;
  /** The line to print, or null when the program exited cleanly. */
  message: string | null;
}

/**
 * What to say about how the program ended.
 *
 * A shell reports the low eight bits, so `return -2` is `254` there and
 * was `-2` here: the reader comparing against their own terminal saw two
 * different numbers for the same program. Both are shown, the shell's
 * first.
 */
export function describeExit(exitCode: number): ExitReport {
  if (exitCode === 0) return { failed: false, message: null };
  const masked = exitCode & 0xff;
  if (masked === exitCode) {
    return { failed: true, message: `Program exited with code ${exitCode}.` };
  }
  return {
    failed: true,
    message: `Program exited with code ${masked} (returned ${exitCode}).`,
  };
}

/**
 * A wasm trap, in terms of what the program did.
 *
 * The runtime reports `unreachable` for everything from a failed
 * `assert()` to a stack overflow, which tells a reader nothing. These are
 * the cases worth naming; anything else keeps the raw message.
 */
export function describeTrap(message: string): string {
  if (/call stack exhausted|Maximum call stack/i.test(message)) {
    return (
      "The program ran out of stack. This is usually infinite recursion, or a very " +
      "large local array."
    );
  }
  if (/unreachable/i.test(message)) {
    return (
      "The program stopped at a trap. A failed assert(), abort(), or a standard " +
      "library check that cannot throw (this build uses -fno-exceptions) all end here."
    );
  }
  if (/out of bounds memory access|memory access out of bounds/i.test(message)) {
    return "The program read or wrote outside its memory.";
  }
  return `The program stopped: ${message}`;
}
