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
