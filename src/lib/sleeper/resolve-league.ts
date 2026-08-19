import { fetchLeague, fetchNflState, fetchUserLeagues, fetchUsers } from "./client";
import type { SleeperLeague, SleeperNflState } from "./types";

// Sleeper has no "successor league" endpoint — the forward link only exists
// as previous_league_id on the *new* league. The only way to find it is to
// list a member's leagues for the next season and match on that field, so we
// try a few members (a renewed league carries its members over; the first
// one tried almost always hits) without fanning out to all 14.
const MAX_MEMBER_LOOKUPS = 5;

export type ResolvedLeague = {
  league: SleeperLeague;
  nflState: SleeperNflState;
  /** Set when next season's league exists but hasn't started (pre_draft/drafting) — we stay on `league`. */
  upcomingSeason?: number;
};

async function findSuccessor(league: SleeperLeague, season: number): Promise<SleeperLeague | null> {
  const users = await fetchUsers(league.league_id);
  for (const user of users.slice(0, MAX_MEMBER_LOOKUPS)) {
    let candidates: SleeperLeague[];
    try {
      candidates = await fetchUserLeagues(user.user_id, season);
    } catch {
      continue; // this member's lookup failed; another member can still find it
    }
    const successor = candidates.find((l) => l.previous_league_id === league.league_id);
    if (successor) return successor;
  }
  return null;
}

/**
 * Follows the configured league forward to the season currently in play.
 * Sleeper mints a new league_id every season, so a stored id goes stale each
 * year; this walks the previous_league_id chain (one hop per completed
 * season, so it also catches up across multiple missed years) and lands on
 * the newest league that has actually started. A successor still in
 * pre_draft/drafting isn't switched to — its rosters are empty and it has no
 * schedule — but is surfaced as `upcomingSeason` so the UI can say the new
 * season is on its way.
 */
export async function resolveCurrentLeague(configuredId: string): Promise<ResolvedLeague> {
  const [nflState, configuredLeague] = await Promise.all([
    fetchNflState(),
    fetchLeague(configuredId),
  ]);
  let league = configuredLeague;
  const targetSeason = Number(nflState.league_season);

  while (league.status === "complete" && Number(league.season) < targetSeason) {
    const successor = await findSuccessor(league, Number(league.season) + 1);
    if (!successor) break;
    if (successor.status === "pre_draft" || successor.status === "drafting") {
      return { league, nflState, upcomingSeason: Number(successor.season) };
    }
    league = successor;
  }
  return { league, nflState };
}
