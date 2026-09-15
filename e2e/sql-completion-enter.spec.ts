import { test, expect } from "@playwright/test";

// Enter accepts the highlighted intellisense suggestion in the SQL editors.
// Tab used to be the only key that took one, which is not what an editor's
// autocomplete does; Enter now accepts while the popup is open and still
// inserts a newline when it is closed. The editor setup is shared, so one
// engine covers all three playgrounds.

/** CodeMirror's `interactionDelay` (75 ms) refuses popup keys pressed the
 *  instant the popup opens or moves — a guard against a keystroke already in
 *  flight taking a suggestion the user never saw. No human types that fast;
 *  Playwright does, so each popup key is given a beat. */
const READ_THE_POPUP_MS = 250;

test("SQLite: Enter accepts the highlighted completion, and is a newline otherwise", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/playground/sqlite");
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });

  const editor = page.locator(".cm-content");
  const popup = page.locator(".cm-tooltip-autocomplete");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");

  // Ctrl-Space opens the popup whatever the "Code Suggestions" setting is, so
  // the test does not lean on the typing trigger's delay.
  await page.keyboard.type("SEL");
  await page.keyboard.press("Control+Space");
  await expect(popup).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(READ_THE_POPUP_MS);

  await page.keyboard.press("Enter");
  await expect(popup).toBeHidden();
  // The suggestion was taken, and Enter did not also break the line.
  await expect(editor).toContainText(/SELECT/i);
  await expect(editor.locator(".cm-line")).toHaveCount(1);

  // Arrow keys move the popup selection, and Enter takes whichever item is
  // highlighted — the case that sent people looking for Tab.
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.type("SELECT * FROM ");
  await page.keyboard.press("Control+Space");
  await expect(popup).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(READ_THE_POPUP_MS);
  // The row's own text is label + detail ("employeestable"), so read the
  // label span rather than the option.
  const selectedLabel = popup.locator("[aria-selected] .cm-completionLabel");
  const firstLabel = ((await selectedLabel.textContent()) ?? "").trim();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(READ_THE_POPUP_MS);
  const secondLabel = ((await selectedLabel.textContent()) ?? "").trim();
  expect(secondLabel).not.toBe(firstLabel);
  await page.keyboard.press("Enter");
  await expect(editor).toContainText(secondLabel);
  await expect(editor.locator(".cm-line")).toHaveCount(1);

  // With no popup open, Enter is a newline again.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Enter");
  await expect(editor.locator(".cm-line")).toHaveCount(2);
});
