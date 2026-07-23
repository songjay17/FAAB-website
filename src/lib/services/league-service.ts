import type { League, LeagueMember } from "@/lib/types";
import { mockLeague, mockMembers } from "@/lib/mock-data";

export async function getLeague(): Promise<League> {
  return mockLeague;
}

export async function getLeagueMembers(): Promise<LeagueMember[]> {
  return mockMembers;
}

export async function getMemberById(memberId: string): Promise<LeagueMember | undefined> {
  return mockMembers.find((m) => m.id === memberId);
}
