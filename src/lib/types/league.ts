export type League = {
  id: string;
  name: string;
  season: number;
  currentWeek: number;
  totalWeeks: number;
  scoringFormat: string;
};

export type LeagueMember = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  teamId: string;
  isCommissioner?: boolean;
};
