import type { BettingMarket, FantasyPlayer, Odds, WeeklyMatchup } from "@/lib/types";
import { getOptimalLineup } from "./optimal-lineup";

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
    // When this line was priced — markets persist to localStorage and are
    // never re-priced (the odds snapshot), so this marks the snapshot time.
    updatedAt: new Date().toISOString(),
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

/**
 * Builds a BettingMarket for every matchup passed in, pricing odds from each
 * team's optimal-lineup projected points (see getOptimalLineup). Shared by
 * both real (Sleeper) and any future mock/test matchup data — the odds math
 * itself doesn't care where the matchups came from.
 */
export function generateMarkets(
  matchups: WeeklyMatchup[],
  playersByTeam: Record<string, FantasyPlayer[]>
): BettingMarket[] {
  return matchups.map((matchup) => {
    const homeRoster = playersByTeam[matchup.homeTeamId] ?? [];
    const awayRoster = playersByTeam[matchup.awayTeamId] ?? [];
    const homeLineup = getOptimalLineup(matchup.homeTeamId, matchup.id, homeRoster);
    const awayLineup = getOptimalLineup(matchup.awayTeamId, matchup.id, awayRoster);

    return {
      id: `market-${matchup.id}`,
      matchupId: matchup.id,
      status: "open",
      odds: projectionToMoneylines(homeLineup.totalProjectedPoints, awayLineup.totalProjectedPoints),
      totalFaabHome: seededPoolAmount(`${matchup.id}-home`, 150, 250),
      totalFaabAway: seededPoolAmount(`${matchup.id}-away`, 120, 220),
    } satisfies BettingMarket;
  });
}
