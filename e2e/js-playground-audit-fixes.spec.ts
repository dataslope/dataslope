/**
 * Regression cover for the JavaScript/TypeScript playground audit fixes:
 * the event loop staying alive for pending timers, the Stop control, real
 * crypto digests, `process.stdout.write`, console fidelity, unhandled
 * rejections, error locations, and run-created files.
 *
 * The almostnode worker is served from this origin and boots in about a
 * second, so unlike the Python and R specs these can run without a CDN
 * download. Type checking is covered by `__tests__/tsAnalysis.test.ts`
 * instead: the language service fetches the compiler from a CDN, which is
 * exactly the dependency an end-to-end test should not take.
 */
import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const RUN_BUTTON = ".playground-run-multi-main";

async function openPlayground(page: Page, language = "javascript"): Promise<void> {
  await page.goto(`/playground/${language}`);
  await expect(page.locator(RUN_BUTTON)).toBeEnabled({ timeout: 120_000 });
}

async function typeProgram(page: Page, code: string): Promise<void> {
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  // insertText, not type(): CodeMirror's bracket auto-closing would mangle
  // a character-by-character program.
  await page.evaluate((source) => {
    const el = document.querySelector(".cm-content") as HTMLElement | null;
    el?.focus();
    document.execCommand("insertText", false, source);
  }, code);
}

async function runProgram(page: Page, code: string): Promise<void> {
  await typeProgram(page, code);
  await page.locator(RUN_BUTTON).click();
}

/** Everything the newest run printed. */
const outputText = (page: Page) => page.locator(".run-cell").last();

async function waitForRunToFinish(page: Page): Promise<void> {
  await expect(page.locator(RUN_BUTTON)).not.toContainText("Stop", {
    timeout: 120_000,
  });
}

test("timer callbacks run instead of being discarded", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      'console.log("1 sync start");',
      'setTimeout(() => console.log("7 setTimeout 0"), 0);',
      'setTimeout(() => console.log("8 setTimeout 10"), 10);',
      'setImmediate(() => console.log("6 setImmediate"));',
      'queueMicrotask(() => console.log("4 microtask"));',
      'Promise.resolve().then(() => console.log("5 promise then"));',
      'process.nextTick(() => console.log("3 nextTick"));',
      'console.log("2 sync end");',
    ].join("\n"),
  );

  await waitForRunToFinish(page);
  const text = (await outputText(page).textContent()) ?? "";
  for (const line of [
    "1 sync start",
    "2 sync end",
    "3 nextTick",
    "4 microtask",
    "5 promise then",
    "6 setImmediate",
    "7 setTimeout 0",
    "8 setTimeout 10",
  ]) {
    expect(text, text).toContain(line);
  }
  // Node's order: synchronous, then nextTick, then microtasks, then timers.
  expect(text.indexOf("3 nextTick")).toBeLessThan(text.indexOf("4 microtask"));
  expect(text.indexOf("5 promise then")).toBeLessThan(text.indexOf("7 setTimeout 0"));
});

test("a timer scheduled after an await still fires", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      "const sleep = (ms) => new Promise((r) => setTimeout(r, ms));",
      "await sleep(50);",
      'setTimeout(() => console.log("T2 fired after the await"), 10);',
      'console.log("module end");',
    ].join("\n"),
  );

  await expect(outputText(page)).toContainText("T2 fired after the await", {
    timeout: 30_000,
  });
});

test("a runaway loop can be stopped, keeping what it printed", async ({ page }) => {
  await openPlayground(page);
  await runProgram(page, ['console.log("STARTED");', "while (true) {}"].join("\n"));

  const runButton = page.locator(RUN_BUTTON);
  await expect(runButton).toContainText("Stop", { timeout: 30_000 });
  await runButton.click();

  await expect(outputText(page)).toContainText("Run stopped.", { timeout: 60_000 });
  await expect(outputText(page)).toContainText("STARTED");

  // And the playground is usable again straight afterwards.
  await expect(runButton).toBeEnabled({ timeout: 60_000 });
  await runProgram(page, 'console.log("alive after stop");');
  await expect(outputText(page)).toContainText("alive after stop", {
    timeout: 60_000,
  });
});

test("crypto digests are the real thing", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      'const crypto = require("crypto");',
      'const h = (a, s) => crypto.createHash(a).update(s).digest("hex");',
      'console.log("sha256=" + h("sha256", "abc"));',
      'console.log("md5=" + h("md5", "hi"));',
      'console.log("hmac=" + crypto.createHmac("sha256", "k").update("hi").digest("hex"));',
      'try { h("notarealalgorithm", "hi"); } catch (e) { console.log("threw: " + e.message); }',
    ].join("\n"),
  );

  await waitForRunToFinish(page);
  const text = (await outputText(page).textContent()) ?? "";
  // The canonical FIPS-180 vector, and Node's own values for the rest.
  expect(text).toContain(
    "sha256=ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  expect(text).toContain("md5=49f68a5c8493ec2c0bf489821c21fc3b");
  expect(text).toContain(
    "hmac=233f8e9a13f278f19758a015d82f51e6e27966f1efc29d2cffb5d1a45ae9dc4c",
  );
  expect(text).toMatch(/threw: .*not supported/i);
});

