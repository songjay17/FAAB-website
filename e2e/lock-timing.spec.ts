import { test, expect } from "./fixtures";

// The shared fixture puts every market's deadline three days out so the
// betting specs stay open. These tests move one matchup's deadline via the
// `book` fixture, proving the clock alone drives the UI — the market locks
// and betting stops with no commissioner action.

const MATCHUP_ID = "7-1";

const inMinutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString();

test.describe("Market lock deadline", () => {
  test("a deadline inside 24h shows a live countdown instead of a date", async ({ page, book }) => {
    book.setLockAt(MATCHUP_ID, inMinutes(3 * 60 + 12));
    await page.goto(`/matchups/${MATCHUP_ID}`);

    await expect(page.getByText(/Locks in 3h \d+m/)).toBeVisible();
  });

  test("a passed deadline locks the market and blocks betting, with no commissioner action", async ({
    page,
    book,
  }) => {
    // The stored status stays "open": the lock must come from the clock, the
    // way a page left open past kickoff would see it.
    book.setLockAt(MATCHUP_ID, inMinutes(-5), "open");
    await page.goto(`/matchups/${MATCHUP_ID}`);

    await expect(page.getByText("Betting closed")).toBeVisible();
    await expect(page.getByText("Locked", { exact: true })).toBeVisible();
    // Both odds buttons are disabled, so the bet slip can't even open.
    const oddsButtons = page.getByRole("button", { name: /^Bet on / });
    await expect(oddsButtons.first()).toBeDisabled();
    await expect(oddsButtons.last()).toBeDisabled();
  });

  test("a far-off deadline still shows the day and time, and betting stays open", async ({
    page,
    book,
  }) => {
    book.setLockAt(MATCHUP_ID, inMinutes(3 * 24 * 60));
    await page.goto(`/matchups/${MATCHUP_ID}`);

    await expect(page.getByText(/Locks \w+day/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Bet on / }).first()).toBeEnabled();
  });

  test("the matchups list locks the passed matchup while its neighbours stay open", async ({
    page,
    book,
  }) => {
    book.setLockAt(MATCHUP_ID, inMinutes(-5), "open");
    await page.goto("/matchups?week=7");

    await expect(page.getByText("Betting closed")).toHaveCount(1);
    // The rest of week 7 is unaffected.
    await expect(page.getByText(/^Locks /).first()).toBeVisible();
  });
});
