/**
 * Regression cover for the Python playground audit fixes: streaming output,
 * the Stop control, run-created files, `plt.show()` with several figures,
 * `input()`, and traceback legibility.
 *
 * Kept out of the default sweep the way the other heavyweight playground
 * specs are: booting Pyodide plus the package set is a CDN download, so this
 * is opt-in (`npx playwright test e2e/python-playground-audit-fixes.spec.ts`).
 */
import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const RUN_BUTTON = ".playground-run-multi-main";

async function openPlayground(page: Page): Promise<void> {
  await page.goto("/playground/python");
  // The Run button enables only once the runtime reports ready.
  await expect(page.locator(RUN_BUTTON)).toBeEnabled({ timeout: 180_000 });
}

async function typeProgram(page: Page, code: string): Promise<void> {
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  // insertText, not type(): CodeMirror's auto-indent would mangle a
  // character-by-character Python block.
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

const outputText = (page: Page) => page.locator(".run-cell-content");

test("output streams while the program is still running", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    ['import time', 'for i in range(6):', '    print("tick", i); time.sleep(1)'].join("\n"),
  );

  // The whole run takes ~6s. Seeing an early line before it ends is the
  // entire point: output used to arrive in one lump at the end.
  await expect(outputText(page)).toContainText("tick 0", { timeout: 20_000 });
  await expect(page.locator(RUN_BUTTON)).toContainText("Stop");
  await expect(outputText(page)).toContainText("tick 5", { timeout: 30_000 });
  await expect(page.locator(RUN_BUTTON)).not.toContainText("Stop", {
    timeout: 30_000,
  });
});

test("a runaway loop can be stopped without reloading", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    ["n = 0", "while True:", "    n += 1"].join("\n"),
  );

  const runButton = page.locator(RUN_BUTTON);
  await expect(runButton).toContainText("Stop", { timeout: 30_000 });
  await runButton.click();

  await expect(outputText(page)).toContainText("Run stopped.", {
    timeout: 60_000,
  });
  // And the playground is usable again straight afterwards.
  await expect(runButton).toBeEnabled({ timeout: 120_000 });
  await runProgram(page, 'print("alive after stop")');
  await expect(outputText(page)).toContainText("alive after stop", {
    timeout: 120_000,
  });
});

test("plt.show() renders every open figure", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      "import matplotlib.pyplot as plt",
      'f1 = plt.figure(); plt.plot([1,2],[1,2]); plt.title("AAA")',
      'f2 = plt.figure(); plt.plot([2,1],[1,2]); plt.title("BBB")',
      "plt.show()",
    ].join("\n"),
  );

  await expect(page.locator(".out-seg-image img")).toHaveCount(2, {
    timeout: 240_000,
  });
});

test("files the program writes show up in the Files panel", async ({ page }) => {
  await openPlayground(page);
  await runProgram(
    page,
    [
      'open("written_by_python.txt", "w").write("hello\\n")',
      'print("wrote it")',
    ].join("\n"),
  );

  await expect(outputText(page)).toContainText("wrote it", {
    timeout: 120_000,
  });
  await page.getByRole("button", { name: /^Files$/ }).click();
  await expect(
    page.locator(".playground-files-name", {
      hasText: "written_by_python.txt",
    }),
  ).toBeVisible({ timeout: 30_000 });
});

test("input() explains itself instead of raising Errno 29", async ({ page }) => {
  await openPlayground(page);
  await runProgram(page, 'name = input("What is your name? ")');

  const output = outputText(page);
  await expect(output).toContainText("isn't available in this playground", {
    timeout: 120_000,
  });
  await expect(output).not.toContainText("Errno 29");
});

test("a traceback names the user's file and drops harness frames", async ({
  page,
}) => {
  await openPlayground(page);
  await runProgram(
    page,
    ['def b(): raise ValueError("boom")', "def a(): return b()", "a()"].join("\n"),
  );

  const output = outputText(page);
  await expect(output).toContainText("ValueError: boom", { timeout: 120_000 });
  await expect(output).toContainText('File "main.py"');
  await expect(output).not.toContainText("_pyodide");
  await expect(output).not.toContainText("<exec>");
  await expect(output).not.toContainText("<string>");
});
