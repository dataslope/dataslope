/**
 * Regression cover for the HTML/React playground audit fixes: console
 * fidelity, error locations in the reader's own files, the in-preview
 * error overlay, an honest timeout, Stop, run boundaries, the storage
 * shim and a resizable console.
 *
 * Everything here runs against the web playground, which needs no CDN at
 * all: the browser is its runtime. The React playground's own fixes (its
 * source-mapped locations, module preflight and type checking) are covered
 * by `__tests__/reactPreviewFixes.test.ts` instead, because esbuild-wasm
 * and esm.sh are both CDN downloads an end-to-end test should not take.
 */
import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

/** Replace one split pane's contents. `insertText` rather than typing:
 *  CodeMirror's auto-closing would mangle markup entered character by
 *  character. */
async function setFile(page: Page, filename: string, code: string) {
  const pane = page.locator(`section[aria-label="${filename} editor"]`);
  await pane.locator(".cm-content").first().click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.evaluate(
    ({ label, source }) => {
      const el = document
        .querySelector(`section[aria-label="${label} editor"]`)
        ?.querySelector(".cm-content") as HTMLElement | null;
      el?.focus();
      document.execCommand("insertText", false, source);
    },
    { label: filename, source: code },
  );
}

/** textContent, not innerText: the console strip scrolls, and innerText
 *  reports only what is laid out. */
const consoleText = (page: Page) =>
  page.locator(".web-console-content").textContent();

async function openWeb(page: Page) {
  await page.goto("/playground/web");
  await expect(page.locator(".run-btn").first()).toBeEnabled({
    timeout: 120_000,
  });
}

async function runScript(page: Page, script: string) {
  await setFile(page, "script.js", script);
  await page.locator(".run-btn").first().click();
}

test("console methods that used to be silent produce output", async ({ page }) => {
  await openWeb(page);
  await runScript(
    page,
    `console.group("GROUP LABEL");
console.log("inside the group");
console.groupEnd();
console.count("tally");
console.count("tally");
console.time("t");
console.timeEnd("t");
console.assert(false, "assertion message");
console.table([{ a: 1, b: 2 }]);
console.dir({ deep: { nested: 1 } });
`,
  );
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("GROUP LABEL");
  const text = (await consoleText(page)) ?? "";
  // The group's label, and its contents indented under it.
  expect(text).toContain("  inside the group");
  expect(text).toContain("tally: 1");
  expect(text).toContain("tally: 2");
  expect(text).toMatch(/t: [\d.]+m?s/);
  expect(text).toContain("Assertion failed: assertion message");
  // console.table draws the box Node draws.
  expect(text).toContain("(index)");
  expect(text).toContain("┌");
  expect(text).toContain("{ deep: { nested: 1 } }");
});

test("values print as values, not as empty objects", async ({ page }) => {
  await openWeb(page);
  await runScript(
    page,
    `console.log("map", new Map([["k", 1]]));
console.log("set", new Set([1, 2]));
console.log("regexp", /ab+c/gi);
console.log("error", new TypeError("boom"));
console.log("fmt %s and %d", "str", 42);
`,
  );
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("Map(1) { 'k' => 1 }");
  const text = (await consoleText(page)) ?? "";
  expect(text).toContain("Set(2) { 1, 2 }");
  expect(text).toContain("/ab+c/gi");
  expect(text).toContain("TypeError: boom");
  expect(text).toContain("fmt str and 42");
});

test("an error names the file and line the reader wrote", async ({ page }) => {
  await openWeb(page);
  await runScript(page, `const ok = 1;\nboomOnLineTwo();\n`);
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("script.js:2");
  expect(await consoleText(page)).toContain("boomOnLineTwo is not defined");
});

