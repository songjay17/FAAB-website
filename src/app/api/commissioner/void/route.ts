import { NextResponse } from "next/server";
import { readBook, voidWagerAdmin } from "@/lib/server/book";
import { asString, jsonError } from "@/lib/server/api";
import { getLeagueDataCached } from "@/lib/server/league-data-cache";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const memberId = asString(body.memberId);
    const wagerId = asString(body.wagerId);
    const reason = typeof body.reason === "string" ? body.reason : "";
    if (!memberId || !wagerId) {
      return jsonError("memberId and wagerId are required.", 400);
    }

    const data = await getLeagueDataCached();
    const leagueId = data.league.id;
    const result = await voidWagerAdmin({ leagueId, actorMemberId: memberId, wagerId, reason });
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return NextResponse.json({ book: await readBook(leagueId) });
  } catch (err) {
    return jsonError(err);
  }
}
