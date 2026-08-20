/**
 * The PHP output pipeline. php-wasm itself needs a ~190 MB CDN download, so
 * the ordering and classification rules are exercised here directly, on the
 * exact transcripts the audit reported.
 */
import { describe, expect, it } from "vitest";

import {
  normalizeDiagnostic,
  PhpOutputRouter,
  type PhpOutputChunk,
} from "../app/_components/runtime/phpOutput";
import {
  buildEntryScript,
  PGLITE_ABORT_RE,
} from "../app/_components/runtime/phpEntry";

/** Drive a router and reassemble the cells the surface would show. */
function render(
  writes: Array<["stdout" | "stderr", string]>,
  entryPath?: string,
): { cells: Array<{ channel: string; content: string }>; text: string } {
  const chunks: PhpOutputChunk[] = [];
  const router = new PhpOutputRouter((c) => chunks.push(c), { entryPath });
  for (const [stream, text] of writes) router.write(stream, text);
  router.flush();

  const cells: Array<{ channel: string; content: string }> = [];
  for (const chunk of chunks) {
    if (chunk.append && cells[chunk.seq]) {
      cells[chunk.seq].content += chunk.content;
    } else {
      cells[chunk.seq] = { channel: chunk.channel, content: chunk.content };
    }
  }
  return { cells, text: cells.map((c) => c.content).join("") };
}

describe("PhpOutputRouter", () => {
  it("keeps stdout, stderr and diagnostics in the order they happened", () => {
    // The audit's PH-02 script, as php-wasm delivers it.
    const { text } = render([
      ["stdout", "1 stdout\n"],
      ["stderr", "2 stderr\n"],
      ["stdout", "3 stdout\n"],
      ["stderr", "4 stderr\n"],
      ["stdout", "5 stdout\n"],
      ["stdout", "Warning: 6 a warning in /index.php on line 7\n"],
      ["stdout", "7 stdout after the warning\n"],
      ["stderr", "8 via error_log\n"],
      ["stdout", "9 the end\n"],
    ]);
    expect(text).toBe(
      [
        "1 stdout",
        "2 stderr",
        "3 stdout",
        "4 stderr",
        "5 stdout",
        "Warning: 6 a warning in /index.php on line 7",
        "7 stdout after the warning",
        "8 via error_log",
        "9 the end",
        "",
      ].join("\n"),
    );
  });

  it("handles the transcript PHP 8.4 actually produces", () => {
    // Captured by running the entry wrapper through the php binary: PHP
    // prints a blank line before a warning, and that blank belongs to
    // stdout, not to the diagnostic that follows it.
    const { cells, text } = render(
      [
        ["stdout", "1 stdout\n"],
        ["stderr", "2 stderr\n"],
        ["stdout", "3 stdout\n"],
        ["stdout", "\nWarning: 4 a warning in /index.php on line 5\n"],
        ["stdout", "5 stdout after the warning\n"],
        ["stderr", "6 via STDERR constant\n"],
      ],
      "/index.php",
    );
    expect(text).toBe(
      [
        "1 stdout",
        "2 stderr",
        "3 stdout",
        "",
        "Warning: 4 a warning in /index.php on line 5",
        "5 stdout after the warning",
        "6 via STDERR constant",
        "",
      ].join("\n"),
    );
    expect(cells.map((c) => c.channel)).toEqual([
      "stdout",
      "log",
      "stdout",
      "stderr",
      "stdout",
      "log",
    ]);
  });

  it("routes a diagnostic to stderr and the program's own output to stdout", () => {
    const { cells } = render([
      ["stdout", "before\n"],
      ["stdout", "Warning: something in /index.php on line 2\n"],
      ["stdout", "after\n"],
    ]);
    expect(cells.map((c) => c.channel)).toEqual(["stdout", "stderr", "stdout"]);
    expect(cells[1].content).toContain("Warning: something");
  });

  it("gives the stderr stream its own channel, not the error one", () => {
    // error_log() is as often progress as it is failure; PHP's stderr is a
    // destination, not a severity.
    const { cells } = render([["stderr", "just a note\n"]]);
    expect(cells[0].channel).toBe("log");
  });

  it("keeps a fatal error's headline above its stack trace", () => {
    // PH-08: the reader used to meet a bare "Stack trace:" four lines
    // before the sentence naming the exception.
    const { text, cells } = render([
      ["stdout", "A: output before the fatal\n"],
      ["stdout", "B: more output\n"],
      ["stdout", "\n"],
      ["stdout", "Fatal error: Uncaught RuntimeException: deliberate failure in /index.php:6\n"],
      ["stdout", "Stack trace:\n"],
      ["stdout", "#0 /index.php(9): thrower()\n"],
      ["stdout", "#1 /index.php(11): middle()\n"],
      ["stdout", "#2 {main}\n"],
      ["stdout", "  thrown in /index.php on line 6\n"],
    ]);
    const lines = text.split("\n");
    expect(lines[0]).toBe("A: output before the fatal");
    expect(lines[3]).toContain("Fatal error: Uncaught RuntimeException");
    expect(lines[4]).toBe("Stack trace:");
    expect(lines[8]).toBe("  thrown in /index.php on line 6");
    // The whole block is one error cell, so it styles as one error.
    const errorCells = cells.filter((c) => c.channel === "stderr");
    expect(errorCells).toHaveLength(1);
    expect(errorCells[0].content).toContain("Stack trace:");
  });

  it("drops the harness frame require adds, and closes the gap", () => {
    // Verified against PHP 8.4 locally: requiring the entry so it has a
    // real path leaves a `require` frame naming the wrapper, which PHP
    // would not have printed for a script run directly.
    const { text } = render(
      [
        ["stdout", "Fatal error: Uncaught RuntimeException: boom in /index.php:5\n"],
        ["stdout", "Stack trace:\n"],
        ["stdout", "#0 /index.php(6): thrower()\n"],
        ["stdout", "#1 /index.php(7): middle()\n"],
        ["stdout", "#2 php-wasm run script(12): require('...')\n"],
        ["stdout", "#3 {main}\n"],
        ["stdout", "  thrown in /index.php on line 5\n"],
      ],
      "/index.php",
    );
    expect(text).not.toContain("require(");
    expect(text).toContain("#0 /index.php(6): thrower()");
    expect(text).toContain("#1 /index.php(7): middle()");
    // Renumbered: PHP would have called this #2, not #3.
    expect(text).toContain("#2 {main}");
    expect(text).not.toContain("#3");
  });

  it("classifies a diagnostic split across two writes", () => {
    const { cells } = render([
      ["stdout", "ok\nWarning: half a "],
      ["stdout", "line in /index.php on line 3\nmore\n"],
    ]);
    expect(cells.map((c) => c.channel)).toEqual(["stdout", "stderr", "stdout"]);
    expect(cells[1].content).toBe(
      "Warning: half a line in /index.php on line 3\n",
    );
  });

  it("emits a trailing line that never got its newline", () => {
    const { text } = render([["stdout", "no newline at the end"]]);
    expect(text).toBe("no newline at the end");
  });

  it("coalesces consecutive lines on one channel into a single cell", () => {
    const { cells } = render([
      ["stdout", "one\n"],
      ["stdout", "two\n"],
      ["stdout", "three\n"],
    ]);
    expect(cells).toHaveLength(1);
    expect(cells[0].content).toBe("one\ntwo\nthree\n");
  });

  it("does not mistake ordinary output for a stack frame", () => {
    const { cells } = render([
      ["stdout", "#0 this is just text\n"],
      ["stdout", "Stack trace: also just text\n"],
    ]);
    expect(cells).toHaveLength(1);
    expect(cells[0].channel).toBe("stdout");
  });

  it("drops the request-startup prefix and names the reader's file", () => {
    expect(
      normalizeDiagnostic(
        "Warning: PHP Request Startup: Epoch doesn't fit in a PHP integer in php-wasm run script on line 13",
        "/index.php",
      ),
    ).toBe(
      "Warning: Epoch doesn't fit in a PHP integer in /index.php on line 13",
    );
  });

  it("never leaves php-wasm's own label in a message", () => {
    const { text } = render(
      [
        ["stdout", "Fatal error: Uncaught Error: boom in php-wasm run script:2\n"],
        ["stdout", "#0 php-wasm run script(12): require('...')\n"],
        ["stdout", "#1 {main}\n"],
      ],
      "/index.php",
    );
    expect(text).not.toContain("php-wasm run script");
    // The headline names the reader's file; the harness frame is not theirs
    // to see at all.
    expect(text).toContain("/index.php:2");
    expect(text).toContain("#0 {main}");
  });
});

