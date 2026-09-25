import { test, expect, type Page } from "@playwright/test";

// Drives the full-page challenge workspace at /challenges/<slug> in a real
// browser: loads each task's reference solution, submits it, and asserts every
// declared check passes. `__tests__/challengeSolutions` already proves the
// solutions are correct against node:sqlite, python3 and node; what only a
// browser can prove is that the workspace actually boots those runtimes, feeds
// them the editor buffer, and grades what comes back.
//
// Challenges are driven through window.__dsChallengeWorkspace rather than by
// typing into CodeMirror's contenteditable, the same way
// challenge-solutions.spec.ts drives the lesson cards.
//
// LANGS=javascript narrows the sweep to challenges whose runtime is reachable
// — useful in a sandbox with no route to the CDN that serves the SQLite and
// Pyodide WASM builds. The JavaScript worker is served from this origin, so it
// runs anywhere.

const LANGS = process.env.LANGS
  ? process.env.LANGS.split(",").map((s) => s.trim()).filter(Boolean)
  : null;

// `window.__dsChallengeWorkspace` is declared by the app itself, in
// app/challenges/_components/testRegistry.ts, so this spec is typed against
// the same handle the workspace registers rather than a copy that could drift.

/** Every slug the catalog lists, collected by walking its pagination. */
async function catalogSlugs(page: Page): Promise<string[]> {
  await page.goto("/dashboard/challenges");
  const slugs: string[] = [];
  for (;;) {
    const hrefs = await page
      .locator('table a[href^="/challenges/"]')
      .evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLAnchorElement).getAttribute("href") ?? ""),
      );
    for (const href of hrefs) {
      const slug = href.replace("/challenges/", "");
      if (slug && !slugs.includes(slug)) slugs.push(slug);
    }
    // Scoped to the pagination nav: Next's dev overlay also has a "Next"
    // button, and an unscoped role query matches both.
    const next = page
      .getByRole("navigation", { name: "Pagination" })
      .getByRole("button", { name: "Next", exact: true });
    if ((await next.count()) === 0 || (await next.isDisabled())) break;
    // Paging is a router navigation now, so wait for the URL to land before
    // sampling the button again — otherwise `isDisabled` reads the previous
    // render and the click waits on a button that is already disabled.
    const before = page.url();
    await next.click();
    await page.waitForFunction((url) => window.location.href !== url, before, {
      timeout: 15_000,
    });
  }
  return slugs;
}

async function openWorkspace(page: Page, slug: string): Promise<void> {
  await page.goto(`/challenges/${slug}`);
  await page.waitForFunction(
    (s) => !!window.__dsChallengeWorkspace?.[s],
    slug,
    { timeout: 60_000 },
  );
}

function handleOf(page: Page, slug: string) {
  return {
    read: () =>
      page.evaluate((s) => {
        const h = window.__dsChallengeWorkspace?.[s];
        return {
          runtimeKind: h?.runtimeKind ?? "code",
          langs: h?.langs ?? [],
          taskKeys: h?.taskKeys ?? [],
        };
      }, slug),
  };
}

/**
 * Put code in the editor and wait until the workspace will grade it.
 *
 * `submit` grades the buffer as of the last render, so submitting in the same
 * tick as a `setCode` or `loadSolution` grades whatever was there before. On a
 * challenge's first task that is the starter, which made the sweep report
 * reference solutions failing their own checks, and made a wrong answer
 * "fail" by grading the starter instead. `"solution"` loads the task's
 * reference.
 */
async function fillEditor(page: Page, slug: string, code: string | "solution") {
  const expected = await page.evaluate(
    ([s, c]) => {
      const handle = window.__dsChallengeWorkspace?.[s];
      if (c === "solution") return handle?.loadSolution() ?? "";
      handle?.setCode(c);
      return c;
    },
    [slug, code] as const,
  );
  await page.waitForFunction(
    ([s, c]) => window.__dsChallengeWorkspace?.[s]?.getCode() === c,
    [slug, expected] as const,
  );
}

