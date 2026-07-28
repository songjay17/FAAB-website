import { test, expect } from "@playwright/test";

// Fresh browser context per test = fresh localStorage = seed data.
// Seed data has matchups/wagers for weeks 6, 7, 8 only.

test.describe("Leaderboard: browsing a past week", () => {
  test("switching weeks in \"This Week\" mode shows different, real stats", async ({ page }) => {
    await page.goto("/leaderboard?scope=week");
    await expect(page.getByRole("tab", { name: "This Week" })).toHaveAttribute("data-active");
    await expect(page.getByRole("main").getByText("Week 7", { exact: true })).toBeVisible();

    const justinRow = page.locator('[data-testid="leaderboard-row"]:visible').filter({ hasText: "Justin" }).first();
    await expect(justinRow).toBeVisible();
    const week7WinsLosses = await justinRow.getByTestId("wins-losses").innerText();

    await page.getByRole("button", { name: "Previous week" }).click();
    await expect(page).toHaveURL(/week=6/);
    await expect(page.getByRole("main").getByText("Week 6", { exact: true })).toBeVisible();

    const justinRowWeek6 = page.locator('[data-testid="leaderboard-row"]:visible').filter({ hasText: "Justin" }).first();
    await expect(justinRowWeek6).toBeVisible();
    const week6WinsLosses = await justinRowWeek6.getByTestId("wins-losses").innerText();

    // Week 6 has settled wagers, Week 7 does not (all still open) — must differ.
    expect(week6WinsLosses).not.toBe(week7WinsLosses);

    // Lower boundary: week 6 is the earliest seeded week.
    await expect(page.getByRole("button", { name: "Previous week" })).toBeDisabled();
  });

  test("week nav is hidden in Season mode and the chosen week is preserved when switching back", async ({
    page,
  }) => {
    await page.goto("/leaderboard?scope=week&week=6");
    await expect(page.getByRole("main").getByText("Week 6", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Season" }).click();
    await expect(page).toHaveURL(/scope=season/);
    await expect(page.getByRole("button", { name: "Previous week" })).toHaveCount(0);

    await page.getByRole("tab", { name: "This Week" }).click();
    await expect(page).toHaveURL(/week=6/);
    await expect(page.getByRole("main").getByText("Week 6", { exact: true })).toBeVisible();
  });
});

test.describe("My Bets: filtering by week", () => {
  test("defaults to All weeks and narrows results when a week is selected", async ({ page }) => {
    await page.goto("/bets");
    await expect(page.getByRole("combobox", { name: "Filter by week" })).toContainText("All weeks");

    const allWeekCards = page.locator('[class*="grid"] > div').filter({ hasText: "Week" });
    const countBefore = await allWeekCards.count();
    expect(countBefore).toBeGreaterThan(0);

    await page.getByRole("combobox", { name: "Filter by week" }).click();
    await page.getByRole("option", { name: "Week 6" }).click();
    await expect(page).toHaveURL(/week=6/);
    await expect(page.getByRole("combobox", { name: "Filter by week" })).toContainText("Week 6");

    // Every visible wager card must now say "Week 6", never another week.
    const bodyText = await page.locator("main").innerText();
    expect(bodyText).not.toMatch(/Week 7|Week 8/);
  });

  test("week filter persists across status tab switches", async ({ page }) => {
    await page.goto("/bets?week=6");
    await page.getByRole("tab", { name: "Won" }).click();
    await expect(page).toHaveURL(/tab=won/);
    await expect(page).toHaveURL(/week=6/);
    await expect(page.getByRole("combobox", { name: "Filter by week" })).toContainText("Week 6");
  });
});
