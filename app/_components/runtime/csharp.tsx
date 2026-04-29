import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";
import { loadDotnet, type DotnetApi } from "./dotnet";

// Run C# in the browser via the official .NET WebAssembly runtime
// (Mono compiled to WASM) + Roslyn's C# scripting engine
// (Microsoft.CodeAnalysis.CSharp.Scripting). The runtime bundle is
// fetched from a CDN on first load — same "everything in the
// browser" approach used by Pyodide (Python), WebR (R), browsercc
// (C/C++), CheerpJ (Java) and php-wasm (PHP) elsewhere in this
// repo. No server-side compilation.
//
// We accept C# *script* syntax: top-level statements, top-level
// `using` directives, and records/classes/methods all work without
// having to wrap the code in `class Program { static void Main(…) }`.
// This is the same surface the `dotnet-script` CLI exposes and is
// the natural fit for a single-file playground.

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
];

const PACKAGES: PackageInfo[] = [
  // Highlights from the .NET base class library — always available
  // through Roslyn's scripting host, no install step. Clicking
  // inserts the corresponding `using` at the top of the editor.
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

class CSharpRuntime implements LanguageRuntime {
  constructor(private api: DotnetApi) {}

  async run(code: string, emit: EmitOutput): Promise<void> {
    let result;
    try {
      result = await this.api.runScript(code);
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
      "Your C# is compiled in your browser by Roslyn (Microsoft.CodeAnalysis.CSharp.Scripting) and the resulting IL is executed by the .NET runtime compiled to WebAssembly — no server roundtrip. Top-level statements and `using` directives are accepted directly (the same surface as `dotnet-script`).",
  },
  // CodeMirror's clike mode handles C#. `text/x-csharp` is the
  // standard MIME alias for C# inside that mode.
  codeMirrorMode: "text/x-csharp",
  examples: EXAMPLES,
  packages: PACKAGES,
  exportFormats: [
    { extension: "csx", label: "C# script (.csx)", mimeType: "text/x-csharp" },
    { extension: "cs",  label: "C# source (.cs)",  mimeType: "text/x-csharp" },
  ],
  exportBaseFilename: "script",
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
      and ship with the WebAssembly runtime — no install step needed.
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
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    const api = await loadDotnet(setLoadingMessage);
    return new CSharpRuntime(api);
  },
};
