import { NextResponse } from "next/server";
import { listMemberClaims, resetMemberPin } from "@/lib/server/auth";
import { asString, jsonError } from "@/lib/server/api";
import { guard, isResponse } from "@/lib/server/guard";

/** Commissioner clears a member's claim so they can set a new PIN ("forgot my PIN"). */
export async function POST(request: Request) {
  try {
    const guarded = await guard({ commissioner: true });
    if (isResponse(guarded)) return guarded;
    const { data, session } = guarded;

    const body = (await request.json()) as Record<string, unknown>;
    const memberId = asString(body.memberId);
    if (!memberId) {
      return jsonError("memberId is required.", 400);
    }
    if (memberId === session.memberId) {
      return jsonError("You can't reset your own PIN — ask another member to do it.", 400);
    }

    const result = await resetMemberPin({
      leagueId: data.league.id,
      actorMemberId: session.memberId,
      memberId,
    });
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return NextResponse.json({ members: await listMemberClaims(data) });
  } catch (err) {
    return jsonError(err);
  }
}
