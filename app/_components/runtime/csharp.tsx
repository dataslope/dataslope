import type {
  EmitOutput,
  ExampleSnippet,
  EntryFileInfo,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
} from "../types";
import { loadDotnet, type DotnetApi } from "./dotnet";
import { getClangFormat } from "./clangFormat";

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

/** Strip block + line comments and string/char literals so simple
 *  regex probes don't false-match inside them. */
function stripCSharpNoise(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/@?"(?:""|\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

/** Returns true if `source` declares an explicit `static … Main(` method.
 *  Matches both `Main` and `Main<T>(...)` style entrypoints. */
function hasCSharpExplicitMain(source: string): boolean {
  const cleaned = stripCSharpNoise(source);
  return /\bstatic\s+(?:async\s+)?[\w<>?\[\],.\s]*?\bMain\s*\(/.test(cleaned);
}

/** True when `source` contains C# top-level statements, i.e. its first
 *  executable token is at file scope. */
function hasCSharpTopLevel(source: string): boolean {
  // Find the first non-using/non-comment/non-namespace/non-type line; a
  // statement-like token there means top-level.
  const cleaned = stripCSharpNoise(source);
  // Strip using directives at file scope.
  const lines = cleaned.split("\n");
  let depth = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (depth > 0) {
      // Track brace depth to skip namespace/type bodies.
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      continue;
    }
    if (/^(?:global\s+)?using(?:\s+static)?\s.*;$/.test(line)) continue;
    // Namespace keyword or type declaration (with any modifier keywords)
    // starts a body we ignore.
    const NAMESPACE_RE = /^namespace\b/;
    const TYPE_DECL_RE =
      /^(?:public\s+|internal\s+|sealed\s+|abstract\s+|static\s+|partial\s+)*(?:class|struct|record|interface|enum)\b/;
    if (NAMESPACE_RE.test(line) || TYPE_DECL_RE.test(line)) {
      depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      continue;
    }
    // First file-scope executable token = top-level statements.
    return true;
  }
  return false;
}

const PACKAGES: PackageInfo[] = [
  // .NET base class library highlights; clicking inserts the `using`.
  {
    cat: "Core", icon: "📦", color: "#34d399", name: "System", ver: ".NET 9",
    desc: "Console, String, Math, primitive types and exceptions.",
    example: `using System;

Console.WriteLine($"Hello, {Environment.UserName ?? "world"}!");
Console.WriteLine($"Math.PI = {Math.PI:F4}");
Console.WriteLine($"|-3.5|  = {Math.Abs(-3.5)}");
`,
  },
  {
    cat: "Collections", icon: "🗂️", color: "#34d399", name: "System.Collections.Generic", ver: ".NET 9",
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
    cat: "Collections", icon: "🌊", color: "#34d399", name: "System.Linq", ver: ".NET 9",
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
    cat: "Async", icon: "⚡", color: "#a78bfa", name: "System.Threading.Tasks", ver: ".NET 9",
    desc: "Task, Task<T>, Task.WhenAll, async / await primitives.",
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
    cat: "I/O", icon: "📁", color: "#facc15", name: "System.IO", ver: ".NET 9",
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
    cat: "Text", icon: "🔤", color: "#fb923c", name: "System.Text", ver: ".NET 9",
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
    cat: "Text", icon: "🔍", color: "#fb923c", name: "System.Text.RegularExpressions", ver: ".NET 9",
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
    cat: "Text", icon: "📝", color: "#fb923c", name: "System.Text.Json", ver: ".NET 9",
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
    cat: "Math", icon: "🎲", color: "#60a5fa", name: "System.Numerics", ver: ".NET 9",
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
    cat: "Time", icon: "📅", color: "#60a5fa", name: "System.Diagnostics", ver: ".NET 9",
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

/** Strip leading `using` directives so the body can be appended after the
 *  entry file without Roslyn's "A using clause must precede all other
 *  elements" error. Only top-of-file directives are stripped; later ones
 *  are intentionally left in place. */
function stripCSharpUsings(source: string): { usings: string[]; body: string } {
  const lines = source.split("\n");
  const usings: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const isUsing =
      // Matches: using Ns;  using static Ns.T;  using A = Ns;  global using Ns;
      /^(?:global\s+)?using(?:\s+static)?\s/.test(trimmed) && trimmed.endsWith(";");
    if (trimmed === "" || trimmed.startsWith("//") || isUsing) {
      if (isUsing) usings.push(trimmed);
      i++;
    } else {
      break;
    }
  }
  return { usings, body: lines.slice(i).join("\n") };
}

class CSharpRuntime implements LanguageRuntime {
  /** Staged workspace .cs files; every non-entry file is appended after
   *  the entry code. */
  private stagedFiles: Map<string, Uint8Array> = new Map();

  constructor(private api: DotnetApi) {}

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    this.stagedFiles = new Map();
    for (const [path, bytes] of files) {
      if (!path.endsWith(".cs")) continue;
      this.stagedFiles.set(path, bytes);
    }
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    // Append extra .cs files' bodies after the entry code (safe: C#
    // resolves class references across the whole compilation unit), with
    // their using directives stripped to satisfy Roslyn's ordering rule.
    const entry = options?.entryFilename ?? "Program.cs";
    const decoder = new TextDecoder();
    const extraBodies: string[] = [];
    const extraUsings: string[] = [];
    for (const [path, bytes] of this.stagedFiles) {
      // The entry file's content already arrives via `code`.
      if (path === entry) continue;
      const { usings, body } = stripCSharpUsings(decoder.decode(bytes));
      extraUsings.push(...usings);
      if (body.trim()) extraBodies.push(body);
    }
    let combined = code;
    if (extraBodies.length > 0) {
      // Sibling `using` directives must be HOISTED, not discarded —
      // dropping them makes unresolved types fail silently (exit code 0,
      // empty stderr).
      const hoisted = [...new Set(extraUsings)].filter((u) => !code.includes(u));
      combined =
        (hoisted.length > 0 ? `${hoisted.join("\n")}\n` : "") +
        code +
        "\n" +
        extraBodies.join("\n");
    }

    let result;
    try {
      result = await this.api.runScript(combined);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: "stderr", content: message });
      return;
    }

    const stdout = result.stdout.replace(/\n+$/, "");
    const stderr = result.stderr.replace(/\n+$/, "");
    if (stdout) emit({ type: "stdout", content: stdout });
    if (stderr) emit({ type: "stderr", content: stderr });
    if (result.exitCode !== 0 && !stderr) {
      emit({
        type: "stderr",
        content: `Script exited with code ${result.exitCode}.`,
      });
    }
  }
}

export const csharpAdapter: LanguageAdapter = {
  id: "csharp",
  displayName: "C# Playground",
  logoText: "C#",
  documentTitle: "C# Playground",
  readyStatus: "C# ready",
  runtimeInfo: {
    language: "C#",
    version: "13",
    engine: "Roslyn (CSharpScript) on Mono / .NET WebAssembly",
    engineUrl: "https://learn.microsoft.com/dotnet/core/wasm/",
    notes:
      "Your C# is compiled in your browser by Roslyn (Microsoft.CodeAnalysis.CSharp.Scripting) and the resulting IL is executed by the .NET runtime compiled to WebAssembly, no server roundtrip. Top-level statements and `using` directives are accepted directly (the same surface as `dotnet-script`).",
  },
  // CodeMirror's clike mode handles C#. `text/x-csharp` is the
  // standard MIME alias for C# inside that mode.
  codeMirrorMode: "text/x-csharp",
  // .NET runtime + Roslyn assembly bundle from jsDelivr, see cdn.ts.
  coldDownloadMB: 35,
  // Compiles (Roslyn) on every run, so later runs are faster, not instant.
  compiled: true,
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
