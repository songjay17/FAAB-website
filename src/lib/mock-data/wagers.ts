import type { Wager } from "@/lib/types";
import { calculatePayout, calculateProfit } from "@/lib/odds";

function makeWager(input: {
  id: string;
  reference: string;
  memberId?: string;
  matchupId: string;
  week: number;
  selectedTeamId: string;
  opponentTeamId: string;
  moneylineAtBet: number;
  stakeFaab: number;
  status: Wager["status"];
  placedAt: string;
  settledAt?: string;
  won?: boolean;
}): Wager {
  const potentialProfit = calculateProfit(input.stakeFaab, input.moneylineAtBet);
  const potentialPayout = calculatePayout(input.stakeFaab, input.moneylineAtBet);
  return {
    id: input.id,
    reference: input.reference,
    memberId: input.memberId ?? "975162996680945664",
    marketId: `market-${input.matchupId}`,
    matchupId: input.matchupId,
    week: input.week,
    selectedTeamId: input.selectedTeamId,
    opponentTeamId: input.opponentTeamId,
    moneylineAtBet: input.moneylineAtBet,
    stakeFaab: input.stakeFaab,
    potentialProfit: Math.round(potentialProfit * 100) / 100,
    potentialPayout: Math.round(potentialPayout * 100) / 100,
    finalPayout:
      input.status === "won"
        ? Math.round(potentialPayout * 100) / 100
        : input.status === "refunded"
          ? input.stakeFaab
          : input.status === "lost"
            ? 0
            : undefined,
    status: input.status,
    placedAt: input.placedAt,
    settledAt: input.settledAt,
  };
}

