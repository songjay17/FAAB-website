import type {
  SleeperLeague,
  SleeperMatchupEntry,
  SleeperNflState,
  SleeperPlayersById,
  SleeperScheduleGame,
  SleeperRoster,
  SleeperUser,
} from "./types";

const ORIGIN = "https://api.sleeper.app";
const BASE_URL = `${ORIGIN}/v1`;

export class SleeperApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "SleeperApiError";
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new SleeperApiError(`Sleeper request failed: ${path} (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export function fetchLeague(leagueId: string): Promise<SleeperLeague> {
  return getJson(`/league/${leagueId}`);
}

export function fetchRosters(leagueId: string): Promise<SleeperRoster[]> {
  return getJson(`/league/${leagueId}/rosters`);
}

export function fetchUsers(leagueId: string): Promise<SleeperUser[]> {
  return getJson(`/league/${leagueId}/users`);
}

export function fetchMatchups(leagueId: string, week: number): Promise<SleeperMatchupEntry[]> {
  return getJson(`/league/${leagueId}/matchups/${week}`);
}

export function fetchNflState(): Promise<SleeperNflState> {
  return getJson(`/state/nfl`);
}

/**
 * The real NFL regular-season schedule (game dates, no kickoff times). Not
 * under /v1 like everything else — this endpoint is undocumented, so callers
 * must treat a failure here as expected and degrade gracefully.
 */
export async function fetchNflSchedule(season: number): Promise<SleeperScheduleGame[]> {
  const res = await fetch(`${ORIGIN}/schedule/nfl/regular/${season}`);
  if (!res.ok) {
    throw new SleeperApiError(
      `Sleeper request failed: /schedule/nfl/regular/${season} (${res.status})`,
      res.status
    );
  }
  return res.json() as Promise<SleeperScheduleGame[]>;
}

/** Every league a user is in for one season — full SleeperLeague objects, settings included. */
export function fetchUserLeagues(userId: string, season: number): Promise<SleeperLeague[]> {
  return getJson(`/user/${userId}/leagues/nfl/${season}`);
}

// ~14.6MB, ~12,200 entries — Sleeper's own guidance is to cache this at most
// once/day, never refetch per-request. See players-cache.ts.
export function fetchAllPlayers(): Promise<SleeperPlayersById> {
  return getJson(`/players/nfl`);
}
