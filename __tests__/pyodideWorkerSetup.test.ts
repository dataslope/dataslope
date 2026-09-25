/**
 * The Python half of the Pyodide worker lives in template literals, so
 * nothing typechecks it and nothing here can execute it (Pyodide is a CDN
 * download). What is pinned is the one place two implementations must agree:
 * the worker's `plt.show()` patch and its mirror in the build-time capture
 * shim, so a prepopulated panel and a live run render the same figures.
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
