import { NextResponse } from "next/server";
import { readBook, setMarketStatus } from "@/lib/server/book";
import { asString, jsonError } from "@/lib/server/api";
import { getLeagueDataCached } from "@/lib/server/league-data-cache";
import type { MarketStatus } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const memberId = asString(body.memberId);
    const matchupId = asString(body.matchupId);
    const status = asString(body.status);
    if (!memberId || !matchupId || !status) {
      return jsonError("memberId, matchupId, and status are required.", 400);
    }

    const data = await getLeagueDataCached();
    const leagueId = data.league.id;
    const result = await setMarketStatus({
      leagueId,
      actorMemberId: memberId,
      matchupId,
      status: status as MarketStatus,
    });
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return NextResponse.json({ book: await readBook(leagueId) });
  } catch (err) {
    return jsonError(err);
  }
}
