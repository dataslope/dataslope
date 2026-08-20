/**
 * What the C# playground sends to Roslyn, and how what comes back is read.
 *
 * The runtime is a ~35 MB CDN download, so everything here is kept free of
 * it: composing the compilation unit, mapping diagnostics back onto the
 * files the reader has open, and turning the scripting host's own
 * bookkeeping (a reflection wrapper, a JavaScript exit object) into
 * sentences. `__tests__/csharpBuild.test.ts` drives the real runtime where
 * the bundle is on disk, so these are checked against Roslyn rather than
 * against an idea of Roslyn.
 */

import { STDIN_FILENAME } from "./stdinFile";

export { STDIN_FILENAME };

/** Strip block + line comments and string/char literals so simple
 *  regex probes don't false-match inside them. */
export function stripCSharpNoise(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/@?"(?:""|\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

/** Returns true if `source` declares an explicit `static … Main(` method.
 *  Matches both `Main` and `Main<T>(...)` style entrypoints. */
export function hasCSharpExplicitMain(source: string): boolean {
  const cleaned = stripCSharpNoise(source);
  return /\bstatic\s+(?:async\s+)?[\w<>?\[\],.\s]*?\bMain\s*\(/.test(cleaned);
}

/** True when `source` contains C# top-level statements, i.e. its first
 *  executable token is at file scope. */
export function hasCSharpTopLevel(source: string): boolean {
  const cleaned = stripCSharpNoise(source);
  const lines = cleaned.split("\n");
  let depth = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (depth > 0) {
      // Track brace depth to skip namespace/type bodies.
      depth +=
        (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      continue;
    }
    if (/^(?:global\s+)?using(?:\s+static)?\s.*;$/.test(line)) continue;
    const NAMESPACE_RE = /^namespace\b/;
    const TYPE_DECL_RE =
      /^(?:public\s+|internal\s+|sealed\s+|abstract\s+|static\s+|partial\s+)*(?:class|struct|record|interface|enum)\b/;
    if (NAMESPACE_RE.test(line) || TYPE_DECL_RE.test(line)) {
      depth +=
        (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      continue;
    }
    // First file-scope executable token = top-level statements.
    return true;
  }
  return false;
}

/**
 * Split off a file's leading `using` directives.
 *
 * They have to be hoisted rather than left where they are: C# requires
 * every using directive to precede the first statement, and the composed
 * unit puts several files' worth of code in a row. `consumedLines` is how
 * far into the original file the remaining body starts, which is what the
 * `#line` directive needs to put the reader's line numbers back.
 */
export function stripCSharpUsings(source: string): {
  usings: string[];
  body: string;
  consumedLines: number;
} {
  const lines = source.split("\n");
  const usings: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const isUsing =
      // Matches: using Ns;  using static Ns.T;  using A = Ns;  global using Ns;
      /^(?:global\s+)?using(?:\s+static)?\s/.test(trimmed) &&
      trimmed.endsWith(";");
    if (trimmed === "" || trimmed.startsWith("//") || isUsing) {
      if (isUsing) usings.push(trimmed);
      i++;
    } else {
      break;
    }
  }
  return { usings, body: lines.slice(i).join("\n"), consumedLines: i };
}

// ─── Instrumentation injected into the compilation unit ────────────────

/** Where the injected `FirstChanceException` handler parks the exception it
 *  saw, for `formatUncaught` to read after the run. */
export const LAST_EXCEPTION_KEY = "__dataslopeCSharpLastException";

/**
 * Statements the playground adds ahead of the reader's own.
 *
 * They sit behind `#line hidden`, so none of them can be named by a
 * diagnostic, and they are emitted only for a program made of top-level
 * statements — an explicit `Main` has no file-scope statement position to
 * put them in.
 */
function preludeStatements(stdin: string | null): string[] {
  if (stdin === null) return [];
  return [
    `System.Console.SetIn(new System.IO.StringReader(${csharpString(stdin)}));`,
  ];
}

/**
 * Installed once at boot, not per run.
 *
 * The scripting host invokes the program by reflection and then reports
 * `ex.Message`, which for a `TargetInvocationException` is the sentence
 * "Exception has been thrown by the target of an invocation." and nothing
 * about what went wrong. `FirstChanceException` sees the real exception at
 * the throw site, with its type and its frames, and parks its `ToString()`
 * where the host can read it.
 *
 * It has to be installed exactly once: the handler list belongs to the
 * AppDomain, which outlives a run, so subscribing per run stacked up a
 * handler per Run pressed. Left that way, an `Environment.Exit` fired all
 * of them into a runtime that was already tearing down, and every run
 * after it failed.
 */
export const EXCEPTION_HOOK_SOURCE =
  `System.AppDomain.CurrentDomain.FirstChanceException += (__dsSender, __dsArgs) => ` +
  `System.Runtime.InteropServices.JavaScript.JSHost.GlobalThis.SetProperty(` +
  `${JSON.stringify(LAST_EXCEPTION_KEY)}, __dsArgs.Exception.ToString());`;

/** A C# string literal. Verbatim escapes only, so the result is one line
 *  however many newlines the value carries. */
export function csharpString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    // Any remaining control character becomes an escape: Roslyn will not
    // take a raw one inside a literal, and stdin is arbitrary user text.
    .replace(
      /[\u0000-\u001f]/g,
      (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
    );
  return `"${escaped}"`;
}

export interface ComposeOptions {
  /** Workspace-relative name of the file holding the program. */
  entryFilename: string;
  /** The entry file's current text (the editor buffer, not a staged copy). */
  entryCode: string;
  /** Every other `.cs` file in the workspace, as [filename, text]. */
  files: Array<[string, string]>;
  /** Contents of `stdin.txt`, or null when the workspace has none. */
  stdin: string | null;
  /** Add the prelude. Off for an explicit-`Main` entry, and off for the
   *  retry that runs after a failure blamed on the prelude itself. */
  instrument: boolean;
}

export interface ComposedProgram {
  /** The text handed to the scripting host. */
  source: string;
  /** Each file's lines, for echoing the line a diagnostic names. */
  sources: Map<string, string[]>;
}

/**
 * Build one compilation unit out of the workspace.
 *
 * The host compiles a single unit, so the files are concatenated — but
 * every file's body is introduced by a `#line` directive naming it, which
 * is what makes Roslyn report `Greeter.cs(4,25)` instead of a position in
 * a combined text nobody can see. Top-level statements come first because
 * C# requires them to precede type declarations; putting a class file
 * first is what produced a phantom `CS8803` pointing into a file the
 * reader had not touched.
 */
export function composeProgram(options: ComposeOptions): ComposedProgram {
  const { entryFilename, entryCode, files, stdin, instrument } = options;

  const sources = new Map<string, string[]>();
  sources.set(entryFilename, entryCode.split("\n"));

  const entry = stripCSharpUsings(entryCode);
  const usings: string[] = [...entry.usings];
  const bodies: { filename: string; startLine: number; body: string }[] = [];

  for (const [filename, text] of files) {
    if (filename === entryFilename) continue;
    sources.set(filename, text.split("\n"));
    const part = stripCSharpUsings(text);
    usings.push(...part.usings);
    if (part.body.trim()) {
      bodies.push({
        filename,
        startLine: part.consumedLines + 1,
        body: part.body,
      });
    }
  }

  const lines: string[] = [...new Set(usings)];
  if (instrument) {
    lines.push("#line hidden");
    lines.push(...preludeStatements(stdin));
  }
  lines.push(`#line ${entry.consumedLines + 1} ${csharpString(entryFilename)}`);
  lines.push(entry.body);
  for (const part of bodies) {
    lines.push(`#line ${part.startLine} ${csharpString(part.filename)}`);
    lines.push(part.body);
  }

  return { source: lines.join("\n"), sources };
}

// ─── Diagnostics ───────────────────────────────────────────────────────

export interface CSharpDiagnostic {
  /** File the diagnostic maps to, or null when it landed outside any
   *  `#line` region — which means it is about code the reader never wrote. */
  filename: string | null;
  line: number | null;
  column: number | null;
  severity: string;
  /** e.g. `CS0029`. */
  code: string;
  message: string;
  /** The line exactly as Roslyn wrote it, for anything unparseable. */
  raw: string;
}

/** `Greeter.cs(4,25): error CS0029: message`, and the same without a file
 *  (which is what every diagnostic looked like before `#line`). */
const DIAGNOSTIC_RE =
  /^(?:(.*?))?\((\d+),(\d+)\):\s*(error|warning|info)\s+([A-Za-z]+\d+):\s*(.*)$/;

export function parseDiagnostics(text: string): CSharpDiagnostic[] {
  const out: CSharpDiagnostic[] = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    const match = DIAGNOSTIC_RE.exec(raw);
    if (!match) {
      out.push({
        filename: null,
        line: null,
        column: null,
        severity: "error",
        code: "",
        message: raw,
        raw,
      });
      continue;
    }
    const filename = match[1]?.trim() ?? "";
    out.push({
      filename: filename || null,
      line: Number(match[2]),
      column: Number(match[3]),
      severity: match[4],
      code: match[5],
      message: match[6],
      raw,
    });
  }
  return out;
}

/** True when the host reported a failed compile rather than a program
 *  that threw: only Roslyn writes `file(line,col): error CSnnnn:`. */
export function looksLikeDiagnostics(text: string): boolean {
  return text.split("\n").some((line) => DIAGNOSTIC_RE.test(line));
}

/** True when every diagnostic names a file the reader has open. A
 *  diagnostic that names none came from the prelude or the host's own
 *  preamble, and blaming the reader for it would be a lie. */
export function allDiagnosticsMapped(
  diagnostics: CSharpDiagnostic[],
  sources: Map<string, string[]>,
): boolean {
  return diagnostics.every(
    (d) => d.filename !== null && sources.has(d.filename),
  );
}

/**
 * Render diagnostics the way a compiler does: position, message, the line
 * it happened on, and a caret under the column.
 *
 * Roslyn emits them in the order it found them, which put a parse error
 * from line 5 above a type error from line 1; they are sorted by position
 * so reading top to bottom walks down the file.
 */
export function renderDiagnostics(
  diagnostics: CSharpDiagnostic[],
  sources: Map<string, string[]>,
): string {
  const sorted = [...diagnostics].sort((a, b) => {
    const fileA = a.filename ?? "";
    const fileB = b.filename ?? "";
    if (fileA !== fileB) return fileA.localeCompare(fileB);
    return (a.line ?? 0) - (b.line ?? 0) || (a.column ?? 0) - (b.column ?? 0);
  });

  const blocks: string[] = [];
  for (const diagnostic of sorted) {
    if (diagnostic.filename === null || diagnostic.line === null) {
      blocks.push(diagnostic.raw);
      continue;
    }
    const head =
      `${diagnostic.filename}(${diagnostic.line},${diagnostic.column}): ` +
      `${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`;
    const source = sources.get(diagnostic.filename)?.[diagnostic.line - 1];
    if (source === undefined) {
      blocks.push(head);
      continue;
    }
    // Tabs are one column to the compiler and several on screen; keeping
    // them in the caret row is what makes it line up.
    const column = Math.max(1, diagnostic.column ?? 1);
    const prefix = source.slice(0, column - 1).replace(/[^\t]/g, " ");
    blocks.push(`${head}\n${source}\n${prefix}^`);
  }
  return blocks.join("\n");
}

// ─── Runtime failures ──────────────────────────────────────────────────

/** `TargetInvocationException`'s message. The host invokes the program by
 *  reflection, so this is the first line of every uncaught failure and
 *  says nothing about the program. */
const REFLECTION_WRAPPER =
  "Exception has been thrown by the target of an invocation.";

/** Frames belonging to the reflection call, not to the program. */
const HOST_FRAME_RE =
  /^\s+at (?:System\.Reflection\.|System\.RuntimeMethodHandle|ScriptRunner\.)/;

/** Compiler-generated names for a top-level program: `<Main>$` is the
 *  statements themselves, `<<Main>$>g__Name|0_1` a local function. */
function prettifyFrame(frame: string): string {
  const local =
    /^(\s+at )Program\.<<Main>\$>g__([A-Za-z_]\w*)\|[\d_]+\((.*)\)$/.exec(
      frame,
    );
  if (local) return `${local[1]}${local[2]}(${local[3]})`;
  const main = /^(\s+at )Program\.<Main>\$\(.*\)$/.exec(frame);
  if (main) return `${main[1]}top-level statements`;
  return frame;
}

/**
 * Turn a failed run's stderr into what .NET would have printed.
 *
 * `stashed` is what the injected `FirstChanceException` handler saw, which
 * is the whole exception — type, message, and the frames below it. It is
 * only trusted when its inner message agrees with what the host reported,
 * so a program that caught an exception earlier and failed for another
 * reason can't have the wrong one attributed to it.
 */
export function formatUncaught(
  reported: string,
  stashed: string | null | undefined,
): string {
  const lines = reported.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0 || lines[0].trim() !== REFLECTION_WRAPPER) {
    return reported.replace(/\n+$/, "");
  }
  // What the host printed under the wrapper is `InnerException.Message`.
  const innerMessage = lines.slice(1).join("\n").trim();

  const detailed = stashed ? unwrapStashed(stashed, innerMessage) : null;
  if (detailed) return detailed;

  // No usable stash: at least drop the wrapper sentence, which describes
  // the playground's plumbing rather than the program.
  return innerMessage || REFLECTION_WRAPPER;
}

