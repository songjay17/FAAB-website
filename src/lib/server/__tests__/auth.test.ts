import { beforeEach, describe, expect, it, vi } from "vitest";

// The auth module talks to Postgres through Drizzle; these tests exercise
// its decision-making (validation, claim races, lockout, commissioner flag)
// against a hand-rolled fake of the query builder rather than a real
// database. The transactional book paths are covered by live API
// verification instead — see the PR description.

const state = {
  rows: [] as Array<{
    leagueId: string;
    memberId: string;
    pinHash: string;
    isCommissioner: boolean;
    failedAttempts: number;
    lockedUntil: Date | null;
  }>,
  inserted: [] as Array<Record<string, unknown>>,
  audits: [] as Array<Record<string, unknown>>,
  /** When false, the next member_auth insert conflicts (member already claimed). */
  insertSucceeds: true,
};

vi.mock("@node-rs/argon2", () => ({
  hash: async (pin: string) => `hashed:${pin}`,
  verify: async (hashed: string, pin: string) => hashed === `hashed:${pin}`,
}));

vi.mock("@/lib/db/schema", () => ({
  memberAuth: { __table: "member_auth" },
  auditLog: { __table: "audit_log" },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: (table: { __table: string }) => ({
        where: () => (table.__table === "member_auth" ? state.rows : []),
      }),
    }),
    insert: (table: { __table: string }) => ({
      values: (values: Record<string, unknown>) => {
        if (table.__table === "audit_log") {
          state.audits.push(values);
          return Promise.resolve([]);
        }
        return {
          onConflictDoNothing: () => ({
            returning: () => {
              if (!state.insertSucceeds) return [];
              state.inserted.push(values);
              return [{ memberId: values.memberId }];
            },
          }),
        };
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          Object.assign(state.rows[0], values);
          return Promise.resolve([]);
        },
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: () => {
          const removed = state.rows.splice(0, state.rows.length);
          return removed.map((r) => ({ memberId: r.memberId }));
        },
      }),
    }),
  }),
}));

const { claimMember, listMemberClaims, loginMember, resetMemberPin } = await import("../auth");

const leagueData = {
  league: { id: "league-1" },
  members: [
    { id: "member-boss", displayName: "Boss", teamId: "roster-1", isCommissioner: true },
    { id: "member-two", displayName: "Two", teamId: "roster-2", isCommissioner: false },
  ],
} as unknown as Parameters<typeof claimMember>[0]["data"];

function seedRow(overrides: Partial<(typeof state.rows)[number]> = {}) {
  state.rows = [
    {
      leagueId: "league-1",
      memberId: "member-two",
      pinHash: "hashed:1234",
      isCommissioner: false,
      failedAttempts: 0,
      lockedUntil: null,
      ...overrides,
    },
  ];
}

beforeEach(() => {
  state.rows = [];
  state.inserted = [];
  state.audits = [];
  state.insertSucceeds = true;
});

describe("claimMember", () => {
  it("claims an unclaimed member and returns a session", async () => {
    const result = await claimMember({ data: leagueData, memberId: "member-two", pin: "1234" });
    expect(result).toEqual({
      ok: true,
      session: { leagueId: "league-1", memberId: "member-two", isCommissioner: false },
    });
    expect(state.inserted[0]).toMatchObject({ memberId: "member-two", pinHash: "hashed:1234" });
    expect(state.audits[0]).toMatchObject({ action: "claim-member" });
  });

  it("carries the commissioner flag from the Sleeper league owner", async () => {
    const result = await claimMember({ data: leagueData, memberId: "member-boss", pin: "1234" });
    expect(result.ok && result.session.isCommissioner).toBe(true);
    expect(state.inserted[0]).toMatchObject({ isCommissioner: true });
  });

  it.each([
    ["123", "too short"],
    ["1234567890123", "too long"],
    ["12ab", "non-numeric"],
  ])("rejects a %s PIN (%s)", async (pin) => {
    const result = await claimMember({ data: leagueData, memberId: "member-two", pin });
    expect(result.ok).toBe(false);
    expect(state.inserted).toHaveLength(0);
  });

  it("rejects a member who isn't in the league", async () => {
    const result = await claimMember({ data: leagueData, memberId: "stranger", pin: "1234" });
    expect(result).toEqual({ ok: false, error: "That member isn't in this league." });
  });

  it("loses the race rather than overwriting an existing claim", async () => {
    state.insertSucceeds = false;
    const result = await claimMember({ data: leagueData, memberId: "member-two", pin: "9999" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/already been claimed/);
  });
});

describe("loginMember", () => {
  it("signs in with the right PIN", async () => {
    seedRow();
    const result = await loginMember({ data: leagueData, memberId: "member-two", pin: "1234" });
    expect(result).toEqual({
      ok: true,
      session: { leagueId: "league-1", memberId: "member-two", isCommissioner: false },
    });
  });

  it("counts a wrong PIN toward lockout without revealing which part was wrong", async () => {
    seedRow();
    const result = await loginMember({ data: leagueData, memberId: "member-two", pin: "0000" });
    expect(result).toEqual({ ok: false, error: "Incorrect member or PIN." });
    expect(state.rows[0].failedAttempts).toBe(1);
  });

  it("locks out after five consecutive failures", async () => {
    seedRow({ failedAttempts: 4 });
    const result = await loginMember({ data: leagueData, memberId: "member-two", pin: "0000" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/Too many failed attempts/);
    expect(state.rows[0].lockedUntil).toBeInstanceOf(Date);
  });

  it("refuses while locked out, even with the correct PIN", async () => {
    seedRow({ lockedUntil: new Date(Date.now() + 60_000) });
    const result = await loginMember({ data: leagueData, memberId: "member-two", pin: "1234" });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/try again in/);
  });

  it("clears the failure count on a successful sign-in", async () => {
    seedRow({ failedAttempts: 3 });
    const result = await loginMember({ data: leagueData, memberId: "member-two", pin: "1234" });
    expect(result.ok).toBe(true);
    expect(state.rows[0].failedAttempts).toBe(0);
    expect(state.rows[0].lockedUntil).toBeNull();
  });

  it("gives the same error for an unclaimed member as for a wrong PIN", async () => {
    state.rows = [];
    const result = await loginMember({ data: leagueData, memberId: "member-two", pin: "1234" });
    expect(result).toEqual({ ok: false, error: "Incorrect member or PIN." });
  });
});

describe("listMemberClaims", () => {
  it("marks who has claimed and who hasn't", async () => {
    seedRow();
    const claims = await listMemberClaims(leagueData);
    expect(claims).toEqual([
      { memberId: "member-boss", displayName: "Boss", claimed: false },
      { memberId: "member-two", displayName: "Two", claimed: true },
    ]);
  });
});

describe("resetMemberPin", () => {
  it("clears the claim and logs it", async () => {
    seedRow();
    const result = await resetMemberPin({
      leagueId: "league-1",
      actorMemberId: "member-boss",
      memberId: "member-two",
    });
    expect(result).toEqual({ ok: true });
    expect(state.audits[0]).toMatchObject({ action: "reset-pin", subjectId: "member-two" });
  });

  it("reports when the member had no claim to reset", async () => {
    state.rows = [];
    const result = await resetMemberPin({
      leagueId: "league-1",
      actorMemberId: "member-boss",
      memberId: "member-two",
    });
    expect(result.ok).toBe(false);
  });
});
