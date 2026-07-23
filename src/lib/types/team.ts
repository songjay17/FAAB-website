export type PlayerPosition = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";

export type FantasyPlayer = {
  id: string;
  name: string;
  position: PlayerPosition;
  nflTeam: string;
  projectedPoints: number;
};

export type TeamRecord = {
  wins: number;
  losses: number;
  ties: number;
};

export type FantasyTeam = {
  id: string;
  ownerMemberId: string;
  name: string;
  logoEmoji: string;
  record: TeamRecord;
  pointsFor: number;
  pointsAgainst: number;
  recentForm: Array<"W" | "L">;
};
