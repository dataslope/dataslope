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
  CSHARP_VERSION,
  DOTNET_VERSION,
  loadDotnet,
  type CSharpScriptResult,
  type DotnetApi,
} from "./dotnet";
import { getClangFormat } from "./clangFormat";
import {
  allDiagnosticsMapped,
  composeProgram,
  describeThrown,
  EXIT_OUTPUT_NOTE,
  formatUncaught,
  hasCSharpExplicitMain,
  hasCSharpTopLevel,
  LAST_EXCEPTION_KEY,
  looksLikeDiagnostics,
  parseDiagnostics,
  renderDiagnostics,
  STDIN_FILENAME,
} from "./csharpBuild";

// C# in the browser via the .NET WebAssembly runtime (Mono) + Roslyn's
// scripting engine, fetched from a CDN on first load. Accepts C# script
// syntax (top-level statements/usings, no Main wrapper required) — the
// same surface as the dotnet-script CLI.

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "Top-level statements, string interpolation",
    code: `// Hello, C# Playground!
Console.WriteLine("Hello, C# Playground!");
Console.WriteLine($"Compiled by Roslyn and run on .NET in your browser.\\n");

Console.WriteLine($"PI = {Math.PI:F10}");
Console.WriteLine($"E  = {Math.E:F10}\\n");

string[] names = { "Ada", "Linus", "Grace" };
foreach (var name in names)
{
    Console.WriteLine($"  hello, {name}!");
}
`,
  },
  {
    key: "linq",
    title: "LINQ",
    desc: "Filter, group and reduce a list of records",
    code: `using System.Linq;

var sales = new List<Sale>
{
    new("Widget A", "North", 42_000m),
    new("Widget A", "South", 38_000m),
    new("Widget B", "North", 51_000m),
    new("Widget B", "South", 47_000m),
    new("Widget C", "East",  29_000m),
    new("Widget C", "West",  33_000m),
};

var byProduct = sales
    .GroupBy(s => s.Product)
    .Select(g => new { Product = g.Key, Total = g.Sum(s => s.Revenue) })
    .OrderByDescending(r => r.Total);

Console.WriteLine("Revenue by product:");
foreach (var row in byProduct)
{
    Console.WriteLine($"  {row.Product,-10} \${row.Total:N0}");
}

var top = sales.Where(s => s.Revenue >= 40_000m)
               .Select(s => $"{s.Product} ({s.Region})");
Console.WriteLine($"\\nTop performers (>= $40k): {string.Join(", ", top)}");

record Sale(string Product, string Region, decimal Revenue);
`,
  },
  {
    key: "generics",
    title: "Generics",
    desc: "A tiny generic Stack<T> with extension methods",
    code: `using System.Linq;

var ints = new Stack<int>();
foreach (var i in new[] { 1, 2, 3, 4, 5 }) ints.Push(i);
ints.Drain("ints (LIFO)");

var words = new Stack<string>();
foreach (var w in new[] { "the", "quick", "brown", "fox" }) words.Push(w);
words.Drain("words (LIFO)");

class Stack<T>
{
    private readonly List<T> _data = new();
    public void Push(T value) => _data.Add(value);
    public T Pop()
    {
        var v = _data[^1];
        _data.RemoveAt(_data.Count - 1);
        return v;
    }
    public bool IsEmpty => _data.Count == 0;
    public int Count => _data.Count;
}

static class StackExtensions
{
    public static void Drain<T>(this Stack<T> s, string label)
    {
        var parts = new List<string> { label + ":" };
        while (!s.IsEmpty) parts.Add(s.Pop()?.ToString() ?? "");
        Console.WriteLine(string.Join(" ", parts));
    }
}
`,
  },
  {
    key: "patterns",
    title: "Pattern Matching",
    desc: "Switch expressions over a discriminated hierarchy",
    code: `double Area(Shape s) => s switch
{
    Circle   { Radius: var r }                  => Math.PI * r * r,
    Rect     { Width: var w, Height: var h }    => w * h,
    Triangle { Base: var b, Height: var h }     => 0.5 * b * h,
    _ => throw new ArgumentException($"Unknown shape: {s}"),
};

Shape[] shapes =
{
    new Circle(3),
    new Rect(4, 5),
    new Triangle(6, 4),
};

foreach (var s in shapes)
{
    var name = s.GetType().Name.PadRight(8);
    Console.WriteLine($"{name} area = {Area(s):F3}");
}

abstract record Shape;
record Circle(double Radius)                         : Shape;
record Rect(double Width, double Height)             : Shape;
record Triangle(double Base, double Height)          : Shape;
`,
  },
  {
    key: "multifile",
    title: "Multi-file Project",
    desc: "Top-level Program.cs that uses a Greeter class from another file",
    code: `var g = new Greeter("C# Playground");
Console.WriteLine(g.Hello());
Console.WriteLine(g.Bye());
`,
    files: [
      {
        filename: "Greeter.cs",
        content: `public class Greeter
{
    private readonly string _name;

    public Greeter(string name)
    {
        _name = name;
    }

    public string Hello() => $"Hello, {_name}!";
    public string Bye()   => $"Goodbye, {_name}!";
}
`,
      },
    ],
    entryFilename: "Program.cs",
  },
];

