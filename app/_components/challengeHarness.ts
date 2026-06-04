/**
 * Language-specific test harnesses for the `ChallengeCard` component
 * plus a stdout-expectation evaluator used by compiled languages.
 *
 * Each test in `ChallengeTest[]` is one of two shapes:
 *
 *   1. **Native test** — `{ id, name, description, code }` where `code`
 *      is a snippet of the target language that `throw`s/`assert`s on
 *      failure and is silent on success. The harness wraps every test
 *      with a try/catch idiom and frames each result with a sentinel
 *      line:
 *
 *        __DSTEST__:<id>:PASS
 *        __DSTEST__:<id>:FAIL:<json-encoded detail>
 *
 *      Anything between the `__DSTEST_BEGIN__` sentinel and the end of
 *      stdout belongs to the harness — the component strips those
 *      lines from the user-visible output and parses them into test
 *      results.
 *
 *   2. **Stdout-based test** — `{ id, name, description, expect }`
 *      where `expect` declares expectations against the user code's
 *      captured stdout/stderr. Useful for compiled languages (C, C++,
 *      Java, C#) where injecting a per-test harness into a single
 *      `main()`-style program isn't practical. Evaluated in JS by
 *      `evaluateStdoutExpect` after the run completes.
 *
 * To extend support for a new language that has an interactive
 * interpreter, add a `HarnessBuilder` keyed by the adapter id. The
 * component looks the builder up at check time and surfaces a clear
 * error if none is registered (and falls back to stdout-only mode if
 * every test is stdout-based).
 */

/** Declarative stdout / stderr expectation for a single test case.
 *  All listed fields are conjunctive — the test passes only when every
 *  field matches. Use one or more of these together. */
export interface StdoutExpect {
  /** Stdout must equal this string exactly (after trimming trailing
   *  whitespace on both sides). */
  stdoutEquals?: string;
  /** Stdout must contain this substring (or every substring in the
   *  array). Whitespace is preserved as-is. */
  stdoutContains?: string | string[];
  /** Stdout must NOT contain this substring (or any of them). */
  stdoutDoesNotContain?: string | string[];
  /** Stdout must match this regex. Provide as a string (with optional
   *  flags via `stdoutMatchesFlags`) so the value round-trips through
   *  MDX, where a literal `RegExp` cannot be expressed. */
  stdoutMatches?: string;
  /** Regex flags for `stdoutMatches`. Defaults to `"s"` (dot matches
   *  newlines) so multi-line stdout matches feel natural. */
  stdoutMatchesFlags?: string;
  /** Each line of stdout (after trim) must equal the corresponding
   *  element of this array. Lines beyond the array are ignored unless
   *  `stdoutLinesExact` is true. */
  stdoutLines?: string[];
  /** When set with `stdoutLines`, requires the line counts to match
   *  exactly. */
  stdoutLinesExact?: boolean;
  /** Stderr must be empty (no diagnostics, warnings, or compile
   *  errors). */
  noStderr?: boolean;
  /** Stderr must contain this substring. */
  stderrContains?: string | string[];
}

export interface ChallengeTestBase {
  id: string;
  name: string;
  description?: string;
}

/** A test that injects code into the runtime alongside the learner's
 *  code. The `code` snippet should `assert`/`throw` on failure and be
 *  silent on success. */
export interface NativeChallengeTest extends ChallengeTestBase {
  code: string;
}

/** A test that evaluates the run's captured stdout/stderr against a
 *  declarative expectation. Useful for compiled languages where
 *  injecting per-test code into a single `main()` is awkward. */
export interface StdoutChallengeTest extends ChallengeTestBase {
  expect: StdoutExpect;
}

export type ChallengeTest = NativeChallengeTest | StdoutChallengeTest;

export function isStdoutTest(t: ChallengeTest): t is StdoutChallengeTest {
  return "expect" in t && t.expect !== undefined;
}

export function isNativeTest(t: ChallengeTest): t is NativeChallengeTest {
  return "code" in t && typeof (t as NativeChallengeTest).code === "string";
}

/** Sentinel printed once, before any per-test result, so the component
 *  can locate where the harness output begins inside captured stdout. */
export const HARNESS_BEGIN = "__DSTEST_BEGIN__";

/** Per-test result marker. Result form is exactly:
 *      __DSTEST__:<id>:PASS
 *      __DSTEST__:<id>:FAIL:<json-encoded detail string> */
export const HARNESS_RESULT_PREFIX = "__DSTEST__:";

/** Parsed individual test outcome. */
export interface ParsedTestResult {
  id: string;
  pass: boolean;
  detail: string | null;
}

