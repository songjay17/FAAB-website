import type { League, LeagueMember } from "@/lib/types";

export async function getLeague(league: League): Promise<League> {
  return league;
}

export async function getLeagueMembers(members: LeagueMember[]): Promise<LeagueMember[]> {
  return members;
}

/** Short "where are we in the season" label for topbars — replaces a bare week number that reads as live betting year-round. */
export function seasonStatusLabel(league: League): string {
  if (league.seasonPhase === "complete") return `${league.season} · Final`;
  if (league.seasonPhase === "upcoming") return `${league.season} · Preseason`;
  return `Week ${league.currentWeek}`;
}

export async function getMemberById(
  members: LeagueMember[],
  memberId: string
): Promise<LeagueMember | undefined> {
  return members.find((m) => m.id === memberId);
}