test("the reported line does not move when another file grows", async ({ page }) => {
  await openWeb(page);
  await setFile(page, "index.html", "<h1>short</h1>\n");
  await runScript(page, `boomOnLineOne();\n`);
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("script.js:1");

  await setFile(
    page,
    "index.html",
    "<h1>taller</h1>\n<p>one</p>\n<p>two</p>\n<p>three</p>\n<p>four</p>\n",
  );
  await page.locator(".run-btn").first().click();
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("script.js:1");
});

test("a stack trace reads in the reader's files", async ({ page }) => {
  await openWeb(page);
  await runScript(
    page,
    `function inner() { throw new TypeError("from inner"); }
try { inner(); } catch (e) { console.log("caught", e); }
`,
  );
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("at inner (script.js:1");
  expect(await consoleText(page)).not.toContain("about:srcdoc");
});

test("an inline script in the entry maps to the entry", async ({ page }) => {
  await openWeb(page);
  await setFile(page, "script.js", "");
  await setFile(page, "index.html", "<h1>x</h1>\n<script>\nboomInline();\n</script>\n");
  await page.locator(".run-btn").first().click();
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("index.html:3");
});

test("an uncaught error paints an overlay instead of a blank page", async ({ page }) => {
  await openWeb(page);
  await setFile(page, "script.js", "");
  await setFile(page, "index.html", "<h1>x</h1>\n<script>\nboomInline();\n</script>\n");
  await page.locator(".run-btn").first().click();
  const overlay = page
    .frameLocator(".web-preview-slot iframe")
    .locator("[data-ds-preview-error]");
  await expect(overlay).toBeVisible({ timeout: 30_000 });
  await expect(overlay).toContainText("boomInline is not defined");
});

test("an unhandled rejection says it is one", async ({ page }) => {
  await openWeb(page);
  await runScript(page, `Promise.reject(new Error("no catch here"));\n`);
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("Uncaught (in promise) Error: no catch here");
});

test("localStorage works instead of throwing SecurityError", async ({ page }) => {
  await openWeb(page);
  await runScript(
    page,
    `try {
  localStorage.setItem("todo", "buy milk");
  sessionStorage.setItem("s", "1");
  console.log("storage ok:", localStorage.getItem("todo"), localStorage.length, sessionStorage.getItem("s"));
} catch (e) {
  console.log("storage FAILED: " + e.name);
}
`,
  );
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("storage ok: buy milk 1 1");
});

test("a wedged page can be stopped, and says what it cost", async ({ page }) => {
  await openWeb(page);
  await runScript(page, `console.log("before");\nwhile (true) ;\n`);
  const stop = page.locator(".run-btn.stop");
  await expect(stop).toBeVisible({ timeout: 30_000 });
  await stop.click();
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("Run stopped.");
  // The frozen document is gone, not left claiming to be live.
  await expect(page.locator(".web-preview-slot iframe")).toHaveCount(0);
});

test("the console names the run its output belongs to", async ({ page }) => {
  await openWeb(page);
  await runScript(page, `console.log("first run");\n`);
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("first run");
  await expect(page.locator(".web-console-bar")).toContainText(/Run \d+/);
  // A finished run shows its duration; the label is the boundary that says
  // which run the text below belongs to.
  await expect(page.locator(".web-console-ms")).toContainText(/s$/);
});

test("the console can be resized", async ({ page }) => {
  await openWeb(page);
  // Enough output to fill past the default cap, so the strip is actually
  // being clipped and a taller cap has something to reveal.
  await runScript(
    page,
    "for (let i = 1; i <= 40; i++) console.log('line ' + i);\n",
  );
  await expect
    .poll(() => consoleText(page), { timeout: 30_000 })
    .toContain("line 40");
  const console_ = page.locator(".web-console");
  const before = (await console_.boundingBox())?.height ?? 0;
  const handle = page.locator(".web-console-resizer");
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2, box!.y - 60, { steps: 8 });
  await page.mouse.up();
  const after = (await console_.boundingBox())?.height ?? 0;
  expect(after).toBeGreaterThan(before);
});
