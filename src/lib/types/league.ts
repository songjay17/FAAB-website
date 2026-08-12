export type League = {
  id: string;
  name: string;
  season: number;
  currentWeek: number;
  totalWeeks: number;
  scoringFormat: string;
  /** The real Sleeper league's FAAB waiver budget per team (e.g. 100) — source of truth for FaabWallet.totalBudget. */
  waiverBudget: number;
};

export type LeagueMember = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  teamId: string;
  isCommissioner?: boolean;
};
