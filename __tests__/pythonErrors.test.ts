/**
 * A Python traceback from the playground has to read like a Python
 * traceback, not like a tour of the interpreter harness. These pin the two
 * string fixups applied when a run fails.
 */
import { describe, expect, it } from "vitest";

import {
  annotateRunError,
  cleanPythonTraceback,
} from "../app/_components/runtime/pythonErrors";

const HARNESS_TRACEBACK = `Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 597, in eval_code_async
    await CodeRunner(
    ...<9 lines>...
    .run_async(globals, locals)
  File "/lib/python314.zip/_pyodide/_base.py", line 413, in run_async
    await coroutine
  File "<exec>", line 34, in <module>
  File "<exec>", line 113, in _execute_with_last_display
  File "main.py", line 10, in <module>
  File "main.py", line 9, in a
  File "main.py", line 8, in b
ValueError: boom`;

describe("cleanPythonTraceback", () => {
  it("keeps only the frames the user wrote", () => {
    expect(cleanPythonTraceback(HARNESS_TRACEBACK)).toBe(
      `Traceback (most recent call last):
  File "main.py", line 10, in <module>
  File "main.py", line 9, in a
  File "main.py", line 8, in b
ValueError: boom`,
    );
  });

  it("drops the source lines echoed under a harness frame", () => {
    const cleaned = cleanPythonTraceback(HARNESS_TRACEBACK);
    expect(cleaned).not.toContain("await CodeRunner(");
    expect(cleaned).not.toContain("...<9 lines>...");
    expect(cleaned).not.toContain("_pyodide");
  });

  it("keeps the joiners and both halves of a chained exception", () => {
    const chained = `Traceback (most recent call last):
  File "<exec>", line 34, in <module>
  File "main.py", line 2, in <module>
KeyError: 'x'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 413, in run_async
    await coroutine
  File "main.py", line 4, in <module>
ValueError: boom`;
    const cleaned = cleanPythonTraceback(chained);
    expect(cleaned).toContain("During handling of the above exception");
    expect(cleaned).toContain("KeyError: 'x'");
    expect(cleaned).toContain('File "main.py", line 2');
    expect(cleaned).toContain('File "main.py", line 4');
    expect(cleaned).not.toContain("_pyodide");
    expect(cleaned).not.toContain("<exec>");
  });

  it("leaves a traceback with no harness frames untouched", () => {
    const plain = `Traceback (most recent call last):
  File "main.py", line 1, in <module>
ZeroDivisionError: division by zero`;
    expect(cleanPythonTraceback(plain)).toBe(plain);
  });

  it("shows a harness-only failure raw rather than showing nothing", () => {
    const harnessOnly = `Traceback (most recent call last):
  File "/lib/python314.zip/_pyodide/_base.py", line 597, in eval_code_async
    await CodeRunner(
RuntimeError: the harness broke`;
    expect(cleanPythonTraceback(harnessOnly)).toBe(harnessOnly);
  });

  it("passes through a message that isn't a traceback", () => {
    expect(cleanPythonTraceback("SyntaxError: invalid syntax")).toBe(
      "SyntaxError: invalid syntax",
    );
  });
});

describe("annotateRunError", () => {
  it("explains a CORS-blocked request in plain language", () => {
    const urllib3Failure = `pyodide.ffi.JsException: AbortError: signal is aborted without reason
  File ".../urllib3/contrib/emscripten/fetch.py", line 667, in _run_sync_with_timeout
urllib3.contrib.emscripten.fetch._TimeoutError: Request timed out`;
    const annotated = annotateRunError(urllib3Failure);
    expect(annotated).toMatch(/^This request was blocked by the browser/);
    expect(annotated).toContain("Access-Control-Allow-Origin");
    // The original failure is kept: the hint is a preface, not a swap.
    expect(annotated).toContain("_TimeoutError");
  });

  it("leaves an ordinary error alone", () => {
    const plain = `Traceback (most recent call last):
  File "main.py", line 1, in <module>
ValueError: boom`;
    expect(annotateRunError(plain)).toBe(plain);
  });
});
