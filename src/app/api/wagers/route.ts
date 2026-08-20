import { NextResponse } from "next/server";
import { placeWager, readBook } from "@/lib/server/book";
import { asString, jsonError } from "@/lib/server/api";
import { guard, isResponse } from "@/lib/server/guard";

// The bettor is whoever the session cookie says — a client can't place a bet
// as someone else.
export async function POST(request: Request) {
  try {
    const guarded = await guard();
    if (isResponse(guarded)) return guarded;
    const { data, session } = guarded;

    const body = (await request.json()) as Record<string, unknown>;
    const marketId = asString(body.marketId);
    const selectedTeamId = asString(body.selectedTeamId);
    const stakeFaab = typeof body.stakeFaab === "number" ? body.stakeFaab : NaN;
    if (!marketId || !selectedTeamId || !Number.isFinite(stakeFaab)) {
      return jsonError("marketId, selectedTeamId, and stakeFaab are required.", 400);
    }

    const leagueId = data.league.id;
    const result = await placeWager({
      leagueId,
      memberId: session.memberId,
      marketId,
      selectedTeamId,
      stakeFaab,
    });
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return NextResponse.json({ wager: result.wager, book: await readBook(leagueId) });
  } catch (err) {
    return jsonError(err);
  }
}
