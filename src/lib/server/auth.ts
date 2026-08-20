import { hash, verify } from "@node-rs/argon2";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLog, memberAuth } from "@/lib/db/schema";
import type { LeagueData } from "@/lib/sleeper/load-league-data";
import type { Session } from "./session";

// Claim-your-member + PIN. The league roster comes from Sleeper; this module
// only tracks who has claimed which member and their PIN. Right-sized for a
// 14-person friends league where everyone knows each other — the PIN stops
// casual impersonation of a teammate, not a determined attacker.

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type AuthResult = { ok: true; session: Session } | { ok: false; error: string };

export type MemberClaimStatus = {
  memberId: string;
  displayName: string;
  claimed: boolean;
};

function isValidPin(pin: unknown): pin is string {
  return (
    typeof pin === "string" &&
    pin.length >= MIN_PIN_LENGTH &&
    pin.length <= MAX_PIN_LENGTH &&
    /^\d+$/.test(pin)
  );
}

/** Who's in the league and who has already claimed their spot — drives the claim/login picker. */
export async function listMemberClaims(data: LeagueData): Promise<MemberClaimStatus[]> {
  const db = getDb();
  const rows = await db
    .select({ memberId: memberAuth.memberId })
    .from(memberAuth)
    .where(eq(memberAuth.leagueId, data.league.id));
  const claimed = new Set(rows.map((r) => r.memberId));
  return data.members.map((member) => ({
    memberId: member.id,
    displayName: member.displayName,
    claimed: claimed.has(member.id),
  }));
}

export async function claimMember(input: {
  data: LeagueData;
  memberId: string;
  pin: string;
}): Promise<AuthResult> {
  const { data, memberId, pin } = input;
  const leagueId = data.league.id;

  const member = data.members.find((m) => m.id === memberId);
  if (!member) {
    return { ok: false, error: "That member isn't in this league." };
  }
  if (!isValidPin(pin)) {
    return {
      ok: false,
      error: `PIN must be ${MIN_PIN_LENGTH}–${MAX_PIN_LENGTH} digits.`,
    };
  }

  const db = getDb();
  const pinHash = await hash(pin);
  // onConflictDoNothing means a second claim of the same member loses the
  // race rather than overwriting the first claimant's PIN.
  const inserted = await db
    .insert(memberAuth)
    .values({
      leagueId,
      memberId,
      pinHash,
      isCommissioner: member.isCommissioner === true,
    })
    .onConflictDoNothing()
    .returning({ memberId: memberAuth.memberId });

  if (inserted.length === 0) {
    return {
      ok: false,
      error: "That member has already been claimed — sign in with their PIN instead.",
    };
  }

  await db.insert(auditLog).values({
    leagueId,
    actorMemberId: memberId,
    action: "claim-member",
    subjectId: memberId,
    reason: null,
  });

  return {
    ok: true,
    session: { leagueId, memberId, isCommissioner: member.isCommissioner === true },
  };
}

export async function loginMember(input: {
  data: LeagueData;
  memberId: string;
  pin: string;
}): Promise<AuthResult> {
  const { data, memberId, pin } = input;
  const leagueId = data.league.id;
  const db = getDb();

  const [row] = await db
    .select()
    .from(memberAuth)
    .where(and(eq(memberAuth.leagueId, leagueId), eq(memberAuth.memberId, memberId)));

  // Same message whether the member is unclaimed or the PIN is wrong, so
  // this can't be used to enumerate who has claimed what.
  const invalid = { ok: false as const, error: "Incorrect member or PIN." };
  if (!row) return invalid;

  if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, error: `Too many failed attempts — try again in ${minutes} min.` };
  }

  const valid = typeof pin === "string" && pin.length > 0 && (await verify(row.pinHash, pin));
  if (!valid) {
    const failedAttempts = row.failedAttempts + 1;
    const lockedUntil =
      failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
    await db
      .update(memberAuth)
      .set({ failedAttempts: lockedUntil ? 0 : failedAttempts, lockedUntil })
      .where(and(eq(memberAuth.leagueId, leagueId), eq(memberAuth.memberId, memberId)));
    return lockedUntil
      ? {
          ok: false,
          error: `Too many failed attempts — try again in ${Math.ceil(LOCKOUT_MS / 60000)} min.`,
        }
      : invalid;
  }

  if (row.failedAttempts !== 0 || row.lockedUntil) {
    await db
      .update(memberAuth)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(and(eq(memberAuth.leagueId, leagueId), eq(memberAuth.memberId, memberId)));
  }

  return {
    ok: true,
    session: { leagueId, memberId, isCommissioner: row.isCommissioner },
  };
}

/**
 * Commissioner-only: clears a member's claim so they can re-claim with a new
 * PIN (the "I forgot my PIN" path). Deliberately doesn't set a PIN on their
 * behalf — the member picks their own on re-claim.
 */
export async function resetMemberPin(input: {
  leagueId: string;
  actorMemberId: string;
  memberId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { leagueId, actorMemberId, memberId } = input;
  const db = getDb();
  const deleted = await db
    .delete(memberAuth)
    .where(and(eq(memberAuth.leagueId, leagueId), eq(memberAuth.memberId, memberId)))
    .returning({ memberId: memberAuth.memberId });
  if (deleted.length === 0) {
    return { ok: false, error: "That member hasn't claimed a PIN yet." };
  }
  await db.insert(auditLog).values({
    leagueId,
    actorMemberId,
    action: "reset-pin",
    subjectId: memberId,
    reason: null,
  });
  return { ok: true };
}
