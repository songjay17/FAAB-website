import type { FantasyTeam } from "@/lib/types";

export async function getTeams(teams: FantasyTeam[]): Promise<FantasyTeam[]> {
  return teams;
}

export async function getTeamById(
  teams: FantasyTeam[],
  teamId: string
): Promise<FantasyTeam | undefined> {
  return teams.find((t) => t.id === teamId);
}
