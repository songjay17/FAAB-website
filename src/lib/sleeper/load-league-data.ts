import type { FantasyPlayer, FantasyTeam, League, LeagueMember, WeeklyMatchup } from "@/lib/types";
import { loadProjectionLookup } from "@/lib/fantasypros/projections-service";
import { SLEEPER_LEAGUE_ID } from "./config";
import { fetchMatchups, fetchNflSchedule, fetchRosters, fetchUsers } from "./client";
import { getAllPlayers } from "./players-cache";
import { resolveCurrentLeague } from "./resolve-league";
import {
  buildWeekLockTimes,
  computeRecentForm,
  deriveCurrentWeek,
  mapLeague,
  mapMatchups,
  mapMembers,
  mapRosterPlayers,
  mapTeams,
  mapWaiverSpend,
} from "./mappers";
import type { SleeperMatchupEntry } from "./types";

export type LeagueData = {
  league: League;
  members: LeagueMember[];
  teams: FantasyTeam[];
  matchupsByWeek: Map<number, WeeklyMatchup[]>;
  /** Keyed by FantasyTeam.id (`roster-${roster_id}`). */
  playersByTeam: Record<string, FantasyPlayer[]>;
  /** Keyed by LeagueMember.id — real FAAB spent on Sleeper waiver claims this season. */
  waiverSpendByMemberId: Record<string, number>;
};

/**
 * Orchestrates every Sleeper + FantasyPros call for one league/season and
 * returns a plain data bag — this function doesn't know or care whether its
 * inputs came from a live fetch or (later) a database read, which is what
 * lets a future server-side data layer slot in underneath it without
 * touching callers.
 *
 * `leagueId` is a starting point, not necessarily the league served:
 * resolveCurrentLeague follows previous_league_id renewals forward to the
 * season currently in play.
 */
export async function loadLeagueData(leagueId: string = SLEEPER_LEAGUE_ID): Promise<LeagueData> {
  const { league: sleeperLeague, nflState, upcomingSeason } = await resolveCurrentLeague(leagueId);

  const [rosters, users, allPlayers, scheduleGames] = await Promise.all([
    fetchRosters(sleeperLeague.league_id),
    fetchUsers(sleeperLeague.league_id),
    getAllPlayers(),
    // Undocumented endpoint — if it ever disappears, lock times fall back
    // to the epoch placeholder rather than taking the whole load down.
    fetchNflSchedule(Number(sleeperLeague.season)).catch(() => null),
  ]);
  const lockTimesByWeek = scheduleGames
    ? buildWeekLockTimes(scheduleGames)
    : new Map<number, string>();

  const currentWeek = deriveCurrentWeek(sleeperLeague, nflState);
  const lastScoredWeek = sleeperLeague.settings.last_scored_leg ?? 0;
  // Scored history plus the week being bet on — mid-season that's one week
  // past last_scored_leg (Sleeper serves future weeks' pairings as scheduled).
  const totalWeeksToLoad = Math.max(currentWeek, lastScoredWeek);
  const weekNumbers = Array.from({ length: totalWeeksToLoad }, (_, i) => i + 1);
  const rawMatchupsByWeek = new Map<number, SleeperMatchupEntry[]>();
  const weeklyEntries = await Promise.all(
    weekNumbers.map((week) => fetchMatchups(sleeperLeague.league_id, week))
  );
  weekNumbers.forEach((week, i) => rawMatchupsByWeek.set(week, weeklyEntries[i]));

  const matchupsByWeek = new Map<number, WeeklyMatchup[]>();
  for (const week of weekNumbers) {
    const entries = rawMatchupsByWeek.get(week) ?? [];
    // Epoch placeholder only if the schedule lookup failed (see above).
    const lockAt = lockTimesByWeek.get(week) ?? new Date(0).toISOString();
    matchupsByWeek.set(week, mapMatchups(week, entries, lockAt, week <= lastScoredWeek));
  }

  const projectionLookup = await loadProjectionLookup(Number(sleeperLeague.season), currentWeek);

  const playersByTeam: Record<string, FantasyPlayer[]> = {};
  for (const roster of rosters) {
    playersByTeam[`roster-${roster.roster_id}`] = mapRosterPlayers(
      roster,
      allPlayers,
      projectionLookup
    );
  }

  const teams = mapTeams(rosters, users).map((team) => {
    const rosterId = Number(team.id.replace("roster-", ""));
    return {
      ...team,
      recentForm: computeRecentForm(rosterId, rawMatchupsByWeek, lastScoredWeek).slice(-5),
    };
  });

  return {
    league: mapLeague(sleeperLeague, currentWeek, upcomingSeason),
    members: mapMembers(users, rosters),
    teams,
    matchupsByWeek,
    playersByTeam,
    waiverSpendByMemberId: mapWaiverSpend(rosters),
  };
}
