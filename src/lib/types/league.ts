/**
 * Where the league's season stands: "upcoming" (created but not played —
 * Sleeper pre_draft/drafting), "in_season", or "complete". Betting is only
 * open in_season; the other two phases get a season-status experience
 * instead of a live book.
 */
export type SeasonPhase = "upcoming" | "in_season" | "complete";

export type League = {
  id: string;
  name: string;
  season: number;
  currentWeek: number;
  totalWeeks: number;
  scoringFormat: string;
  /** The real Sleeper league's FAAB waiver budget per team (e.g. 100) — source of truth for FaabWallet.totalBudget. */
  waiverBudget: number;
  seasonPhase: SeasonPhase;
  /** FantasyTeam.id of the season champion — only set once the season is complete. */
  championTeamId?: string;
  /** Next season's year when its Sleeper league exists but hasn't started yet. */
  upcomingSeason?: number;
};

export type LeagueMember = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  teamId: string;
  isCommissioner?: boolean;
};
