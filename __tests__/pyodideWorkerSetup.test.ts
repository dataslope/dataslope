/**
 * The Python half of the Pyodide worker lives in template literals, so
 * nothing typechecks it and nothing here can execute it (Pyodide is a CDN
 * download). These pin the behaviours that were silently wrong, by reading
 * the scripts back out of the source: each assertion below is a bug that
 * shipped, not a style rule.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const WORKER_SRC = readFileSync(
  join(__dirname, "../app/_components/runtime/pyodide-worker.ts"),
  "utf8",
);
const CAPTURE_SRC = readFileSync(
  join(__dirname, "../scripts/lib/python-output-capture.mjs"),
  "utf8",
);

/** Text between two markers in the worker source. */
function between(start: string, end: string): string {
  const from = WORKER_SRC.indexOf(start);
  expect(from, `marker not found: ${start}`).toBeGreaterThan(-1);
  const to = WORKER_SRC.indexOf(end, from + start.length);
  expect(to, `end marker not found: ${end}`).toBeGreaterThan(-1);
  return WORKER_SRC.slice(from + start.length, to);
}

const SETUP_B = between("const SETUP_SCRIPT_B = `", "`;");
const RUN_WRAPPER = between("const wrappedCode = `", "`;");

describe("plt.show()", () => {
  // The bug: savefig() saves the *current* figure, and the patch then closed
  // all of them — so "build two figures, show() once" rendered one and threw
  // the other away with no warning.
  it("iterates every open figure rather than saving the current one", () => {
    const show = SETUP_B.slice(
      SETUP_B.indexOf("def _patched_show"),
      SETUP_B.indexOf("plt.show = _patched_show"),
    );
    expect(show).toContain("plt.get_fignums()");
    expect(show).toContain("_fig.savefig(");
    expect(show).not.toContain("plt.savefig(");
    expect(show).not.toContain("plt.gcf()");
  });

  it("is mirrored by the build-time capture path", () => {
    // A lesson's prepopulated panel and a live run must not disagree.
    const show = CAPTURE_SRC.slice(
      CAPTURE_SRC.indexOf("def _bo_show"),
      CAPTURE_SRC.indexOf("_bo_plt.show = _bo_show"),
    );
    expect(show).toContain("_bo_plt.get_fignums()");
    expect(show).not.toContain("_bo_plt.savefig(");
    expect(show).not.toContain("_bo_plt.gcf()");
  });
});

describe("output streaming", () => {
  it("routes every rich cell through the emitter that flushes", () => {
    // A raw `_display_outputs.append` for a table/image/chart would sit in
    // the list until the run ended, which is the batching this replaced.
    for (const script of [SETUP_B, RUN_WRAPPER]) {
      expect(script).not.toMatch(/_display_outputs\.append\(\{"type": "(image|plot|dataframe|html)"/);
    }
    expect(RUN_WRAPPER).toContain('_pg_emit_cell({"type": "plot"');
    expect(RUN_WRAPPER).toContain('_pg_emit_cell({"type": "image"');
  });

  it("drains anything left over when the run ends", () => {
    expect(WORKER_SRC).toContain('pyodide.runPython("_pg_stream_flush(True)")');
  });

  it("detaches the sink afterwards so it can't outlive its run", () => {
    expect(WORKER_SRC).toContain('pyodide.runPython("_pg_stream_sink = None")');
  });
});

describe("error legibility", () => {
  it("compiles the user's code under its real filename", () => {
    // Frames used to read `File "<string>"`, which looks like a real file
    // that doesn't exist.
    expect(WORKER_SRC).toContain(
      'async def _execute_with_last_display(code, filename="main.py")',
    );
    expect(WORKER_SRC).toContain('compile(tree, filename, "exec"');
    expect(WORKER_SRC).toContain('compile(expr_tree, filename, "eval"');
    expect(WORKER_SRC).not.toContain('compile(tree, "<string>"');
    expect(RUN_WRAPPER).toContain(
      "_execute_with_last_display(_user_code_str, _pg_entry_filename)",
    );
  });

  it("replaces input() with an explanation instead of an errno", () => {
    expect(WORKER_SRC).toContain("builtins.input = _pg_input");
    expect(WORKER_SRC).toContain("isn't available in this playground");
  });

  it("cleans and annotates the message a failed run reports", () => {
    expect(WORKER_SRC).toContain(
      "annotateRunError(cleanPythonTraceback(raw))",
    );
  });
});

describe("files a run creates", () => {
  it("answers the surface's request for them", () => {
    expect(WORKER_SRC).toContain('msg.kind === "collect-created-files"');
    expect(WORKER_SRC).toContain('kind: "created-files"');
  });

  it("stamps staged files so only genuinely new ones are reported", () => {
    expect(WORKER_SRC).toContain("stagedStamps.set(");
    expect(WORKER_SRC).toContain("stagedStamps.clear()");
  });
});
