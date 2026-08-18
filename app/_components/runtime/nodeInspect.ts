/**
 * Node-style value formatting for the almostnode playgrounds.
 *
 * `console.log(value)` used to render its arguments as pretty-printed JSON,
 * which loses exactly the values worth logging: an `Error` has no enumerable
 * own properties and printed as `{}`, `Map`/`Set`/`RegExp` printed as `{}`
 * too, a cycle threw inside `JSON.stringify` and fell back to
 * `[object Object]`, and a 120-element array became 120 lines. This is a
 * focused re-implementation of `util.inspect` plus `util.format`: same
 * shapes as Node for the values people actually log, without pulling Node's
 * (very large) implementation into the worker bundle.
 */

export interface InspectOptions {
  /** Levels of nesting before `[Object]` / `[Array]` stands in. */
  depth?: number;
  /** Elements shown before `... n more items`. */
  maxArrayLength?: number;
  /** Width to keep a value on one line, as Node's `breakLength`. */
  breakLength?: number;
  /** Rewrites an `Error`'s stack before printing it, so a logged error
   *  points at the user's file rather than the runtime's internals. */
  cleanStack?: (stack: string) => string;
}

const DEFAULTS = { depth: 2, maxArrayLength: 100, breakLength: 80 } as const;

/** Node's `compact: 3`: how many levels a value may span and still be
 *  printed on one line, and (times four) the column cap for a grid. */
const COMPACT = 3;

/** Keys that can be written bare rather than quoted, as Node does. */
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function quoteString(value: string): string {
  // Node prefers single quotes, then double, then backtick, escaping only
  // what it must.
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`);
  if (!escaped.includes("'")) return `'${escaped}'`;
  if (!escaped.includes('"')) return `"${escaped}"`;
  return `'${escaped.replace(/'/g, "\\'")}'`;
}

function formatNumber(value: number): string {
  // -0 is a different value from 0 and Node says so.
  return Object.is(value, -0) ? "-0" : String(value);
}

