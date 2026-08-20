import { NextResponse } from "next/server";
import { cancelWager, readBook } from "@/lib/server/book";
import { jsonError } from "@/lib/server/api";
import { guard, isResponse } from "@/lib/server/guard";

/**
 * Self-cancel within the grace window (misclick protection) — see
 * SELF_CANCEL_WINDOW_MS. cancelWager only matches wagers belonging to the
 * session's member, so this can't cancel someone else's bet.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ wagerId: string }> }
) {
  try {
    const guarded = await guard();
    if (isResponse(guarded)) return guarded;
    const { data, session } = guarded;

    const { wagerId } = await params;
    const leagueId = data.league.id;
    const result = await cancelWager({ leagueId, memberId: session.memberId, wagerId });
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return NextResponse.json({ book: await readBook(leagueId) });
  } catch (err) {
    return jsonError(err);
  }
}
