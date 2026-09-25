/**
 * Table-driven checks for code challenges.
 *
 * Most code checks are the same three lines: call the function with some
 * arguments, compare with the expected value, say what came back when it
 * differs. Written by hand for Python and again for JavaScript, that is two
 * copies of every case, and nothing makes the two languages grade the same
 * inputs — one side quietly gains an edge case the other never checks.
 *
 * A `CallCase` is written once, as plain values, and rendered into each
 * language here. `dualChallenge` in `./authoring` uses it so that a
 * challenge's Python and JavaScript variants are held to identical cases by
 * construction. The output is an ordinary `CodeTest`, so anything a case
 * cannot express is still written by hand and mixed in beside it.
 *
 * The generated code is never shown to the learner — the Test cases tab shows
 * `name` and `description`, and the failure message below — so it is written
 * for the failure message rather than for reading.
 */

import type { CodeTest, WorkedExample } from "./types";

/** A value both languages can write as a literal. */
export type Value =
  | null
  | boolean
  | number
  | string
  | Value[]
  | { [key: string]: Value };

export interface CallCase {
  id: string;
  name: string;
  description?: string;
  /** Positional arguments, rendered as a literal in each language. */
  args?: Value[];
  /**
   * Argument source per language, in place of `args`, for inputs too big to
   * write out (`list(range(10**5))` / `Array.from(...)`). The failure message
   * then shows `f(...)` rather than the whole input.
   */
  pyArgs?: string;
  jsArgs?: string;
  /** The expected return value. */
  expected?: Value;
  /** Expected-value source per language, in place of `expected`. */
  pyExpected?: string;
  jsExpected?: string;
  /** Compare numbers within this absolute tolerance instead of exactly. */
  tolerance?: number;
  /**
   * Instead of a return value, expect the call to raise. `true` accepts any
   * exception; the object names the Python exception class to require.
   */
  throws?: true | { py: string };
  /** Also check that the call left its arguments unchanged. */
  noMutation?: boolean;
  /**
   * Turn this case into a worked example in the instructions, with this as
   * its note. Needs `params` on the challenge to name the fields.
   */
  example?: string;
}

// ─── Literals ────────────────────────────────────────────────────────

/** Is `key` usable bare in a JS object literal? */
function isIdentifier(key: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

/**
 * A Python literal. Strings go through `JSON.stringify`, whose escapes
 * (`\n`, `\"`, `\uXXXX`) are all valid Python too.
 */
export function pyLiteral(v: Value): string {
  if (v === null) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return numberLiteral(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(pyLiteral).join(", ")}]`;
  const entries = Object.entries(v).map(
    ([k, x]) => `${JSON.stringify(k)}: ${pyLiteral(x)}`,
  );
  return `{${entries.join(", ")}}`;
}

/** A JavaScript literal, spaced to read like the Python one. */
export function jsLiteral(v: Value): string {
  if (v === null) return "null";
  if (typeof v === "boolean") return String(v);
  if (typeof v === "number") return numberLiteral(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(jsLiteral).join(", ")}]`;
  const entries = Object.entries(v).map(
    ([k, x]) => `${isIdentifier(k) ? k : JSON.stringify(k)}: ${jsLiteral(x)}`,
  );
  return entries.length ? `{ ${entries.join(", ")} }` : "{}";
}

function numberLiteral(n: number): string {
  if (!Number.isFinite(n)) {
    throw new Error(`cases: ${n} has no literal in both languages`);
  }
  return String(n);
}

// ─── Python ──────────────────────────────────────────────────────────

/**
 * Tuples compare unequal to lists in Python, and returning a tuple for a
 * pair is idiomatic, so both sides are normalised to lists before comparing.
 */
const PY_NORM = `def _norm(v):
    if isinstance(v, (list, tuple)):
        return [_norm(x) for x in v]
    if isinstance(v, dict):
        return {k: _norm(x) for k, x in v.items()}
    return v`;

const PY_CLOSE = `def _close(a, b, tol):
    num = lambda x: isinstance(x, (int, float)) and not isinstance(x, bool)
    if num(a) and num(b):
        return abs(a - b) <= tol
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_close(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_close(a[k], b[k], tol) for k in a)
    return a == b`;

function pyCaseCode(fn: string, c: CallCase): string {
  const argSrc = c.pyArgs ?? (c.args ?? []).map(pyLiteral).join(", ");
  const shown = c.pyArgs !== undefined ? `${fn}(...)` : `${fn}(${argSrc})`;
  const call = c.noMutation ? `${fn}(*_args)` : `${fn}(${argSrc})`;
  const lines: string[] = [];
  if (c.noMutation) lines.push(`_args = [${argSrc}]`);

  if (c.throws) {
    const cls = c.throws === true ? "Exception" : c.throws.py;
    lines.push(
      "try:",
      `    _got = ${call}`,
      `except ${cls}:`,
      "    pass",
      "else:",
      `    raise AssertionError(${JSON.stringify(`${shown} should raise ${cls}, but returned `)} + repr(_got)[:300])`,
    );
  } else {
    const want = c.pyExpected ?? pyLiteral(c.expected ?? null);
    lines.push(PY_NORM);
    if (c.tolerance !== undefined) lines.push(PY_CLOSE);
    lines.push(`_got = _norm(${call})`, `_want = _norm(${want})`);
    const cmp =
      c.tolerance !== undefined
        ? `_close(_got, _want, ${c.tolerance})`
        : "_got == _want";
    lines.push(
      `assert ${cmp}, ${JSON.stringify(`${shown} returned `)} + repr(_got)[:300] + ", expected " + repr(_want)[:300]`,
    );
  }
  if (c.noMutation) {
    lines.push(
      `assert _args == [${argSrc}], ${JSON.stringify(`${fn} changed its input: `)} + repr(_args)[:300]`,
    );
  }
  return lines.join("\n");
}

