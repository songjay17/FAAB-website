import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// Signed, httpOnly session cookie — no session table needed. The cookie
// carries only the league/member/commissioner triple; every route re-reads
// it server-side, so a client can no longer assert who it is.

const COOKIE_NAME = "jhulads_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — a season of weekly visits

export type Session = {
  leagueId: string;
  memberId: string;
  isCommissioner: boolean;
};

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 32 characters."
    );
  }
  return new TextEncoder().encode(value);
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** The signed-in member, or null when the cookie is absent, expired, or tampered with. */
export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const { leagueId, memberId, isCommissioner } = payload as Partial<Session>;
    if (typeof leagueId !== "string" || typeof memberId !== "string") return null;
    return { leagueId, memberId, isCommissioner: isCommissioner === true };
  } catch {
    return null;
  }
}

/**
 * A session scoped to the league currently being served. A cookie minted for
 * a previous season's league is treated as signed-out — the rollover starts
 * a new book, so it must also start a new claim.
 */
export async function requireSession(leagueId: string): Promise<Session | null> {
  const session = await readSession();
  if (!session || session.leagueId !== leagueId) return null;
  return session;
}
