// Pure mapping from TypeScript `ScriptElementKind` strings to CodeMirror
// completion types (which drive the popup icons). Shared by the language
// service worker; dependency-free so it's unit-testable in Node.

const KIND_TO_CM_TYPE: Record<string, string> = {
  "method": "method",
  "function": "function",
  "local function": "function",
  "construct": "function",
  "call": "function",
  "index": "function",
  "var": "variable",
  "let": "variable",
  "const": "constant",
  "local var": "variable",
  "parameter": "variable",
  "alias": "variable",
  "property": "property",
  "getter": "property",
  "setter": "property",
  "accessor": "property",
  "class": "class",
  "local class": "class",
  "interface": "interface",
  "type": "type",
  "enum": "enum",
  "enum member": "constant",
  "module": "namespace",
  "external module name": "namespace",
  "keyword": "keyword",
  "string": "text",
  "label": "text",
  "directory": "text",
  "script": "text",
  "primitive type": "type",
  "type parameter": "type",
};

/** CodeMirror completion type for a TS `ScriptElementKind`. */
export function cmTypeForTsKind(kind: string): string {
  return KIND_TO_CM_TYPE[kind] ?? "variable";
}

/** Length of the identifier fragment immediately before `offset` —
 *  the prefix a completion should replace. */
export function completionPrefixLength(text: string, offset: number): number {
  const before = text.slice(Math.max(0, offset - 200), offset);
  const m = /[A-Za-z0-9_$]*$/.exec(before);
  return m ? m[0].length : 0;
}

/** Standard-library reference directives (`/// <reference lib="x" />`)
 *  in a lib.*.d.ts file, as lib file names. */
export function referencedLibFiles(source: string): string[] {
  const out: string[] = [];
  const re = /\/\/\/\s*<reference\s+lib="([^"]+)"\s*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) out.push(`lib.${m[1]}.d.ts`);
  return out;
}
