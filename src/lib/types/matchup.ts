import type { FantasyPlayer } from "./team";

export type MatchupResultStatus = "upcoming" | "live" | "final";

export type WeeklyMatchup = {
  id: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  lockAt: string;
  status: MatchupResultStatus;
  homeScore?: number;
  awayScore?: number;
};

export type LineupSlot = {
  slot: string;
  player: FantasyPlayer;
};

export type ProjectedLineup = {
  teamId: string;
  matchupId: string;
  slots: LineupSlot[];
  totalProjectedPoints: number;
};
