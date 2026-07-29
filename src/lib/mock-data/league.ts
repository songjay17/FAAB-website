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
  { id: "975162996680945664", displayName: "Justin", teamId: "roster-1", isCommissioner: true },
  { id: "984151623574323200", displayName: "Connor", teamId: "roster-2" },
  { id: "984156047625523200", displayName: "Dave", teamId: "roster-3" },
  { id: "594590141419405312", displayName: "Ravi", teamId: "roster-4" },
  { id: "984230356897337344", displayName: "Mike", teamId: "roster-5" },
  { id: "987034877151293440", displayName: "Alex", teamId: "roster-6" },
  { id: "990743597525831680", displayName: "Sam", teamId: "roster-7" },
  { id: "990745711383805952", displayName: "Tyler", teamId: "roster-8" },
];
