import { test, expect } from "./fixtures";

// Fresh browser context per test = a fresh in-memory StubBook = seed data
// (see e2e/fixtures.ts), the same isolation the rest of the suite relies on.
// Fixture data pins the current week to 7 (real matchups exist for weeks
// 1-7); seeded wagers span weeks 5-7, with week 6 settled and week 7 open.

test.describe("Leaderboard: browsing a past week", () => {
  test("switching weeks in \"This Week\" mode shows different, real stats", async ({ page }) => {
    await page.goto("/leaderboard?scope=week");
    await expect(page.getByRole("tab", { name: "This Week" })).toHaveAttribute("data-active");
    await expect(page.getByRole("main").getByText("Week 7", { exact: true })).toBeVisible();

    const justinRow = page.locator('[data-testid="leaderboard-row"]:visible').filter({ hasText: "jdawnso" }).first();
    await expect(justinRow).toBeVisible();
    const week7WinsLosses = await justinRow.getByTestId("wins-losses").innerText();

    await page.getByRole("button", { name: "Previous week" }).click();
    await expect(page).toHaveURL(/week=6/);
    await expect(page.getByRole("main").getByText("Week 6", { exact: true })).toBeVisible();

    const justinRowWeek6 = page.locator('[data-testid="leaderboard-row"]:visible').filter({ hasText: "jdawnso" }).first();
    await expect(justinRowWeek6).toBeVisible();
    const week6WinsLosses = await justinRowWeek6.getByTestId("wins-losses").innerText();

    // Week 6 has settled wagers, Week 7 does not (all still open) — must differ.
    expect(week6WinsLosses).not.toBe(week7WinsLosses);

    // Lower boundary: week 1 is the earliest week with real matchup data.
    await page.goto("/leaderboard?scope=week&week=1");
    await expect(page.getByRole("main").getByText("Week 1", { exact: true })).toBeVisible();
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
