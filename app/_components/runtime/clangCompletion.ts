// Pure helpers for the C/C++ completion tier, which drives clang's own
// code completer (`-code-completion-at`) on the browsercc toolchain the
// Run button already downloads. Dependency-free so it's unit-testable.
//
// clang prints one line per candidate:
//   COMPLETION: capacity : [#size_type#]capacity()[# const#]
//   COMPLETION: assign : [#void#]assign(<#size_type n#>, <#const_reference u#>)
//   COMPLETION: x : [#int#]x
//   COMPLETION: int
//   COMPLETION: Pattern : for(<#init#>;<#cond#>;<#inc#>){<#stmts#>}
// `[#…#]` is a result type or qualifier, `<#…#>` a placeholder, `{#…#}` an
// optional chunk. Pattern rows are snippets, dropped here.

import type { CompletionItemDetail } from "../types";

/** clang wants the column of the identifier's first character, 1-based;
 *  it does no filtering of its own (CodeMirror does). */
export function identifierStart(
  line: string,
  column: number,
): { column1: number; prefixLength: number } {
  const before = line.slice(0, Math.max(0, column));
  const m = /[A-Za-z_]\w*$/.exec(before);
  const prefixLength = m ? m[0].length : 0;
  return { column1: column - prefixLength + 1, prefixLength };
}

const C_KEYWORDS = new Set([
  "auto", "break", "case", "char", "const", "continue", "default", "do",
  "double", "else", "enum", "extern", "float", "for", "goto", "if", "inline",
  "int", "long", "register", "restrict", "return", "short", "signed",
  "sizeof", "static", "struct", "switch", "typedef", "union", "unsigned",
  "void", "volatile", "while", "_Bool", "_Complex", "bool", "true", "false",
  "class", "public", "private", "protected", "virtual", "override", "final",
  "template", "typename", "namespace", "using", "new", "delete", "this",
  "nullptr", "constexpr", "consteval", "constinit", "static_cast",
  "dynamic_cast", "reinterpret_cast", "const_cast", "try", "catch", "throw",
  "noexcept", "operator", "friend", "explicit", "mutable", "decltype",
  "static_assert", "alignof", "alignas", "concept", "requires", "co_await",
  "co_return", "co_yield", "export", "import", "module", "wchar_t",
  "char8_t", "char16_t", "char32_t", "and", "or", "not", "xor",
]);

/** Strip clang's chunk markers, keeping their text. */
function plain(display: string): string {
  return display
    .replace(/<#([^#]*)#>/g, "$1")
    .replace(/\{#([^#]*)#\}/g, "$1")
    .replace(/\[#([^#]*)#\]/g, "$1");
}

export interface ParseOptions {
  /** What the user has typed of the identifier; names starting with `_`
   *  stay hidden unless it does too. */
  typedPrefix: string;
  limit?: number;
}

/** Turn clang's `COMPLETION:` lines into completion items, deduplicated
 *  by name with overloads counted in the detail. */
export function parseClangCompletions(
  output: string,
  opts: ParseOptions,
): CompletionItemDetail[] {
  const hidePrivate = !opts.typedPrefix.startsWith("_");
  const showOperators = opts.typedPrefix.startsWith("operator");
  const limit = opts.limit ?? 300;
  const byLabel = new Map<string, CompletionItemDetail & { overloads: number }>();

  for (const rawLine of output.split("\n")) {
    if (!rawLine.startsWith("COMPLETION: ")) continue;
    const body = rawLine.slice("COMPLETION: ".length);
    const sep = body.indexOf(" : ");
    const name = sep < 0 ? body.trim() : body.slice(0, sep);
    const display = sep < 0 ? "" : body.slice(sep + 3);

    if (!name || name === "Pattern") continue;
    if (name.startsWith("<")) continue; // deduction guides, `<unnamed>`
    if (hidePrivate && name.startsWith("_")) continue;
    if (name.startsWith("operator") && !showOperators) continue;
    if (!/^[A-Za-z_~]\w*$/.test(name)) continue;

    const existing = byLabel.get(name);
    if (existing) {
      existing.overloads += 1;
      continue;
    }

    let type = "text";
    let detail: string | undefined;
    if (!display) {
      type = C_KEYWORDS.has(name)
        ? "keyword"
        : /^[A-Z][A-Z0-9_]*$/.test(name)
          ? "constant"
          : "keyword";
    } else {
      // A leading `[#type#]` is the result type of a function or the type
      // of a variable; what follows is the name and, for calls, the
      // parameter list.
      let result: string | undefined;
      let rest = display;
      const resultMatch = /^\[#([^#]*)#\]/.exec(rest);
      if (resultMatch) {
        result = resultMatch[1];
        rest = rest.slice(resultMatch[0].length);
      }
      const afterName = rest.startsWith(name) ? rest.slice(name.length) : rest;
      if (afterName.startsWith("(")) {
        type = "function";
        detail = plain(afterName) + (result ? `: ${result}` : "");
      } else if (afterName.startsWith("<")) {
        type = "type";
        detail = plain(afterName);
      } else if (result) {
        type = "variable";
        detail = result;
      } else {
        type = C_KEYWORDS.has(name) ? "keyword" : "type";
      }
    }

    byLabel.set(name, { label: name, type, detail, overloads: 0 });
    if (byLabel.size >= limit) break;
  }

  const items: CompletionItemDetail[] = [];
  for (const item of byLabel.values()) {
    const { overloads, ...rest } = item;
    if (overloads > 0) {
      rest.detail = `${rest.detail ?? ""} (+${overloads} overload${overloads > 1 ? "s" : ""})`.trim();
    }
    items.push(rest);
  }
  return items;
}

/** The `-cc1` argument vector from a driver dry run (`-###`), the way
 *  browsercc itself obtains it. Null when no cc1 line was printed. */
export function cc1ArgsFromDriverOutput(stderr: string): string[] | null {
  const line = stderr.split("\n").find((l) => l.includes("-cc1"));
  if (!line) return null;
  const quoted = line.match(/"([^"]*)"/g);
  if (!quoted) return null;
  // The first quoted item is the clang binary itself.
  return quoted.map((s) => s.slice(1, -1)).slice(1);
}

/** Entries of a POSIX tar archive (browsercc's `sysroot.tar`). */
export function* tarEntries(
  contents: ArrayBuffer,
): Generator<{ name: string; content: Uint8Array }> {
  const data = new Uint8Array(contents);
  const decoder = new TextDecoder("utf-8");
  let offset = 0;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, "");
    if (!name) break;
    const size =
      parseInt(decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, "").trim(), 8) || 0;
    yield { name, content: data.subarray(offset + 512, offset + 512 + size) };
    offset += 512 + Math.ceil(size / 512) * 512;
  }
}
