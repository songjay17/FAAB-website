import { NextResponse } from "next/server";
import { loginMember } from "@/lib/server/auth";
import { asString, jsonError } from "@/lib/server/api";
import { getLeagueDataCached } from "@/lib/server/league-data-cache";
import { createSession } from "@/lib/server/session";

/** Returning visit: member + PIN. Failures are rate-limited by lockout in loginMember. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const memberId = asString(body.memberId);
    const pin = asString(body.pin);
    if (!memberId || !pin) {
      return jsonError("memberId and pin are required.", 400);
    }

    const data = await getLeagueDataCached();
    const result = await loginMember({ data, memberId, pin });
    if (!result.ok) {
      return jsonError(result.error, 401);
    }
    await createSession(result.session);
    return NextResponse.json({ session: result.session });
  } catch (err) {
    return jsonError(err);
  }
}
