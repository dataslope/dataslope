/**
 * Language-specific test harnesses for `ChallengeCard` plus a stdout-expectation
 * evaluator for compiled languages. Native tests (`{ code }`) are wrapped so each
 * result prints `__DSTEST__:<id>:PASS` or `__DSTEST__:<id>:FAIL:<json>` after a
 * `__DSTEST_BEGIN__` sentinel; stdout tests (`{ expect }`) are evaluated in JS by
 * `evaluateStdoutExpect` after the run. New interpreted languages register a
 * `HarnessBuilder` keyed by adapter id.
 */

/** Declarative stdout/stderr expectation. All set fields are conjunctive. */
export interface StdoutExpect {
  /** Stdout must equal this exactly (both sides trimmed). */
  stdoutEquals?: string;
  /** Stdout must contain the substring(s), whitespace preserved. */
  stdoutContains?: string | string[];
  /** Stdout must NOT contain the substring(s). */
  stdoutDoesNotContain?: string | string[];
  /** Regex as a string (a literal `RegExp` can't be expressed in MDX). */
  stdoutMatches?: string;
  /** Flags for `stdoutMatches`; defaults to `"s"`. */
  stdoutMatchesFlags?: string;
  /** Per-line equality (right-trimmed); extra lines ignored unless `stdoutLinesExact`. */
  stdoutLines?: string[];
  /** With `stdoutLines`, require line counts to match exactly. */
  stdoutLinesExact?: boolean;
  /** Stderr must be empty. */
  noStderr?: boolean;
  /** Stderr must contain the substring(s). */
  stderrContains?: string | string[];
}

export interface ChallengeTestBase {
  id: string;
  name: string;
  description?: string;
}

/** Test whose `code` runs alongside the learner's code; assert/throw on failure. */
export interface NativeChallengeTest extends ChallengeTestBase {
  code: string;
}

/** Test evaluated against captured stdout/stderr (for compiled languages). */
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

/** One-check-per-line summary of a stdout expectation, for the test-details popover. */
export function stdoutExpectSummary(e: StdoutExpect): string {
  const lines: string[] = [];
  const list = (v: string | string[]) =>
    (Array.isArray(v) ? v : [v]).map((s) => JSON.stringify(s)).join(", ");
  if (e.stdoutEquals !== undefined)
    lines.push(`stdout equals ${JSON.stringify(e.stdoutEquals)}`);
  if (e.stdoutContains !== undefined)
    lines.push(`stdout contains ${list(e.stdoutContains)}`);
  if (e.stdoutDoesNotContain !== undefined)
    lines.push(`stdout does not contain ${list(e.stdoutDoesNotContain)}`);
  if (e.stdoutMatches !== undefined)
    lines.push(`stdout matches /${e.stdoutMatches}/${e.stdoutMatchesFlags ?? "s"}`);
  if (e.stdoutLines !== undefined)
    lines.push(
      `stdout lines${e.stdoutLinesExact ? " (exact)" : ""}:\n${e.stdoutLines
        .map((l) => `  ${l}`)
        .join("\n")}`,
    );
  if (e.noStderr) lines.push("no stderr output");
  if (e.stderrContains !== undefined)
    lines.push(`stderr contains ${list(e.stderrContains)}`);
  return lines.join("\n");
}

/** Sentinel marking where harness output begins in captured stdout. */
export const HARNESS_BEGIN = "__DSTEST_BEGIN__";

/** Result line prefix: `__DSTEST__:<id>:PASS` or `__DSTEST__:<id>:FAIL:<json>`. */
export const HARNESS_RESULT_PREFIX = "__DSTEST__:";

export interface ParsedTestResult {
  id: string;
  pass: boolean;
  detail: string | null;
}

/** Parse a challenge run's stdout into user-visible `clean` text and ordered `results`. */
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
            // Malformed result line: show the raw payload rather than nothing.
            detail = detailJson;
          }
        }
        results.push({ id, pass: false, detail });
      }
      continue;
    }
    // Past the begin sentinel, suppress any incidental harness stdout.
    if (seenBegin) continue;
    cleanLines.push(line);
  }

  return { clean: cleanLines.join("\n"), results };
}

/** Evaluate a stdout-based test against captured stdout/stderr. */
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
    // Drop trailing empty lines so a stray final newline doesn't fail the match.
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
 * Python harness. Per-test wrapper functions let assertions read the learner's
 * globals while isolating exceptions; details are JSON-encoded to round-trip
 * newlines/quotes.
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
    // Indent the body 4 spaces; an empty body renders as `pass`.
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
 * JavaScript/TypeScript harness (shared by both adapters). Test bodies run in
 * async functions so `return`/`await` are legal; the runtime supports top-level
 * `await`, so tests are awaited in order.
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
 * R harness; test bodies signal failure via `stop()`/`stopifnot()`. Helper names
 * use a leading `.` because R identifiers cannot begin with `_`.
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
 * PHP harness. Test bodies run inline (not in closures) so they can see the
 * learner's file-scope variables; throw on failure.
 */
