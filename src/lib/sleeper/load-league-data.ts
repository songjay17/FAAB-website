import type { FantasyPlayer, FantasyTeam, League, LeagueMember, WeeklyMatchup } from "@/lib/types";
import { loadProjectionLookup } from "@/lib/fantasypros/projections-service";
import { SLEEPER_LEAGUE_ID, SLEEPER_SEASON } from "./config";
import { fetchLeague, fetchMatchups, fetchRosters, fetchUsers } from "./client";
import { getAllPlayers } from "./players-cache";
import {
  computeRecentForm,
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
 */
export async function loadLeagueData(leagueId: string = SLEEPER_LEAGUE_ID): Promise<LeagueData> {
  const [sleeperLeague, rosters, users, allPlayers] = await Promise.all([
    fetchLeague(leagueId),
    fetchRosters(leagueId),
    fetchUsers(leagueId),
    getAllPlayers(),
  ]);

  const totalWeeks = sleeperLeague.settings.last_scored_leg || 17;
  const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  const rawMatchupsByWeek = new Map<number, SleeperMatchupEntry[]>();
  const weeklyEntries = await Promise.all(weekNumbers.map((week) => fetchMatchups(leagueId, week)));
  weekNumbers.forEach((week, i) => rawMatchupsByWeek.set(week, weeklyEntries[i]));

  const matchupsByWeek = new Map<number, WeeklyMatchup[]>();
  for (const week of weekNumbers) {
    const entries = rawMatchupsByWeek.get(week) ?? [];
    // Placeholder — this completed season has no real lock times to fetch;
    // the type requires a string.
    const lockAt = new Date(0).toISOString();
    matchupsByWeek.set(week, mapMatchups(week, entries, lockAt));
  }

  const projectionLookup = await loadProjectionLookup(SLEEPER_SEASON, totalWeeks);

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
      recentForm: computeRecentForm(rosterId, rawMatchupsByWeek, totalWeeks).slice(-5),
    };
  });

  return {
    league: mapLeague(sleeperLeague),
    members: mapMembers(users, rosters),
    teams,
    matchupsByWeek,
    playersByTeam,
    waiverSpendByMemberId: mapWaiverSpend(rosters),
  };
}
