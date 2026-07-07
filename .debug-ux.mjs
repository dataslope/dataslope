import { chromium } from "playwright-core";

const run = async () => {
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    headless: true,
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.log("[pageerror]", err.message.slice(0, 200)));

  await page.goto("http://localhost:3457/playground/web", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // 1. Auto-run: the preview should render WITHOUT clicking Run.
  const preview = page.frameLocator(".web-preview-slot iframe");
  await preview.locator("h1").waitFor({ timeout: 30000 });
  const h1 = await preview.locator("h1").textContent();
  console.log("[auto-run] initial preview h1:", JSON.stringify(h1));

  // 2. Auto-run on EDIT: type into the HTML pane, expect the preview to
  //    update without any click on Run.
  const htmlPane = page.locator(".split-editor-section", { hasText: "index.html" });
  await htmlPane.locator(".cm-content").click({ timeout: 10000 });
  await page.keyboard.press("Control+Home");
  await page.keyboard.type("<h2>typed live</h2>\n");
  await preview.locator("h2", { hasText: "typed live" }).waitFor({ timeout: 15000 });
  console.log("[auto-run] edit re-rendered the preview: OK");

  // 3. Change View: switch to editors-top, then editors-right.
  await page.locator('button[aria-label="Change view (editor position)"]').click();
  await page.locator(".change-view-item", { hasText: "Editors top" }).click();
  let pos = await page.locator(".panes").getAttribute("data-editor-position");
  console.log("[change-view] top applied:", pos === "top" ? "OK" : `FAIL(${pos})`);
  await page.locator('button[aria-label="Change view (editor position)"]').click();
  await page.locator(".change-view-item", { hasText: "Editors right" }).click();
  pos = await page.locator(".panes").getAttribute("data-editor-position");
  console.log("[change-view] right applied:", pos === "right" ? "OK" : `FAIL(${pos})`);
  // Editor pane should now sit to the RIGHT of the output pane.
  const editorBox = await page.locator(".editor-pane").boundingBox();
  const outputBox = await page.locator(".output-pane").boundingBox();
  console.log(
    "[change-view] editor is right of output:",
    editorBox && outputBox && editorBox.x > outputBox.x ? "OK" : "FAIL",
  );
  await page.locator('button[aria-label="Change view (editor position)"]').click();
  await page.locator(".change-view-item", { hasText: "Editors left" }).click();

  // 4. Add file from the split stack.
  const before = await page.locator(".split-editor-section").count();
  await page.locator(".split-editor-add").click();
  await page.waitForTimeout(500);
  const after = await page.locator(".split-editor-section").count();
  console.log(`[add-file] panes ${before} -> ${after}:`, after === before + 1 ? "OK" : "FAIL");

  // 5. Auto-run toggle persists.
  await page.locator('button[aria-label="Turn off auto-run on edit"]').click();
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("playground_web_autorun"),
  );
  console.log("[auto-run] toggle persisted:", stored === "false" ? "OK" : `FAIL(${stored})`);

  await browser.close();
  console.log("UX CHECKS DONE");
};

run().catch((e) => {
  console.error("DEBUG SCRIPT ERROR", e.message ?? e);
  process.exit(1);
});