const buildPhpHarness: HarnessBuilder = (tests) => {
  const lines: string[] = [];
  // Reopen `<?php` so the concatenated script stays valid whether or not the
  // user's code closed with `?>`.
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

/**
 * Shared core of the web/react preview harnesses. Runs in the sandboxed preview
 * iframe so tests can assert on the real DOM; results travel through the console
 * bridge as sentinel lines, and `__dsPreviewHarnessDone()` (installed by the
 * bridge; see runtime/webPreview.ts) signals completion. Tests start after the
 * `load` event plus `settleDelayMs`, and async bodies are awaited in order.
 */
function buildPreviewHarnessScript(
  tests: NativeChallengeTest[],
  settleDelayMs: number,
): string {
  const lines: string[] = [];
  lines.push("(function () {");
  lines.push('  "use strict";');
  lines.push("  var __dstestRun = async function (tid, fn) {");
  lines.push("    try { await fn();");
  lines.push(
    `      console.log("${HARNESS_RESULT_PREFIX}" + tid + ":PASS");`,
  );
  lines.push("    } catch (e) {");
  lines.push("      var msg = e && e.message ? e.message : String(e);");
  lines.push(
    `      console.log("${HARNESS_RESULT_PREFIX}" + tid + ":FAIL:" + JSON.stringify(msg));`,
  );
  lines.push("    }");
  lines.push("  };");
  // `load` does not guarantee a layout box, and getComputedStyle returns *used*
  // values only for elements that generate one — without waiting, a correct
  // 4-column grid resolved to its specified `repeat(4, 1fr)` and failed the
  // test. Poll instead of requestAnimationFrame: frames are throttled in a
  // non-presented document, so rAF may never fire.
  lines.push("  var __dsAwaitLayout = async function () {");
  lines.push("    for (var i = 0; i < 60; i++) {");
  lines.push("      var b = document.body;");
  lines.push("      if (b && b.getBoundingClientRect().width > 0) return;");
  lines.push("      await new Promise(function (r) { setTimeout(r, 16); });");
  lines.push("    }");
  lines.push("  };");
  lines.push("  var __dstestAll = async function () {");
  lines.push("    await __dsAwaitLayout();");
  lines.push(`    console.log("${HARNESS_BEGIN}");`);
  tests.forEach((t) => {
    const body = t.code.trim() || "/* empty */";
    lines.push(
      `    await __dstestRun(${JSON.stringify(t.id)}, async function () {\n${body}\n    });`,
    );
  });
  lines.push(
    "    if (window.__dsPreviewHarnessDone) window.__dsPreviewHarnessDone();",
  );
  lines.push("  };");
  lines.push(
    `  var __dstestStart = function () { setTimeout(function () { void __dstestAll(); }, ${settleDelayMs}); };`,
  );
  lines.push('  if (document.readyState === "complete") __dstestStart();');
  lines.push('  else window.addEventListener("load", __dstestStart);');
  lines.push("})();");
  return lines.join("\n");
}

/**
 * Web (HTML/CSS/JS) harness: a `<script>` appended after the HTML document.
 * Content after `</html>` is legal — the parser relocates it into `<body>`.
 */
const buildWebHarness: HarnessBuilder = (tests) => {
  const script = buildPreviewHarnessScript(tests, 0)
    // Escape `</script` so test code can't terminate the wrapper tag early.
    .replace(/<\/(script)/gi, "<\\/$1");
  return `\n<script>\n${script}\n</script>`;
};

/**
 * React harness, appended to the entry module. The settle delay lets React's
 * initial render commit (render is scheduled, not synchronous). No top-level
 * `await` — that would delay the `load` event the harness itself waits on.
 */
const buildReactHarness: HarnessBuilder = (tests) =>
  `\n;${buildPreviewHarnessScript(tests, 80)}\n`;

const HARNESS_BUILDERS: Record<string, HarnessBuilder> = {
  python: buildPythonHarness,
  javascript: buildJsHarness,
  typescript: buildJsHarness,
  r: buildRHarness,
  php: buildPhpHarness,
  web: buildWebHarness,
  react: buildReactHarness,
};

/** Build the harness snippet for the adapter's native tests; returns "" when
 *  there are none. Stdout-based tests are evaluated separately after the run. */
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

/** True iff the given tests can be evaluated for `adapterId` (native tests
 *  require a harness builder; stdout tests work on any runtime). */
export function canRunTests(
  adapterId: string,
  tests: ChallengeTest[],
): boolean {
  if (tests.length === 0) return false;
  const hasNative = tests.some(isNativeTest);
  return !hasNative || hasNativeHarness(adapterId);
}

/** Backwards-compatible alias for `hasNativeHarness`. */
export function hasHarness(adapterId: string): boolean {
  return hasNativeHarness(adapterId);
}
