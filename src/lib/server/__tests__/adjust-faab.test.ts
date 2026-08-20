import { beforeEach, describe, expect, it, vi } from "vitest";

// adjustWalletFaab runs inside a Drizzle transaction; this exercises its
// rules (validation, cap, floor at zero, what it does and doesn't touch)
// against a fake query builder, the same approach as the auth tests. The
// transactional locking itself is covered by live API verification.

type WalletRow = {
  leagueId: string;
  memberId: string;
  totalBudget: number;
  availableFaab: number;
  reservedFaab: number;
  weeklyProfitLoss: number;
  seasonProfitLoss: number;
  sleeperWaiverSpend: number;
};

const state = {
  wallet: null as WalletRow | null,
  updates: [] as Array<Record<string, unknown>>,
  audits: [] as Array<Record<string, unknown>>,
};

vi.mock("@/lib/db/schema", () => ({
  wallets: { __table: "wallets" },
  auditLog: { __table: "audit_log" },
  markets: { __table: "markets" },
  wagers: { __table: "wagers" },
  books: { __table: "books" },
  memberAuth: { __table: "member_auth" },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  asc: (x: unknown) => x,
  desc: (x: unknown) => x,
  eq: (...args: unknown[]) => args,
  isNotNull: (x: unknown) => x,
  isNull: (x: unknown) => x,
  lte: (...args: unknown[]) => args,
  sql: (...args: unknown[]) => args,
}));

const tx = {
  select: () => ({
    from: () => ({
      where: () => ({
        for: () => (state.wallet ? [state.wallet] : []),
      }),
    }),
  }),
  update: () => ({
    set: (values: Record<string, unknown>) => ({
      where: () => {
        state.updates.push(values);
        return Promise.resolve([]);
      },
    }),
  }),
  insert: () => ({
    values: (values: Record<string, unknown>) => {
      state.audits.push(values);
      return Promise.resolve([]);
    },
  }),
};

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  }),
}));

const { adjustWalletFaab, MAX_FAAB_ADJUSTMENT } = await import("../book");

function seedWallet(overrides: Partial<WalletRow> = {}) {
  state.wallet = {
    leagueId: "league-1",
    memberId: "member-1",
    totalBudget: 100,
    availableFaab: 40,
    reservedFaab: 25,
    weeklyProfitLoss: 5,
    seasonProfitLoss: 12,
    sleeperWaiverSpend: 35,
    ...overrides,
  };
}

const base = { leagueId: "league-1", actorMemberId: "boss", memberId: "member-1" };

beforeEach(() => {
  state.wallet = null;
  state.updates = [];
  state.audits = [];
  seedWallet();
});

describe("adjustWalletFaab", () => {
  it("credits a member and records the signed amount with the reason", async () => {
    const result = await adjustWalletFaab({ ...base, amount: 15, reason: "waiver correction" });
    expect(result.ok && result.wallet.availableFaab).toBe(55);
    expect(state.audits[0]).toMatchObject({
      action: "adjust-faab",
      subjectId: "member-1",
      reason: "+15 FAAB — waiver correction",
    });
  });

  it("debits on a negative amount", async () => {
    const result = await adjustWalletFaab({ ...base, amount: -10, reason: "double credit" });
    expect(result.ok && result.wallet.availableFaab).toBe(30);
    expect(state.audits[0]).toMatchObject({ reason: "-10 FAAB — double credit" });
  });

  it("leaves reserved FAAB and P/L untouched — a correction isn't a betting outcome", async () => {
    await adjustWalletFaab({ ...base, amount: 15, reason: "correction" });
    expect(state.updates[0]).toMatchObject({
      availableFaab: 55,
      reservedFaab: 25,
      weeklyProfitLoss: 5,
      seasonProfitLoss: 12,
      sleeperWaiverSpend: 35,
    });
  });

  it("refuses to push a balance below zero", async () => {
    const result = await adjustWalletFaab({ ...base, amount: -50, reason: "too much" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/below zero/);
    expect(state.updates).toHaveLength(0);
  });

  it("allows an adjustment that lands exactly on zero", async () => {
    const result = await adjustWalletFaab({ ...base, amount: -40, reason: "zero out" });
    expect(result.ok && result.wallet.availableFaab).toBe(0);
  });

  it.each([
    [0, "zero"],
    [Number.NaN, "not a number"],
  ])("rejects %s as an amount (%s)", async (amount) => {
    const result = await adjustWalletFaab({ ...base, amount, reason: "correction" });
    expect(result.ok).toBe(false);
    expect(state.updates).toHaveLength(0);
  });

  it("caps a single correction, guarding against a typo'd extra zero", async () => {
    const result = await adjustWalletFaab({
      ...base,
      amount: MAX_FAAB_ADJUSTMENT + 1,
      reason: "oops",
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/capped/);
  });

  it.each(["", "   "])("requires a reason (%s)", async (reason) => {
    const result = await adjustWalletFaab({ ...base, amount: 10, reason });
    expect(result.ok).toBe(false);
    expect(state.updates).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
  });

  it("reports a missing wallet rather than creating one", async () => {
    state.wallet = null;
    const result = await adjustWalletFaab({ ...base, amount: 10, reason: "correction" });
    expect(result).toEqual({ ok: false, error: "Member wallet not found." });
  });

  it("rounds to cents rather than accumulating float drift", async () => {
    seedWallet({ availableFaab: 10.1 });
    const result = await adjustWalletFaab({ ...base, amount: 0.2, reason: "rounding" });
    expect(result.ok && result.wallet.availableFaab).toBe(10.3);
  });
});
