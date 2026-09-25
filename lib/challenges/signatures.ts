/**
 * JavaScript signatures, written the way JavaScript writes them.
 *
 * Signatures are authored with TypeScript annotations, because that is the
 * compact way to say what goes in and what comes out, and it reads like the
 * type hints on the Python side. JavaScript has no annotations, though, so
 * `function twoSum(nums: number[], target: number): number[]` on a JavaScript
 * tab is a syntax error that the learner is invited to copy. The builders in
 * `./authoring` therefore pass every JavaScript signature through
 * `jsSignature`, which keeps the declaration and moves its types into a JSDoc
 * block: valid JavaScript, and the place an editor reads types from anyway.
 *
 * What it rewrites: `function` declarations, including a parameter list that
 * spans lines, and the method lines of a `class` body. Everything else passes
 * through untouched, so a hand-written JSDoc `@typedef` or a `// ...` comment
 * survives as written. `__tests__/challengeSignatures` parses every result as
 * JavaScript, so an annotation this does not understand fails the build
 * rather than reaching the page.
 */

/** Split `text` at top-level occurrences of `sep`, skipping brackets and strings. */
function splitTop(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(" || ch === "[" || ch === "{" || ch === "<") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    // `=>` is an arrow, not the end of a generic.
    else if (ch === ">" && text[i - 1] !== "=") depth--;
    else if (depth === 0 && text.startsWith(sep, i)) {
      parts.push(text.slice(start, i));
      start = i + sep.length;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** Index just past the bracket that closes the one at `open`, or -1. */
function closingParen(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

interface Param {
  name: string;
  type?: string;
  optional: boolean;
  rest: boolean;
}

function parseParam(raw: string): Param | null {
  const text = raw.replace(/\s+/g, " ").trim();
  const [head, ...typeParts] = splitTop(text, ":");
  const type = typeParts.length ? typeParts.join(":").trim() : undefined;
  const m = /^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?$/.exec(head.trim());
  // A destructured parameter or a default value: not something a signature
  // here uses, so leave the declaration alone and let the test say so.
  if (!m) return null;
  return { name: m[2], type, optional: Boolean(m[3]), rest: Boolean(m[1]) };
}

/** `number[]` for a rest parameter typed `...xs: number[]`, as JSDoc spells it. */
function restType(type: string): string {
  const arr = /^(.*)\[\]$/.exec(type.trim());
  return `...${arr ? arr[1].trim() : type}`;
}

function jsDoc(indent: string, tags: string[]): string {
  if (tags.length === 1) return `${indent}/** ${tags[0]} */\n`;
  return `${indent}/**\n${tags.map((t) => `${indent} * ${t}\n`).join("")}${indent} */\n`;
}

/**
 * Rewrite the declaration that starts at `head` (the text before its `(`),
 * returning the JavaScript and how much of `rest` it consumed, or null when
 * it cannot be read.
 */
function rewriteDeclaration(
  indent: string,
  head: string,
  source: string,
  open: number,
): { text: string; end: number } | null {
  const close = closingParen(source, open);
  if (close === -1) return null;
  const inner = source.slice(open + 1, close - 1);
  // The return type runs to the end of the line.
  const lineEnd = source.indexOf("\n", close);
  const end = lineEnd === -1 ? source.length : lineEnd;
  const tail = source.slice(close, end).trim();
  let returns: string | undefined;
  if (tail) {
    const m = /^:\s*(.+)$/.exec(tail);
    if (!m) return null;
    returns = m[1].trim();
  }

  const params: Param[] = [];
  for (const raw of splitTop(inner, ",")) {
    if (!raw.trim()) continue; // a trailing comma
    const p = parseParam(raw);
    if (!p) return null;
    params.push(p);
  }

  const typed = returns !== undefined || params.some((p) => p.type !== undefined);
  const call = `${indent}${head}(${params.map((p) => (p.rest ? `...${p.name}` : p.name)).join(", ")})`;
  if (!typed) return { text: call, end };

  const isGetter = /^get\s/.test(head);
  const tags: string[] = [];
  for (const p of params) {
    const type = p.type ?? "*";
    tags.push(
      `@param {${p.rest ? restType(type) : type}} ${p.optional ? `[${p.name}]` : p.name}`,
    );
  }
  if (returns !== undefined && returns !== "void") {
    tags.push(isGetter ? `@type {${returns}}` : `@returns {${returns}}`);
  }
  return { text: `${tags.length ? jsDoc(indent, tags) : ""}${call}`, end };
}

const FUNCTION_HEAD = /^([ \t]*)(function\s+[A-Za-z_$][\w$]*)\s*\(/;
const METHOD_HEAD = /^([ \t]*)((?:(?:static|async|get|set)\s+)*[A-Za-z_$][\w$]*)\s*\(/;

/** A TypeScript-annotated JavaScript signature, as JavaScript with JSDoc types. */
export function jsSignature(signature: string): string {
  let out = "";
  let pos = 0;
  let inClass = false;
  while (pos < signature.length) {
    const lineEnd = signature.indexOf("\n", pos);
    const line = signature.slice(pos, lineEnd === -1 ? signature.length : lineEnd);
    const next = lineEnd === -1 ? signature.length : lineEnd;

    if (/^\s*class\s+[A-Za-z_$][\w$]*.*\{\s*$/.test(line)) inClass = true;
    else if (inClass && /^\s*\}\s*$/.test(line)) inClass = false;

    const m = (inClass ? METHOD_HEAD : FUNCTION_HEAD).exec(line);
    const rewritten = m
      ? rewriteDeclaration(m[1], m[2], signature, pos + m[0].length - 1)
      : null;
    if (rewritten) {
      // Two top-level functions in a row each get a doc block now, and two
      // blocks with nothing between them read as one.
      if (!inClass && out && !out.endsWith("\n\n") && rewritten.text.trimStart().startsWith("/**")) {
        out += "\n";
      }
      out += rewritten.text;
      pos = rewritten.end;
    } else {
      out += line;
      pos = next;
    }
    if (pos < signature.length) {
      out += "\n";
      pos += 1;
    }
  }
  return out;
}
