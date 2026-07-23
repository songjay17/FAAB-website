import type { Wager } from "@/lib/types";
import { calculatePayout, calculateProfit } from "@/lib/odds";

function makeWager(input: {
  id: string;
  reference: string;
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
    memberId: "member-1",
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
    selectedTeamId: "team-1",
    opponentTeamId: "team-2",
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
    selectedTeamId: "team-6",
    opponentTeamId: "team-5",
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
    selectedTeamId: "team-1",
    opponentTeamId: "team-4",
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
    selectedTeamId: "team-3",
    opponentTeamId: "team-2",
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
    selectedTeamId: "team-7",
    opponentTeamId: "team-6",
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
    selectedTeamId: "team-8",
    opponentTeamId: "team-5",
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
    selectedTeamId: "team-2",
    opponentTeamId: "team-3",
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
    selectedTeamId: "team-5",
    opponentTeamId: "team-8",
    moneylineAtBet: -140,
    stakeFaab: 35,
    status: "open",
    placedAt: "2026-07-18T15:30:00.000Z",
  }),
];
