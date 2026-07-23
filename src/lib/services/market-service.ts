import type { BettingMarket } from "@/lib/types";
import { mockMarkets } from "@/lib/mock-data";

export async function getMarketForMatchup(matchupId: string): Promise<BettingMarket | undefined> {
  return mockMarkets.find((m) => m.matchupId === matchupId);
}

export async function getMarketsForWeek(matchupIds: string[]): Promise<BettingMarket[]> {
  return mockMarkets.filter((m) => matchupIds.includes(m.matchupId));
}
