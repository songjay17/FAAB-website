export type FaabWallet = {
  memberId: string;
  totalBudget: number;
  availableFaab: number;
  reservedFaab: number;
  weeklyProfitLoss: number;
  seasonProfitLoss: number;
  /**
   * Real Sleeper waiver-claim FAAB spend as of the last reconciliation
   * (see reconcileWaiverSpend in settlement.ts). Tracked separately from
   * totalBudget/availableFaab so a repeat sync can compute the delta since
   * last time instead of re-deriving the whole balance from scratch.
   */
  sleeperWaiverSpend: number;
};
