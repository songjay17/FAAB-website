import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Exercises the cookie/JWT round-trip through a fake Next cookie jar: the
// point is that a session can't be forged or reused across leagues.

const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

const { clearSession, createSession, readSession, requireSession } = await import("../session");

const session = { leagueId: "league-1", memberId: "member-1", isCommissioner: true };

beforeEach(() => {
  jar.clear();
  process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-chars-long";
});

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

describe("session cookie", () => {
  it("round-trips a signed session", async () => {
    await createSession(session);
    expect(await readSession()).toEqual(session);
  });

  it("returns null when no cookie is set", async () => {
    expect(await readSession()).toBeNull();
  });

  it("rejects a tampered token", async () => {
    await createSession(session);
    const [header, payload, signature] = jar.get("jhulads_session")!.split(".");
    // Flip the commissioner claim and keep the original signature.
    const forged = Buffer.from(
      JSON.stringify({ ...session, memberId: "someone-else" })
    ).toString("base64url");
    jar.set("jhulads_session", `${header}.${forged}.${signature}`);
    expect(await readSession()).toBeNull();
    expect(payload).not.toBe(forged);
  });

  it("rejects a token signed with a different secret", async () => {
    await createSession(session);
    process.env.SESSION_SECRET = "a-completely-different-secret-32-chars";
    expect(await readSession()).toBeNull();
  });

  it("treats a session from another league as signed out", async () => {
    await createSession(session);
    expect(await requireSession("league-1")).toEqual(session);
    // A season rollover mints a new league id — the old cookie shouldn't carry over.
    expect(await requireSession("league-2")).toBeNull();
  });

  it("clears the cookie on sign-out", async () => {
    await createSession(session);
    await clearSession();
    expect(await readSession()).toBeNull();
  });

  it("refuses to mint a session without a strong secret", async () => {
    process.env.SESSION_SECRET = "too-short";
    await expect(createSession(session)).rejects.toThrow(/SESSION_SECRET/);
  });
});
