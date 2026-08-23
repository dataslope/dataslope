/**
 * What the JavaScript/TypeScript playgrounds actually do with a program:
 * how long the run lives, what reaches the output pane, and what the run
 * leaves behind. Real almostnode runtime, no mocks — every case here is a
 * finding from the JS/TS playground audit.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  AlmostNodeRunner,
  reportUnhandledRejection,
  type ConsoleSink,
} from "../app/_components/runtime/almostnode-worker-shared";

function makeSink(): {
  sink: ConsoleSink;
  stdout: () => string;
  stderr: () => string;
  all: () => string;
} {
  const chunks: Array<[string, string]> = [];
  return {
    sink: { write: (channel, text) => chunks.push([channel, text]) },
    stdout: () =>
      chunks.filter(([c]) => c === "stdout").map(([, t]) => t).join(""),
    stderr: () =>
      chunks.filter(([c]) => c === "stderr").map(([, t]) => t).join(""),
    all: () => chunks.map(([, t]) => t).join(""),
  };
}

/** One single-file run, the way the JavaScript worker performs it. */
async function run(
  code: string,
  options: { timeLimitMs?: number } = {},
): Promise<{
  stdout: string;
  stderr: string;
  all: string;
  error: string | null;
  createdFiles: Array<[string, Uint8Array]>;
}> {
  const runner = new AlmostNodeRunner();
  const s = makeSink();
  const result = await runner.run("/index.js", () => code, s.sink, {
    flushMs: 0,
    ...options,
  });
  return {
    stdout: s.stdout(),
    stderr: s.stderr(),
    all: s.all(),
    error: result.error,
    createdFiles: result.createdFiles,
  };
}

