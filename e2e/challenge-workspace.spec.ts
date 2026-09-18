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
    await next.click();
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
  await page.evaluate((s) => window.__dsChallengeWorkspace?.[s]?.loadSolution(), slug);
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
  test("the catalog lists the pilot and links every row to a workspace", async ({
    page,
  }) => {
    const slugs = await catalogSlugs(page);
    expect(slugs.length).toBe(50);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("every reference solution passes in the browser", async ({ page }) => {
    // Each challenge is a fresh page load, so every one boots its runtime from
    // cold. Fifty of those does not fit the file's default timeout.
    test.setTimeout(45 * 60_000);
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
    await page.evaluate(() => {
      const handle = window.__dsChallengeWorkspace?.["two-sum"];
      handle?.setCode("function twoSum(nums, target) {\n  return [];\n}\n");
      return handle?.submit();
    });
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
});
