import type { BettingMarket, Odds } from "@/lib/types";
import { mockLineups, mockMatchups } from "./matchups";

/**
 * Converts a projected-points edge between two teams into a pair of
 * American moneylines (with a small book margin), favorite/underdog.
 */
function projectionToMoneylines(homePts: number, awayPts: number): Odds {
  const spread = homePts - awayPts;
  // Logistic curve mapping point-spread to win probability.
  const homeProb = 1 / (1 + Math.exp(-spread / 9));
  const vig = 0.04;
  const homeImplied = Math.min(0.93, homeProb + vig / 2);
  const awayImplied = Math.min(0.93, 1 - homeProb + vig / 2);

  const toMoneyline = (implied: number) => {
    if (implied >= 0.5) {
      return -Math.round((implied / (1 - implied)) * 100);
    }
    return Math.round(((1 - implied) / implied) * 100);
  };

  return {
    homeMoneyline: toMoneyline(homeImplied),
    awayMoneyline: toMoneyline(awayImplied),
    updatedAt: "2026-07-22T12:00:00.000Z",
  };
}

// Deterministic pseudo-random FAAB pool sizes, seeded per matchup id so
// server and client render identically (avoids hydration mismatch).
function seededPoolAmount(seed: string, base: number, range: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return base + (hash % range);
}

// Week 8 matchups intentionally have no market yet (odds not posted) —
// this is what powers the "matchups not posted" empty state.
export const mockMarkets: BettingMarket[] = mockMatchups
  .filter((m) => m.status === "upcoming" && m.week !== 8)
  .map((matchup) => {
    const homeLineup = mockLineups.find(
      (l) => l.matchupId === matchup.id && l.teamId === matchup.homeTeamId
    );
    const awayLineup = mockLineups.find(
      (l) => l.matchupId === matchup.id && l.teamId === matchup.awayTeamId
    );
    const homePts = homeLineup?.totalProjectedPoints ?? 110;
    const awayPts = awayLineup?.totalProjectedPoints ?? 108;

    return {
      id: `market-${matchup.id}`,
      matchupId: matchup.id,
      status: "open",
      odds: projectionToMoneylines(homePts, awayPts),
      totalFaabHome: seededPoolAmount(`${matchup.id}-home`, 150, 250),
      totalFaabAway: seededPoolAmount(`${matchup.id}-away`, 120, 220),
    } satisfies BettingMarket;
  });
