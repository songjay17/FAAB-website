import type { ProjectedLineup, WeeklyMatchup } from "@/lib/types";
import { mockLineups, mockMatchups } from "@/lib/mock-data";

export async function getMatchupsByWeek(week: number): Promise<WeeklyMatchup[]> {
  return mockMatchups.filter((m) => m.week === week);
}

export async function getMatchupById(matchupId: string): Promise<WeeklyMatchup | undefined> {
  return mockMatchups.find((m) => m.id === matchupId);
}

export async function getProjectedLineup(
  teamId: string,
  matchupId: string
): Promise<ProjectedLineup | undefined> {
  return mockLineups.find((l) => l.teamId === teamId && l.matchupId === matchupId);
}

export async function getAvailableWeeks(): Promise<number[]> {
  return Array.from(new Set(mockMatchups.map((m) => m.week))).sort((a, b) => a - b);
}
