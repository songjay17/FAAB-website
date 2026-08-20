import { loadLeagueData, type LeagueData } from "@/lib/sleeper/load-league-data";

// GET /api/book fires on every page load and window focus; re-running the
// full Sleeper + FantasyPros load (players blob, per-week matchups,
// projections) each time would hammer both APIs for data that changes on a
// weekly cadence. Same module-singleton pattern as players-cache: per
// server instance, cold starts pay one full load.
const TTL_MS = 5 * 60 * 1000;

let cached: { data: LeagueData; at: number } | null = null;
let pending: Promise<LeagueData> | null = null;

export function getLeagueDataCached(): Promise<LeagueData> {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return Promise.resolve(cached.data);
  }
  if (pending) return pending;

  pending = loadLeagueData()
    .then((data) => {
      cached = { data, at: Date.now() };
      pending = null;
      return data;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
}