describe("the entry script", () => {
  it("runs the reader's file from the VFS, so it has a real path", () => {
    const script = buildEntryScript("/index.php");
    // Not evaluated as a string with a made-up label: `__FILE__`, `__DIR__`,
    // the warning text and every stack frame come from the file itself.
    expect(script).toContain('require "/index.php";');
  });

  it("defines the CLI streams the embed SAPI lacks", () => {
    const script = buildEntryScript("/index.php");
    for (const name of ["STDIN", "STDOUT", "STDERR"]) {
      expect(script).toContain(`if (!defined('${name}'))`);
    }
    // `fwrite(STDERR, …)` used to be a fatal on line 1 of a normal script.
    expect(script).toContain("php://stderr");
  });

  it("gives $argv something to hold", () => {
    const script = buildEntryScript("/index.php");
    expect(script).toContain('$argv = ["/index.php"];');
    expect(script).toContain("$argc = 1;");
    expect(script).toContain("$_SERVER['SCRIPT_FILENAME'] = \"/index.php\";");
  });

  it("quotes a path that would otherwise break out of the string", () => {
    const script = buildEntryScript('/od"d.php');
    expect(script).toContain('require "/od\\"d.php";');
  });

  it("follows the chosen entry file", () => {
    expect(buildEntryScript("/app/main.php")).toContain('require "/app/main.php";');
  });

  it("recognises the PGlite abort php-wasm prints", () => {
    expect(
      PGLITE_ABORT_RE.test(
        "The PGlite class must be provided as a constructor arg to PHP to use PGlite.",
      ),
    ).toBe(true);
    expect(PGLITE_ABORT_RE.test("ordinary output")).toBe(false);
  });
});
