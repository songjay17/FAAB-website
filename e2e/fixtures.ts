import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Every spec imports { test, expect } from "./fixtures" instead of
// "@playwright/test": the extended `test` intercepts all Sleeper API and
// /api/projections traffic and serves recorded JSON from e2e/fixtures/.
//
// The app loads live league data in the browser on every page load (see
// SleeperDataProvider), so without this the suite's assertions drift with
// the real league — the recorded 2025 season is now complete
// (last_scored_leg 17, FAAB budgets fully spent), while these tests need
// the frozen mid-season snapshot they were written against: current week 7,
// weeks 1–6 settled, no real waiver spend. Fixtures are patched to that
// state by scripts recording them (league.status "in_season",
// settings.last_scored_leg 7, roster waiver_budget_used 0; nfl-state.json
// frozen to the matching regular-season week 7 — currentWeek now comes from
// /v1/state/nfl, not last_scored_leg).

const FIXTURES_DIR = join(__dirname, "fixtures");

/** Weeks with a recorded matchups fixture — matches last_scored_leg in league.json. */
const RECORDED_WEEKS = 7;

function fixture(name: string) {
  return {
    status: 200,
    contentType: "application/json",
    body: readFileSync(join(FIXTURES_DIR, name), "utf-8"),
  };
}

async function stubLeagueApis(context: BrowserContext) {
  await context.route("https://api.sleeper.app/**", (route) => {
    const { pathname } = new URL(route.request().url());

    const matchups = pathname.match(/^\/v1\/league\/\d+\/matchups\/(\d+)$/);
    if (matchups) {
      const week = Number(matchups[1]);
      if (week >= 1 && week <= RECORDED_WEEKS) {
        return route.fulfill(fixture(`matchups-${week}.json`));
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (/^\/v1\/league\/\d+\/rosters$/.test(pathname)) {
      return route.fulfill(fixture("rosters.json"));
    }
    if (/^\/v1\/league\/\d+\/users$/.test(pathname)) {
      return route.fulfill(fixture("users.json"));
    }
    if (/^\/v1\/league\/\d+$/.test(pathname)) {
      return route.fulfill(fixture("league.json"));
    }
    if (pathname === "/v1/players/nfl") {
      return route.fulfill(fixture("players.json"));
    }
    if (pathname === "/v1/state/nfl") {
      return route.fulfill(fixture("nfl-state.json"));
    }
    if (/^\/schedule\/nfl\/regular\/\d+$/.test(pathname)) {
      return route.fulfill(fixture("schedule.json"));
    }
    // League-rollover successor lookups (resolve-league.ts) — the frozen
    // in-season league has no successor, so any user-leagues query is empty.
    if (/^\/v1\/user\/\d+\/leagues\/nfl\/\d+$/.test(pathname)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    // Fail loudly on anything unstubbed rather than silently hitting the
    // live API — the app surfaces the error state and the test fails there.
    return route.fulfill({ status: 500, body: `No fixture for ${pathname}` });
  });

  await context.route("**/api/projections*", (route) => {
    const position = new URL(route.request().url()).searchParams.get("position");
    return route.fulfill(fixture(`projections-${position}.json`));
  });
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await stubLeagueApis(context);
    await use(context);
  },
});

export { expect, type Page };
