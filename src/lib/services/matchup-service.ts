import type { FantasyPlayer, ProjectedLineup, WeeklyMatchup } from "@/lib/types";
import { getOptimalLineup } from "@/lib/state/optimal-lineup";

export async function getMatchupsByWeek(
  matchupsByWeek: Map<number, WeeklyMatchup[]>,
  week: number
): Promise<WeeklyMatchup[]> {
  return matchupsByWeek.get(week) ?? [];
}

export async function getMatchupById(
  matchupsByWeek: Map<number, WeeklyMatchup[]>,
  matchupId: string
): Promise<WeeklyMatchup | undefined> {
  for (const weekMatchups of matchupsByWeek.values()) {
    const found = weekMatchups.find((m) => m.id === matchupId);
    if (found) return found;
  }
  return undefined;
}

export async function getProjectedLineup(
  playersByTeam: Record<string, FantasyPlayer[]>,
  teamId: string,
  matchupId: string
): Promise<ProjectedLineup | undefined> {
  const roster = playersByTeam[teamId];
  if (!roster) return undefined;
  return getOptimalLineup(teamId, matchupId, roster);
}

export async function getAvailableWeeks(
  matchupsByWeek: Map<number, WeeklyMatchup[]>
): Promise<number[]> {
  return Array.from(matchupsByWeek.keys())
    .filter((week) => (matchupsByWeek.get(week) ?? []).length > 0)
    .sort((a, b) => a - b);
}
