import type {
  SleeperLeague,
  SleeperMatchupEntry,
  SleeperPlayersById,
  SleeperRoster,
  SleeperUser,
} from "./types";

const BASE_URL = "https://api.sleeper.app/v1";

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

// ~14.6MB, ~12,200 entries — Sleeper's own guidance is to cache this at most
// once/day, never refetch per-request. See players-cache.ts.
export function fetchAllPlayers(): Promise<SleeperPlayersById> {
  return getJson(`/players/nfl`);
}