const PACKAGES: PackageInfo[] = [
  // .NET base class library highlights; clicking inserts the `using`.
  {
    cat: "Core", icon: "📦", color: "#34d399", name: "System", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc:
      "Console, String, Math, primitive types and exceptions, plus DateTime, " +
      "DateTimeOffset and TimeSpan.",
    example: `using System;

Console.WriteLine($"Hello, {Environment.UserName ?? "world"}!");
Console.WriteLine($"Math.PI = {Math.PI:F4}");
Console.WriteLine($"|-3.5|  = {Math.Abs(-3.5)}");
`,
  },
  {
    cat: "Collections", icon: "🗂️", color: "#34d399", name: "System.Collections.Generic", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc: "List<T>, Dictionary<TKey, TValue>, HashSet<T>, Queue<T>.",
    example: `using System;
using System.Collections.Generic;

var ages = new Dictionary<string, int> {
    ["Ada"] = 36, ["Linus"] = 54, ["Grace"] = 40,
};
ages["Hopper"] = 85;
foreach (var (name, age) in ages) {
    Console.WriteLine($"{name} -> {age}");
}
`,
  },
  {
    cat: "Collections", icon: "🌊", color: "#34d399", name: "System.Linq", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc: "Where, Select, GroupBy, OrderBy and other LINQ operators.",
    example: `using System;
using System.Linq;

int[] numbers = { 5, 2, 8, 1, 9, 3, 7, 4, 6 };

var evens = numbers.Where(n => n % 2 == 0).OrderBy(n => n);
Console.WriteLine("evens: " + string.Join(", ", evens));
Console.WriteLine("sum: "   + numbers.Sum());
Console.WriteLine("avg: "   + numbers.Average());
`,
  },
  {
    cat: "Async", icon: "⚡", color: "#a78bfa", name: "System.Threading.Tasks", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc:
      "Task, Task<T>, Task.WhenAll, async / await primitives. Single-threaded: " +
      "continuations run on the same thread and there is no parallelism.",
    example: `using System;
using System.Threading.Tasks;

async Task<int> SquareAsync(int x) {
    await Task.Delay(50);
    return x * x;
}

var results = await Task.WhenAll(SquareAsync(2), SquareAsync(3), SquareAsync(4));
Console.WriteLine("squares: " + string.Join(", ", results));
`,
  },
  {
    cat: "I/O", icon: "📁", color: "#facc15", name: "System.IO", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc: "Stream, MemoryStream, StringReader/Writer (no disk access).",
    example: `using System;
using System.IO;

using var ms = new MemoryStream();
using (var w = new StreamWriter(ms, leaveOpen: true)) {
    w.WriteLine("line 1");
    w.WriteLine("line 2");
}
ms.Position = 0;
using var r = new StreamReader(ms);
Console.WriteLine(r.ReadToEnd());
`,
  },
  {
    cat: "Text", icon: "🔤", color: "#fb923c", name: "System.Text", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc: "StringBuilder, Encoding, Rune utilities.",
    example: `using System;
using System.Text;

var sb = new StringBuilder();
for (int i = 1; i <= 3; i++) sb.AppendLine($"line {i}");
Console.Write(sb.ToString());

byte[] bytes = Encoding.UTF8.GetBytes("héllo");
Console.WriteLine($"utf-8 bytes: {bytes.Length}");
`,
  },
  {
    cat: "Text", icon: "🔍", color: "#fb923c", name: "System.Text.RegularExpressions", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc: "Regex, Match, MatchCollection.",
    example: `using System;
using System.Text.RegularExpressions;

var input = "Order 123 was placed on 2024-05-12.";
foreach (Match m in Regex.Matches(input, @"\\d+")) {
    Console.WriteLine($"matched: {m.Value} at {m.Index}");
}
`,
  },
  {
    cat: "Text", icon: "📝", color: "#fb923c", name: "System.Text.Json", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc: "JsonSerializer, JsonDocument, JsonNode.",
    example: `using System;
using System.Text.Json;

var person = new { Name = "Ada", Age = 36, Skills = new[] { "math", "code" } };
string json = JsonSerializer.Serialize(person,
    new JsonSerializerOptions { WriteIndented = true });
Console.WriteLine(json);
`,
  },
  {
    cat: "Math", icon: "🎲", color: "#60a5fa", name: "System.Numerics", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc: "BigInteger, Complex, Vector<T>.",
    example: `using System;
using System.Numerics;

BigInteger fact = 1;
for (int i = 1; i <= 30; i++) fact *= i;
Console.WriteLine($"30! = {fact}");

var c = new Complex(3, 4);
Console.WriteLine($"|3+4i| = {c.Magnitude}");
`,
  },
  {
    cat: "Text", icon: "🌍", color: "#fb923c", name: "System.Globalization", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc:
      "CultureInfo and friends, but this build is InvariantGlobalization: " +
      "only the invariant culture exists, and any other one throws.",
    example: `using System;
using System.Globalization;

// The invariant culture is the only one this runtime has.
Console.WriteLine($"current culture = '{CultureInfo.CurrentCulture.Name}'");
Console.WriteLine(1234.56.ToString("N2", CultureInfo.InvariantCulture));

// new CultureInfo("de-DE") would throw here.
`,
  },
  {
    cat: "Diagnostics", icon: "⏱️", color: "#60a5fa", name: "System.Diagnostics", ver: `.NET ${DOTNET_VERSION.split(".")[0]}`,
    desc: "Stopwatch and other diagnostics helpers.",
    example: `using System;
using System.Diagnostics;

var sw = Stopwatch.StartNew();
long sum = 0;
for (int i = 0; i < 1_000_000; i++) sum += i;
sw.Stop();
Console.WriteLine($"sum = {sum} ({sw.Elapsed.TotalMilliseconds:F2} ms)");
`,
  },
];