export const mockWagers: Wager[] = [
  makeWager({
    id: "wager-1",
    reference: "JHL-70231",
    matchupId: "matchup-w7-1",
    week: 7,
    selectedTeamId: "roster-1",
    opponentTeamId: "roster-2",
    moneylineAtBet: -145,
    stakeFaab: 50,
    status: "open",
    placedAt: "2026-07-22T14:10:00.000Z",
  }),
  makeWager({
    id: "wager-2",
    reference: "JHL-70198",
    matchupId: "matchup-w7-3",
    week: 7,
    selectedTeamId: "roster-6",
    opponentTeamId: "roster-5",
    moneylineAtBet: 160,
    stakeFaab: 25,
    status: "open",
    placedAt: "2026-07-22T11:42:00.000Z",
  }),
  makeWager({
    id: "wager-3",
    reference: "JHL-69874",
    matchupId: "matchup-w6-1",
    week: 6,
    selectedTeamId: "roster-1",
    opponentTeamId: "roster-4",
    moneylineAtBet: -180,
    stakeFaab: 60,
    status: "won",
    placedAt: "2026-07-18T13:05:00.000Z",
    settledAt: "2026-07-21T04:00:00.000Z",
  }),
  makeWager({
    id: "wager-4",
    reference: "JHL-69720",
    matchupId: "matchup-w6-2",
    week: 6,
    selectedTeamId: "roster-3",
    opponentTeamId: "roster-2",
    moneylineAtBet: -110,
    stakeFaab: 40,
    status: "lost",
    placedAt: "2026-07-18T10:22:00.000Z",
    settledAt: "2026-07-21T04:00:00.000Z",
  }),
  makeWager({
    id: "wager-5",
    reference: "JHL-69655",
    matchupId: "matchup-w6-3",
    week: 6,
    selectedTeamId: "roster-7",
    opponentTeamId: "roster-6",
    moneylineAtBet: 135,
    stakeFaab: 20,
    status: "won",
    placedAt: "2026-07-17T22:15:00.000Z",
    settledAt: "2026-07-21T04:00:00.000Z",
  }),
  makeWager({
    id: "wager-6",
    reference: "JHL-69410",
    matchupId: "matchup-w6-4",
    week: 6,
    selectedTeamId: "roster-8",
    opponentTeamId: "roster-5",
    moneylineAtBet: 210,
    stakeFaab: 15,
    status: "lost",
    placedAt: "2026-07-17T18:03:00.000Z",
    settledAt: "2026-07-21T04:00:00.000Z",
  }),
  makeWager({
    id: "wager-7",
    reference: "JHL-68902",
    matchupId: "matchup-w6-2",
    week: 5,
    selectedTeamId: "roster-2",
    opponentTeamId: "roster-3",
    moneylineAtBet: -125,
    stakeFaab: 30,
    status: "refunded",
    placedAt: "2026-07-11T15:47:00.000Z",
    settledAt: "2026-07-12T09:00:00.000Z",
  }),
  // Still open going into this pass — this is what the Commissioner
  // "Settle Week 6" action processes.
  makeWager({
    id: "wager-8",
    reference: "JHL-69920",
    matchupId: "matchup-w6-4",
    week: 6,
    selectedTeamId: "roster-5",
    opponentTeamId: "roster-8",
    moneylineAtBet: -140,
    stakeFaab: 35,
    status: "open",
    placedAt: "2026-07-18T15:30:00.000Z",
  }),

  // Other members' wager history, giving the leaderboard real variety to
  // rank, tie-break, and compute streaks/ROI from.
  makeWager({
    id: "wager-9",
    reference: "JHL-69350",
    memberId: "984151623574323200",
    matchupId: "matchup-w6-2",
    week: 6,
    selectedTeamId: "roster-2",
    opponentTeamId: "roster-3",
    moneylineAtBet: 210,
    stakeFaab: 40,
    status: "won",
    placedAt: "2026-07-17T12:00:00.000Z",
    settledAt: "2026-07-21T04:00:00.000Z",
  }),
  makeWager({
    id: "wager-10",
    reference: "JHL-69355",
    memberId: "984151623574323200",
    matchupId: "matchup-w6-1",
    week: 6,
    selectedTeamId: "roster-4",
    opponentTeamId: "roster-1",
    moneylineAtBet: 155,
    stakeFaab: 30,
    status: "won",
    placedAt: "2026-07-17T13:00:00.000Z",
    settledAt: "2026-07-21T04:00:00.000Z",
  }),
  makeWager({
    id: "wager-11",
    reference: "JHL-69360",
    memberId: "984151623574323200",
    matchupId: "matchup-w6-3",
    week: 6,
    selectedTeamId: "roster-6",
    opponentTeamId: "roster-7",
    moneylineAtBet: -120,
    stakeFaab: 50,
    status: "lost",
    placedAt: "2026-07-17T14:00:00.000Z",
    settledAt: "2026-07-21T04:00:00.000Z",
  }),
  makeWager({
    id: "wager-12",
    reference: "JHL-70210",
    memberId: "984151623574323200",
    matchupId: "matchup-w7-2",
    week: 7,
    selectedTeamId: "roster-3",
    opponentTeamId: "roster-4",
    moneylineAtBet: -199,
    stakeFaab: 20,
    status: "open",
    placedAt: "2026-07-22T09:00:00.000Z",
  }),
  makeWager({
    id: "wager-13",
    reference: "JHL-69300",
    memberId: "984156047625523200",
    matchupId: "matchup-w6-4",
    week: 6,
    selectedTeamId: "roster-8",
    opponentTeamId: "roster-5",
    moneylineAtBet: 210,
    stakeFaab: 25,
    status: "lost",
    placedAt: "2026-07-17T10:00:00.000Z",
    settledAt: "2026-07-21T04:00:00.000Z",
  }),
  makeWager({
    id: "wager-14",
    reference: "JHL-69305",
    memberId: "984156047625523200",
    matchupId: "matchup-w6-2",
    week: 6,
    selectedTeamId: "roster-3",
    opponentTeamId: "roster-2",
    moneylineAtBet: -110,
    stakeFaab: 45,
    status: "won",
    placedAt: "2026-07-17T11:00:00.000Z",
    settledAt: "2026-07-21T04:00:00.000Z",
  }),
  makeWager({
    id: "wager-15",
    reference: "JHL-68800",
    memberId: "594590141419405312",
    matchupId: "matchup-w6-1",
    week: 5,
    selectedTeamId: "roster-4",
    opponentTeamId: "roster-1",
    moneylineAtBet: 145,
    stakeFaab: 20,
    status: "refunded",
    placedAt: "2026-07-11T09:00:00.000Z",
    settledAt: "2026-07-12T09:00:00.000Z",
  }),
];
