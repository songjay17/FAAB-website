import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveCurrentLeague } from "../resolve-league";
import {
  fetchLeague,
  fetchNflState,
  fetchUserLeagues,
  fetchUsers,
} from "../client";
import type { SleeperLeague, SleeperNflState, SleeperUser } from "../types";

vi.mock("../client");

function league(overrides: Partial<SleeperLeague> = {}): SleeperLeague {
  return {
    league_id: "league-2025",
    name: "Test League",
    season: "2025",
    status: "complete",
    previous_league_id: null,
    roster_positions: [],
    metadata: null,
    settings: { playoff_week_start: 15, last_scored_leg: 17, waiver_budget: 100 },
    ...overrides,
  };
}

function user(id: string): SleeperUser {
  return { user_id: id, display_name: id, is_owner: null, metadata: null };
}

const state2026: SleeperNflState = {
  season_type: "pre",
  season: "2026",
  league_season: "2026",
  display_week: 2,
  leg: 0,
  week: 2,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchNflState).mockResolvedValue(state2026);
  vi.mocked(fetchUsers).mockResolvedValue([user("u1"), user("u2")]);
});

describe("resolveCurrentLeague", () => {
  it("stays on an in-season league untouched", async () => {
    const current = league({ status: "in_season", season: "2026", league_id: "league-2026" });
    vi.mocked(fetchLeague).mockResolvedValue(current);

    const resolved = await resolveCurrentLeague("league-2026");
    expect(resolved.league).toBe(current);
    expect(resolved.upcomingSeason).toBeUndefined();
    expect(fetchUserLeagues).not.toHaveBeenCalled();
  });

  it("keeps a completed league but surfaces a successor that hasn't started", async () => {
    const successor = league({
      league_id: "league-2026",
      season: "2026",
      status: "pre_draft",
      previous_league_id: "league-2025",
    });
    vi.mocked(fetchLeague).mockResolvedValue(league());
    vi.mocked(fetchUserLeagues).mockResolvedValue([successor]);

    const resolved = await resolveCurrentLeague("league-2025");
    expect(resolved.league.league_id).toBe("league-2025");
    expect(resolved.upcomingSeason).toBe(2026);
  });

  it("switches to a successor once its season is underway", async () => {
    const successor = league({
      league_id: "league-2026",
      season: "2026",
      status: "in_season",
      previous_league_id: "league-2025",
    });
    vi.mocked(fetchLeague).mockResolvedValue(league());
    vi.mocked(fetchUserLeagues).mockResolvedValue([successor]);

    const resolved = await resolveCurrentLeague("league-2025");
    expect(resolved.league.league_id).toBe("league-2026");
    expect(resolved.upcomingSeason).toBeUndefined();
  });

  it("walks multiple seasons forward to catch up", async () => {
    const l2025 = league({ league_id: "league-2025", season: "2025", status: "complete" });
    const l2026 = league({
      league_id: "league-2026",
      season: "2026",
      status: "complete",
      previous_league_id: "league-2025",
    });
    const l2027 = league({
      league_id: "league-2027",
      season: "2027",
      status: "in_season",
      previous_league_id: "league-2026",
    });
    vi.mocked(fetchNflState).mockResolvedValue({ ...state2026, season: "2027", league_season: "2027" });
    vi.mocked(fetchLeague).mockResolvedValue(l2025);
    vi.mocked(fetchUserLeagues).mockImplementation(async (_userId, season) =>
      season === 2026 ? [l2026] : season === 2027 ? [l2027] : []
    );

    const resolved = await resolveCurrentLeague("league-2025");
    expect(resolved.league.league_id).toBe("league-2027");
  });

  it("stays put when no successor exists yet", async () => {
    vi.mocked(fetchLeague).mockResolvedValue(league());
    vi.mocked(fetchUserLeagues).mockResolvedValue([]);

    const resolved = await resolveCurrentLeague("league-2025");
    expect(resolved.league.league_id).toBe("league-2025");
    expect(resolved.upcomingSeason).toBeUndefined();
  });

  it("tries the next member when one member's league lookup fails", async () => {
    const successor = league({
      league_id: "league-2026",
      season: "2026",
      status: "in_season",
      previous_league_id: "league-2025",
    });
    vi.mocked(fetchLeague).mockResolvedValue(league());
    vi.mocked(fetchUserLeagues)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([successor]);

    const resolved = await resolveCurrentLeague("league-2025");
    expect(resolved.league.league_id).toBe("league-2026");
  });
});
