import { snippetCompletion, type Completion } from "@codemirror/autocomplete";

// Static completion tier for C#. Roslyn's CompletionService could run on the
// .NET WASM bundle but adds tens of MB of assemblies — deliberately skipped.

const kw = (label: string): Completion => ({ label, type: "keyword" });
const ty = (label: string, detail?: string): Completion => ({
  label,
  type: "class",
  detail,
});
const fn = (label: string, detail: string): Completion => ({
  label,
  type: "function",
  detail,
});

export const CSHARP_KEYWORDS: readonly Completion[] = [
  "abstract", "as", "async", "await", "base", "bool", "break", "byte",
  "case", "catch", "char", "checked", "class", "const", "continue",
  "decimal", "default", "delegate", "do", "double", "dynamic", "else",
  "enum", "event", "explicit", "extern", "finally", "fixed", "float",
  "for", "foreach", "get", "goto", "if", "implicit", "in", "init", "int",
  "interface", "internal", "is", "lock", "long", "nameof", "namespace",
  "new", "not", "object", "operator", "out", "override", "params",
  "private", "protected", "public", "readonly", "record", "ref", "required",
  "return", "sbyte", "sealed", "set", "short", "sizeof", "stackalloc",
  "static", "string", "struct", "switch", "this", "throw", "try", "typeof",
  "uint", "ulong", "unchecked", "unsafe", "ushort", "using", "value", "var",
  "virtual", "void", "volatile", "when", "where", "while", "with", "yield",
  "true", "false", "null",
].map(kw);

const CSHARP_TYPES: readonly Completion[] = [
  ty("Console", "System"),
  ty("Math", "System"),
  ty("Convert", "System"),
  ty("DateTime", "System"),
  ty("TimeSpan", "System"),
  ty("Random", "System"),
  ty("Exception", "System"),
  ty("ArgumentException", "System"),
  ty("InvalidOperationException", "System"),
  ty("StringBuilder", "System.Text"),
  ty("List", "System.Collections.Generic"),
  ty("Dictionary", "System.Collections.Generic"),
  ty("HashSet", "System.Collections.Generic"),
  ty("Queue", "System.Collections.Generic"),
  ty("Stack", "System.Collections.Generic"),
  ty("KeyValuePair", "System.Collections.Generic"),
  ty("IEnumerable", "System.Collections.Generic"),
  ty("Task", "System.Threading.Tasks"),
  ty("Enumerable", "System.Linq"),
  ty("Regex", "System.Text.RegularExpressions"),
  ty("File", "System.IO"),
  ty("Path", "System.IO"),
  ty("Tuple", "System"),
  ty("Nullable", "System"),
  ty("Func", "System"),
  ty("Action", "System"),
];

const CSHARP_STATICS: readonly Completion[] = [
  fn("Console.WriteLine", "(value)"),
  fn("Console.Write", "(value)"),
  fn("Console.ReadLine", "()"),
  fn("Math.Abs", "(value)"),
  fn("Math.Max", "(a, b)"),
  fn("Math.Min", "(a, b)"),
  fn("Math.Pow", "(x, y)"),
  fn("Math.Sqrt", "(x)"),
  fn("Math.Floor", "(x)"),
  fn("Math.Ceiling", "(x)"),
  fn("Math.Round", "(x, digits)"),
  fn("int.Parse", "(string s)"),
  fn("int.TryParse", "(string s, out int result)"),
  fn("double.Parse", "(string s)"),
  fn("string.Format", "(format, args...)"),
  fn("string.Join", "(separator, values)"),
  fn("string.IsNullOrEmpty", "(string s)"),
  fn("string.IsNullOrWhiteSpace", "(string s)"),
  fn("DateTime.Now", "property"),
  fn("Task.Delay", "(int milliseconds)"),
  fn("Task.WhenAll", "(tasks)"),
  fn("Enumerable.Range", "(int start, int count)"),
  fn("Enumerable.Repeat", "(element, count)"),
];

const CSHARP_SNIPPETS: readonly Completion[] = [
  snippetCompletion("Console.WriteLine(${});", {
    label: "cw",
    detail: "Console.WriteLine(…)",
    type: "keyword",
  }),
  snippetCompletion(
    "for (int ${i} = 0; ${i} < ${n}; ${i}++)\n{\n\t${}\n}",
    { label: "for", detail: "for loop", type: "keyword", boost: 1 },
  ),
  snippetCompletion("foreach (var ${item} in ${collection})\n{\n\t${}\n}", {
    label: "foreach",
    detail: "foreach loop",
    type: "keyword",
    boost: 1,
  }),
];

export const CSHARP_COMPLETIONS: readonly Completion[] = [
  ...CSHARP_KEYWORDS,
  ...CSHARP_TYPES,
  ...CSHARP_STATICS,
  ...CSHARP_SNIPPETS,
];