/** Load a task's reference solution, submit it, and report what the UI says. */
async function submitSolution(
  page: Page,
  slug: string,
  key: string,
): Promise<{ ok: boolean; detail: string }> {
  await page.evaluate(
    ([s, k]) => {
      const handle = window.__dsChallengeWorkspace?.[s];
      handle?.selectTask(k);
    },
    [slug, key] as const,
  );
  // selectTask re-seeds the editor from the new task, so the solution has to
  // be loaded after React has committed that swap.
  await page.waitForTimeout(50);
  await fillEditor(page, slug, "solution");
  await page.evaluate((s) => window.__dsChallengeWorkspace?.[s]?.submit(), slug);
  await page.waitForFunction(
    (s) => window.__dsChallengeWorkspace?.[s]?.isBusy() === false,
    slug,
    { timeout: 150_000 },
  );

  const result = await page.evaluate((s) => {
    const handle = window.__dsChallengeWorkspace?.[s];
    return {
      tests: handle?.getTestResults() ?? [],
      outputKind: handle?.getOutputKind() ?? null,
      outputError: handle?.getOutputError() ?? null,
    };
  }, slug);

  if (result.outputError) {
    return { ok: false, detail: `run failed: ${result.outputError}` };
  }
  if (result.tests.length === 0) {
    return { ok: false, detail: "the run produced no check results" };
  }
  const failed = result.tests.filter((t) => !t.pass);
  if (failed.length > 0) {
    return {
      ok: false,
      detail: failed.map((t) => `  - ${t.name}: ${t.got ?? t.detail}`).join("\n"),
    };
  }
  return { ok: true, detail: `${result.tests.length} checks passed` };
}

