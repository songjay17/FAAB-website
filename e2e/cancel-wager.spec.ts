import { test, expect } from "@playwright/test";

// Fresh browser context per test = fresh localStorage = seed data
// (see betting-provider.tsx seedState()), same reset mechanism the
// leaderboard/void-wager e2e suites rely on. wager-1 (JHL-70231, "Hurts So
// Good") belongs to the signed-in member and is open on a market seeded
// "open", so it's cancelable by default.

test.describe("Member: expand a wager card and cancel your own open bet", () => {
  test("clicking a wager card expands it to show reference, placed time, and lock status", async ({
    page,
  }) => {
    await page.goto("/bets");
    await expect(page.getByText("JHL-70231")).toHaveCount(0);

    await page.getByRole("button", { name: /Hurts So Good vs Bijan/ }).click();

    await expect(page.getByText("JHL-70231")).toBeVisible();
    await expect(page.getByText("Placed")).toBeVisible();
    await expect(page.getByText(/^(Locks|Locked)$/)).toBeVisible();
  });

  test("cancelling an open, unlocked bet refunds the stake and drops it from Open", async ({
    page,
  }) => {
    await page.goto("/");
    const balanceBeforeText = await page
      .getByText("Available to Bet")
      .locator("..")
      .getByText(/^\d/)
      .innerText();
    const balanceBefore = Number(balanceBeforeText.replace(/,/g, ""));

    await page.goto("/bets");
    await page.getByRole("button", { name: /Hurts So Good vs Bijan/ }).click();

    const cancelTrigger = page.getByRole("button", { name: "Cancel bet" });
    await expect(cancelTrigger).toBeVisible();
    await cancelTrigger.click();

    const confirmDialog = page.getByRole("alertdialog", { name: "Cancel this bet?" });
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.locator("p")).toHaveText(
      "Your 50 FAAB stake on Hurts So Good will be refunded in full. This can't be undone, and you can rebet up until the matchup locks."
    );
    await confirmDialog.getByRole("button", { name: "Cancel bet" }).click();
    await expect(confirmDialog).not.toBeVisible();

    // Stake (50 FAAB) is refunded in full: available balance goes up by
    // exactly the stake, since it was reserved (not deducted from
    // "available") the moment the bet was placed.
    await page.goto("/");
    const balanceLocator = page.getByText("Available to Bet").locator("..").getByText(/^\d/);
    await expect(balanceLocator).toHaveText(
      new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(balanceBefore + 50)
    );

    await expect(page.getByText("JHL-70231")).toHaveCount(0);
    await page.goto("/bets?tab=open");
    await expect(page.getByText("JHL-70231")).toHaveCount(0);
    await page.goto("/bets?tab=refunded");
    await expect(page.getByText("Hurts So Good", { exact: true })).toBeVisible();
  });

  test("a locked matchup's wager has no cancel option, only the commissioner can void it", async ({
    page,
  }) => {
    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Manage Markets" }).click();
    const row = page.getByTestId("manageable-market-row").filter({ hasText: "Hurts So Good vs Bijan Mustard" });
    await row.getByRole("button", { name: "Lock" }).click();
    await expect(row.getByText("Locked", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).first().click();

    await page.goto("/bets");
    await page.getByRole("button", { name: /Hurts So Good vs Bijan/ }).click();

    await expect(page.getByText("Locked", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel bet" })).toHaveCount(0);
  });
});
