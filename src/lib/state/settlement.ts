import type { FaabWallet, Wager, WeeklyMatchup } from "@/lib/types";
import { calculatePayout } from "@/lib/odds";

export type SettlementSkipReason =
  | "matchup-not-found"
  | "matchup-not-final"
  | "missing-final-score"
  | "team-not-in-matchup";

export type SettlementSkip = {
  wagerId: string;
  reference: string;
  reason: SettlementSkipReason;
};

export type SettlementResult = {
  week: number;
  processed: number;
  won: number;
  lost: number;
  refunded: number;
  totalPaidOut: number;
  skipped: SettlementSkip[];
  updatedWallet: FaabWallet;
  /** Present only when at least one wager changed; null means nothing to settle. */
  updatedWagers: Wager[] | null;
};

function emptyResult(week: number, wallet: FaabWallet): SettlementResult {
  return {
    week,
    processed: 0,
    won: 0,
    lost: 0,
    refunded: 0,
    totalPaidOut: 0,
    skipped: [],
    updatedWallet: wallet,
    updatedWagers: null,
  };
}

/**
 * Settles all open wagers for a given week against final matchup scores.
 * Pure function: takes current state, returns the next state plus a summary.
 * Only ever reads `open` wagers, so calling this again on an already-settled
 * week is a no-op — safe to invoke repeatedly (e.g. a repeated button click).
 */
export function settleWagersForWeek(input: {
  week: number;
  wallet: FaabWallet;
  wagers: Wager[];
  matchups: WeeklyMatchup[];
}): SettlementResult {
  const { week, wallet, wagers, matchups } = input;
  const openWagers = wagers.filter((w) => w.week === week && w.status === "open");

  if (openWagers.length === 0) {
    return emptyResult(week, wallet);
  }

  const matchupsById = new Map(matchups.map((m) => [m.id, m]));

  let availableFaab = wallet.availableFaab;
  let reservedFaab = wallet.reservedFaab;
  let weeklyProfitLoss = wallet.weeklyProfitLoss;
  let seasonProfitLoss = wallet.seasonProfitLoss;

  let won = 0;
  let lost = 0;
  let refunded = 0;
  let totalPaidOut = 0;
  const skipped: SettlementSkip[] = [];
  const settled: Wager[] = [];
  const settledAt = new Date().toISOString();

  for (const wager of openWagers) {
    const matchup = matchupsById.get(wager.matchupId);

    if (!matchup) {
      skipped.push({ wagerId: wager.id, reference: wager.reference, reason: "matchup-not-found" });
      continue;
    }
    if (matchup.status !== "final") {
      skipped.push({ wagerId: wager.id, reference: wager.reference, reason: "matchup-not-final" });
      continue;
    }
    if (matchup.homeScore === undefined || matchup.awayScore === undefined) {
      skipped.push({ wagerId: wager.id, reference: wager.reference, reason: "missing-final-score" });
      continue;
    }
    if (
      wager.selectedTeamId !== matchup.homeTeamId &&
      wager.selectedTeamId !== matchup.awayTeamId
    ) {
      skipped.push({ wagerId: wager.id, reference: wager.reference, reason: "team-not-in-matchup" });
      continue;
    }

    // Every open wager reserves its stake at placement time; settling always
    // releases exactly that reservation, regardless of outcome.
    reservedFaab = Math.max(0, reservedFaab - wager.stakeFaab);

    if (matchup.homeScore === matchup.awayScore) {
      const finalPayout = wager.stakeFaab;
      availableFaab += finalPayout;
      settled.push({ ...wager, status: "refunded", finalPayout, settledAt });
      refunded += 1;
      totalPaidOut += finalPayout;
      continue;
    }

    const winningTeamId = matchup.homeScore > matchup.awayScore ? matchup.homeTeamId : matchup.awayTeamId;

    if (wager.selectedTeamId === winningTeamId) {
      const finalPayout = Math.round(calculatePayout(wager.stakeFaab, wager.moneylineAtBet) * 100) / 100;
      availableFaab += finalPayout;
      weeklyProfitLoss += finalPayout - wager.stakeFaab;
      seasonProfitLoss += finalPayout - wager.stakeFaab;
      settled.push({ ...wager, status: "won", finalPayout, settledAt });
      won += 1;
      totalPaidOut += finalPayout;
    } else {
      weeklyProfitLoss += -wager.stakeFaab;
      seasonProfitLoss += -wager.stakeFaab;
      settled.push({ ...wager, status: "lost", finalPayout: 0, settledAt });
      lost += 1;
    }
  }

  if (settled.length === 0) {
    return { ...emptyResult(week, wallet), skipped };
  }

  return {
    week,
    processed: settled.length,
    won,
    lost,
    refunded,
    totalPaidOut: Math.round(totalPaidOut * 100) / 100,
    skipped,
    updatedWallet: {
      ...wallet,
      availableFaab: Math.max(0, Math.round(availableFaab * 100) / 100),
      reservedFaab: Math.max(0, Math.round(reservedFaab * 100) / 100),
      weeklyProfitLoss: Math.round(weeklyProfitLoss * 100) / 100,
      seasonProfitLoss: Math.round(seasonProfitLoss * 100) / 100,
    },
    updatedWagers: settled,
  };
}