test("process.stdout.write reaches the pane, with no newline of its own", async ({
  page,
}) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      'process.stdout.write("X-");',
      'process.stdout.write("stdout-line\\n");',
      'process.stderr.write("Y-stderr-line\\n");',
    ].join("\n"),
  );

  await waitForRunToFinish(page);
  await expect(outputText(page)).toContainText("X-stdout-line");
  await expect(page.locator(".out-seg-stderr").last()).toContainText("Y-stderr-line");
});

test("console prints values instead of empty objects", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      'console.log("map", new Map([["k", 1]]));',
      'console.log("set", new Set([1, 2]));',
      "console.log(/ab+c/gi);",
      'console.log("err", new TypeError("boom"));',
      'const circ = { name: "circ" }; circ.self = circ;',
      "console.log(circ);",
      'console.log(Buffer.from("hi"));',
      'console.log("%s and %d and %j", "str", 42, { a: 1 });',
    ].join("\n"),
  );

  await waitForRunToFinish(page);
  const text = (await outputText(page).textContent()) ?? "";
  expect(text).toContain("Map(1) { 'k' => 1 }");
  expect(text).toContain("Set(2) { 1, 2 }");
  expect(text).toContain("/ab+c/gi");
  expect(text).toContain("TypeError: boom");
  expect(text).toContain("[Circular *1]");
  expect(text).toContain("<Buffer 68 69>");
  expect(text).toContain('str and 42 and {"a":1}');
  expect(text, text).not.toContain("{}");
});

test("console.group, count, time, assert and table produce output", async ({
  page,
}) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      'console.group("GROUP");',
      'console.log("inside");',
      "console.groupEnd();",
      'console.count("c");',
      'console.time("t");',
      'console.timeEnd("t");',
      'console.assert(false, "assert failed");',
      "console.table([{ a: 1, b: 2 }]);",
    ].join("\n"),
  );

  await waitForRunToFinish(page);
  const text = (await outputText(page).textContent()) ?? "";
  expect(text).toContain("GROUP");
  expect(text).toContain("  inside");
  expect(text).toContain("c: 1");
  expect(text).toMatch(/t: \d/);
  expect(text).toContain("│ (index) │ a │ b │");
  await expect(page.locator(".out-seg-stderr").last()).toContainText(
    "Assertion failed: assert failed",
  );
});

test("an unhandled promise rejection is reported", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      'Promise.reject(new Error("boom-unhandled-rejection"));',
      'console.log("A sync");',
      "await new Promise((r) => setTimeout(r, 50));",
      'console.log("B after await");',
    ].join("\n"),
  );

  await waitForRunToFinish(page);
  await expect(outputText(page)).toContainText("B after await");
  await expect(page.locator(".out-seg-stderr").last()).toContainText(
    "boom-unhandled-rejection",
  );
});

test("a stack trace points at the user's file and line", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      'console.log("before-1");',
      'function inner() { throw new Error("deep failure"); }',
      "function middle() { inner(); }",
      "middle();",
    ].join("\n"),
  );

  await waitForRunToFinish(page);
  await expect(outputText(page)).toContainText("before-1");
  const stack = (await page.locator(".out-seg-stderr").last().textContent()) ?? "";
  expect(stack).toContain("deep failure");
  expect(stack).toContain("at inner (/index.js:2:");
  expect(stack).toContain("at middle (/index.js:3:");
  // Frames inside the worker bundle are never actionable.
  expect(stack, stack).not.toContain("javascript-worker.js");
  expect(stack, stack).not.toContain("<anonymous>");
});

test("files the program writes show up in the Files panel", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      'const fs = require("fs");',
      'fs.writeFileSync("written_by_js.txt", "hello from fs");',
      'console.log("readback=" + fs.readFileSync("written_by_js.txt", "utf8"));',
    ].join("\n"),
  );

  await expect(outputText(page)).toContainText("readback=hello from fs", {
    timeout: 60_000,
  });
  await page.locator('[aria-label="Files"]').first().click();
  await expect(
    page.locator(".playground-files-name", { hasText: "written_by_js.txt" }),
  ).toBeVisible({ timeout: 30_000 });
});

test("TypeScript still runs what the compiler emits", async ({ page }) => {
  await openPlayground(page, "typescript");
  await runProgram(
    page,
    [
      "enum Color { Red, Green, Blue }",
      'console.log("enum: " + Color.Red + " " + Color[0] + " " + Color.Blue);',
      "namespace NS { export const x = 42; }",
      'console.log("namespace: " + NS.x);',
      'setTimeout(() => console.log("timer fired"), 10);',
    ].join("\n"),
  );

  await expect(outputText(page)).toContainText("enum: 0 Red 2", { timeout: 60_000 });
  await expect(outputText(page)).toContainText("namespace: 42");
  await expect(outputText(page)).toContainText("timer fired", { timeout: 60_000 });
});
