import type { FantasyTeam } from "@/lib/types";
import { mockTeams } from "@/lib/mock-data";

export async function getTeams(): Promise<FantasyTeam[]> {
  return mockTeams;
}

export async function getTeamById(teamId: string): Promise<FantasyTeam | undefined> {
  return mockTeams.find((t) => t.id === teamId);
}
