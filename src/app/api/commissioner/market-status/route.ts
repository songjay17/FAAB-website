import { NextResponse } from "next/server";
import { readBook, setMarketStatus } from "@/lib/server/book";
import { asString, jsonError } from "@/lib/server/api";
import { guard, isResponse } from "@/lib/server/guard";
import type { MarketStatus } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const guarded = await guard({ commissioner: true });
    if (isResponse(guarded)) return guarded;
    const { data, session } = guarded;

    const body = (await request.json()) as Record<string, unknown>;
    const matchupId = asString(body.matchupId);
    const status = asString(body.status);
    if (!matchupId || !status) {
      return jsonError("matchupId and status are required.", 400);
    }

    const leagueId = data.league.id;
    const result = await setMarketStatus({
      leagueId,
      actorMemberId: session.memberId,
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
