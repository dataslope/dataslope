import type { Completion } from "@codemirror/autocomplete";

// Keyword completions for JavaScript/TypeScript. `@codemirror/lang-javascript`
// bundles an equivalent list inside its `javascript()` wrapper but does not
// export it, so it's recreated here for the manually-assembled source list in
// `languageCompletion.ts`. Snippet templates come from the package's exported
// `snippets` / `typescriptSnippets` and are merged by the caller.

const kw = (label: string): Completion => ({ label, type: "keyword" });

const JS_KEYWORD_NAMES = [
  "async", "await", "break", "case", "catch", "class", "const", "continue",
  "debugger", "default", "delete", "do", "else", "export", "extends", "false",
  "finally", "for", "function", "if", "import", "in", "instanceof", "let",
  "new", "null", "of", "return", "static", "super", "switch", "this", "throw",
  "true", "try", "typeof", "undefined", "var", "void", "while", "with",
  "yield",
];

const TS_EXTRA_KEYWORD_NAMES = [
  "abstract", "any", "as", "asserts", "boolean", "declare", "enum",
  "implements", "infer", "interface", "is", "keyof", "namespace", "never",
  "number", "object", "override", "private", "protected", "public",
  "readonly", "satisfies", "string", "symbol", "type", "unique", "unknown",
];

export const JS_KEYWORDS: readonly Completion[] = JS_KEYWORD_NAMES.map(kw);

export const TS_KEYWORDS: readonly Completion[] = [
  ...JS_KEYWORD_NAMES,
  ...TS_EXTRA_KEYWORD_NAMES,
].map(kw);