/**
 * Parse stdout text emitted by a challenge run. Returns:
 *   - `clean`: stdout with all harness lines removed (user-visible).
 *   - `results`: every `__DSTEST__:` line seen, in order.
 */
export function parseHarnessOutput(stdout: string): {
  clean: string;
  results: ParsedTestResult[];
} {
  const lines = stdout.split("\n");
  const cleanLines: string[] = [];
  const results: ParsedTestResult[] = [];
  let seenBegin = false;

  for (const line of lines) {
    if (line === HARNESS_BEGIN) {
      seenBegin = true;
      continue;
    }
    if (line.startsWith(HARNESS_RESULT_PREFIX)) {
      const rest = line.slice(HARNESS_RESULT_PREFIX.length);
      // Form: <id>:PASS  or  <id>:FAIL:<json>
      const firstColon = rest.indexOf(":");
      if (firstColon === -1) continue;
      const id = rest.slice(0, firstColon);
      const after = rest.slice(firstColon + 1);
      if (after === "PASS") {
        results.push({ id, pass: true, detail: null });
      } else if (after.startsWith("FAIL")) {
        const detailJson = after.startsWith("FAIL:")
          ? after.slice("FAIL:".length)
          : "";
        let detail: string | null = null;
        if (detailJson) {
          try {
            detail = String(JSON.parse(detailJson));
          } catch {
            // Fall back to the raw payload so the user sees *something*
            // rather than a silent failure if the harness emitted a
            // malformed result line.
            detail = detailJson;
          }
        }
        results.push({ id, pass: false, detail });
      }
      continue;
    }
    // Once we've crossed into the harness region, also suppress any
    // incidental stdout the harness produced (shouldn't happen, but a
    // misbehaving assertion that prints before raising shouldn't leak
    // into the user-facing output).
    if (seenBegin) continue;
    cleanLines.push(line);
  }

  return { clean: cleanLines.join("\n"), results };
}

/** Evaluate a stdout-based test against the captured stdout/stderr.
 *  Returns the same shape as `ParsedTestResult` for symmetric handling
 *  in the UI. */
export function evaluateStdoutExpect(
  test: StdoutChallengeTest,
  stdout: string,
  stderr: string,
): ParsedTestResult {
  const exp = test.expect;
  const ensureArray = (v: string | string[] | undefined): string[] =>
    v === undefined ? [] : Array.isArray(v) ? v : [v];

  if (exp.stdoutEquals !== undefined) {
    const a = stdout.trim();
    const b = exp.stdoutEquals.trim();
    if (a !== b) {
      return {
        id: test.id,
        pass: false,
        detail: `Expected stdout to equal:\n${b}\n\nGot:\n${a || "(empty)"}`,
      };
    }
  }

  for (const needle of ensureArray(exp.stdoutContains)) {
    if (!stdout.includes(needle)) {
      return {
        id: test.id,
        pass: false,
        detail: `Expected stdout to contain: ${JSON.stringify(needle)}`,
      };
    }
  }

  for (const needle of ensureArray(exp.stdoutDoesNotContain)) {
    if (stdout.includes(needle)) {
      return {
        id: test.id,
        pass: false,
        detail: `Stdout should not contain: ${JSON.stringify(needle)}`,
      };
    }
  }

  if (exp.stdoutMatches !== undefined) {
    let re: RegExp;
    try {
      re = new RegExp(exp.stdoutMatches, exp.stdoutMatchesFlags ?? "s");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        id: test.id,
        pass: false,
        detail: `Invalid regex in test: ${msg}`,
      };
    }
    if (!re.test(stdout)) {
      return {
        id: test.id,
        pass: false,
        detail: `Expected stdout to match /${exp.stdoutMatches}/${exp.stdoutMatchesFlags ?? "s"}`,
      };
    }
  }

  if (exp.stdoutLines !== undefined) {
    const actual = stdout
      .split("\n")
      .map((l) => l.replace(/\s+$/, ""));
    // Drop trailing empty lines so a stray final newline doesn't fail
    // an otherwise-correct match.
    while (actual.length > 0 && actual[actual.length - 1] === "") {
      actual.pop();
    }
    const expected = exp.stdoutLines.map((l) => l.replace(/\s+$/, ""));
    if (exp.stdoutLinesExact && actual.length !== expected.length) {
      return {
        id: test.id,
        pass: false,
        detail: `Expected ${expected.length} line(s) of stdout, got ${actual.length}.`,
      };
    }
    for (let i = 0; i < expected.length; i++) {
      if (actual[i] !== expected[i]) {
        return {
          id: test.id,
          pass: false,
          detail: `Line ${i + 1} mismatch.\n  expected: ${JSON.stringify(expected[i])}\n  got:      ${JSON.stringify(actual[i] ?? "")}`,
        };
      }
    }
  }

  if (exp.noStderr && stderr.trim().length > 0) {
    return {
      id: test.id,
      pass: false,
      detail: `Expected no stderr output, got:\n${stderr.trim()}`,
    };
  }

  for (const needle of ensureArray(exp.stderrContains)) {
    if (!stderr.includes(needle)) {
      return {
        id: test.id,
        pass: false,
        detail: `Expected stderr to contain: ${JSON.stringify(needle)}`,
      };
    }
  }

  return { id: test.id, pass: true, detail: null };
}

