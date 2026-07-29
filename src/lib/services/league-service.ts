import type { League, LeagueMember } from "@/lib/types";

export async function getLeague(league: League): Promise<League> {
  return league;
}

export async function getLeagueMembers(members: LeagueMember[]): Promise<LeagueMember[]> {
  return members;
}

export async function getMemberById(
  members: LeagueMember[],
  memberId: string
): Promise<LeagueMember | undefined> {
  return members.find((m) => m.id === memberId);
}
