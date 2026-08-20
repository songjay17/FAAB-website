import { NextResponse } from "next/server";
import { placeWager, readBook } from "@/lib/server/book";
import { asString, jsonError } from "@/lib/server/api";
import { getLeagueDataCached } from "@/lib/server/league-data-cache";

// PR-1 trust model: memberId is client-asserted (the same honor system the
// per-browser build had, now against shared state). Identity/enforcement
// lands in the follow-up PR — see docs/shared-persistence-plan.md.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const memberId = asString(body.memberId);
    const marketId = asString(body.marketId);
    const selectedTeamId = asString(body.selectedTeamId);
    const stakeFaab = typeof body.stakeFaab === "number" ? body.stakeFaab : NaN;
    if (!memberId || !marketId || !selectedTeamId || !Number.isFinite(stakeFaab)) {
      return jsonError("memberId, marketId, selectedTeamId, and stakeFaab are required.", 400);
    }

    const data = await getLeagueDataCached();
    const leagueId = data.league.id;
    const result = await placeWager({ leagueId, memberId, marketId, selectedTeamId, stakeFaab });
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return NextResponse.json({ wager: result.wager, book: await readBook(leagueId) });
  } catch (err) {
    return jsonError(err);
  }
}
