import { describe, expect, it } from "vitest";
import { buildWeekLockTimes, deriveCurrentWeek, mapLeague, mapSeasonPhase } from "../mappers";
import type { SleeperLeague, SleeperNflState, SleeperScheduleGame } from "../types";

type LeagueOverrides = Omit<Partial<SleeperLeague>, "settings"> & {
  settings?: Partial<SleeperLeague["settings"]>;
};

function league(overrides: LeagueOverrides = {}): SleeperLeague {
  return {
    league_id: "league-1",
    name: "Test League",
    season: "2025",
    status: "in_season",
    previous_league_id: null,
    roster_positions: [],
    metadata: null,
    ...overrides,
    settings: {
      playoff_week_start: 15,
      last_scored_leg: 7,
      waiver_budget: 100,
      ...overrides.settings,
    },
  };
}

function nflState(overrides: Partial<SleeperNflState> = {}): SleeperNflState {
  return {
    season_type: "regular",
    season: "2025",
    league_season: "2025",
    display_week: 7,
    leg: 7,
    week: 7,
    ...overrides,
  };
}

describe("deriveCurrentWeek", () => {
  it("uses the NFL display week for an in-season league", () => {
    expect(deriveCurrentWeek(league(), nflState({ display_week: 9, leg: 8 }))).toBe(9);
  });

  it("clamps NFL week 18 to the league's final week", () => {
    expect(
      deriveCurrentWeek(league(), nflState({ display_week: 18, leg: 18 }))
    ).toBe(17);
  });

  it("pins a complete season to its last scored week, not the live NFL clock", () => {
    expect(
      deriveCurrentWeek(
        league({ status: "complete", settings: { last_scored_leg: 17 } }),
        nflState({ season_type: "pre", league_season: "2026", display_week: 2 })
      )
    ).toBe(17);
  });

  it("falls back to the final week for a complete season missing last_scored_leg", () => {
    expect(
      deriveCurrentWeek(league({ status: "complete", settings: { last_scored_leg: null } }), nflState())
    ).toBe(17);
  });

  it("treats a pre-draft league as heading into week 1", () => {
    expect(
      deriveCurrentWeek(
        league({ status: "pre_draft", season: "2026", settings: { last_scored_leg: null } }),
        nflState({ season_type: "pre", season: "2026", league_season: "2026", display_week: 2, leg: 0 })
      )
    ).toBe(1);
  });

  it("treats a drafted league waiting on kickoff as week 1, not the preseason display week", () => {
    expect(
      deriveCurrentWeek(
        league({ season: "2026", settings: { last_scored_leg: null } }),
        nflState({ season_type: "pre", season: "2026", league_season: "2026", display_week: 3, leg: 0 })
      )
    ).toBe(1);
  });

  it("falls back to last_scored_leg when the NFL state describes a different season", () => {
    expect(
      deriveCurrentWeek(league(), nflState({ season: "2026", league_season: "2026", display_week: 1 }))
    ).toBe(7);
  });
});

describe("buildWeekLockTimes", () => {
  function game(week: number, date: string): SleeperScheduleGame {
    return { game_id: `${week}-${date}`, week, date, status: "pre_game", home: "A", away: "B" };
  }

  it("locks each week at 13:00 UTC on its earliest game day", () => {
    const lockTimes = buildWeekLockTimes([
      game(1, "2026-09-13"),
      game(1, "2026-09-10"), // Thursday opener, listed out of order
      game(1, "2026-09-14"),
      game(2, "2026-09-20"),
    ]);
    expect(lockTimes.get(1)).toBe("2026-09-10T13:00:00.000Z");
    expect(lockTimes.get(2)).toBe("2026-09-20T13:00:00.000Z");
    expect(lockTimes.get(3)).toBeUndefined();
  });
});

describe("mapSeasonPhase", () => {
  it.each([
    ["pre_draft", "upcoming"],
    ["drafting", "upcoming"],
    ["in_season", "in_season"],
    ["complete", "complete"],
  ])("maps %s to %s", (status, phase) => {
    expect(mapSeasonPhase(league({ status }))).toBe(phase);
  });
});

describe("mapLeague", () => {
  it("names the champion team only once the season is complete", () => {
    const withChampion = league({
      status: "complete",
      metadata: { latest_league_winner_roster_id: "3" },
    });
    expect(mapLeague(withChampion, 17).championTeamId).toBe("roster-3");

    // Mid-season, latest_league_winner names *last* year's champion.
    const midSeason = league({ metadata: { latest_league_winner_roster_id: "3" } });
    expect(mapLeague(midSeason, 7).championTeamId).toBeUndefined();
  });

  it("carries the upcoming season through", () => {
    const mapped = mapLeague(league({ status: "complete" }), 17, 2026);
    expect(mapped.upcomingSeason).toBe(2026);
    expect(mapped.seasonPhase).toBe("complete");
  });
});