/**
 * How long a run may take before the host stops it.
 *
 * .NET holds the browser's main thread while the program executes, so this
 * timer can only fire while the program is *waiting* — on the compiler's
 * downloads, or on anything it awaits. A program spinning in a tight loop
 * holds the thread and the timer with it; that one needs the runtime moved
 * into a worker, which is not something this host supports today.
 */
const RUN_TIMEOUT_MS = 30_000;

/** Workspace-relative path reduced to its filename. */
function basename(path: string): string {
  return path.includes("/") ? path.split("/").pop()! : path;
}

/** What the injected handler parked, and a clean slate for the next run. */
function takeStashedException(): string | null {
  if (typeof globalThis === "undefined") return null;
  const store = globalThis as Record<string, unknown>;
  const value = store[LAST_EXCEPTION_KEY];
  delete store[LAST_EXCEPTION_KEY];
  return typeof value === "string" ? value : null;
}

class CSharpRuntime implements LanguageRuntime {
  /** Staged workspace `.cs` files, as text. */
  private stagedFiles = new Map<string, string>();
  /** Contents of `stdin.txt`, when the workspace has one. */
  private stdin: string | null = null;
  /** Rejects the run in flight, for Stop and for the timeout. */
  private abortActiveRun: ((err: Error) => void) | null = null;
  /** The script the host is still executing, if any. A second overlapping
   *  `RunScript` would fight the first over `Console.SetOut`. */
  private inFlight: Promise<unknown> | null = null;

