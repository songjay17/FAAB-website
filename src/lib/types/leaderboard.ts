export type LeaderboardEntry = {
  rank: number;
  memberId: string;
  displayName: string;
  teamName: string;
  faabBalance: number;
  seasonProfitLoss: number;
  totalWagered: number;
  betsWon: number;
  betsLost: number;
  winPercent: number;
  largestWin: number;
  currentStreak: string;
  /** (profit or loss) / (FAAB staked on won + lost wagers only). 0 when nothing has been decided yet. */
  returnOnWagered: number;
};
