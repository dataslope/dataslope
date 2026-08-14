/**
 * Per-run isolation for the almostnode-backed JS/TS workers: all blocks of a
 * language on a page share ONE worker (runtimeRegistry), so its filesystem is
 * long-lived. Regression pinned: the run handler once preferred whatever sat
 * at the entry path in the shared VFS over freshly-passed code, re-running
 * the previous block's entry file. Real runner, no mocks.
 */
import { describe, it, expect } from "vitest";
import {
  AlmostNodeRunner,
  type ConsoleSink,
} from "../app/_components/runtime/almostnode-worker-shared";

const encoder = new TextEncoder();

/** Collect stdout/stderr from a run into plain strings. */
function makeSink(): { sink: ConsoleSink; stdout: () => string; stderr: () => string } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    sink: {
      stdout: (c) => out.push(c),
      stderr: (e) => err.push(e),
    },
    stdout: () => out.join("\n"),
    stderr: () => err.join("\n"),
  };
}

/** Mirror the JavaScript worker's single-file run: the inline `code` is
 *  always the authoritative entry source. */
async function runSingleFileJs(
  runner: AlmostNodeRunner,
  code: string,
): Promise<{ stdout: string; stderr: string }> {
  const s = makeSink();
  await runner.run("/index.js", () => code, s.sink);
  return { stdout: s.stdout(), stderr: s.stderr() };
}

describe("AlmostNodeRunner per-run isolation", () => {
  it("runs a single-file snippet", async () => {
    const runner = new AlmostNodeRunner();
    const { stdout } = await runSingleFileJs(
      runner,
      `console.log("Hello, Ada!");`,
    );
    expect(stdout).toBe("Hello, Ada!");
  });

  // The reported bug, distilled: run a greeter then a counter on the SAME
  // runner; the counter must never print the greeter's output.
  it("does not leak the previous block's output into the next", async () => {
    const runner = new AlmostNodeRunner();

    const greeter = await runSingleFileJs(
      runner,
      `
      function makeGreeter(greeting) {
        return (name) => greeting + ", " + name + "!";
      }
      const hello = makeGreeter("Hello");
      console.log(hello("Ada"));
      console.log(hello("Linus"));
      `,
    );
    expect(greeter.stdout).toBe("Hello, Ada!\nHello, Linus!");

    const counter = await runSingleFileJs(
      runner,
      `
      function makeCounter() {
        let count = 0;
        return () => (count += 1);
      }
      const tick = makeCounter();
      console.log(tick());
      console.log(tick());
      console.log(tick());
      `,
    );
    // The counter's own output…
    expect(counter.stdout).toBe("1\n2\n3");
    // …and crucially NOT the greeter block's output.
    expect(counter.stdout).not.toContain("Hello");
    expect(counter.stdout).not.toContain("Ada");
  });

  it("isolates top-level declarations across consecutive runs", async () => {
    const runner = new AlmostNodeRunner();
    await runSingleFileJs(runner, `const secret = 42; globalThis.__x = 1;`);
    const second = await runSingleFileJs(
      runner,
      `
      try { console.log(secret); } catch { console.log("secret-not-visible"); }
      `,
    );
    expect(second.stdout).toContain("secret-not-visible");
    expect(second.stdout).not.toContain("42");
  });

  // A multi-file block stages helper modules for one run; a single-file
  // block that runs next must NOT be able to see those staged files.
  it("does not leak staged helper files into a later single-file run", async () => {
    const runner = new AlmostNodeRunner();

    // Run 1: multi-file. Stage index.js + utils.js, then run.
    runner.stage([
      ["index.js", encoder.encode(`console.log(require("./utils").tag);`)],
      ["utils.js", encoder.encode(`exports.tag = "from-utils";`)],
    ]);
    const first = makeSink();
    await runner.run(
      "/index.js",
      () => `console.log(require("./utils").tag);`,
      first.sink,
    );
    expect(first.stdout()).toBe("from-utils");

    // Run 2: single-file (no stage). utils.js must be gone.
    const second = await runSingleFileJs(
      runner,
      `
      try {
        require("./utils");
        console.log("LEAKED");
      } catch {
        console.log("no-utils");
      }
      `,
    );
    expect(second.stdout).toBe("no-utils");
    expect(second.stdout).not.toContain("LEAKED");
  });

  // Guard the multi-file happy path so the isolation fix doesn't break
  // legitimate require() resolution within a single staged run.
  it("resolves require() against freshly-staged files within a run", async () => {
    const runner = new AlmostNodeRunner();
    runner.stage([
      ["index.js", encoder.encode(`console.log(require("./math").add(2, 3));`)],
      ["math.js", encoder.encode(`exports.add = (a, b) => a + b;`)],
    ]);
    const s = makeSink();
    await runner.run(
      "/index.js",
      () => `console.log(require("./math").add(2, 3));`,
      s.sink,
    );
    expect(s.stdout()).toBe("5");
  });

  // The TS worker resolves its entry via vfs.existsSync (prefer staged copy),
  // which is only safe because each run gets a fresh VFS — verify a
  // single-file run never observes a stale entry.
  it("hands each un-staged run a VFS with no stale entry file", async () => {
    const runner = new AlmostNodeRunner();

    await runSingleFileJs(runner, `console.log("first");`);

    let secondRunSawStaleEntry = true;
    const s = makeSink();
    await runner.run(
      "/index.js",
      (vfs) => {
        // In the buggy shared-VFS worker this was `true` (the previous
        // run's /index.js lingered); with per-run isolation it's `false`.
        secondRunSawStaleEntry = vfs.existsSync("/index.js");
        return `console.log("second");`;
      },
      s.sink,
    );

    expect(secondRunSawStaleEntry).toBe(false);
    expect(s.stdout()).toBe("second");
  });
});