type HarnessBuilder = (tests: NativeChallengeTest[]) => string;

/**
 * Python harness — uses a per-test wrapper function so the assertion
 * can read globals defined by the learner's code (e.g. `summary`) while
 * still isolating exceptions per test. Detail strings are JSON-encoded
 * so newlines / quotes in error messages round-trip cleanly.
 */
const buildPythonHarness: HarnessBuilder = (tests) => {
  const lines: string[] = [];
  lines.push(`print("${HARNESS_BEGIN}")`);
  lines.push("import json as __dstest_json");
  lines.push("def __dstest_run(_tid, _fn):");
  lines.push("    try:");
  lines.push("        _fn()");
  lines.push(`        print("${HARNESS_RESULT_PREFIX}" + _tid + ":PASS")`);
  lines.push("    except AssertionError as _e:");
  lines.push("        _msg = str(_e) or 'Assertion failed'");
  lines.push(
    `        print("${HARNESS_RESULT_PREFIX}" + _tid + ":FAIL:" + __dstest_json.dumps(_msg))`,
  );
  lines.push("    except Exception as _e:");
  lines.push("        _msg = type(_e).__name__ + ': ' + str(_e)");
  lines.push(
    `        print("${HARNESS_RESULT_PREFIX}" + _tid + ":FAIL:" + __dstest_json.dumps(_msg))`,
  );
  lines.push("");
  tests.forEach((t, i) => {
    const fnName = `__dstest_t${i}`;
    lines.push(`def ${fnName}():`);
    // Indent every line of the user-supplied body by 4 spaces so it
    // becomes the function body. An empty body is still legal (renders
    // as `pass`).
    const body = t.code.trim();
    if (!body) {
      lines.push("    pass");
    } else {
      for (const raw of body.split("\n")) {
        lines.push("    " + raw);
      }
    }
    lines.push(`__dstest_run(${JSON.stringify(t.id)}, ${fnName})`);
    lines.push("");
  });
  return lines.join("\n");
};

/**
 * JavaScript / TypeScript harness — used by both adapters since their
 * runtime surface for `console.log` and exception handling is the same.
 * Test bodies execute inside an async function so `return`/`await` are
 * legal and lexical bindings don't pollute the global scope. The runtime
 * wraps user code (and this harness) in an async function with top-level
 * `await` support, so each test is awaited in turn — this lets test code
 * `await` Promises (e.g. asserting on a callback wrapped in a Promise).
 */
const buildJsHarness: HarnessBuilder = (tests) => {
  const lines: string[] = [];
  lines.push(`console.log("${HARNESS_BEGIN}");`);
  lines.push("async function __dstestRun(tid, fn) {");
  lines.push("  try { await fn();");
  lines.push(`    console.log("${HARNESS_RESULT_PREFIX}" + tid + ":PASS");`);
  lines.push("  } catch (e) {");
  lines.push(
    "    const msg = e && e.message ? e.message : String(e);",
  );
  lines.push(
    `    console.log("${HARNESS_RESULT_PREFIX}" + tid + ":FAIL:" + JSON.stringify(msg));`,
  );
  lines.push("  }");
  lines.push("}");
  lines.push("");
  tests.forEach((t) => {
    const body = t.code.trim() || "/* empty */";
    lines.push(
      `await __dstestRun(${JSON.stringify(t.id)}, async function () {\n${body}\n});`,
    );
    lines.push("");
  });
  return lines.join("\n");
};

/**
 * R harness — same shape as the Python one, using `tryCatch` for the
 * pass / fail framing. Test bodies should call `stop("…")` (or any
 * function that calls it, e.g. `stopifnot()`) to signal failure.
 *
 * Note: R identifiers cannot begin with `_`, so the helper names use
 * a leading `.` (which is conventional for "hidden" R variables) —
 * `.dstest_run`, `.dstest_t0`, etc. Using the `__dstest…` form the
 * other harnesses share would cause R's parser to fail with
 * "unexpected input" on line 1 of the snippet.
 */
