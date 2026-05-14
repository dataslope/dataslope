/**
 * Language-specific test harnesses for the `ChallengeCard` component.
 *
 * The component is otherwise language-agnostic: each test is a `{ id,
 * name, description, code }` record where `code` is a snippet of the
 * target language that throws / raises on failure and is silent on
 * success. The harness wraps every test with a try/catch idiom and
 * frames each result with a sentinel line:
 *
 *   __DSTEST__:<id>:PASS
 *   __DSTEST__:<id>:FAIL:<json-encoded detail>
 *
 * Anything between the `__DSTEST_BEGIN__` sentinel and the end of
 * stdout belongs to the harness — the component strips those lines
 * from the user-visible output and parses them into test results.
 *
 * To extend support for a new language (e.g. JavaScript / TypeScript /
 * SQL), add a builder here keyed by the adapter id. The component
 * looks the builder up at check time and surfaces a clear error if
 * none is registered.
 */

export interface ChallengeTest {
  id: string;
  name: string;
  description: string;
  /** Test body in the target language. Should `assert` / `throw` on
   *  failure and execute silently on success. */
  code: string;
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

type HarnessBuilder = (tests: ChallengeTest[]) => string;

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
 * Test bodies execute inside an IIFE so `return` is legal and lexical
 * bindings don't pollute the global scope.
 */
const buildJsHarness: HarnessBuilder = (tests) => {
  const lines: string[] = [];
  lines.push(`console.log("${HARNESS_BEGIN}");`);
  lines.push("function __dstestRun(tid, fn) {");
  lines.push("  try { fn();");
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
      `__dstestRun(${JSON.stringify(t.id)}, function () {\n${body}\n});`,
    );
    lines.push("");
  });
  return lines.join("\n");
};

/**
 * R harness — same shape as the Python one, using `tryCatch` for the
 * pass / fail framing. Test bodies should call `stop("…")` (or any
 * function that calls it, e.g. `stopifnot()`) to signal failure.
 */
const buildRHarness: HarnessBuilder = (tests) => {
  const lines: string[] = [];
  lines.push(`cat("${HARNESS_BEGIN}\\n")`);
  lines.push("__dstest_run <- function(tid, fn) {");
  lines.push("  tryCatch({ fn();");
  lines.push(
    `    cat(paste0("${HARNESS_RESULT_PREFIX}", tid, ":PASS\\n"))`,
  );
  lines.push("  }, error = function(e) {");
  lines.push("    msg <- conditionMessage(e)");
  lines.push(
    `    cat(paste0("${HARNESS_RESULT_PREFIX}", tid, ":FAIL:", jsonlite::toJSON(msg, auto_unbox = TRUE), "\\n"))`,
  );
  lines.push("  })");
  lines.push("}");
  lines.push("");
  tests.forEach((t, i) => {
    const fnName = `__dstest_t${i}`;
    const body = t.code.trim() || "invisible(NULL)";
    lines.push(`${fnName} <- function() {`);
    for (const raw of body.split("\n")) lines.push("  " + raw);
    lines.push("}");
    lines.push(
      `__dstest_run(${JSON.stringify(t.id)}, ${fnName})`,
    );
    lines.push("");
  });
  return lines.join("\n");
};

const HARNESS_BUILDERS: Record<string, HarnessBuilder> = {
  python: buildPythonHarness,
  javascript: buildJsHarness,
  typescript: buildJsHarness,
  r: buildRHarness,
};

/** Build the harness snippet for the given adapter. Throws if no
 *  builder is registered — callers should surface that as a UI error
 *  rather than silently dropping the check button. */
export function buildHarness(
  adapterId: string,
  tests: ChallengeTest[],
): string {
  const builder = HARNESS_BUILDERS[adapterId];
  if (!builder) {
    throw new Error(
      `No challenge test harness registered for adapter "${adapterId}". ` +
        `Add one to challengeHarness.ts.`,
    );
  }
  return builder(tests);
}

/** True iff a harness exists for the given adapter id. The component
 *  uses this to disable the check button (rather than blow up at click
 *  time) when an adapter doesn't yet support challenges. */
export function hasHarness(adapterId: string): boolean {
  return adapterId in HARNESS_BUILDERS;
}
