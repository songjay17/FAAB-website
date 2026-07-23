import { describe, expect, it } from "vitest";
import { settleWagersForWeek } from "@/lib/state/settlement";
import { calculatePayout } from "@/lib/odds";
import type { FaabWallet, Wager, WeeklyMatchup } from "@/lib/types";

function makeWallet(overrides: Partial<FaabWallet> = {}): FaabWallet {
  return {
    memberId: "member-1",
    totalBudget: 1000,
    availableFaab: 500,
    reservedFaab: 100,
    weeklyProfitLoss: 0,
    seasonProfitLoss: 0,
    ...overrides,
  };
}

function makeWager(overrides: Partial<Wager> = {}): Wager {
  return {
    id: "wager-x",
    reference: "JHL-1",
    memberId: "member-1",
    marketId: "market-matchup-w6-1",
    matchupId: "matchup-w6-1",
    week: 6,
    selectedTeamId: "team-1",
    opponentTeamId: "team-2",
    moneylineAtBet: -150,
    stakeFaab: 30,
    potentialProfit: 20,
    potentialPayout: 50,
    status: "open",
    placedAt: "2026-07-18T13:00:00.000Z",
    ...overrides,
  };
}

function makeMatchup(overrides: Partial<WeeklyMatchup> = {}): WeeklyMatchup {
  return {
    id: "matchup-w6-1",
    week: 6,
    homeTeamId: "team-1",
    awayTeamId: "team-2",
    lockAt: "2026-07-19T17:00:00.000Z",
    status: "final",
    homeScore: 120,
    awayScore: 100,
    ...overrides,
  };
}