test.describe("Challenge workspace", () => {
  test("the catalog lists every challenge and links every row to a workspace", async ({
    page,
  }) => {
    const slugs = await catalogSlugs(page);
    expect(slugs.length).toBe(300);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("every reference solution passes in the browser", async ({ page }) => {
    // Each challenge is a fresh page load, so every one boots its runtime from
    // cold. Three hundred of those does not fit the file's default timeout;
    // the hundred-challenge pilot needed 45 minutes, so this scales that.
    test.setTimeout(135 * 60_000);
    const slugs = await catalogSlugs(page);
    const failures: string[] = [];
    let swept = 0;
    let skipped = 0;

    for (const slug of slugs) {
      await openWorkspace(page, slug);
      const { langs, taskKeys } = await handleOf(page, slug).read();
      if (LANGS && !langs.some((l) => LANGS.includes(l))) {
        skipped += 1;
        continue;
      }
      // A single-step challenge keys its tasks by language id (a multi-step
      // one by step number, which is never a language), so a narrowed sweep
      // can drop the languages it cannot boot and keep the rest.
      const languageIds: string[] = langs;
      const keysAreLanguages = taskKeys.every((k) => languageIds.includes(k));

      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      for (const key of taskKeys) {
        if (LANGS && keysAreLanguages && !LANGS.includes(key)) {
          skipped += 1;
          continue;
        }
        const r = await submitSolution(page, slug, key);
        swept += 1;
        if (!r.ok) failures.push(`❌ ${slug} · ${key}\n${r.detail}`);
      }

      if (pageErrors.length > 0) {
        failures.push(`❌ ${slug}: uncaught page error\n  ${pageErrors.join("\n  ")}`);
      }
      page.removeAllListeners("pageerror");
    }

    console.log(`SWEEP ${JSON.stringify({ kind: "workspace", ran: swept, skipped })}`);
    expect(swept, "the sweep ran no tasks").toBeGreaterThan(0);
    expect(failures.join("\n\n")).toBe("");
  });

  test("a wrong answer fails, and the workspace says why", async ({ page }) => {
    await openWorkspace(page, "two-sum");
    await page.evaluate(() => {
      const handle = window.__dsChallengeWorkspace?.["two-sum"];
      handle?.selectTask("javascript");
    });
    await page.waitForTimeout(50);
    await fillEditor(page, "two-sum", "function twoSum(nums, target) {\n  return [];\n}\n");
    await page.evaluate(() => window.__dsChallengeWorkspace?.["two-sum"]?.submit());
    await page.waitForFunction(
      () => window.__dsChallengeWorkspace?.["two-sum"]?.isBusy() === false,
      null,
      { timeout: 150_000 },
    );

    const tests = await page.evaluate(
      () => window.__dsChallengeWorkspace?.["two-sum"]?.getTestResults() ?? [],
    );
    expect(tests.length).toBeGreaterThan(0);
    expect(tests.every((t) => !t.pass)).toBe(true);
    // A failing check must say what came back, not just that it failed.
    expect(tests[0].got ?? "").not.toBe("");
  });

  test("steps stay locked until the one before them passes", async ({ page }) => {
    await openWorkspace(page, "matrix-rotation");

    const before = await page.evaluate(() => {
      const handle = window.__dsChallengeWorkspace?.["matrix-rotation"];
      return (handle?.taskKeys ?? []).map((k) => handle!.isTaskUnlocked(k));
    });
    expect(before[0]).toBe(true);
    expect(before.slice(1).every((unlocked) => !unlocked)).toBe(true);

    const first = await submitSolution(page, "matrix-rotation", "01");
    expect(first.detail).toContain("passed");

    const after = await page.evaluate(() => {
      const handle = window.__dsChallengeWorkspace?.["matrix-rotation"];
      return (handle?.taskKeys ?? []).map((k) => handle!.isTaskUnlocked(k));
    });
    expect(after[0]).toBe(true);
    expect(after[1]).toBe(true);
    // Step 3 is still behind step 2.
    expect(after[2]).toBe(false);
  });


  test("a locked step shows its solution but keeps the editor locked", async ({
    page,
  }) => {
    await openWorkspace(page, "matrix-rotation");
    // Step 2 is locked until step 1 passes.
    await page.evaluate(() =>
      window.__dsChallengeWorkspace?.["matrix-rotation"]?.selectTask("02"),
    );
    expect(
      await page.evaluate(() =>
        window.__dsChallengeWorkspace?.["matrix-rotation"]?.isTaskUnlocked("02"),
      ),
    ).toBe(false);

    // The editor is still gated: no CodeMirror, just the locked placeholder.
    await expect(page.locator(".cm-content")).toHaveCount(0);
    await expect(page.locator("body")).toContainText("Editor unlocks when step 1 passes");

    // The solution is readable in advance, by design — step 2's answer
    // reverses each transposed row. It is one confirmation away (CH-9), not
    // one click: the tab asks first, then shows it.
    await page.getByRole("tab", { name: "Solution", exact: true }).click();
    await expect(page.locator("body")).not.toContainText("row.reverse()");
    await page.getByRole("button", { name: "Reveal solution" }).click();
    await expect(page.locator("body")).toContainText("row.reverse()");
  });

  test("the editor can be left with the keyboard", async ({ page }) => {
    await openWorkspace(page, "two-sum");
    await page.locator(".cm-content").first().click();
    await expect(page.locator(".cm-content").first()).toBeFocused();

    // Tab alone indents rather than moving focus, which is the trap.
    await page.keyboard.press("Tab");
    await expect(page.locator(".cm-content").first()).toBeFocused();

    // Escape releases it, so the next Tab leaves.
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    await expect(page.locator(".cm-content").first()).not.toBeFocused();
  });

  test("submitting announces the verdict and moves focus", async ({ page }) => {
    await openWorkspace(page, "two-sum");
    await page.evaluate(() => {
      const handle = window.__dsChallengeWorkspace?.["two-sum"];
      handle?.selectTask("javascript");
    });
    await page.waitForTimeout(50);
    await fillEditor(page, "two-sum", "solution");
    await page.evaluate((s) => window.__dsChallengeWorkspace?.[s]?.submit(), "two-sum");
    await page.waitForFunction(
      () => window.__dsChallengeWorkspace?.["two-sum"]?.isBusy() === false,
      null,
      { timeout: 150_000 },
    );

    // Targeted by test id: Next's own route announcer is also a polite live
    // region, so an attribute selector matches two elements here.
    await expect(
      page.getByTestId("challenge-announcement"),
    ).toContainText("checks passed");
    // Focus lands on the results banner rather than dropping to <body>.
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? "");
    expect(focused).not.toBe("BODY");
  });

  test("lists 50 a page, and changing the size keeps your place", async ({ page }) => {
    await page.goto("/dashboard/challenges?page=3");
    await page.waitForLoadState("networkidle");
    const perPage = page.getByLabel("Challenges per page");
    await expect(perPage).toHaveValue("50");
    await expect(page.locator("table tbody tr")).toHaveCount(50);
    await expect(page.getByText("101–150 of 300")).toBeVisible();

    // Row 101 was at the top; at 10 a page it lives on page 11.
    await perPage.selectOption("10");
    await expect(page).toHaveURL(/page=11/);
    await expect(page).toHaveURL(/per=10/);
    await expect(page.locator("table tbody tr")).toHaveCount(10);
    await expect(page.getByText("101–110 of 300")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Challenges per page")).toHaveValue("10");

    // The default is left out of the URL, like an empty filter. The select is
    // server-rendered, so wait for hydration before changing it (see the
    // next test): a change before React attaches is a DOM change only.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Challenges per page").selectOption("50");
    await expect(page).not.toHaveURL(/per=/);
  });

  test("filters live in the URL and survive a reload", async ({ page }) => {
    await page.goto("/dashboard/challenges");
    // The rows are server-rendered, so the select exists before React has
    // attached to it. Setting it pre-hydration changes the DOM value and
    // nothing else, so wait for the chunks to land first.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Language").selectOption("python");
    await expect(page).toHaveURL(/lang=python/);

    const beforeReload = await page.locator("table tbody tr").count();
    await page.reload();
    await expect(page.getByLabel("Language")).toHaveValue("python");
    expect(await page.locator("table tbody tr").count()).toBe(beforeReload);
  });

  test("passing every step marks the challenge solved, and it survives a reload", async ({
    page,
  }) => {
    await openWorkspace(page, "paginate-results");
    const { taskKeys } = await handleOf(page, "paginate-results").read();
    for (const key of taskKeys) {
      const r = await submitSolution(page, "paginate-results", key);
      expect(r.detail, `${key} should pass`).toContain("passed");
    }

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("ds_challenge_progress_v1"),
    );
    expect(stored ?? "").toContain("paginate-results");

    await page.reload();
    await page.waitForFunction(
      () => !!window.__dsChallengeWorkspace?.["paginate-results"],
      null,
      { timeout: 60_000 },
    );
    const unlocked = await page.evaluate(() => {
      const handle = window.__dsChallengeWorkspace?.["paginate-results"];
      return (handle?.taskKeys ?? []).map((k) => handle!.isTaskUnlocked(k));
    });
    expect(unlocked.every(Boolean)).toBe(true);
  });

  // ─── Audit regressions (CH-1 to CH-4, CH-7 to CH-9, A11Y-1, SEO-1) ────

  test("CH-1: the search box keeps every keystroke, and the URL follows", async ({ page }) => {
    await page.goto("/dashboard/challenges");
    // Typing before hydration goes to the server-rendered copy, which React
    // replaces; wait for the chunks so the keystrokes reach the real list.
    await page.waitForLoadState("networkidle");
    const search = page.getByLabel("Search challenges");
    await search.click();
    // A normal typing speed, which used to leave only the last letter.
    await search.pressSequentially("coh", { delay: 30 });
    // Let the first write land mid-word, then keep typing: its arrival must
    // not put "coh" back over the letters typed since.
    await page.waitForTimeout(400);
    await search.pressSequentially("ort", { delay: 30 });
    await expect(search).toHaveValue("cohort");
    await expect(page).toHaveURL(/[?&]q=cohort(&|$)/);

    const titles = page.locator("table tbody tr");
    await expect(titles.first()).toContainText(/cohort/i);
    for (const text of await titles.allTextContents()) expect(text).toMatch(/cohort/i);

    // Leave for a challenge and come back: the search comes back with it.
    await titles.first().locator("a").click();
    await expect(page).toHaveURL(/\/challenges\//);
    await page.goBack();
    await expect(page.getByLabel("Search challenges")).toHaveValue("cohort");
  });

  test("CH-7: the language filter offers only languages with challenges, with counts", async ({
    page,
  }) => {
    await page.goto("/dashboard/challenges");
    const labels = await page.getByLabel("Language").locator("option").allTextContents();
    expect(labels[0]).toBe("All languages");
    for (const label of labels.slice(1)) expect(label).toMatch(/^[\w+#. ]+ \(\d+\)$/);
    expect(labels.some((l) => l.startsWith("Python ("))).toBe(true);
    expect(labels.some((l) => l.startsWith("PostgreSQL"))).toBe(false);
    expect(labels.some((l) => l.startsWith("DuckDB"))).toBe(false);
  });

  test("CH-2: passing a step shows the verdict and waits for Continue", async ({ page }) => {
    await openWorkspace(page, "matrix-rotation");
    const handle = () =>
      page.evaluate(() => window.__dsChallengeWorkspace?.["matrix-rotation"]?.currentTaskKey());
    expect(await handle()).toBe("01");

    // No step picked: the page is following progress, which is the state the
    // jump happened in. Submit through the real button.
    await fillEditor(page, "matrix-rotation", "solution");
    await page.getByRole("button", { name: "Submit step" }).click();

    const panel = page.getByRole("tabpanel");
    await expect(panel).toContainText(/All \d+ checks passed/, { timeout: 150_000 });
    await expect(panel).toContainText("Step 1 accepted");
    const cont = page.getByRole("button", { name: "Continue to step 2" });
    await expect(cont).toBeVisible();
    expect(await handle()).toBe("01");

    await cont.click();
    await expect.poll(handle).toBe("02");
    await expect(page.locator(".cm-content").first()).toBeVisible();

    // A fresh load opens on the first step not yet passed.
    await page.reload();
    await page.waitForFunction(() => !!window.__dsChallengeWorkspace?.["matrix-rotation"]);
    expect(await handle()).toBe("02");
  });

  test("CH-3: a submission that throws says so in Test cases", async ({ page }) => {
    await openWorkspace(page, "two-sum");
    await page.evaluate(() => window.__dsChallengeWorkspace?.["two-sum"]?.selectTask("javascript"));
    await page.waitForTimeout(50);
    await fillEditor(
      page,
      "two-sum",
      "function twoSum(nums, target) {\n  return [];\n}\noops();\n",
    );
    await page.evaluate(() => window.__dsChallengeWorkspace?.["two-sum"]?.submit());
    await page.waitForFunction(
      () => window.__dsChallengeWorkspace?.["two-sum"]?.isBusy() === false,
      null,
      { timeout: 150_000 },
    );

    await expect(page.getByRole("tab", { name: /^Test cases/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const panel = page.getByRole("tabpanel");
    await expect(panel).toContainText("The checks did not run");
    await expect(panel).toContainText("before the checks for this challenge could run");
    await expect(panel).toContainText("oops is not defined");
    // The harness appended after the learner's four lines is not theirs to
    // debug, so no frame points past them.
    const message = (await panel.locator("pre").textContent()) ?? "";
    for (const m of message.matchAll(/:(\d+):\d+\)?\s*$/gm)) {
      expect(Number(m[1])).toBeLessThanOrEqual(4);
    }

    await panel.getByRole("button", { name: "Open Output" }).click();
    await expect(page.getByRole("tab", { name: "Output" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tabpanel")).toContainText("oops is not defined");
  });

  test("CH-4: the previous and next chevrons go to the neighbouring challenges", async ({
    page,
  }) => {
    await openWorkspace(page, "two-sum");
    const nextLink = page.getByRole("link", { name: /^Next challenge: / });
    const name = (await nextLink.getAttribute("aria-label")) ?? "";
    await nextLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).not.toHaveURL(/\/challenges\/two-sum$/);
    await expect(page.locator("h1")).toHaveText(name.replace(/^Next challenge: /, ""));

    await page.getByRole("link", { name: /^Previous challenge: / }).click();
    await expect(page).toHaveURL(/\/challenges\/two-sum$/);

    // The first challenge in the catalog has nowhere to go back to.
    await openWorkspace(page, "top-products-by-month");
    await expect(page.getByRole("button", { name: "No previous challenge" })).toBeDisabled();
  });

  test("CH-4: the phone's More menu opens and its items work", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page, "two-sum");
    const more = page.getByRole("button", { name: "More" });
    await more.click();
    const menu = page.getByRole("menu", { name: "More" });
    await expect(menu).toBeVisible();
    // Focus moves into the menu, the arrows move through it, Escape leaves.
    await expect(menu.getByRole("menuitemradio").first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(menu.getByRole("menuitem").last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(more).toBeFocused();

    // Switching language from the menu.
    await more.click();
    await menu.getByRole("menuitemradio", { name: /JavaScript/ }).click();
    await expect.poll(() =>
      page.evaluate(() => window.__dsChallengeWorkspace?.["two-sum"]?.currentTaskKey()),
    ).toBe("javascript");

    // Solution opens the results on that tab, behind its confirmation.
    await more.click();
    await menu.getByRole("menuitem", { name: "Solution" }).click();
    await expect(page.getByRole("tab", { name: "Solution" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("button", { name: "Reveal solution" })).toBeVisible();

    // And the next challenge.
    await more.click();
    await menu.getByRole("menuitem", { name: /^Next challenge: / }).click();
    await expect(page).not.toHaveURL(/\/challenges\/two-sum$/);
  });

  test("CH-8: the phone opens a new challenge on Problem, and a started one on Code", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page, "two-sum");
    const nav = (name: string) => page.getByRole("button", { name, exact: true });
    await expect(nav("Problem")).toHaveAttribute("aria-current", "page");

    await nav("Code").click();
    await expect(page.getByText("Autosaved")).toHaveCount(0);
    await fillEditor(page, "two-sum", "def two_sum(nums, target):\n    return []\n");
    await expect(page.getByText("Autosaved")).toBeVisible();

    await page.reload();
    await page.waitForFunction(() => !!window.__dsChallengeWorkspace?.["two-sum"]);
    await expect(nav("Code")).toHaveAttribute("aria-current", "page");
  });

  test("A11Y-1: the result tabs are a tab set", async ({ page }) => {
    await openWorkspace(page, "two-sum");
    const tabs = page.getByRole("tablist", { name: "Results" }).getByRole("tab");
    await expect(tabs).toHaveCount(4);
    const output = page.getByRole("tab", { name: "Output" });
    await expect(output).toHaveAttribute("aria-selected", "true");
    const panelId = await output.getAttribute("aria-controls");
    await expect(page.locator(`[id="${panelId}"]`)).toHaveAttribute("role", "tabpanel");

    await output.focus();
    await page.keyboard.press("ArrowRight");
    const tests = page.getByRole("tab", { name: /^Test cases/ });
    await expect(tests).toBeFocused();
    await expect(tests).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Submissions" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(output).toBeFocused();

    // Ids are unique across the desktop and phone trees.
    const duplicates = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    });
    expect(duplicates).toEqual([]);
  });

  test("SEO-1: the catalog's HTML carries challenge links, and the sitemap lists them", async ({
    browser,
    request,
  }) => {
    // No JavaScript: what a crawler that does not render gets.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/dashboard/challenges");
    expect(await page.locator('a[href^="/challenges/"]').count()).toBeGreaterThanOrEqual(10);
    await context.close();

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/dashboard/challenges</loc>");
    expect(sitemap).toContain("/challenges/two-sum</loc>");
    expect(sitemap.match(/\/challenges\/[a-z0-9-]+<\/loc>/g)?.length).toBe(300);
  });
});

