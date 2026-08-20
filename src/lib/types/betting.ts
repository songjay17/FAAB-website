export type MarketStatus = "open" | "locked" | "paused" | "settled";

export type Odds = {
  homeMoneyline: number;
  awayMoneyline: number;
  updatedAt: string;
};

export type BettingMarket = {
  id: string;
  matchupId: string;
  status: MarketStatus;
  odds: Odds;
  totalFaabHome: number;
  totalFaabAway: number;
  /**
   * Betting deadline for this market (the week's first kickoff). Absent
   * when the NFL schedule lookup found no date — such a market has no
   * clock-based deadline. `status` already reflects the clock as served
   * (see effectiveMarketStatus); this is here so the UI can count down.
   */
  lockAt?: string;
};

export type WagerStatus = "open" | "won" | "lost" | "refunded";

export type Wager = {
  id: string;
  reference: string;
  memberId: string;
  marketId: string;
  matchupId: string;
  week: number;
  selectedTeamId: string;
  opponentTeamId: string;
  moneylineAtBet: number;
  stakeFaab: number;
  potentialProfit: number;
  potentialPayout: number;
  finalPayout?: number;
  status: WagerStatus;
  placedAt: string;
  settledAt?: string;
};