describe("settleWagersForWeek", () => {
  it("settles a winning wager: correct payout, wallet, and status", () => {
    const wallet = makeWallet({ availableFaab: 500, reservedFaab: 100 });
    const wager = makeWager({ selectedTeamId: "team-1", stakeFaab: 30, moneylineAtBet: -150 });
    const matchup = makeMatchup({ homeScore: 120, awayScore: 100 });

    const result = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [matchup] });

    const expectedPayout = Math.round(calculatePayout(30, -150) * 100) / 100;
    expect(result.processed).toBe(1);
    expect(result.won).toBe(1);
    expect(result.lost).toBe(0);
    expect(result.refunded).toBe(0);
    expect(result.totalPaidOut).toBe(expectedPayout);
    expect(result.updatedWagers).toHaveLength(1);
    expect(result.updatedWagers![0].status).toBe("won");
    expect(result.updatedWagers![0].finalPayout).toBe(expectedPayout);
    expect(result.updatedWagers![0].settledAt).toBeDefined();
    expect(result.updatedWallet.reservedFaab).toBe(70);
    expect(result.updatedWallet.availableFaab).toBe(500 + expectedPayout);
    expect(result.updatedWallet.weeklyProfitLoss).toBe(expectedPayout - 30);
    expect(result.updatedWallet.seasonProfitLoss).toBe(expectedPayout - 30);
  });

  it("settles a losing wager: zero payout, no double deduction from availableFaab", () => {
    const wallet = makeWallet({ availableFaab: 500, reservedFaab: 100 });
    const wager = makeWager({ selectedTeamId: "team-2", stakeFaab: 30 });
    const matchup = makeMatchup({ homeScore: 120, awayScore: 100 });

    const result = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [matchup] });

    expect(result.won).toBe(0);
    expect(result.lost).toBe(1);
    expect(result.updatedWagers![0].status).toBe("lost");
    expect(result.updatedWagers![0].finalPayout).toBe(0);
    expect(result.updatedWallet.reservedFaab).toBe(70);
    // availableFaab was already debited at placement time; losing must not touch it again.
    expect(result.updatedWallet.availableFaab).toBe(500);
    expect(result.updatedWallet.weeklyProfitLoss).toBe(-30);
    expect(result.updatedWallet.seasonProfitLoss).toBe(-30);
  });

  it("refunds a wager on a tied matchup", () => {
    const wallet = makeWallet({ availableFaab: 500, reservedFaab: 100 });
    const wager = makeWager({ selectedTeamId: "team-1", stakeFaab: 30 });
    const matchup = makeMatchup({ homeScore: 110, awayScore: 110 });

    const result = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [matchup] });

    expect(result.refunded).toBe(1);
    expect(result.won).toBe(0);
    expect(result.lost).toBe(0);
    expect(result.updatedWagers![0].status).toBe("refunded");
    expect(result.updatedWagers![0].finalPayout).toBe(30);
    expect(result.updatedWallet.reservedFaab).toBe(70);
    expect(result.updatedWallet.availableFaab).toBe(530);
    // Refunds are profit-neutral.
    expect(result.updatedWallet.weeklyProfitLoss).toBe(0);
    expect(result.updatedWallet.seasonProfitLoss).toBe(0);
    expect(result.totalPaidOut).toBe(30);
  });

  it("processes multiple open wagers across different matchups in one settlement", () => {
    const wallet = makeWallet({ availableFaab: 500, reservedFaab: 100 });
    const winner = makeWager({
      id: "w-win",
      matchupId: "matchup-a",
      selectedTeamId: "team-1",
      stakeFaab: 20,
      moneylineAtBet: 150,
    });
    const loser = makeWager({
      id: "w-lose",
      matchupId: "matchup-b",
      selectedTeamId: "team-4",
      opponentTeamId: "team-3",
      stakeFaab: 10,
    });
    const matchupA = makeMatchup({ id: "matchup-a", homeTeamId: "team-1", awayTeamId: "team-2", homeScore: 100, awayScore: 90 });
    const matchupB = makeMatchup({ id: "matchup-b", homeTeamId: "team-3", awayTeamId: "team-4", homeScore: 100, awayScore: 90 });

    const result = settleWagersForWeek({
      week: 6,
      wallet,
      wagers: [winner, loser],
      matchups: [matchupA, matchupB],
    });

    expect(result.processed).toBe(2);
    expect(result.won).toBe(1);
    expect(result.lost).toBe(1);
    expect(result.updatedWallet.reservedFaab).toBe(70);
  });

  it("skips a wager whose matchup cannot be found, leaving it open", () => {
    const wallet = makeWallet();
    const wager = makeWager({ matchupId: "does-not-exist" });

    const result = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [] });

    expect(result.processed).toBe(0);
    expect(result.updatedWagers).toBeNull();
    expect(result.skipped).toEqual([
      { wagerId: wager.id, reference: wager.reference, reason: "matchup-not-found" },
    ]);
    expect(result.updatedWallet).toEqual(wallet);
  });

  it("skips a wager when the matchup has no final score yet", () => {
    const wallet = makeWallet();
    const wager = makeWager();
    const matchup = makeMatchup({ status: "final", homeScore: undefined, awayScore: undefined });

    const result = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [matchup] });

    expect(result.processed).toBe(0);
    expect(result.skipped[0].reason).toBe("missing-final-score");
  });

  it("skips a wager whose matchup is not marked final", () => {
    const wallet = makeWallet();
    const wager = makeWager();
    const matchup = makeMatchup({ status: "upcoming", homeScore: undefined, awayScore: undefined });

    const result = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [matchup] });

    expect(result.processed).toBe(0);
    expect(result.skipped[0].reason).toBe("matchup-not-final");
  });

  it("skips a wager whose selected team does not belong to the matchup", () => {
    const wallet = makeWallet();
    const wager = makeWager({ selectedTeamId: "team-99" });
    const matchup = makeMatchup();

    const result = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [matchup] });

    expect(result.processed).toBe(0);
    expect(result.skipped[0].reason).toBe("team-not-in-matchup");
  });

  it("ignores wagers that are already settled", () => {
    const wallet = makeWallet();
    const wager = makeWager({ status: "won", finalPayout: 50, settledAt: "2026-07-20T00:00:00.000Z" });
    const matchup = makeMatchup();

    const result = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [matchup] });

    expect(result.processed).toBe(0);
    expect(result.updatedWagers).toBeNull();
    expect(result.skipped).toHaveLength(0);
  });

  it("is a no-op when there are no open wagers for the week", () => {
    const wallet = makeWallet();
    const result = settleWagersForWeek({ week: 6, wallet, wagers: [], matchups: [] });

    expect(result.processed).toBe(0);
    expect(result.updatedWagers).toBeNull();
    expect(result.updatedWallet).toEqual(wallet);
  });

  it("is idempotent: settling twice does not pay out or refund twice", () => {
    const wallet = makeWallet({ availableFaab: 500, reservedFaab: 100 });
    const wager = makeWager({ selectedTeamId: "team-1", stakeFaab: 30 });
    const matchup = makeMatchup({ homeScore: 120, awayScore: 100 });

    const first = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [matchup] });
    const settledWager = first.updatedWagers![0];

    const second = settleWagersForWeek({
      week: 6,
      wallet: first.updatedWallet,
      wagers: [settledWager],
      matchups: [matchup],
    });

    expect(second.processed).toBe(0);
    expect(second.updatedWagers).toBeNull();
    expect(second.updatedWallet).toEqual(first.updatedWallet);
  });

  it("never lets availableFaab or reservedFaab go negative", () => {
    const wallet = makeWallet({ availableFaab: 0, reservedFaab: 5 });
    const wager = makeWager({ selectedTeamId: "team-2", stakeFaab: 30 });
    const matchup = makeMatchup({ homeScore: 120, awayScore: 100 });

    const result = settleWagersForWeek({ week: 6, wallet, wagers: [wager], matchups: [matchup] });

    expect(result.updatedWallet.reservedFaab).toBeGreaterThanOrEqual(0);
    expect(result.updatedWallet.availableFaab).toBeGreaterThanOrEqual(0);
  });

  it("only settles wagers for the requested week", () => {
    const wallet = makeWallet();
    const weekSixWager = makeWager({ id: "w6", week: 6, matchupId: "matchup-w6-1" });
    const weekSevenWager = makeWager({ id: "w7", week: 7, matchupId: "matchup-w7-1" });
    const matchup = makeMatchup();

    const result = settleWagersForWeek({
      week: 6,
      wallet,
      wagers: [weekSixWager, weekSevenWager],
      matchups: [matchup],
    });

    expect(result.processed).toBe(1);
    expect(result.updatedWagers![0].id).toBe("w6");
  });
});