function functionLabel(value: (...args: unknown[]) => unknown): string {
  const isClass = /^class[\s{]/.test(Function.prototype.toString.call(value));
  const name = value.name;
  if (isClass) return name ? `[class ${name}]` : "[class (anonymous)]";
  return name ? `[Function: ${name}]` : "[Function (anonymous)]";
}

function constructorName(value: object): string | null {
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return null;
  const name = proto.constructor?.name;
  return name && name !== "Object" ? name : null;
}

function isTypedArray(value: object): value is ArrayBufferView & { length: number } {
  return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

/** Node's Buffer, by shape rather than by name: the worker bundle minifies
 *  the shim's class name, so `constructor.name` is not it. */
function isBuffer(value: object): value is Uint8Array {
  if (!(value instanceof Uint8Array)) return false;
  const proto = value as unknown as { readUInt8?: unknown; writeUInt8?: unknown };
  return (
    typeof proto.readUInt8 === "function" && typeof proto.writeUInt8 === "function"
  );
}

/** `<Buffer 68 69>`, the way Node renders one, capped like an array. */
function formatBuffer(value: Uint8Array, maxLength: number): string {
  const shown = Array.from(value.subarray(0, maxLength), (b) =>
    b.toString(16).padStart(2, "0"),
  );
  const more = value.length - maxLength;
  const tail = more > 0 ? ` ... ${more} more byte${more === 1 ? "" : "s"}` : "";
  return `<Buffer${shown.length ? " " + shown.join(" ") : ""}${tail}>`;
}

const INDEX_KEY_RE = /^(0|[1-9][0-9]*)$/;

/**
 * Render an array's elements, collapsing runs of holes into `<N empty items>`
 * the way Node does for a sparse array. Returns the rendered entries plus how
 * many trailing elements `maxArrayLength` cut, which the caller reports as
 * "… more items".
 */
function arrayItems(
  obj: unknown[],
  maxArrayLength: number,
  render: (value: unknown) => string,
): { items: string[]; hidden: number } {
  const len = Math.min(Math.max(0, maxArrayLength), obj.length);
  const items: string[] = [];
  for (let i = 0; i < len; i++) {
    if (!Object.prototype.hasOwnProperty.call(obj, i)) {
      items.length = 0;
      return sparseArrayItems(obj, len, render);
    }
    items.push(render(obj[i]));
  }
  return { items, hidden: obj.length - len };
}

/** The hole-aware path, ported from Node's `formatSpecialArray`. */
function sparseArrayItems(
  obj: unknown[],
  len: number,
  render: (value: unknown) => string,
): { items: string[]; hidden: number } {
  const items: string[] = [];
  const record = obj as unknown as Record<string, unknown>;
  let index = 0;
  for (const key of Object.keys(obj)) {
    if (items.length >= len) break;
    // Non-index keys are reported separately, as their own entries.
    if (!INDEX_KEY_RE.test(key)) break;
    const at = Number(key);
    if (at !== index) {
      const empty = at - index;
      items.push(`<${empty} empty item${empty === 1 ? "" : "s"}>`);
      index = at;
      if (items.length === len) break;
    }
    items.push(render(record[key]));
    index++;
  }
  const remaining = obj.length - index;
  // Holes past the last element are still holes, not elided elements.
  if (items.length !== len) {
    if (remaining > 0) {
      items.push(`<${remaining} empty item${remaining === 1 ? "" : "s"}>`);
    }
    return { items, hidden: 0 };
  }
  return { items, hidden: remaining };
}

/**
 * Lay short entries out in columns, the way Node does for arrays of numbers,
 * so a 120-element array is a readable grid instead of 120 lines. Ported from
 * `groupArrayElements` in Node's `util.inspect`, quirks included, so the
 * output matches what a reader sees in their terminal.
 *
 * `output` is everything inside the brackets: the elements, then any
 * "… more items" note and extra string keys, which Node lays into the grid
 * alongside the elements rather than giving them their own line.
 */
function groupArrayElements(
  output: string[],
  maxArrayLength: number,
  breakLength: number,
  indentLength: number,
  /** The array behind the entries, untruncated: all-numeric columns are
   *  right-aligned. */
  values: ArrayLike<unknown> | undefined,
): string[] | null {
  if (output.length <= 6) return null;
  // Node reads a longer-than-the-cap output as ending in a "… more items"
  // note and keeps that last entry out of the column measurements.
  const outputLength =
    maxArrayLength < output.length ? output.length - 1 : output.length;
  const separatorSpace = 2; // ", "
  const dataLen: number[] = [];
  let totalLength = 0;
  let maxLength = 0;
  for (let i = 0; i < outputLength; i++) {
    const len = output[i].length;
    dataLen.push(len);
    totalLength += len + separatorSpace;
    if (len > maxLength) maxLength = len;
  }
  const actualMax = maxLength + separatorSpace;
  // Three columns have to fit, and one entry must not dwarf all the others.
  if (
    actualMax * 3 + indentLength >= breakLength ||
    !(totalLength / actualMax > 5 || maxLength <= 6)
  ) {
    return null;
  }
  const approxCharHeights = 2.5;
  const averageBias = Math.sqrt(actualMax - totalLength / output.length);
  const biasedMax = Math.max(actualMax - 3 - averageBias, 1);
  const columns = Math.min(
    Math.round(Math.sqrt(approxCharHeights * biasedMax * outputLength) / biasedMax),
    Math.floor((breakLength - indentLength) / actualMax),
    COMPACT * 4,
    15,
  );
  if (columns <= 1) return null;

  const maxLineLength: number[] = [];
  for (let i = 0; i < columns; i++) {
    let lineLength = 0;
    for (let j = i; j < output.length; j += columns) {
      // Past `outputLength` there is no measurement, and none is wanted.
      const len = dataLen[j] ?? 0;
      if (len > lineLength) lineLength = len;
    }
    maxLineLength.push(lineLength + separatorSpace);
  }

  // Numbers read better right-aligned; anything else left-aligned. Node
  // walks one slot per output entry, notes included, against the original
  // array, so a truncated or sparse array lands on left-aligned.
  let padStart = true;
  if (values !== undefined) {
    for (let i = 0; i < output.length; i++) {
      const v = values[i];
      if (typeof v !== "number" && typeof v !== "bigint") {
        padStart = false;
        break;
      }
    }
  }

  const rows: string[] = [];
  for (let i = 0; i < outputLength; i += columns) {
    const max = Math.min(i + columns, outputLength);
    let line = "";
    let j = i;
    for (; j < max - 1; j++) {
      const cell = `${output[j]}, `;
      const padding = maxLineLength[j - i];
      line += padStart ? cell.padStart(padding) : cell.padEnd(padding);
    }
    line += padStart
      ? output[j].padStart(maxLineLength[j - i] - separatorSpace)
      : output[j];
    rows.push(line);
  }
  if (maxArrayLength < output.length) rows.push(output[outputLength]);
  return rows;
}

/** Node's `isBelowBreakLength`: does this fit on one line? */
function fitsOneLine(
  parts: string[],
  breakLength: number,
  indentLength: number,
  /** Length of the opening brace *with* any `Map(2) ` style prefix. */
  headLength: number,
  /** Length of a `<ref *1>` marker, which sits outside the brace. */
  baseLength: number,
): boolean {
  let total = parts.length + parts.length + indentLength + headLength + baseLength + 10;
  if (total + parts.length > breakLength) return false;
  for (const part of parts) {
    if (part.includes("\n")) return false;
    total += part.length;
    if (total > breakLength) return false;
  }
  return true;
}

/** `{ a: 1 }` on one line when it fits, otherwise one entry per line. */
function wrap(
  parts: string[],
  open: string,
  close: string,
  /** Constructor or size marker printed inside the head: `Map(2)`, `Pt`. */
  prefix: string,
  /** `<ref *1>` for a value something else in the output points back to. */
  base: string,
  indent: string,
  breakLength: number,
  grouped: string[] | null,
  /** False when this value's subtree runs deeper than Node's `compact`
   *  setting, which keeps tall structures off a single line. */
  compactOk: boolean,
): string {
  const brace = prefix ? `${prefix} ${open}` : open;
  const head = base ? `${base} ${brace}` : brace;
  if (parts.length === 0) return `${head}${close}`;
  // A grouped array is always laid out as a grid, as in Node: the grid is
  // the point, and re-joining it onto one line would undo it.
  if (
    !grouped &&
    compactOk &&
    fitsOneLine(parts, breakLength, indent.length, brace.length, base.length)
  ) {
    return `${head} ${parts.join(", ")} ${close}`;
  }
  // Rows join with a comma and a newline, exactly as Node joins them.
  const body = grouped ?? parts;
  const inner = body.map((line) => `${indent}  ${line}`).join(`,\n`);
  return `${head}\n${inner}\n${indent}${close}`;
}

/** Format `value` the way `util.inspect` would. */
export function inspect(value: unknown, options: InspectOptions = {}): string {
  const depth = options.depth ?? DEFAULTS.depth;
  const maxArrayLength = options.maxArrayLength ?? DEFAULTS.maxArrayLength;
  const breakLength = options.breakLength ?? DEFAULTS.breakLength;
  // Objects seen on the current path, so a cycle is reported rather than
  // followed, and the reference is numbered as Node numbers it.
  const seen = new Map<object, number>();
  let circularCount = 0;
  // Node's `ctx.currentDepth`: the level of the last container it started
  // formatting. Read after a value's children are done, it says how deep
  // that subtree went.
  let deepest = 0;

  function walk(current: unknown, level: number, indent: string): string {
    if (typeof current === "string") return quoteString(current);
    if (typeof current === "number") return formatNumber(current);
    if (typeof current === "bigint") return `${current}n`;
    if (typeof current === "boolean") return String(current);
    if (current === undefined) return "undefined";
    if (current === null) return "null";
    if (typeof current === "symbol") return current.toString();
    if (typeof current === "function") return functionLabel(current as (...a: unknown[]) => unknown);
    if (typeof current !== "object") return String(current);

    const obj = current as object;
    const existing = seen.get(obj);
    if (existing !== undefined) {
      if (existing === 0) {
        circularCount += 1;
        seen.set(obj, circularCount);
        return `[Circular *${circularCount}]`;
      }
      return `[Circular *${existing}]`;
    }

    // Values Node renders by identity rather than by walking them.
    if (obj instanceof Date) {
      return Number.isNaN(obj.getTime()) ? "Invalid Date" : obj.toISOString();
    }
    if (obj instanceof RegExp) return obj.toString();
    if (obj instanceof Error) return formatError(obj, options.cleanStack);
    if (typeof Promise !== "undefined" && obj instanceof Promise) {
      // A promise's state isn't observable synchronously; `console.log(p)`
      // is nearly always a forgotten await, which is exactly this case.
      return "Promise { <pending> }";
    }

    seen.set(obj, 0);
    try {
      const nested = level + 1;
      const childIndent = `${indent}  `;

      if (Array.isArray(obj)) {
        if (level > depth) return "[Array]";
        // Extra string keys on an array still show, as in Node.
        const namedKeys = Object.keys(obj).filter((k) => !/^\d+$/.test(k));
        if (obj.length === 0 && namedKeys.length === 0) return "[]";
        deepest = level;
        const { items, hidden } = arrayItems(obj, maxArrayLength, (item) =>
          walk(item, nested, childIndent),
        );
        const extras: string[] = [];
        if (hidden > 0) extras.push(`... ${hidden} more item${hidden === 1 ? "" : "s"}`);
        for (const key of namedKeys) {
          extras.push(`${formatKey(key)}: ${walk((obj as unknown as Record<string, unknown>)[key], nested, childIndent)}`);
        }
        const parts = [...items, ...extras];
        return wrap(
          parts,
          "[",
          "]",
          "",
          refBase(obj),
          indent,
          breakLength,
          groupArrayElements(parts, maxArrayLength, breakLength, indent.length, obj),
          compactOk(level),
        );
      }

      if (obj instanceof Map) {
        if (level > depth) return "[Map]";
        if (obj.size === 0) return `Map(0) {}`;
        deepest = level;
        const parts = [...obj.entries()]
          .slice(0, maxArrayLength)
          .map(([k, v]) => `${walk(k, nested, childIndent)} => ${walk(v, nested, childIndent)}`);
        const hidden = obj.size - parts.length;
        if (hidden > 0) parts.push(`... ${hidden} more item${hidden === 1 ? "" : "s"}`);
        return wrap(
          parts, "{", "}", `Map(${obj.size})`, refBase(obj),
          indent, breakLength, null, compactOk(level),
        );
      }

      if (obj instanceof Set) {
        if (level > depth) return "[Set]";
        if (obj.size === 0) return `Set(0) {}`;
        deepest = level;
        const parts = [...obj.values()]
          .slice(0, maxArrayLength)
          .map((v) => walk(v, nested, childIndent));
        const hidden = obj.size - parts.length;
        if (hidden > 0) parts.push(`... ${hidden} more item${hidden === 1 ? "" : "s"}`);
        return wrap(
          parts, "{", "}", `Set(${obj.size})`, refBase(obj),
          indent, breakLength, null, compactOk(level),
        );
      }

      if (isTypedArray(obj)) {
        // Buffer is a Uint8Array subclass, and Node prints it as bytes.
        if (isBuffer(obj)) return formatBuffer(obj, 50);
        const ctor = constructorName(obj) ?? "TypedArray";
        const items = Array.from(obj as unknown as ArrayLike<number | bigint>);
        if (items.length === 0) return `${ctor}(0) []`;
        deepest = level;
        const shown = items.slice(0, maxArrayLength);
        const cells = shown.map((v) => (typeof v === "bigint" ? `${v}n` : formatNumber(v)));
        const hidden = items.length - shown.length;
        if (hidden > 0) {
          cells.push(`... ${hidden} more item${hidden === 1 ? "" : "s"}`);
        }
        return wrap(
          cells,
          "[",
          "]",
          `${ctor}(${items.length})`,
          refBase(obj),
          indent,
          breakLength,
          groupArrayElements(cells, maxArrayLength, breakLength, indent.length, items),
          compactOk(level),
        );
      }

      if (level > depth) return "[Object]";

      const proto = Object.getPrototypeOf(obj);
      deepest = level;
      const parts: string[] = [];
      for (const key of Object.keys(obj)) {
        const descriptor = Object.getOwnPropertyDescriptor(obj, key);
        // Don't run getters: side effects belong to the program, not to
        // printing it. Node labels them the same way.
        if (descriptor && !("value" in descriptor)) {
          parts.push(`${formatKey(key)}: ${descriptor.get ? "[Getter]" : "[Setter]"}`);
          continue;
        }
        parts.push(`${formatKey(key)}: ${walk((obj as Record<string, unknown>)[key], nested, childIndent)}`);
      }
      for (const sym of Object.getOwnPropertySymbols(obj)) {
        const descriptor = Object.getOwnPropertyDescriptor(obj, sym);
        if (!descriptor?.enumerable) continue;
        parts.push(`[${sym.toString()}]: ${walk((obj as Record<symbol, unknown>)[sym], nested, childIndent)}`);
      }

      const name =
        proto === null ? "[Object: null prototype]" : (constructorName(obj) ?? "");
      return wrap(
        parts, "{", "}", name, refBase(obj),
        indent, breakLength, null, compactOk(level),
      );
    } finally {
      seen.delete(obj);
    }
  }

  /** `<ref *N>` when something in the output points back at this value. */
  function refBase(obj: object): string {
    const id = seen.get(obj);
    return id ? `<ref *${id}>` : "";
  }

  /** Node consolidates a value onto one line only when its subtree is
   *  shallower than `compact`, so a tall structure stays tall. `deepest`
   *  tracks the last level reached, exactly as Node's `currentDepth` does. */
  function compactOk(level: number): boolean {
    return deepest - level < COMPACT;
  }

  function formatKey(key: string): string {
    return IDENTIFIER_RE.test(key) ? key : quoteString(key);
  }

  return walk(value, 0, "");
}

/** An error as Node prints it: the stack when there is one, plus any own
 *  properties the program attached (`err.code`, `err.cause`, …). */
function formatError(
  error: Error,
  cleanStack?: (stack: string) => string,
): string {
  const raw =
    error.stack && error.stack.includes(error.message)
      ? error.stack
      : `${error.name}: ${error.message}`;
  const base = cleanStack ? cleanStack(raw) : raw;
  const extras = Object.keys(error).filter((k) => k !== "stack" && k !== "message");
  if (extras.length === 0) return base;
  const parts = extras.map(
    (key) => `${IDENTIFIER_RE.test(key) ? key : quoteString(key)}: ${inspect((error as unknown as Record<string, unknown>)[key], { depth: 1 })}`,
  );
  return `${base} { ${parts.join(", ")} }`;
}

/** `%s`, `%d`, `%i`, `%f`, `%j`, `%o`, `%O`, `%c`, `%%`, as `util.format`. */
const SPECIFIER_RE = /%[sdifjoOc%]/g;

/** Format console arguments the way Node's `util.format` does: substitute
 *  specifiers in a leading format string, inspect whatever is left over. */
export function formatConsoleArgs(args: unknown[], options?: InspectOptions): string {
  if (args.length === 0) return "";
  const [first, ...rest] = args;
  let consumed = 0;
  let head: string;
  // With nothing after it, the format string is output verbatim — Node
  // leaves even `%%` alone in that case.
  if (typeof first === "string" && rest.length > 0 && SPECIFIER_RE.test(first)) {
    SPECIFIER_RE.lastIndex = 0;
    head = first.replace(SPECIFIER_RE, (match) => {
      if (match === "%%") return "%";
      if (consumed >= rest.length) return match;
      const arg = rest[consumed++];
      switch (match) {
        case "%s":
          return typeof arg === "string"
            ? arg
            : typeof arg === "bigint"
              ? `${arg}n`
              : arg !== null && typeof arg === "object"
                ? inspect(arg, { ...options, depth: 0 })
                : String(arg);
        case "%d":
          return typeof arg === "bigint" ? `${arg}n` : String(Number(arg));
        case "%i":
          return typeof arg === "bigint" ? `${arg}n` : String(parseInt(String(arg), 10));
        case "%f":
          return String(parseFloat(String(arg)));
        case "%j":
          try {
            return JSON.stringify(arg) ?? "undefined";
          } catch {
            return "[Circular]";
          }
        case "%o":
          return inspect(arg, { ...options, depth: 4 });
        case "%O":
          return inspect(arg, options);
        case "%c":
          // CSS styling: consumed and dropped, as Node does.
          return "";
        default:
          return match;
      }
    });
  } else {
    head = typeof first === "string" ? first : inspect(first, options);
  }
  const tail = rest
    .slice(consumed)
    .map((arg) => (typeof arg === "string" ? arg : inspect(arg, options)));
  return [head, ...tail].join(" ");
}
