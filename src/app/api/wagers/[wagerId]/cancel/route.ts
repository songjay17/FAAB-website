import { NextResponse } from "next/server";
import { cancelWager, readBook } from "@/lib/server/book";
import { asString, jsonError } from "@/lib/server/api";
import { getLeagueDataCached } from "@/lib/server/league-data-cache";

/** Self-cancel within the grace window (misclick protection) — see SELF_CANCEL_WINDOW_MS. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ wagerId: string }> }
) {
  try {
    const { wagerId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const memberId = asString(body.memberId);
    if (!memberId) {
      return jsonError("memberId is required.", 400);
    }

    const data = await getLeagueDataCached();
    const leagueId = data.league.id;
    const result = await cancelWager({ leagueId, memberId, wagerId });
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return NextResponse.json({ book: await readBook(leagueId) });
  } catch (err) {
    return jsonError(err);
  }
}
