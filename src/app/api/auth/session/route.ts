import { NextResponse } from "next/server";
import { listMemberClaims } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/api";
import { getLeagueDataCached } from "@/lib/server/league-data-cache";
import { clearSession, requireSession } from "@/lib/server/session";

/** Who am I (if anyone), plus the claim/login picker's member list. */
export async function GET() {
  try {
    const data = await getLeagueDataCached();
    const session = await requireSession(data.league.id);
    return NextResponse.json({
      session,
      members: await listMemberClaims(data),
    });
  } catch (err) {
    return jsonError(err);
  }
}

/** Sign out. */
export async function DELETE() {
  try {
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
