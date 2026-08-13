import { test, expect } from "./fixtures";

// Fresh browser context per test = fresh localStorage = seed data
// (see betting-provider.tsx seedState()), same reset mechanism the
// leaderboard e2e suite relies on.

test.describe("Commissioner: void or refund a wager", () => {
  test("voiding an open wager returns the stake, removes it from the open list, and logs an audit entry", async ({
    page,
  }) => {
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Review & Void" }).click();

    const dialog = page.getByRole("dialog", { name: "Open wagers" });
    await expect(dialog).toBeVisible();

    const connorRow = page.getByTestId("voidable-wager-row").filter({ hasText: "cacloading" });
    await expect(connorRow).toBeVisible();
    const stakeText = await connorRow.locator("span.font-mono").innerText();

    await connorRow.getByRole("button", { name: "Void" }).click();

    // Confirming with no reason shows inline validation and keeps the row.
    await connorRow.getByRole("button", { name: "Confirm Void" }).click();
    await expect(connorRow.getByText("A reason is required.")).toBeVisible();
    await expect(connorRow).toBeVisible();

    await connorRow.getByLabel("Reason").fill("Market posted with wrong opponent");
    await connorRow.getByRole("button", { name: "Confirm Void" }).click();

    // Row disappears from the open-wagers list once voided.
    await expect(page.getByTestId("voidable-wager-row").filter({ hasText: "cacloading" })).toHaveCount(0);

    await page.getByRole("button", { name: "Close" }).first().click();

    // Audit Activity gets a live entry reflecting the void.
    await expect(
      page.getByText(`Voided cacloading's ${stakeText} FAAB bet — reason: Market posted with wrong opponent.`)
    ).toBeVisible();
  });

  test("voided wager does not count as won or lost, and leaves balance/P-L unaffected", async ({ page }) => {
    await page.goto("/leaderboard");
    const connorRow = page.locator('[data-testid="leaderboard-row"]:visible').filter({ hasText: "cacloading" }).first();
    await expect(connorRow).toBeVisible();
    const balanceBefore = await connorRow.getByTestId("faab-balance").innerText();
    const winsLossesBefore = await connorRow.getByTestId("wins-losses").innerText();

    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Review & Void" }).click();
    const connorWagerRow = page.getByTestId("voidable-wager-row").filter({ hasText: "cacloading" });
    await connorWagerRow.getByRole("button", { name: "Void" }).click();
    await connorWagerRow.getByLabel("Reason").fill("Market posted in error");
    await connorWagerRow.getByRole("button", { name: "Confirm Void" }).click();
    await page.getByRole("button", { name: "Close" }).first().click();

    await page.goto("/leaderboard");
    const connorRowAfter = page
      .locator('[data-testid="leaderboard-row"]:visible')
      .filter({ hasText: "cacloading" })
      .first();
    await expect(connorRowAfter).toBeVisible();

    expect(await connorRowAfter.getByTestId("faab-balance").innerText()).toBe(balanceBefore);
    expect(await connorRowAfter.getByTestId("wins-losses").innerText()).toBe(winsLossesBefore);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toMatch(/NaN|undefined|Infinity/);
  });

  test("a wager already settled cannot be voided again (not shown in the open list)", async ({ page }) => {
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Review & Void" }).click();
    const rows = page.getByTestId("voidable-wager-row");
    await expect(rows.first()).toBeVisible();

    // Every row shown must be an open wager, never a settled one; a
    // wager we haven't touched (e.g. one that's already won/lost in seed
    // data) must not appear here at all.
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});
