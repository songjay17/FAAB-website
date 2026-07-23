import type { League, LeagueMember } from "@/lib/types";

export const mockLeague: League = {
  id: "league-jhulads",
  name: "JHULads",
  season: 2026,
  currentWeek: 7,
  totalWeeks: 17,
  scoringFormat: "PPR · 0.5 PPR TE Premium · Superflex",
};

export const mockMembers: LeagueMember[] = [
  { id: "member-1", displayName: "Justin", teamId: "team-1", isCommissioner: true },
  { id: "member-2", displayName: "Connor", teamId: "team-2" },
  { id: "member-3", displayName: "Dave", teamId: "team-3" },
  { id: "member-4", displayName: "Ravi", teamId: "team-4" },
  { id: "member-5", displayName: "Mike", teamId: "team-5" },
  { id: "member-6", displayName: "Alex", teamId: "team-6" },
  { id: "member-7", displayName: "Sam", teamId: "team-7" },
  { id: "member-8", displayName: "Tyler", teamId: "team-8" },
];

// The signed-in member for this prototype.
export const currentMemberId = "member-1";
