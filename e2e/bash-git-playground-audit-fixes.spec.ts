/**
 * Regression cover for the Bash & Git playground audit fixes (September
 * 2026, findings BG-01 to BG-27): definitions that persist without replaying
 * their line, the continuation prompt, a diff that marks its changes, a
 * status that tells modified from new, a reset that keeps HEAD attached,
 * fills that leave the caret at the end, a styled command palette, a
 * confirmed reset with Undo behind it, and a session that survives a reload.
 *
 * Opt-in like the other playground specs
 * (`npx playwright test e2e/bash-git-playground-audit-fixes.spec.ts`): each
 * page boots the shell runtime worker.
 */
import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const INPUT = "input.git-terminal-input";

async function open(page: Page, which: "bash" | "git"): Promise<void> {
  await page.goto(`/playground/${which}`);
  await expect(page.locator(INPUT).first()).toBeVisible({ timeout: 120_000 });
  // The runtime reports ready by enabling the prompt.
  await expect(page.locator(INPUT).first()).toBeEnabled({ timeout: 120_000 });
}

async function run(page: Page, command: string): Promise<string> {
  const input = page.locator(INPUT).first();
  await input.fill(command);
  await input.press("Enter");
  await page.waitForFunction(() => !document.querySelector(".git-terminal-busy"), null, { timeout: 30_000 });
  return (await page.locator(".git-terminal-block").last().innerText()).trim();
}

const selection = (page: Page) =>
  page.locator(INPUT).first().evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd, el.value] as const);

test("Bash: a function definition persists without its line replaying", async ({ page }) => {
  await open(page, "bash");
  expect(await run(page, 'greet(){ echo "hi $1"; }; greet a')).toContain("hi a");
  const second = await run(page, "greet b");
  expect(second).toContain("hi b");
  expect(second).not.toContain("hi a");
  await run(page, "f(){ :; }; echo X >> t");
  await run(page, "");
  await run(page, "");
  expect(await run(page, "wc -l t")).toContain("1 t");
});

test("Bash: an unfinished line gets a > prompt, aliases work, stdin is explained", async ({ page }) => {
  await open(page, "bash");
  await run(page, "if true; then echo yes");
  await expect(page.locator(".git-terminal-inputrow .git-terminal-prompt")).toHaveText(">");
  expect(await run(page, "fi")).toContain("yes");
  expect(await run(page, "alias hi='echo hello'; hi there")).toContain("hello there");
  expect(await run(page, "cat > x.txt")).toContain("no standard input");
  await run(page, "echo err >&2");
  await expect(page.locator(".git-terminal-block").last().locator("pre")).toHaveClass(/git-terminal-stderr/);
  expect(await run(page, "echo $USER $SHELL")).toContain("user /bin/bash");
});

test("Bash: the menu's palette fills the prompt with the caret at the end, and Reset asks first", async ({ page }) => {
  await open(page, "bash");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: /All commands/ }).click();
  const row = page.locator(".gitx-palette-btn").first();
  await expect(row).toBeVisible();
  // Styled, not the browser's default button chrome.
  expect(await row.evaluate((el) => getComputedStyle(el).borderStyle)).toBe("none");
  await row.click();
  await expect(page.locator(".gitx-palette-btn")).toHaveCount(0);
  const [start, end, value] = await selection(page);
  expect(value.length).toBeGreaterThan(0);
  expect(start).toBe(value.length);
  expect(end).toBe(value.length);
  await page.locator(INPUT).first().press("Enter");
  await page.waitForFunction(() => !document.querySelector(".git-terminal-busy"));

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: /About this shell/ }).click();
  await expect(page.locator(".bpg-about")).toContainText("no standard input");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Reset" }).click();
  // The About dialog is still fading out; the open one is the alert.
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".git-terminal-block").first()).toBeVisible();
});

