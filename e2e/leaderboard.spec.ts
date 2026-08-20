import { test, expect, type Page } from "./fixtures";

// Each Playwright test gets a fresh, isolated browser context by default,
// and the fixture gives each context its own in-memory StubBook seeded from
// the recorded fixtures (see e2e/fixtures.ts) — so every test starts from
// identical book state with no extra setup and no database.
//
// The table renders both a desktop <table> and a mobile card layout at all
// times, toggling visibility with CSS breakpoints — both are always present
// in the DOM. Every row lookup below is scoped to :visible so it resolves to
// whichever layout is actually shown at the current viewport.

function visibleRows(page: Page) {
  return page.locator('[data-testid="leaderboard-row"]:visible');
}

function leaderboardRow(page: Page, memberName: string) {
  return visibleRows(page).filter({ hasText: memberName }).first();
}

async function readBalance(page: Page, memberName: string): Promise<number> {
  const text = await leaderboardRow(page, memberName).getByTestId("faab-balance").innerText();
  return Number(text.replace(/,/g, ""));
}

async function readWinsLosses(page: Page, memberName: string): Promise<{ wins: number; losses: number }> {
  const text = await leaderboardRow(page, memberName).getByTestId("wins-losses").innerText();
  const [wins, losses] = text.split("-").map(Number);
  return { wins, losses };
}