  constructor(private api: DotnetApi) {}

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    this.stagedFiles = new Map();
    this.stdin = null;
    const decoder = new TextDecoder();
    for (const [path, bytes] of files) {
      if (basename(path) === STDIN_FILENAME) {
        this.stdin = decoder.decode(bytes);
        continue;
      }
      if (!path.endsWith(".cs")) continue;
      this.stagedFiles.set(path, decoder.decode(bytes));
    }
  }

  /**
   * Stop the running program.
   *
   * The host offers no way to interrupt a script once it is executing, so
   * this disowns the run rather than killing it: the `run()` promise
   * rejects and the playground comes back, while the abandoned script
   * finishes into a result nobody reads. The next run waits for it, since
   * two scripts at once would fight over the captured console.
   */
  async cancelRun(): Promise<void> {
    const abort = this.abortActiveRun;
    this.abortActiveRun = null;
    if (!abort) return;
    const err = new Error("Run stopped.");
    err.name = "RunCancelledError";
    abort(err);
  }

  /** One `RunScript`, with the Stop hook and the wall-clock cap around it. */
  private async execute(
    source: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<CSharpScriptResult> {
    if (this.inFlight) await this.inFlight.catch(() => {});
    // The compiler downloads a reference assembly per loaded assembly the
    // first time it runs, and that used to be an empty output pane and a
    // spinner for minutes with no way to tell it from a hang. The wait is
    // the same length; the difference is that it now says what it is.
    if (!this.api.isWarm()) {
      options?.onStatus?.("Preparing the C# compiler…", true);
      await this.api.whenWarm((message) => options?.onStatus?.(message, true));
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<never>((_resolve, reject) => {
      this.abortActiveRun = reject;
      // Skipped until the compiler is warm: when the boot warm-up could
      // not run, the first compile still has the whole class library to
      // fetch and capping that would abort a run that was working.
      if (!this.api.isWarm()) return;
      timer = setTimeout(() => {
        const seconds = Math.round(RUN_TIMEOUT_MS / 1000);
        emit({
          type: "stderr",
          content:
            `Stopped after ${seconds}s: the program was still running. ` +
            "A loop that never ends holds the browser's main thread, so this " +
            "only fires while the program is waiting.",
        });
        void this.cancelRun();
      }, RUN_TIMEOUT_MS);
    });

    const running = this.api.runScript(source);
    this.inFlight = running;
    // A disowned run must not raise an unhandled rejection later, and the
    // next one must not start until it has actually finished.
    void running
      .catch(() => {})
      .finally(() => {
        if (this.inFlight === running) this.inFlight = null;
      });
    try {
      return await Promise.race([running, guard]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      this.abortActiveRun = null;
    }
  }

  /** One attempt at a run, with the two non-result outcomes named. */
  private async attempt(
    source: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<
    | { kind: "result"; result: CSharpScriptResult }
    | { kind: "exit"; exitCode: number }
    | { kind: "failed"; message: string }
  > {
    try {
      return {
        kind: "result",
        result: await this.execute(source, emit, options),
      };
    } catch (err) {
      // A Stop is the surface's to render, not ours.
      if (err instanceof Error && err.name === "RunCancelledError") throw err;
      const { message, exitCode } = describeThrown(err);
      return exitCode !== undefined
        ? { kind: "exit", exitCode }
        : { kind: "failed", message };
    }
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    const entryFilename = options?.entryFilename ?? "Program.cs";
    const files: Array<[string, string]> = [...this.stagedFiles];
    // The prelude is statements, so only a program made of top-level
    // statements has a place to put it.
    const instrument = hasCSharpTopLevel(code);

    const compose = (withPrelude: boolean) =>
      composeProgram({
        entryFilename,
        entryCode: code,
        files,
        stdin: this.stdin,
        instrument: withPrelude,
      });

    takeStashedException();
    let composed = compose(instrument);
    let attempt = await this.attempt(composed.source, emit, options);

    // A compile error that names none of the reader's files can only have
    // come from the prelude, so try again without it rather than show a
    // diagnostic about code they never wrote.
    if (
      instrument &&
      attempt.kind === "result" &&
      attempt.result.exitCode !== 0 &&
      looksLikeDiagnostics(attempt.result.stderr) &&
      !allDiagnosticsMapped(
        parseDiagnostics(attempt.result.stderr),
        composed.sources,
      )
    ) {
      composed = compose(false);
      attempt = await this.attempt(composed.source, emit, options);
    }

    if (attempt.kind === "exit") {
      this.reportExit(attempt.exitCode, emit);
      return;
    }
    if (attempt.kind === "failed") {
      emit({ type: "stderr", content: attempt.message });
      return;
    }
    const result = attempt.result;

    const stdout = result.stdout.replace(/\n+$/, "");
    if (stdout) emit({ type: "stdout", content: stdout });

    const stderr = result.stderr.replace(/\n+$/, "");
    if (stderr) {
      emit({
        type: "stderr",
        content: looksLikeDiagnostics(stderr)
          ? renderDiagnostics(parseDiagnostics(stderr), composed.sources)
          : formatUncaught(stderr, takeStashedException()),
      });
    } else if (result.exitCode !== 0) {
      emit({
        type: "stderr",
        content: `Program exited with code ${result.exitCode}.`,
      });
    }
  }

  /** `Environment.Exit` tore the runtime down mid-run: say what the exit
   *  code was, and why the output the program produced is not above. */
  private reportExit(exitCode: number, emit: EmitOutput): void {
    emit({
      type: exitCode === 0 ? "log" : "stderr",
      content: `Program exited with code ${exitCode}.`,
    });
    emit({ type: "log", content: EXIT_OUTPUT_NOTE });
  }
}

export const csharpAdapter: LanguageAdapter = {
  id: "csharp",
  displayName: "C# Playground",
  logoText: "C#",
  documentTitle: "C# Playground",
  readyStatus: `C# ${CSHARP_VERSION} ready`,
  runtimeInfo: {
    language: "C#",
    // Kept a plain literal so `playgroundVersions.test.ts` can read it out
    // of the source; `csharpBuild.test.ts` ties it to DOTNET_VERSION and
    // to what the runtime reports about itself.
    version: "14 (.NET 10.0.7)",
    engine: "Roslyn on Mono / .NET WebAssembly",
    engineUrl: "https://learn.microsoft.com/dotnet/core/wasm/",
    notes:
      "Your C# is compiled in your browser by Roslyn (Microsoft.CodeAnalysis.CSharp) and the resulting IL is executed by the .NET runtime compiled to WebAssembly, no server roundtrip. Top-level statements and `using` directives are accepted directly (the same surface as `dotnet-script`).\n\nFirst load downloads the runtime and then the class library the compiler references, which is slow and happens once per browser; every run after that compiles and executes in a fraction of a second.\n\nFor standard input, add a file named `stdin.txt` to the workspace and `Console.ReadLine` reads from it. Without one, a read returns null at end of input. There is no way to pass command-line arguments.\n\nThe build is `InvariantGlobalization`, which is what keeps the download to a size worth waiting for: only the invariant culture exists, so `new CultureInfo(\"de-DE\")` throws and culture-specific number, currency and date formatting are unavailable. It is also single-threaded and 32-bit: `Task` and `async`/`await` work, but continuations run on the same thread, `Environment.ProcessorCount` is 1 and there is no parallelism.\n\nTwo things to know about a run. .NET holds the browser's main thread while your program executes, so a loop that never ends freezes the tab; Stop and the 30-second cap can only end a program that is waiting. And `Console.Error` is collected separately from `Console.Out` and printed after it, rather than interleaved where it happened.",
  },
  // CodeMirror's clike mode handles C#. `text/x-csharp` is the
  // standard MIME alias for C# inside that mode.
  codeMirrorMode: "text/x-csharp",
  // .NET runtime + Roslyn assembly bundle from jsDelivr, see cdn.ts.
  coldDownloadMB: 35,
  // Compiles (Roslyn) on every run, so later runs are faster, not instant.
  compiled: true,
  // `stdin.txt` read by the composed program's Console.ReadLine shim.
  supportsStdin: true,
  // clang-format Microsoft style (see formatCode), keep in sync.
  indentWidth: 4,
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "csx", label: "C# script (.csx)", mimeType: "text/x-csharp" },
    { extension: "cs",  label: "C# source (.cs)",  mimeType: "text/x-csharp" },
  ],
  exportBaseFilename: "Program",
  defaultFileExtension: "cs",
  findEntryFiles(files): EntryFileInfo[] {
    const out: EntryFileInfo[] = [];
    for (const f of files) {
      if (!f.filename.endsWith(".cs")) continue;
      // Prefer top-level classification (a file with both is a CS8802
      // compile error, which Roslyn surfaces).
      if (hasCSharpTopLevel(f.content)) {
        out.push({ filename: f.filename, kind: "topLevel" });
      } else if (hasCSharpExplicitMain(f.content)) {
        out.push({ filename: f.filename, kind: "main" });
      }
    }
    return out;
  },
  packagesFooter: (
    <>
      Namespaces above are part of the{" "}
      <a
        href="https://learn.microsoft.com/dotnet/api/"
        target="_blank"
        rel="noreferrer"
      >
        .NET base class library
      </a>{" "}
      and ship with the WebAssembly runtime, no install step needed.
    </>
  ),
  importSnippet: (name) => `using ${name};`,
  hasImport(code, name) {
    // Match `using <Name>;`, `using static <Name>.Member;`, and
    // `using Alias = <Name>;` with arbitrary whitespace.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `\\busing\\s+(?:static\\s+)?(?:[A-Za-z_][\\w]*\\s*=\\s*)?${escaped}(?:\\s*\\.\\s*[A-Za-z_][\\w]*)*\\s*;`,
    ).test(code);
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getClangFormat();
    return format(code, "Main.cs", "Microsoft");
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    const api = await loadDotnet(setLoadingMessage);
    return new CSharpRuntime(api);
  },
};
