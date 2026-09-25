import { test, expect } from "@playwright/test";

// The account page for someone who is not signed in. It used to be one
// centred line and a button under a left-aligned heading; it now explains
// what an account adds, and its links bring the learner back here once they
// have one.

test.describe("Account page, signed out", () => {
  test("explains what an account adds and links back after sign-in", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/dashboard/account");
    // Scoped to the page body: the studio sidebar has a "Sign in" link too.
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "You're browsing as a guest" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "What an account adds" })).toBeVisible();
    for (const perk of ["Cloud saves", "Share links you control"]) {
      await expect(main.getByRole("heading", { name: perk })).toBeVisible();
    }

    await expect(main.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute(
      "href",
      "/sign-in?next=/dashboard/account",
    );
    await expect(main.getByRole("link", { name: "Create a free account" })).toHaveAttribute(
      "href",
      "/sign-up?next=/dashboard/account",
    );

    // The session settles on the client; the page must not hydrate against
    // a different card than the server rendered.
    await page.waitForLoadState("networkidle");
    expect(errors.filter((m) => m.includes("Hydration"))).toEqual([]);
  });
});