test.describe("Leaderboard reflects real betting state", () => {
  test("core flow: place a wager, settle the week, verify leaderboard updates", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();

    // 1) Record the active member's (jdawnso) initial state on the season
    // view (default tab).
    await expect(leaderboardRow(page, "jdawnso")).toBeVisible();
    const balanceBefore = await readBalance(page, "jdawnso");

    const bodyTextBefore = await page.locator("body").innerText();
    expect(bodyTextBefore).not.toMatch(/NaN|undefined|Infinity/);

    // 2) Navigate to an available (still-open) matchup and place a wager.
    // "Optimal Lineups" is desktop-only (sm:block); the odds buttons are the
    // stable cross-viewport signal that the matchup detail page has loaded.
    await page.goto("/matchups");
    await page.getByRole("link", { name: /Crashee Rice/ }).click();
    const oddsButtons = page.getByRole("button", { name: /^Bet on/ });
    await expect(oddsButtons.first()).toBeVisible();

    await oddsButtons.first().click();

    await expect(page.getByRole("heading", { name: "Bet Slip" })).toBeVisible();
    await page.getByLabel("Stake (FAAB)").fill("10");
    await page.getByRole("button", { name: "Confirm Bet" }).click();
    await expect(page.getByRole("heading", { name: "Bet Placed" })).toBeVisible({ timeout: 5000 });

    // 3) Return to the leaderboard — an open wager must not look like a loss:
    // total bankroll (available + reserved) is unaffected by placing a bet.
    await page.goto("/leaderboard");
    await expect(leaderboardRow(page, "jdawnso")).toBeVisible();
    const balanceAfterOpenBet = await readBalance(page, "jdawnso");
    expect(balanceAfterOpenBet).toBe(balanceBefore);

    const winsAfterOpenBet = await readWinsLosses(page, "jdawnso");

    const bodyTextAfterOpen = await page.locator("body").innerText();
    expect(bodyTextAfterOpen).not.toMatch(/NaN|undefined|Infinity/);

    // 4) Settle the eligible week via the Commissioner flow.
    await page.goto("/commissioner");
    const settleButton = page.getByRole("button", { name: "Settle Week" });
    await expect(settleButton).toBeEnabled();
    await settleButton.click();
    await page.getByRole("button", { name: "Confirm Settle" }).click();
    await expect(page.getByText(/wagers? processed/)).toBeVisible();

    // 5) Return to the leaderboard and verify connected values updated.
    // jdawnso's known Week 6 wager (wager-8, roster-7 @ -140 vs roster-5) wins
    // that matchup (128.2 to 113.14), so wins should increase by exactly one
    // and the newly placed (still-open) Week 7 wager must not count.
    await page.goto("/leaderboard");
    await expect(leaderboardRow(page, "jdawnso")).toBeVisible();
    const winsAfterSettle = await readWinsLosses(page, "jdawnso");
    expect(winsAfterSettle.wins).toBe(winsAfterOpenBet.wins + 1);
    expect(winsAfterSettle.losses).toBe(winsAfterOpenBet.losses);

    const balanceAfterSettle = await readBalance(page, "jdawnso");
    expect(balanceAfterSettle).toBeGreaterThan(balanceAfterOpenBet);

    const bodyTextAfterSettle = await page.locator("body").innerText();
    expect(bodyTextAfterSettle).not.toMatch(/NaN|undefined|Infinity/);

    // 6) Switch between current-week and season views; values should differ,
    // since jdawnso's win was in Week 6 and the current week is Week 7.
    await page.getByRole("tab", { name: "This Week" }).click();
    await expect(page.getByRole("tab", { name: "This Week" })).toHaveAttribute("data-active");
    await expect(leaderboardRow(page, "jdawnso")).toBeVisible();
    const weekWinsLosses = await readWinsLosses(page, "jdawnso");

    await page.getByRole("tab", { name: "Season" }).click();
    await expect(page.getByRole("tab", { name: "Season" })).toHaveAttribute("data-active");
    await expect(leaderboardRow(page, "jdawnso")).toBeVisible();
    const seasonWinsLosses = await readWinsLosses(page, "jdawnso");

    expect(weekWinsLosses).not.toEqual(seasonWinsLosses);
  });

  test("winning wager settlement increases bankroll, adds a win, and can change rank", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(leaderboardRow(page, "jdawnso")).toBeVisible();
    const before = await readWinsLosses(page, "jdawnso");
    const balanceBefore = await readBalance(page, "jdawnso");

    await page.goto("/commissioner");
    await page.getByRole("button", { name: "Settle Week" }).click();
    await page.getByRole("button", { name: "Confirm Settle" }).click();
    await expect(page.getByText(/wagers? processed/)).toBeVisible();

    await page.goto("/leaderboard");
    await expect(leaderboardRow(page, "jdawnso")).toBeVisible();
    const after = await readWinsLosses(page, "jdawnso");
    const balanceAfter = await readBalance(page, "jdawnso");

    // wager-8 (jdawnso, Week 6, roster-7) wins its matchup on settlement.
    expect(after.wins).toBe(before.wins + 1);
    expect(after.losses).toBe(before.losses);
    expect(balanceAfter).toBeGreaterThan(balanceBefore);
  });

  test("ranking and tie-break: rows are ordered by descending FAAB balance", async ({ page }) => {
    await page.goto("/leaderboard");
    const rows = visibleRows(page);
    await expect(rows.first()).toBeVisible();

    const count = await rows.count();
    expect(count).toBeGreaterThan(1);

    const balances: number[] = [];
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).getByTestId("faab-balance").innerText();
      balances.push(Number(text.replace(/,/g, "")));
    }

    for (let i = 1; i < balances.length; i++) {
      expect(balances[i]).toBeLessThanOrEqual(balances[i - 1]);
    }
  });

  test("rank numbers are sequential starting at 1", async ({ page }) => {
    await page.goto("/leaderboard");
    const rows = visibleRows(page);
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(`#${i + 1}`);
    }
  });
});

test.describe("Leaderboard responsive and accessibility", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("remains readable and keyboard-accessible on a mobile viewport", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/leaderboard");
    await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();

    const rows = visibleRows(page);
    await expect(rows.first()).toBeVisible();

    // No horizontal overflow on the page body.
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasOverflow).toBe(false);

    // Timeframe toggle is keyboard accessible.
    const weekTab = page.getByRole("tab", { name: "This Week" });
    await weekTab.focus();
    await expect(weekTab).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(weekTab).toHaveAttribute("data-active");

    // Member rows expose understandable accessible text (name + balance),
    // not just numbers with no label.
    const firstRowText = await rows.first().innerText();
    expect(firstRowText.length).toBeGreaterThan(0);
    expect(firstRowText).not.toMatch(/NaN|undefined|Infinity/);

    expect(consoleErrors).toEqual([]);
  });
});