/** Pull the inner exception out of a stashed `TargetInvocationException`
 *  string, or null when it isn't about the failure being reported. */
function unwrapStashed(stashed: string, innerMessage: string): string | null {
  const lines = stashed.split("\n");
  const innerStart = lines.findIndex((l) => l.trimStart().startsWith("---> "));
  const body =
    innerStart === -1
      ? lines
      : lines
          .slice(innerStart)
          .map((l, i) => (i === 0 ? l.replace(/^\s*---> /, "") : l));

  const header = body[0] ?? "";
  // `System.InvalidOperationException: deliberate uncaught`
  const split = /^([\w.+`]+(?:Exception|Error)):\s*([\s\S]*)$/.exec(header);
  if (!split) return null;
  // The stash is per-throw, so a stale one from an exception the program
  // caught must not be reported as the failure.
  if (innerMessage && !split[2].startsWith(innerMessage.split("\n")[0])) {
    return null;
  }

  const frames = body
    .slice(1)
    .filter(
      (l) =>
        !HOST_FRAME_RE.test(l) &&
        !/^\s*--- End of inner exception stack trace ---\s*$/.test(l),
    )
    .map(prettifyFrame);

  return [`Unhandled exception. ${header}`, ...frames].join("\n");
}

// ─── Values thrown out of the runtime ──────────────────────────────────

export interface ThrownDescription {
  /** Text to show, empty when the value was purely an exit signal. */
  message: string;
  /** Set when the value was the runtime's exit signal. */
  exitCode?: number;
}

/**
 * Say what came out of the runtime, whatever shape it is.
 *
 * `Environment.Exit` surfaces as Emscripten's `ExitStatus`, a plain
 * JavaScript object. Interpolating it into a string produced the literal
 * text `[object Object]` in the output pane, in place of the program's
 * result. Nothing here can reach a template literal without going through
 * a `typeof` check first.
 */
export function describeThrown(value: unknown): ThrownDescription {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.status === "number") {
      return { message: "", exitCode: record.status };
    }
    if (value instanceof Error)
      return { message: value.message || String(value.name) };
    if (typeof record.message === "string" && record.message) {
      return { message: record.message };
    }
    try {
      const json = JSON.stringify(value);
      if (json && json !== "{}") return { message: json };
    } catch {
      /* circular or otherwise unserialisable; fall through */
    }
    const name = record.constructor?.name;
    return {
      message: `The C# runtime threw ${typeof name === "string" && name ? name : "an object"} with no message.`,
    };
  }
  if (typeof value === "string" && value) return { message: value };
  if (value === undefined || value === null || value === "") {
    return { message: "The C# runtime failed without saying why." };
  }
  return { message: String(value) };
}

/** Why a program that called `Environment.Exit` shows nothing it printed,
 *  and what to write instead. */
export const EXIT_OUTPUT_NOTE =
  "Output printed before Environment.Exit is lost: the call tears the runtime down " +
  "before the playground can read what the program wrote. Ending top-level statements " +
  "with `return <code>;` sets the same exit code and keeps the output.";