const buildRHarness: HarnessBuilder = (tests) => {
  const lines: string[] = [];
  lines.push(`cat("${HARNESS_BEGIN}\\n")`);
  lines.push(".dstest_run <- function(tid, fn) {");
  lines.push("  tryCatch({ fn();");
  lines.push(
    `    cat(paste0("${HARNESS_RESULT_PREFIX}", tid, ":PASS\\n"))`,
  );
  lines.push("  }, error = function(e) {");
  lines.push("    msg <- conditionMessage(e)");
  lines.push(
    `    cat(paste0("${HARNESS_RESULT_PREFIX}", tid, ":FAIL:", deparse(as.character(msg)), "\\n"))`,
  );
  lines.push("  })");
  lines.push("}");
  lines.push("");
  tests.forEach((t, i) => {
    const fnName = `.dstest_t${i}`;
    const body = t.code.trim() || "invisible(NULL)";
    lines.push(`${fnName} <- function() {`);
    for (const raw of body.split("\n")) lines.push("  " + raw);
    lines.push("}");
    lines.push(
      `.dstest_run(${JSON.stringify(t.id)}, ${fnName})`,
    );
    lines.push("");
  });
  return lines.join("\n");
};

/**
 * PHP harness — runs each test body inline inside a try/catch so the
 * snippet can see file-scope variables defined by the learner's code
 * (PHP closures would otherwise require explicit `use(...)` captures).
 * Snippets should `throw new Exception("…")` on failure.
 */
const buildPhpHarness: HarnessBuilder = (tests) => {
  const lines: string[] = [];
  // The user's code begins with `<?php` and may or may not close with
  // `?>`. The harness opens a fresh `<?php` block so the concatenated
  // script remains valid even if the user closed PHP mode at the end
  // of their snippet.
  lines.push(`?>`);
  lines.push(`<?php`);
  lines.push(`echo "${HARNESS_BEGIN}\\n";`);
  tests.forEach((t) => {
    const body = t.code.trim() || "/* empty */";
    lines.push("try {");
    for (const raw of body.split("\n")) lines.push("    " + raw);
    lines.push(
      `    echo "${HARNESS_RESULT_PREFIX}" . ${JSON.stringify(t.id)} . ":PASS\\n";`,
    );
    lines.push("} catch (\\Throwable $__dstest_e) {");
    lines.push("    $__dstest_msg = $__dstest_e->getMessage();");
    lines.push(
      "    if ($__dstest_msg === '') $__dstest_msg = get_class($__dstest_e);",
    );
    lines.push(
      `    echo "${HARNESS_RESULT_PREFIX}" . ${JSON.stringify(t.id)} . ":FAIL:" . json_encode($__dstest_msg) . "\\n";`,
    );
    lines.push("}");
    lines.push("");
  });
  return lines.join("\n");
};

const HARNESS_BUILDERS: Record<string, HarnessBuilder> = {
  python: buildPythonHarness,
  javascript: buildJsHarness,
  typescript: buildJsHarness,
  r: buildRHarness,
  php: buildPhpHarness,
};

/** Build the harness snippet for the given adapter for the subset of
 *  tests that are native (have a `code` field). Stdout-based tests are
 *  ignored here — they're evaluated separately after the run.
 *
 *  Returns an empty string when there are no native tests, so the
 *  caller can avoid invoking the harness machinery entirely. */
export function buildHarness(
  adapterId: string,
  tests: ChallengeTest[],
): string {
  const native = tests.filter(isNativeTest);
  if (native.length === 0) return "";
  const builder = HARNESS_BUILDERS[adapterId];
  if (!builder) {
    throw new Error(
      `No native challenge test harness registered for adapter "${adapterId}". ` +
        `Use stdout-based \`expect\` tests for compiled languages, or add a ` +
        `harness builder to challengeHarness.ts.`,
    );
  }
  return builder(native);
}

/** True iff a native harness exists for the given adapter id. */
export function hasNativeHarness(adapterId: string): boolean {
  return adapterId in HARNESS_BUILDERS;
}

/** True iff the given tests can be evaluated for `adapterId`. Native
 *  tests require a harness builder; stdout-based tests work on any
 *  runtime that emits stdout/stderr. */
export function canRunTests(
  adapterId: string,
  tests: ChallengeTest[],
): boolean {
  if (tests.length === 0) return false;
  const hasNative = tests.some(isNativeTest);
  return !hasNative || hasNativeHarness(adapterId);
}

/** Backwards-compatible alias. The previous component checked
 *  `hasHarness(adapter.id)` to decide whether to show the check button;
 *  the new `canRunTests` is a superset. */
export function hasHarness(adapterId: string): boolean {
  return hasNativeHarness(adapterId);
}
