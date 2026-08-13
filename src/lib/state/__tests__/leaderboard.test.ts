import { describe, expect, it } from "vitest";
import { buildLeaderboard } from "@/lib/state/leaderboard";
import type { FaabWallet, FantasyTeam, LeagueMember, Wager } from "@/lib/types";

function makeMember(overrides: Partial<LeagueMember> = {}): LeagueMember {
  return {
    id: "member-1",
    displayName: "Justin",
    teamId: "team-1",
    ...overrides,
  };
}

function makeTeam(overrides: Partial<FantasyTeam> = {}): FantasyTeam {
  return {
    id: "team-1",
    ownerMemberId: "member-1",
    name: "Hurts So Good",
    logoEmoji: "🦅",
    record: { wins: 5, losses: 1, ties: 0 },
    pointsFor: 700,
    pointsAgainst: 600,
    recentForm: [],
    ...overrides,
  };
}

function makeWallet(overrides: Partial<FaabWallet> = {}): FaabWallet {
  return {
    memberId: "member-1",
    totalBudget: 1000,
    availableFaab: 500,
    reservedFaab: 0,
    weeklyProfitLoss: 0,
    seasonProfitLoss: 0,
    sleeperWaiverSpend: 0,
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

describe("buildLeaderboard", () => {
  it("includes a member with no wagers at all, with zero-value stats (not NaN)", () => {
    const [entry] = buildLeaderboard({
      scope: "season",
      week: 7,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet({ availableFaab: 800, reservedFaab: 0 })],
      wagers: [],
    });

    expect(entry.faabBalance).toBe(800);
    expect(entry.seasonProfitLoss).toBe(0);
    expect(entry.totalWagered).toBe(0);
    expect(entry.betsWon).toBe(0);
    expect(entry.betsLost).toBe(0);
    expect(entry.winPercent).toBe(0);
    expect(entry.largestWin).toBe(0);
    expect(entry.currentStreak).toBe("—");
    expect(entry.returnOnWagered).toBe(0);
    expect(Number.isNaN(entry.winPercent)).toBe(false);
    expect(Number.isNaN(entry.returnOnWagered)).toBe(false);
  });

  it("member with only open wagers: wagered counts, but no wins/losses/P&L", () => {
    const [entry] = buildLeaderboard({
      scope: "season",
      week: 7,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet({ availableFaab: 450, reservedFaab: 50 })],
      wagers: [makeWager({ status: "open", stakeFaab: 50 })],
    });

    expect(entry.totalWagered).toBe(50);
    expect(entry.betsWon).toBe(0);
    expect(entry.betsLost).toBe(0);
    expect(entry.seasonProfitLoss).toBe(0);
    expect(entry.winPercent).toBe(0);
    expect(entry.currentStreak).toBe("—");
    // Open wager reserves the stake but doesn't reduce total bankroll.
    expect(entry.faabBalance).toBe(500);
  });

  it("member with one winning wager: correct P&L, largest win, streak, ROI", () => {
    const [entry] = buildLeaderboard({
      scope: "season",
      week: 6,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet({ availableFaab: 550, reservedFaab: 0 })],
      wagers: [
        makeWager({ status: "won", stakeFaab: 30, finalPayout: 50, settledAt: "2026-07-21T00:00:00.000Z" }),
      ],
    });

    expect(entry.betsWon).toBe(1);
    expect(entry.betsLost).toBe(0);
    expect(entry.seasonProfitLoss).toBe(20);
    expect(entry.largestWin).toBe(20);
    expect(entry.currentStreak).toBe("W1");
    expect(entry.winPercent).toBe(100);
    expect(entry.returnOnWagered).toBe(0.67);
  });

  it("member with one losing wager: correct P&L, streak, ROI", () => {
    const [entry] = buildLeaderboard({
      scope: "season",
      week: 6,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet({ availableFaab: 500, reservedFaab: 0 })],
      wagers: [
        makeWager({ status: "lost", stakeFaab: 30, finalPayout: 0, settledAt: "2026-07-21T00:00:00.000Z" }),
      ],
    });

    expect(entry.betsWon).toBe(0);
    expect(entry.betsLost).toBe(1);
    expect(entry.seasonProfitLoss).toBe(-30);
    expect(entry.largestWin).toBe(0);
    expect(entry.currentStreak).toBe("L1");
    expect(entry.winPercent).toBe(0);
    expect(entry.returnOnWagered).toBe(-1);
  });

  it("refunded wagers do not count as wins/losses, do not affect P&L, ROI denominator, or streak", () => {
    const [entry] = buildLeaderboard({
      scope: "season",
      week: 6,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet({ availableFaab: 500, reservedFaab: 0 })],
      wagers: [
        makeWager({
          id: "refund-1",
          status: "refunded",
          stakeFaab: 30,
          finalPayout: 30,
          settledAt: "2026-07-20T00:00:00.000Z",
        }),
      ],
    });

    expect(entry.betsWon).toBe(0);
    expect(entry.betsLost).toBe(0);
    expect(entry.seasonProfitLoss).toBe(0);
    expect(entry.winPercent).toBe(0);
    expect(entry.returnOnWagered).toBe(0);
    expect(entry.currentStreak).toBe("—");
    // Refunds still count as betting volume.
    expect(entry.totalWagered).toBe(30);
  });

  it("refunded wagers between two wins do not break the streak", () => {
    const [entry] = buildLeaderboard({
      scope: "season",
      week: 6,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet()],
      wagers: [
        makeWager({ id: "w1", status: "won", stakeFaab: 10, finalPayout: 15, settledAt: "2026-07-18T00:00:00.000Z" }),
        makeWager({ id: "refund", status: "refunded", stakeFaab: 10, finalPayout: 10, settledAt: "2026-07-19T00:00:00.000Z" }),
        makeWager({ id: "w2", status: "won", stakeFaab: 10, finalPayout: 15, settledAt: "2026-07-20T00:00:00.000Z" }),
      ],
    });

    // Streak is computed from decided wagers only, so the refund in the
    // middle is simply skipped rather than resetting the count.
    expect(entry.currentStreak).toBe("W2");
  });

  it("multiple wagers across multiple weeks: season includes all, week scope filters", () => {
    const wagers = [
      makeWager({ id: "w6a", week: 6, status: "won", stakeFaab: 20, finalPayout: 35, settledAt: "2026-07-21T00:00:00.000Z" }),
      makeWager({ id: "w6b", week: 6, status: "lost", stakeFaab: 15, finalPayout: 0, settledAt: "2026-07-21T01:00:00.000Z" }),
      makeWager({ id: "w7a", week: 7, status: "open", stakeFaab: 25 }),
    ];

    const season = buildLeaderboard({
      scope: "season",
      week: 7,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet()],
      wagers,
    })[0];

    const week7 = buildLeaderboard({
      scope: "week",
      week: 7,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet()],
      wagers,
    })[0];

    const week6 = buildLeaderboard({
      scope: "week",
      week: 6,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet()],
      wagers,
    })[0];

    expect(season.totalWagered).toBe(60);
    expect(season.betsWon).toBe(1);
    expect(season.betsLost).toBe(1);
    expect(season.seasonProfitLoss).toBe(0); // +15 - 15

    expect(week7.totalWagered).toBe(25);
    expect(week7.betsWon).toBe(0);
    expect(week7.betsLost).toBe(0);

    expect(week6.totalWagered).toBe(35);
    expect(week6.betsWon).toBe(1);
    expect(week6.betsLost).toBe(1);
  });

  it("computes correct wallet balance including reserved FAAB", () => {
    const [entry] = buildLeaderboard({
      scope: "season",
      week: 7,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet({ availableFaab: 300, reservedFaab: 120 })],
      wagers: [],
    });

    expect(entry.faabBalance).toBe(420);
  });

  it("ranks members by FAAB balance descending", () => {
    const members = [makeMember({ id: "member-1", displayName: "Justin" }), makeMember({ id: "member-2", displayName: "Connor", teamId: "team-2" })];
    const teams = [makeTeam(), makeTeam({ id: "team-2", ownerMemberId: "member-2", name: "Bijan Mustard" })];
    const wallets = [
      makeWallet({ memberId: "member-1", availableFaab: 400, reservedFaab: 0 }),
      makeWallet({ memberId: "member-2", availableFaab: 900, reservedFaab: 0 }),
    ];

    const board = buildLeaderboard({ scope: "season", week: 7, members, teams, wallets, wagers: [] });

    expect(board[0].memberId).toBe("member-2");
    expect(board[0].rank).toBe(1);
    expect(board[1].memberId).toBe("member-1");
    expect(board[1].rank).toBe(2);
  });

  it("rank updates after settlement changes a member's balance", () => {
    const members = [makeMember({ id: "member-1" }), makeMember({ id: "member-2", teamId: "team-2" })];
    const teams = [makeTeam(), makeTeam({ id: "team-2", ownerMemberId: "member-2" })];
    const wallets = [
      makeWallet({ memberId: "member-1", availableFaab: 500, reservedFaab: 0 }),
      makeWallet({ memberId: "member-2", availableFaab: 480, reservedFaab: 0 }),
    ];

    const before = buildLeaderboard({ scope: "season", week: 7, members, teams, wallets, wagers: [] });
    expect(before[0].memberId).toBe("member-1");

    // Simulate settlement crediting member-2 a big win.
    const walletsAfter = wallets.map((w) =>
      w.memberId === "member-2" ? { ...w, availableFaab: 650 } : w
    );
    const after = buildLeaderboard({ scope: "season", week: 7, members, teams, wallets: walletsAfter, wagers: [] });
    expect(after[0].memberId).toBe("member-2");
  });

  it("applies deterministic tie-break: equal balance and P&L falls back to displayName", () => {
    const members = [
      makeMember({ id: "member-2", displayName: "Zeta", teamId: "team-2" }),
      makeMember({ id: "member-1", displayName: "Alpha" }),
    ];
    const teams = [makeTeam({ id: "team-2", ownerMemberId: "member-2" }), makeTeam()];
    const wallets = [
      makeWallet({ memberId: "member-2", availableFaab: 500, reservedFaab: 0 }),
      makeWallet({ memberId: "member-1", availableFaab: 500, reservedFaab: 0 }),
    ];

    const board = buildLeaderboard({ scope: "season", week: 7, members, teams, wallets, wagers: [] });

    expect(board[0].displayName).toBe("Alpha");
    expect(board[1].displayName).toBe("Zeta");
  });

  it("tie-break falls through to total FAAB won when balance and P&L are equal", () => {
    const members = [
      makeMember({ id: "member-1", displayName: "Justin" }),
      makeMember({ id: "member-2", displayName: "Connor", teamId: "team-2" }),
    ];
    const teams = [makeTeam(), makeTeam({ id: "team-2", ownerMemberId: "member-2" })];
    const wallets = [
      makeWallet({ memberId: "member-1", availableFaab: 500, reservedFaab: 0 }),
      makeWallet({ memberId: "member-2", availableFaab: 500, reservedFaab: 0 }),
    ];
    // Both end up with seasonProfitLoss 0 overall, but member-2 has a bigger
    // total-FAAB-won component offset by an equal loss.
    const wagers = [
      makeWager({ id: "m1-win", memberId: "member-1", status: "won", stakeFaab: 10, finalPayout: 15, settledAt: "2026-07-20T00:00:00.000Z" }),
      makeWager({ id: "m1-loss", memberId: "member-1", status: "lost", stakeFaab: 5, finalPayout: 0, settledAt: "2026-07-20T00:00:00.000Z" }),
      makeWager({ id: "m2-win", memberId: "member-2", status: "won", stakeFaab: 30, finalPayout: 40, settledAt: "2026-07-20T00:00:00.000Z" }),
      makeWager({ id: "m2-loss", memberId: "member-2", status: "lost", stakeFaab: 10, finalPayout: 0, settledAt: "2026-07-20T00:00:00.000Z" }),
    ];

    const board = buildLeaderboard({ scope: "season", week: 7, members, teams, wallets, wagers });

    // member-1: +5 -5 = 0 P&L, totalFaabWon = 5
    // member-2: +10 -10 = 0 P&L, totalFaabWon = 10 -> ranks above on tie-break
    expect(board[0].memberId).toBe("member-2");
    expect(board[1].memberId).toBe("member-1");
  });

  it("does not omit a member who has a wallet but has never placed a wager", () => {
    const members = [makeMember({ id: "member-1" }), makeMember({ id: "member-2", displayName: "Connor", teamId: "team-2" })];
    const teams = [makeTeam(), makeTeam({ id: "team-2", ownerMemberId: "member-2" })];
    const wallets = [
      makeWallet({ memberId: "member-1" }),
      makeWallet({ memberId: "member-2" }),
    ];

    const board = buildLeaderboard({ scope: "season", week: 7, members, teams, wallets, wagers: [] });

    expect(board).toHaveLength(2);
    expect(board.some((e) => e.memberId === "member-2")).toBe(true);
  });

  it("does not produce NaN or Infinity when a member has no decided wagers", () => {
    const [entry] = buildLeaderboard({
      scope: "season",
      week: 7,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet()],
      wagers: [makeWager({ status: "open" })],
    });

    expect(Number.isFinite(entry.returnOnWagered)).toBe(true);
    expect(Number.isFinite(entry.winPercent)).toBe(true);
    expect(entry.returnOnWagered).toBe(0);
  });

  it("repeated settlement (wagers already settled, called again) does not change stats twice", () => {
    const wager = makeWager({ status: "won", stakeFaab: 20, finalPayout: 35, settledAt: "2026-07-20T00:00:00.000Z" });

    const first = buildLeaderboard({
      scope: "season",
      week: 6,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet()],
      wagers: [wager],
    })[0];

    // Calling buildLeaderboard again on the exact same (already-settled)
    // wager data must be idempotent — it's a pure read, not a mutation.
    const second = buildLeaderboard({
      scope: "season",
      week: 6,
      members: [makeMember()],
      teams: [makeTeam()],
      wallets: [makeWallet()],
      wagers: [wager],
    })[0];

    expect(second).toEqual(first);
    expect(second.seasonProfitLoss).toBe(15);
  });
});
