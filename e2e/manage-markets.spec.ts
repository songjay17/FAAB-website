import { test, expect } from "@playwright/test";

// Fresh browser context per test = fresh localStorage = seed data.
// Week 7 markets are seeded uniformly "open" (see mock-data/markets.ts).

test.describe("Commissioner: open or close a market", () => {
  test("locking a market blocks new bets on that matchup everywhere it's shown", async ({ page }) => {
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Manage Markets" }).click();

    const dialog = page.getByRole("dialog", { name: "Markets" });
    await expect(dialog).toBeVisible();

    const row = page.getByTestId("manageable-market-row").filter({ hasText: "Puka Shells vs CeeDeez Nuts" });
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
    await expect(page.getByRole("button", { name: /Bet on Puka Shells/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Bet on Diggs My Grave/ })).toBeEnabled();

    // Matchup detail page reflects the same locked state. The docked
    // bet-slip rail (desktop-only, `hidden lg:block`) additionally spells
    // this out in words on wide viewports.
    await page.goto("/matchups/matchup-w7-2");
    await expect(page.getByText("Locked", { exact: true })).toBeVisible();
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await expect(page.getByText("This market is no longer accepting bets.")).toBeVisible();
    }
  });

  test("reopening a locked market re-enables betting", async ({ page }) => {
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Manage Markets" }).click();
    const row = page.getByTestId("manageable-market-row").filter({ hasText: "Puka Shells vs CeeDeez Nuts" });
    await row.getByRole("button", { name: "Lock" }).click();
    await expect(row.getByRole("button", { name: "Reopen" })).toBeVisible();

    await row.getByRole("button", { name: "Reopen" }).click();
    await expect(row.getByText("Open", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: "Lock" })).toBeVisible();

    await page.getByRole("button", { name: "Close" }).first().click();
    await page.goto("/matchups");
    await expect(page.getByRole("button", { name: /Bet on Puka Shells/ })).toBeEnabled();
  });

  test("locking a market logs no audit entry (no reason prompt, unlike void)", async ({ page }) => {
    // Locking/unlocking a market is a lightweight toggle, distinct from
    // void (which requires a logged reason) — confirms no dialog/prompt
    // for a reason ever appears on this action.
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Manage Markets" }).click();
    const row = page.getByTestId("manageable-market-row").filter({ hasText: "Hurts So Good vs Bijan Mustard" });
    await row.getByRole("button", { name: "Lock" }).click();
    await expect(row.getByRole("button", { name: "Reopen" })).toBeVisible();
    await expect(page.getByLabel("Reason")).toHaveCount(0);
  });
});
