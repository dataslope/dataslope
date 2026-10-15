// Everything the video prints: listings, emitted JavaScript, tsc's errors and
// node's output. None of it is typed here. verify.py writes each example,
// compiles it with the repo's TypeScript and runs the result with node, and
// compiled.json is its output; this module only reads it and picks out the
// lines and positions the scenes need. Pure (no Remotion, no DOM).
//
//   python3 src/videos/type-erasure/verify.py   # rewrites compiled.json
//
// The checks at the bottom of this file throw if a re-run ever changes what
// the narration says (a clean compile, an error, a crash), so a stale claim
// fails in the Studio instead of shipping.

import compiled from "./compiled.json";

export const VIDEO = "type-erasure";

/** Whether public/images/type-erasure/ holds both watercolors from
 *  illustrations.json. They do; flip this off to lay the page out without. */
export const ILLUSTRATIONS = true;

export const TSC_VERSION = compiled.tsc.replace(/^Version\s+/, "");
export const NODE_VERSION = compiled.node.replace(/^v/, "");

type Example = (typeof compiled.files)[keyof typeof compiled.files];
const FILES = compiled.files;

/** One piece of a source line: the part tsc keeps, or a part it erases
 *  (written «like this» in verify.py). */
export type Segment = { text: string; erased: boolean };

export const segments = (marked: string): Segment[] =>
  marked
    .split(/(«[^»]*»)/)
    .filter(Boolean)
    .map((s) => (s.startsWith("«") ? { text: s.slice(1, -1), erased: true } : { text: s, erased: false }));

/** A marked line as tsc reads it. */
export const plain = (marked: string) => marked.replace(/[«»]/g, "");

const lines = (text: string | null) => (text ?? "").replace(/\n$/, "").split("\n");

/** The command every example is compiled with, as the terminal shows it. */
export const tscCommand = (name: string) => `tsc --target ${compiled.target} ${name}.ts`;

/** Where in a line a piece of code starts, and how long it is. Throws if
 *  the line does not hold it, so an edited example cannot leave a mark
 *  pointing at the wrong code. */
export type Span = { line: number; col: number; chars: number };
export const spanOf = (source: readonly string[], line: number, needle: string, nth = 1): Span => {
  const text = plain(source[line]);
  let col = -1;
  for (let k = 0; k < nth; k++) col = text.indexOf(needle, col + 1);
  if (col < 0) throw new Error(`Line ${line + 1} "${text}" has no "${needle}"`);
  return { line, col, chars: needle.length };
};