describe("the event loop stays alive for pending work", () => {
  it("runs timer callbacks scheduled by the module body", async () => {
    const { stdout } = await run(`
      console.log("1 sync start");
      setTimeout(() => console.log("4 setTimeout 0"), 0);
      setTimeout(() => console.log("5 setTimeout 10"), 10);
      setImmediate(() => console.log("3b setImmediate"));
      queueMicrotask(() => console.log("2 microtask"));
      console.log("1b sync end");
    `);
    expect(stdout).toContain("4 setTimeout 0");
    expect(stdout).toContain("5 setTimeout 10");
    expect(stdout).toContain("3b setImmediate");
    // Ordering: sync, microtask, then timers.
    expect(stdout.indexOf("2 microtask")).toBeLessThan(stdout.indexOf("4 setTimeout 0"));
  });

  it("runs a timer scheduled after an await, which used to be dropped", async () => {
    const { stdout } = await run(`
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      await sleep(10);
      console.log("B after await");
      setTimeout(() => console.log("T2 fired - scheduled AFTER the await"), 10);
      console.log("C module end");
    `);
    expect(stdout).toContain("T2 fired - scheduled AFTER the await");
  });

  it("keeps an interval running until it is cleared", async () => {
    const { stdout } = await run(`
      let n = 0;
      const id = setInterval(() => {
        n += 1;
        console.log("tick " + n);
        if (n === 3) clearInterval(id);
      }, 5);
    `);
    expect(stdout).toBe("tick 1\ntick 2\ntick 3\n");
  });

  it("stops an interval that is never cleared, and says so", async () => {
    const { stdout, stderr } = await run(
      `setInterval(() => console.log("forever"), 5);`,
      { timeLimitMs: 120 },
    );
    expect(stdout).toContain("forever");
    expect(stderr).toMatch(/Stopped after .*timer/);
  });

  it("does not let one run's timers print into the next run", async () => {
    const runner = new AlmostNodeRunner();
    const first = makeSink();
    await runner.run(
      "/index.js",
      () => `setInterval(() => console.log("LEAK"), 5);`,
      first.sink,
      { flushMs: 0, timeLimitMs: 60 },
    );
    const second = makeSink();
    await runner.run("/index.js", () => `console.log("second run");`, second.sink, {
      flushMs: 0,
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(second.all()).toBe("second run\n");
  });

  it("reports an error thrown from a timer callback", async () => {
    const { error } = await run(`setTimeout(() => { throw new Error("late boom"); }, 5);`);
    expect(error).toContain("late boom");
  });

  it("does not hold the run open for an unref'd timer", async () => {
    const started = Date.now();
    const { stdout } = await run(`
      const t = setTimeout(() => console.log("SHOULD NOT PRINT"), 5000);
      t.unref?.();
      console.log("done");
    `);
    expect(stdout).toBe("done\n");
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

describe("console output", () => {
  it("prints an Error's message instead of {}", async () => {
    const { stdout } = await run(`console.log("failed:", new TypeError("boom"));`);
    expect(stdout).toContain("TypeError: boom");
    expect(stdout).not.toContain("{}");
  });

  it("keeps the contents of Map, Set and RegExp", async () => {
    const { stdout } = await run(`
      console.log(new Map([["k", 1]]));
      console.log(new Set([1, 2]));
      console.log(/ab+c/gi);
    `);
    expect(stdout).toBe("Map(1) { 'k' => 1 }\nSet(2) { 1, 2 }\n/ab+c/gi\n");
  });

  it("substitutes format specifiers", async () => {
    const { stdout } = await run(`console.log("%s and %d and %j", "str", 42, { a: 1 });`);
    expect(stdout).toBe('str and 42 and {"a":1}\n');
  });

  it("emits group, count, time, assert and table", async () => {
    const { stdout, stderr } = await run(`
      console.group("GROUP");
      console.log("inside");
      console.groupEnd();
      console.count("c");
      console.time("t");
      console.timeEnd("t");
      console.assert(false, "assert failed");
      console.table([{ a: 1, b: 2 }]);
    `);
    expect(stdout).toContain("GROUP\n  inside");
    expect(stdout).toContain("c: 1");
    expect(stdout).toMatch(/t: \d/);
    expect(stdout).toContain("│ (index) │ a │ b │");
    expect(stderr).toContain("Assertion failed: assert failed");
  });

  it("writes process.stdout.write with no newline of its own", async () => {
    const { stdout, stderr } = await run(`
      process.stdout.write("X-");
      process.stdout.write("stdout-line");
      process.stderr.write("Y-stderr");
    `);
    expect(stdout).toBe("X-stdout-line");
    expect(stderr).toBe("Y-stderr");
  });

  it("drains process.nextTick before promise microtasks", async () => {
    const { stdout } = await run(`
      queueMicrotask(() => console.log("4 microtask"));
      Promise.resolve().then(() => console.log("5 promise then"));
      process.nextTick(() => console.log("3 nextTick"));
    `);
    expect(stdout).toBe("3 nextTick\n4 microtask\n5 promise then\n");
  });
});

describe("errors", () => {
  it("reports an uncaught error with the user's line, not the wrapper's", async () => {
    const { error, stdout } = await run(
      [
        `console.log("before-1");`,
        `function inner() { throw new Error("deep failure"); }`,
        `inner();`,
      ].join("\n"),
    );
    expect(stdout).toContain("before-1");
    expect(error).toContain("deep failure");
    // The throw is on line 2 of the user's file.
    expect(error).toMatch(/index\.js:2:/);
    // No frames from inside the runtime's own machinery.
    expect(error).not.toContain("almostnode");
    expect(error).not.toContain("<anonymous>");
  });

  it("reports an unhandled promise rejection", async () => {
    const runner = new AlmostNodeRunner();
    const s = makeSink();
    // The worker installs a global `unhandledrejection` listener that calls
    // this; Node fires a different event, so drive the same entry point.
    (globalThis as unknown as { __pgReport: (p: Promise<unknown>) => void }).__pgReport = (
      promise,
    ) => {
      promise.catch((reason) => reportUnhandledRejection(reason, promise));
    };
    const result = await runner.run(
      "/index.js",
      () => `
        const p = Promise.reject(new Error("boom-unhandled-rejection"));
        globalThis.__pgReport(p);
        await new Promise((r) => setTimeout(r, 10));
        console.log("A sync");
      `,
      s.sink,
      { flushMs: 0 },
    );
    expect(result.error).toContain("boom-unhandled-rejection");
    expect(s.stdout()).toContain("A sync");
  });

  it("keeps output produced before the error", async () => {
    const { stdout, error } = await run(`
      console.log("before-1");
      console.log("before-2");
      null.x;
    `);
    expect(stdout).toContain("before-1");
    expect(stdout).toContain("before-2");
    expect(error).toContain("TypeError");
  });
});

describe("crypto", () => {
  it("computes real digests", async () => {
    const { stdout } = await run(`
      const crypto = require("crypto");
      console.log(crypto.createHash("sha256").update("abc").digest("hex"));
      console.log(crypto.createHash("md5").update("hi").digest("hex"));
      console.log(crypto.createHmac("sha256", "k").update("hi").digest("hex"));
    `);
    const [sha256, md5, hmac] = stdout.trim().split("\n");
    expect(sha256).toBe(createHash("sha256").update("abc").digest("hex"));
    expect(md5).toBe(createHash("md5").update("hi").digest("hex"));
    expect(md5).toHaveLength(32);
    expect(hmac).toHaveLength(64);
  });

  it("throws for an algorithm that does not exist", async () => {
    const { error } = await run(`
      require("crypto").createHash("notarealalgorithm").update("hi").digest("hex");
    `);
    expect(error).toMatch(/not supported/i);
  });
});

describe("files a program writes", () => {
  it("hands them back for the Files panel", async () => {
    const { createdFiles, stdout } = await run(`
      const fs = require("fs");
      fs.writeFileSync("out.txt", "hello from fs");
      console.log("readback=" + fs.readFileSync("out.txt", "utf8"));
    `);
    expect(stdout).toContain("readback=hello from fs");
    expect(createdFiles.map(([path]) => path)).toEqual(["out.txt"]);
    expect(new TextDecoder().decode(createdFiles[0][1])).toBe("hello from fs");
  });

  it("does not report the workspace it was given as newly created", async () => {
    const runner = new AlmostNodeRunner();
    const encoder = new TextEncoder();
    runner.stage([
      ["index.js", encoder.encode(`console.log(require("./lib").tag);`)],
      ["lib.js", encoder.encode(`exports.tag = "from-lib";`)],
    ]);
    const s = makeSink();
    const result = await runner.run(
      "/index.js",
      () => `console.log(require("./lib").tag);`,
      s.sink,
      { flushMs: 0 },
    );
    expect(s.stdout()).toBe("from-lib\n");
    expect(result.createdFiles).toEqual([]);
  });
});
