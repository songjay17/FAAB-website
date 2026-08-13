import { test, expect } from "./fixtures";

// Fresh browser context per test = fresh localStorage = seed data
// (see betting-provider.tsx seedState()), same reset mechanism the
// leaderboard/void-wager e2e suites rely on. wager-1 (JHL-70231, "Puka di
// Beppo") belongs to the signed-in member and is open, so it's a good fixture
// for expand-to-see-detail — but it was "placed" days ago in seed data, so
// it's outside the 5-minute self-cancel grace window (see
// SELF_CANCEL_WINDOW_MS in betting-provider.tsx) and has no Cancel button.
// Testing an actual cancel requires placing a fresh bet in the test itself.

test.describe("Member: expand a wager card and cancel your own open bet", () => {
  test("clicking a wager card expands it to show reference, placed time, and lock status", async ({
    page,
  }) => {
    await page.goto("/bets");
    await expect(page.getByText("JHL-70231")).toHaveCount(0);

    await page.getByRole("button", { name: /Puka di Beppo vs The Flying/ }).click();

    await expect(page.getByText("JHL-70231")).toBeVisible();
    await expect(page.getByText("Placed")).toBeVisible();
    await expect(page.getByText(/^(Locks|Locked)$/)).toBeVisible();
  });

  test("a bet placed days ago (seed data) is outside the grace window and has no cancel option", async ({
    page,
  }) => {
    await page.goto("/bets");
    await page.getByRole("button", { name: /Puka di Beppo vs The Flying/ }).click();

    await expect(page.getByText("JHL-70231")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel bet" })).toHaveCount(0);
  });

  test("cancelling a freshly-placed bet within the grace window refunds the stake and drops it from Open", async ({
    page,
  }) => {
    await page.goto("/");
    const balanceBeforeText = await page
      .getByText("Available to Bet")
      .locator("..")
      .getByText(/^\d/)
      .innerText();
    const balanceBefore = Number(balanceBeforeText.replace(/,/g, ""));

    // Place a fresh bet so it's within the self-cancel grace window.
    await page.goto("/matchups");
    await page.getByRole("link", { name: /Crashee Rice/ }).click();
    const oddsButtons = page.getByRole("button", { name: /^Bet on/ });
    await expect(oddsButtons.first()).toBeVisible();
    await oddsButtons.first().click();
    await expect(page.getByRole("heading", { name: "Bet Slip" })).toBeVisible();
    await page.getByLabel("Stake (FAAB)").fill("10");
    await page.getByRole("button", { name: "Confirm Bet" }).click();
    await expect(page.getByRole("heading", { name: "Bet Placed" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "View in My Bets" }).click();

    await page.getByRole("button", { name: /C- Tier Daddy/ }).click();

    const cancelTrigger = page.getByRole("button", { name: "Cancel bet" });
    await expect(cancelTrigger).toBeVisible();
    await cancelTrigger.click();

    const confirmDialog = page.getByRole("alertdialog", { name: "Cancel this bet?" });
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.locator("p")).toContainText(
      "Your 10 FAAB stake on"
    );
    await expect(confirmDialog.locator("p")).toContainText(
      "will be refunded in full"
    );
    await confirmDialog.getByRole("button", { name: "Cancel bet" }).click();
    await expect(confirmDialog).not.toBeVisible();

    // Stake (10 FAAB) is refunded in full: available balance returns to
    // exactly what it was before the bet was placed (reserved, then
    // released — net zero across place-then-cancel).
    await page.goto("/");
    const balanceLocator = page.getByText("Available to Bet").locator("..").getByText(/^\d/);
    await expect(balanceLocator).toHaveText(
      new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(balanceBefore)
    );

    await page.goto("/bets?tab=open");
    await expect(page.getByRole("button", { name: /C- Tier Daddy/ })).toHaveCount(0);
    await page.goto("/bets?tab=refunded");
    await expect(page.getByRole("button", { name: /C- Tier Daddy/ })).toBeVisible();
  });

  test("a locked matchup's wager has no cancel option, only the commissioner can void it", async ({
    page,
  }) => {
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Manage Markets" }).click();
    // wager-1's matchup (7-4, Puka di Beppo vs The Flying Dutchman).
    const row = page.locator('[data-testid="manageable-market-row"][data-matchup-id="7-4"]');
    await row.getByRole("button", { name: "Lock" }).click();
    await expect(row.getByText("Locked", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).first().click();

    await page.goto("/bets");
    await page.getByRole("button", { name: /Puka di Beppo vs The Flying/ }).click();

    await expect(page.getByText("Locked", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel bet" })).toHaveCount(0);
  });
});