// ─── JavaScript ──────────────────────────────────────────────────────

/**
 * `JSON.stringify` with object keys sorted, so `{ b: 1, a: 2 }` equals
 * `{ a: 2, b: 1 }` the way two Python dicts would.
 */
const JS_CANON = `const canon = (v) => JSON.stringify(v, (_k, x) =>
  x && typeof x === "object" && !Array.isArray(x)
    ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : x);`;

const JS_CLOSE = `const close = (a, b, tol) => {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= tol;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => close(x, b[i], tol));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return canon(ka) === canon(kb) && ka.every((k) => close(a[k], b[k], tol));
  }
  return canon(a) === canon(b);
};`;

function jsCaseCode(fn: string, c: CallCase): string {
  const argSrc = c.jsArgs ?? (c.args ?? []).map(jsLiteral).join(", ");
  const shown = c.jsArgs !== undefined ? `${fn}(...)` : `${fn}(${argSrc})`;
  const call = c.noMutation ? `${fn}(...args)` : `${fn}(${argSrc})`;
  const lines: string[] = [JS_CANON];
  if (c.noMutation) lines.push(`const args = [${argSrc}];`);

  if (c.throws) {
    lines.push(
      "let threw = false;",
      "let got;",
      `try { got = ${call}; } catch { threw = true; }`,
      `if (!threw) throw new Error(${JSON.stringify(`${shown} should throw, but returned `)} + String(canon(got)).slice(0, 300));`,
    );
  } else {
    const want = c.jsExpected ?? jsLiteral(c.expected ?? null);
    if (c.tolerance !== undefined) lines.push(JS_CLOSE);
    lines.push(`const got = ${call};`, `const want = ${want};`);
    const same =
      c.tolerance !== undefined
        ? `close(got, want, ${c.tolerance})`
        : "canon(got) === canon(want)";
    lines.push(
      `if (!(${same})) {`,
      `  throw new Error(${JSON.stringify(`${shown} returned `)} + String(canon(got)).slice(0, 300) + ", expected " + canon(want).slice(0, 300));`,
      "}",
    );
  }
  if (c.noMutation) {
    lines.push(
      `if (canon(args) !== canon([${argSrc}])) {`,
      `  throw new Error(${JSON.stringify(`${fn} changed its input: `)} + canon(args).slice(0, 300));`,
      "}",
    );
  }
  return lines.join("\n");
}

// ─── Public ──────────────────────────────────────────────────────────

/** Render cases as checks against the Python function `fn`. */
export function pyCases(fn: string, cases: CallCase[]): CodeTest[] {
  return cases.map((c) => ({
    id: c.id,
    name: c.name,
    ...(c.description ? { description: c.description } : {}),
    code: pyCaseCode(fn, c),
  }));
}

/** Render cases as checks against the JavaScript function `fn`. */
export function jsCases(fn: string, cases: CallCase[]): CodeTest[] {
  return cases.map((c) => ({
    id: c.id,
    name: c.name,
    ...(c.description ? { description: c.description } : {}),
    code: jsCaseCode(fn, c),
  }));
}

/**
 * A value in Python's spelling, plus JavaScript's where the two differ, so a
 * worked example reads `null` rather than `None` once the learner switches
 * language.
 */
function spelled(py: string, js: string) {
  return py === js ? { value: py } : { value: py, byLanguage: { javascript: js } };
}

/**
 * Worked examples from the cases marked `example`, so the instructions show
 * exactly the inputs the first checks grade. Each value is written the way
 * the language on screen would write it: Python by default, since Python is
 * the language a two-language challenge opens on, and JavaScript's spelling
 * when that is picked.
 */
export function examplesFromCases(
  params: string[],
  cases: CallCase[],
): WorkedExample[] {
  return cases
    .filter((c) => c.example !== undefined)
    .map((c, i) => {
      if (!c.args) {
        throw new Error(`cases: example "${c.id}" needs literal args to show`);
      }
      if (c.args.length !== params.length) {
        throw new Error(
          `cases: example "${c.id}" has ${c.args.length} args for ${params.length} params`,
        );
      }
      const output = c.throws
        ? { name: "output", value: "raises an error", emphasis: true }
        : {
            name: "output",
            ...spelled(
              c.pyExpected ?? pyLiteral(c.expected ?? null),
              c.jsExpected ?? jsLiteral(c.expected ?? null),
            ),
            emphasis: true,
          };
      return {
        label: `Example ${i + 1}`,
        fields: [
          ...params.map((name, j) => ({
            name,
            ...spelled(pyLiteral(c.args![j]), jsLiteral(c.args![j])),
          })),
          output,
        ],
        note: c.example,
      };
    });
}