test("Bash: choosing Panes or Tabs does not move the layout buttons", async ({ page }) => {
  await open(page, "bash");
  const panes = page.getByRole("button", { name: "Panes" });
  const before = (await panes.boundingBox())!;
  await page.getByRole("button", { name: "Tabs" }).click();
  await expect(page.locator(".bpg-tabs")).toBeVisible();
  const after = (await panes.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeLessThan(1);
  await panes.click();
  await expect(page.locator(".bpg-tabs")).toHaveCount(0);
  expect(Math.abs((await panes.boundingBox())!.x - before.x)).toBeLessThan(1);
});

test("Bash: the session survives a reload", async ({ page }) => {
  await open(page, "bash");
  await run(page, "echo keep > kept.txt");
  await page.reload();
  await open(page, "bash");
  await page.waitForFunction(() => document.querySelectorAll(".git-terminal-block").length >= 1, null, { timeout: 60_000 });
  expect(await run(page, "cat kept.txt")).toContain("keep");
});

test("Git: diff marks the change, status says modified, reset keeps HEAD on main", async ({ page }) => {
  await open(page, "git");
  const diff = await run(page, "git diff");
  expect(diff).toContain("@@ -1,3 +1,5 @@");
  expect(diff).toContain("+Edited but not staged.");
  await run(page, "git add README.md");
  expect(await run(page, "git status --short")).toContain("M  README.md");
  expect(await run(page, "git reset --hard HEAD~1")).toMatch(/HEAD is now at [0-9a-f]{7} Add add\(\)/);
  expect(await run(page, "git log --oneline -1")).toContain("(HEAD -> main)");
  await expect(page.locator(".gitx-branch")).toHaveText("main");
});

test("Git: chips and the palette leave the caret at the end; the commit chip selects its message", async ({ page }) => {
  await open(page, "git");
  await page.getByRole("button", { name: "All commands" }).click();
  await expect(page.locator("[role=dialog][aria-label='All commands']")).toHaveAttribute("aria-modal", "true");
  await page.locator(".gitx-palette-btn").first().click();
  const [s1, e1, v1] = await selection(page);
  expect([s1, e1]).toEqual([v1.length, v1.length]);
  await expect(page.locator(".gitx-palette-btn")).toHaveCount(0);

  await page.locator(INPUT).first().fill("");
  await run(page, "git add README.md");
  await page.locator(".gitx-step", { hasText: "Commit these changes" }).click();
  const [s2, e2, v2] = await selection(page);
  expect(v2.slice(s2!, e2!)).toBe("Describe the change");
  await page.keyboard.type("Edit the README");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.querySelector(".git-terminal-busy"));
  await expect(page.locator(".git-terminal-block").last()).toContainText("Edit the README");
});

test("Git: Reset asks first and Undo brings the session back", async ({ page }) => {
  await open(page, "git");
  await run(page, "git add README.md");
  await run(page, 'git commit -m "Keep me"');
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator(".confirm-popup")).toContainText("Start this scenario over?");
  await page.locator(".confirm-btn-danger").click();
  await expect(page.locator(".git-terminal-block")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await page.getByRole("button", { name: "Undo" }).click();
  await page.waitForFunction(() => !document.querySelector(".git-terminal-busy"), null, { timeout: 30_000 });
  await expect(page.locator(".git-terminal-block").last()).toContainText("Keep me");
});

test("Git: a conflict is unmerged work in the working directory, marked UU with HEAD markers", async ({ page }) => {
  await open(page, "git");
  await page.locator(".gitx-scenario").click();
  await page.getByRole("option", { name: /Conflict waiting/ }).click();
  await expect(page.locator(INPUT).first()).toBeEnabled({ timeout: 60_000 });
  await run(page, "git merge rename");
  await expect(page.locator(".gitx-box.area-work")).toContainText("1 to resolve");
  await expect(page.locator(".gitx-box.area-stage")).not.toContainText("ready");
  expect(await run(page, "git status --short")).toContain("UU config.yml");
  expect(await run(page, "cat config.yml")).toContain("<<<<<<< HEAD");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("both playgrounds keep their controls reachable at 375px", async ({ page }) => {
    await open(page, "bash");
    expect(await page.locator(INPUT).first().getAttribute("enterkeyhint")).toBe("go");
    expect((await page.locator(".bpg-pane-menu").first().boundingBox())!.height).toBeGreaterThanOrEqual(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await open(page, "git");
    await expect(page.getByRole("tab", { name: "Changes" })).toHaveAttribute("aria-selected", "true");
    const chip = page.locator(".gitx-step").first();
    expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
