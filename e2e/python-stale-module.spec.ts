import { test, expect, type Page } from "@playwright/test";

// Regression test for the multi-file Python "stale module" bug.
//
// A multi-file Python challenge whose helper module is edited between
// runs (the classic try → fail → fix → retry flow) must pick up the new
// module source on the second Run. Pyodide caches imported modules in
// `sys.modules`, and the per-run reset only wipes `globals()`, so without
// an explicit cache invalidation on file staging the second run re-imports
// the STALE module — and a correct solution still fails its tests.
//
// Reproduced against the live "Implement greet() in utils.py" card on
// /learn/challenge-cards-python:
//   1. Submit with the broken starter (greet returns "") → tests fail,
//      `utils` is now cached in sys.modules.
//   2. Replace utils.py with the reference solution and submit again.
//   3. Before the fix the banner stays "fail"; after the fix it is "pass".

const KEY = "python::Implement greet() in utils.py";
const SOLUTION = `def greet(name):
    return f"Hello, {name}!"
`;

interface HandleLite {
  setFileContent(filename: string, content: string): boolean;
  submit(): Promise<void>;
  getBannerState(): "pass" | "fail" | null;
  getTestResults(): { name: string; state: string; detail: string | null }[];
}
// Access the per-card test registry without globally augmenting `Window`
// (challenge-solutions.spec.ts already declares it with a different shape).
type WinDS = { __dsChallenges?: Record<string, HandleLite> };

// Fire Submit (like a real button click — do NOT await the run) and poll
// the banner ref until it settles, so we don't race React's effect that
// mirrors banner state into the imperative test handle.
async function clickSubmitAndAwaitBanner(
  page: Page,
  opts: { expectReset: boolean },
): Promise<{ banner: "pass" | "fail" | null; tests: { name: string; state: string; detail: string | null }[] }> {
  await page.evaluate(
    (key) => void (window as unknown as WinDS).__dsChallenges?.[key]?.submit(),
    KEY,
  );
  if (opts.expectReset) {
    // A prior run left the banner non-null; check() resets it to null at
    // the start of the new run. Wait for that reset first so we read THIS
    // run's result, not the previous one.
    await page.waitForFunction(
      (key) => (window as unknown as WinDS).__dsChallenges?.[key]?.getBannerState() === null,
      KEY,
      { timeout: 30_000 },
    );
  }
  await page.waitForFunction(
    (key) => (window as unknown as WinDS).__dsChallenges?.[key]?.getBannerState() !== null,
    KEY,
    { timeout: 150_000 },
  );
  return await page.evaluate((key) => {
    const h = (window as unknown as WinDS).__dsChallenges?.[key];
    return { banner: h?.getBannerState() ?? null, tests: h?.getTestResults() ?? [] };
  }, KEY);
}

test("multi-file Python picks up an edited helper module on re-run", async ({
  page,
}) => {
  await page.goto("/learn/challenge-cards-python");
  await page.waitForFunction(
    (k) => !!(window as unknown as WinDS).__dsChallenges?.[k],
    KEY,
    { timeout: 60_000 },
  );

  // 1) Run the broken starter so `utils` gets imported (and cached).
  const first = await clickSubmitAndAwaitBanner(page, { expectReset: false });
  expect(first.banner, "starter should fail its test").toBe("fail");

  // 2) Apply the reference solution to utils.py and re-run.
  const staged = await page.evaluate(
    ([key, sol]) =>
      (window as unknown as WinDS).__dsChallenges?.[key]?.setFileContent("utils.py", sol) ?? false,
    [KEY, SOLUTION] as const,
  );
  expect(staged, "utils.py buffer should be writable").toBe(true);

  const second = await clickSubmitAndAwaitBanner(page, { expectReset: true });
  expect(
    second.banner,
    `solution should pass on re-run; tests=${JSON.stringify(second.tests)}`,
  ).toBe("pass");
});
