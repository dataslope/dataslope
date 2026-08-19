/**
 * Cover for the three cross-playground findings the Java audit filed as
 * JV-07, JV-13 and JV-14: an unsaved workspace that could not be exported,
 * two download paths disagreeing about a file's type, and a Workspaces
 * panel that rendered a page-load snapshot.
 *
 * Run against the JavaScript playground, which boots from this origin in
 * about a second. None of the three is a Java bug; Java is only where they
 * bite hardest, because a Java project is multi-file by construction.
 */
import { test, expect, type Page } from "@playwright/test";

const RUN_BUTTON = ".playground-run-multi-main";

interface CapturedDownload {
  name: string;
  type: string;
  size: number;
}

declare global {
  interface Window {
    __downloads?: CapturedDownload[];
  }
}

/**
 * Record what the page hands the browser to download, without downloading.
 *
 * `URL.createObjectURL` is where the Blob's type is still visible, and the
 * anchor's `download` attribute carries the filename; intercepting the
 * click keeps the browser out of it.
 */
async function captureDownloads(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__downloads = [];
    const blobs = new Map<string, Blob>();
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (obj: Blob | MediaSource) => {
      const url = createObjectURL(obj);
      if (obj instanceof Blob) blobs.set(url, obj);
      return url;
    };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function patched(
      this: HTMLAnchorElement,
    ) {
      const blob = blobs.get(this.href);
      if (blob) {
        window.__downloads!.push({
          name: this.download,
          type: blob.type,
          size: blob.size,
        });
        return;
      }
      return click.call(this);
    };
  });
}

async function openPlayground(page: Page): Promise<void> {
  await page.goto("/playground/javascript");
  await expect(page.locator(RUN_BUTTON)).toBeEnabled({ timeout: 120_000 });
}

/** Open the header's ⋯ menu and click one of its items. */
async function openMoreMenu(page: Page, label: string): Promise<void> {
  await page.locator(".ph-more-btn").first().click();
  await page.locator(".ph-more-item", { hasText: label }).first().click();
}

const downloads = (page: Page) => page.evaluate(() => window.__downloads ?? []);

test("a file downloads as the type the Export menu declares", async ({
  page,
}) => {
  // JV-13: the Files rail hard-coded text/plain, so the same index.js came
  // out as two different types depending on which menu was used.
  await captureDownloads(page);
  await openPlayground(page);

  await page.locator('button[aria-label="Files"]').first().click();
  const row = page
    .locator(".playground-files-row", { hasText: "index.js" })
    .first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.click({ button: "right" });
  await page
    .locator(".playground-files-ctx-menu .ex-title", { hasText: "Download" })
    .first()
    .click();

  await expect.poll(() => downloads(page)).toHaveLength(1);
  const [file] = await downloads(page);
  expect(file.name).toBe("index.js");
  expect(file.type).toBe("text/javascript");
});

test("an unsaved workspace can still be exported", async ({ page }) => {
  // JV-07: a playground's first workspace is a draft, absent from the
  // registry, and every export path looked workspaces up there — so a
  // multi-file project had no way out of the browser at all.
  await captureDownloads(page);
  await openPlayground(page);

  await openMoreMenu(page, "Export");
  await page
    .locator(".example-item", { hasText: "Whole workspace" })
    .first()
    .click();

  await expect.poll(() => downloads(page), { timeout: 30_000 }).toHaveLength(1);
  const [archive] = await downloads(page);
  expect(archive.name).toMatch(/\.workspace\.zip$/);
  expect(archive.size).toBeGreaterThan(0);
});

test("the Workspaces panel sees a workspace saved in the same tab", async ({
  page,
}) => {
  // JV-14: the registry lives in localStorage, which React cannot
  // subscribe to, and the panel only read it on mount. Saving and then
  // opening the panel showed "No workspaces yet" until a full reload,
  // which made a real storage problem look like a rendering glitch.
  await openPlayground(page);

  await openMoreMenu(page, "Workspaces");
  const drawer = page
    .locator("[role=dialog]", { hasText: "Workspaces" })
    .first();
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("No workspaces yet");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  // Save only appears once the workspace differs from its default.
  await page.locator(".cm-content").first().click();
  await page.keyboard.type("// edited\n");
  const save = page.locator(".ph-save-main").first();
  await expect(save).toBeVisible();
  await save.click();

  await openMoreMenu(page, "Workspaces");
  const reopened = page
    .locator("[role=dialog]", { hasText: "Workspaces" })
    .first();
  await expect(reopened).toBeVisible();
  await expect(reopened).not.toContainText("No workspaces yet");
  await expect(reopened.locator(".workspace-manager-item")).toHaveCount(1);
});
