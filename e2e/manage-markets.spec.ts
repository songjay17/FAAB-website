import { test, expect } from "./fixtures";

// Fresh browser context per test = a fresh in-memory StubBook = seed data
// (see e2e/fixtures.ts), the same isolation the rest of the suite relies on.
// Every generated market starts "open" (see generateMarkets), so the
// current week's (7) matchups all accept bets from a fresh seed.

test.describe("Commissioner: open or close a market", () => {
  test("locking a market blocks new bets on that matchup everywhere it's shown", async ({ page }) => {
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Manage Markets" }).click();

    const dialog = page.getByRole("dialog", { name: "Markets" });
    await expect(dialog).toBeVisible();

    // Week-7 matchup 7-1: C- Tier Daddy vs Crashee Rice.
    const row = page.locator('[data-testid="manageable-market-row"][data-matchup-id="7-1"]');
    await expect(row).toBeVisible();
    await expect(row.getByText("Open", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Lock" }).click();
    await expect(row.getByText("Locked", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Reopen" })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).first().click();

    // Matchups list: a "Locked" badge appears (there's exactly one matchup
    // in this state) and its odds buttons are disabled, while a
    // still-open matchup is unaffected.
    await page.goto("/matchups");
    await expect(page.getByText("Locked", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Bet on C- Tier Daddy/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Bet on The TERRYminator/ })).toBeEnabled();

    // Matchup detail page reflects the same locked state. The docked
    // bet-slip rail (desktop-only, `hidden lg:block`) additionally spells
    // this out in words on wide viewports.
    await page.goto("/matchups/7-1");
    await expect(page.getByText("Locked", { exact: true })).toBeVisible();
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await expect(page.getByText("This market is no longer accepting bets.")).toBeVisible();
    }
  });

  test("reopening a locked market re-enables betting", async ({ page }) => {
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Manage Markets" }).click();
    const row = page.locator('[data-testid="manageable-market-row"][data-matchup-id="7-1"]');
    await row.getByRole("button", { name: "Lock" }).click();
    await expect(row.getByRole("button", { name: "Reopen" })).toBeVisible();

    await row.getByRole("button", { name: "Reopen" }).click();
    await expect(row.getByText("Open", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Lock" })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).first().click();
    await page.goto("/matchups");
    await expect(page.getByRole("button", { name: /Bet on C- Tier Daddy/ })).toBeEnabled();
  });

  test("locking a market logs no audit entry (no reason prompt, unlike void)", async ({ page }) => {
    // Locking/unlocking a market is a lightweight toggle, distinct from
    // void (which requires a logged reason) — confirms no dialog/prompt
    // for a reason ever appears on this action.
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Manage Markets" }).click();
    const row = page.locator('[data-testid="manageable-market-row"][data-matchup-id="7-6"]');
    await row.getByRole("button", { name: "Lock" }).click();
    await expect(row.getByRole("button", { name: "Reopen" })).toBeVisible();
    await expect(page.getByLabel("Reason")).toHaveCount(0);
  });
});