/** "check.ts(4,23): error TS2693: 'User' only …" → where, and what. */
const parseTscError = (out: string) => {
  const m = out.trim().match(/^(\S+)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
  if (!m) throw new Error(`Not one tsc error: ${out}`);
  return { file: m[1], line: Number(m[2]) - 1, col: Number(m[3]) - 1, code: m[4], message: m[5], full: out.trim() };
};

/** Node's uncaught error: its message line, and the line and column of the
 *  first frame in the file that ran. */
const parseNodeError = (err: string, js: string) => {
  const message = lines(err).find((l) => /^\w*Error: /.test(l));
  const at = err.match(new RegExp(`\\(${js.replace(".", "\\.")}:(\\d+):(\\d+)\\)`));
  if (!message || !at) throw new Error(`No error in node's output: ${err}`);
  return { message, line: Number(at[1]) - 1, col: Number(at[2]) - 1 };
};

/** The identifier that starts at a span's column, as a span. */
const wordAt = (source: readonly string[], line: number, col: number): Span => {
  const word = plain(source[line]).slice(col).match(/^\w+/);
  if (!word) throw new Error(`No identifier at ${line + 1}:${col + 1}`);
  return { line, col, chars: word[0].length };
};

// ── Fig. 1: user.ts and the user.js tsc writes for it ──
export const USER_TS = FILES.user.marked;
export const USER_JS = lines(FILES.user.emitted);
export const USER_RUN = FILES.user.nodeOut.trim();

// ── Fig. 2: instanceof against an interface ──
export const CHECK_TS = FILES.check.marked;
export const CHECK_JS = lines(FILES.check.emitted);
export const CHECK_ERROR = parseTscError(FILES.check.tscOut);
/** The squiggle under `User`, where tsc puts the error. */
export const CHECK_ERROR_SPAN = wordAt(CHECK_TS, CHECK_ERROR.line, CHECK_ERROR.col);
export const CHECK_RUN = parseNodeError(FILES.check.nodeErr, "check.js");
/** Where node stopped in check.js: the erased name. */
export const CHECK_RUN_SPAN = wordAt(CHECK_JS, CHECK_RUN.line, CHECK_RUN.col);
export const CHECK_INSTANCEOF = spanOf(CHECK_TS, CHECK_ERROR.line, "instanceof User");

// ── Fig. 3: a User that is not one ──
export const CRASH_TS = FILES.crash.marked;
export const CRASH_RUN = parseNodeError(FILES.crash.nodeErr, "crash.js");
/** The JSON text, its null, the parse and the claim. */
const TEXT_LINE = CRASH_TS.findIndex((l) => l.startsWith("const text"));
const PARSE_LINE = CRASH_TS.findIndex((l) => l.includes("JSON.parse"));
export const CRASH_NULL = spanOf(CRASH_TS, TEXT_LINE, "null");
export const CRASH_PARSE = spanOf(CRASH_TS, PARSE_LINE, "JSON.parse(text)");
export const CRASH_CLAIM = spanOf(CRASH_TS, PARSE_LINE, ": User");
/** Where node stopped, mapped from crash.js back to the same line of crash.ts. */
const CRASH_JS = lines(FILES.crash.emitted);
export const CRASH_AT = wordAt(
  CRASH_TS,
  CRASH_TS.findIndex((l) => plain(l) === CRASH_JS[CRASH_RUN.line]),
  CRASH_RUN.col,
);
/** How lib.es5.d.ts declares JSON.parse: `…): any;`. */
export const JSON_PARSE_RETURNS = compiled.jsonParse.match(/\):\s*(\w+);$/)?.[1] ?? "";

// ── Fig. 4: parse into unknown, then check ──
export const GUARD_TS = FILES.guard.marked;
export const GUARD_RUN = FILES.guard.nodeOut.trim();
const DATA_LINE = GUARD_TS.findIndex((l) => l.startsWith("const data"));
export const GUARD_UNKNOWN = spanOf(GUARD_TS, DATA_LINE, "unknown");
/** The three lines of tests inside isUser. */
export const GUARD_TESTS = GUARD_TS.flatMap((l, i) => (/typeof|" in /.test(l) && !l.startsWith("function") ? [i] : []));
/** The line inside `if (isUser(data))`, and the else branch's line. */
export const GUARD_INSIDE = GUARD_TS.findIndex((l) => l.includes("data.name"));
export const GUARD_ELSE = GUARD_TS.findIndex((l) => l.includes("Not a user"));
/** The same use of `data` with no check, in unguarded.ts. */
export const UNGUARDED_ERROR = parseTscError(FILES.unguarded.tscOut);

const expect = (ok: boolean, what: string, f?: Example) => {
  if (!ok) throw new Error(`compiled.json no longer shows that ${what}${f ? `: ${JSON.stringify(f.tscOut)}` : ""}`);
};
expect(FILES.user.tscExit === 0 && FILES.user.tscOut === "", "user.ts compiles cleanly", FILES.user);
expect(USER_RUN.length > 0, "node user.js prints a name");
expect(CHECK_ERROR.code === "TS2693", "instanceof User is TS2693", FILES.check);
expect(FILES.check.emitted !== null, "tsc writes check.js despite the error");
expect(CHECK_RUN.message.startsWith("ReferenceError"), "check.js throws a ReferenceError");
expect(FILES.crash.tscExit === 0 && FILES.crash.tscOut === "", "crash.ts compiles with no errors", FILES.crash);
expect(CRASH_RUN.message.startsWith("TypeError"), "crash.js throws a TypeError");
expect(JSON_PARSE_RETURNS === "any", "JSON.parse returns any");
expect(FILES.guard.tscExit === 0 && FILES.guard.tscOut === "", "guard.ts compiles cleanly", FILES.guard);
expect(GUARD_RUN.startsWith("Not a user"), "the null name takes the else branch");
expect(FILES.unguarded.tscExit !== 0, "using unknown unchecked is an error", FILES.unguarded);
expect(GUARD_TESTS.length === 3, "isUser holds three lines of tests");
