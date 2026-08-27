/**
 * The Run button reflects whether there is anything to run.
 *
 * `runCode` bails on `!code.trim()`, so an empty editor used to leave a
 * live-looking button that did nothing at all when clicked. The button now
 * resolves the same source file the run would and goes down when that file
 * is blank — including the multi-file case, where the primary button and
 * each chevron entry can point at different files and disagree.
 *
 * JavaScript, because the almostnode worker is served from this origin and
 * boots in about a second; the button logic is adapter-independent.
 */
import { test, expect, type Page } from "@playwright/test";

const TABBAR = ".playground-file-tabbar";
const RUN_BUTTON = ".playground-run-multi-main";
const RUN_CHEVRON = ".playground-run-multi-chevron";
const RUN_ITEM = ".playground-run-multi-item";

async function openPlayground(page: Page): Promise<void> {
  await page.goto("/playground/javascript");
  // Seeded index.js, booted runtime: the baseline is an enabled button.
  await expect(page.locator(RUN_BUTTON)).toBeEnabled({ timeout: 120_000 });
}

/** Replace the active editor's contents. */
async function setEditor(page: Page, source: string): Promise<void> {
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  if (source === "") return;
  // insertText, not type(): CodeMirror's bracket auto-closing would mangle
  // a character-by-character program.
  await page.evaluate((text) => {
    const el = document.querySelector(".cm-content") as HTMLElement | null;
    el?.focus();
    document.execCommand("insertText", false, text);
  }, source);
}

function tab(page: Page, name: string) {
  return page.locator(`${TABBAR} .playground-tab`, { hasText: name });
}

test("Run goes down when the editor has nothing to execute", async ({
  page,
}) => {
  await openPlayground(page);

  await setEditor(page, "");
  await expect(page.locator(RUN_BUTTON)).toBeDisabled();

  // Whitespace is not a program either: the run guard trims first.
  await setEditor(page, "  \n  ");
  await expect(page.locator(RUN_BUTTON)).toBeDisabled();

  await setEditor(page, "console.log('back');");
  await expect(page.locator(RUN_BUTTON)).toBeEnabled();
});

test("a blank tab disables Run but leaves the seeded entry runnable", async ({
  page,
}) => {
  await openPlayground(page);

  // The new tab is empty and active; index.js keeps its seeded program, so
  // the two Run affordances now point at files that disagree.
  await page.locator(`${TABBAR} .playground-tab-add`).click();
  await expect(page.locator(RUN_BUTTON)).toBeDisabled();

  // The chevron is exactly how you reach index.js from a blank tab, so it
  // stays live — and its entry still runs.
  const chevron = page.locator(RUN_CHEVRON);
  await expect(chevron).toBeEnabled();
  await chevron.click();
  await page.locator(RUN_ITEM).first().click();
  await expect(page.locator(".run-cell")).toHaveCount(1, { timeout: 120_000 });

  // Blank index.js as well and nothing under the chevron can run either.
  await tab(page, "index.js").click();
  await setEditor(page, "");
  await tab(page, "untitled_2.js").click();
  await expect(page.locator(RUN_BUTTON)).toBeDisabled();
  await expect(chevron).toBeDisabled();
});
